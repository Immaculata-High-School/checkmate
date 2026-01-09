import { prisma } from './db';
import { shuttleAI, type AIContext } from './shuttleai';
import { cache } from './cache';

// Global rate limit configuration - SYSTEM-WIDE AI LIMIT
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute for entire app (system-wide limit)

// In-memory rate limiting (shared across all requests in this process)
interface RateLimitState {
  requests: number[];
  processing: Set<string>;
}

const rateLimitState: RateLimitState = {
  requests: [],
  processing: new Set()
};

// Lock to prevent race conditions when processing queue
let isProcessingQueue = false;
let lastProcessingStart = 0;
let lastProcessingTrigger = 0;
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout for stuck processing
const PROCESSING_DEBOUNCE_MS = 5000; // Don't re-trigger processing within 5 seconds

/**
 * Check if we can make an AI request right now
 */
export function canMakeRequest(): boolean {
  const now = Date.now();
  // Clean up old requests outside the window
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  return rateLimitState.requests.length < MAX_REQUESTS_PER_WINDOW;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
  currentRequests: number;
  maxRequests: number;
  windowMs: number;
  availableSlots: number;
  nextSlotAvailableIn: number | null;
} {
  const now = Date.now();
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  const availableSlots = Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitState.requests.length);

  // Calculate when the next slot will be available
  let nextSlotAvailableIn: number | null = null;
  if (availableSlots === 0 && rateLimitState.requests.length > 0) {
    const oldestRequest = Math.min(...rateLimitState.requests);
    nextSlotAvailableIn = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldestRequest));
  }

  return {
    currentRequests: rateLimitState.requests.length,
    maxRequests: MAX_REQUESTS_PER_WINDOW,
    windowMs: RATE_LIMIT_WINDOW_MS,
    availableSlots,
    nextSlotAvailableIn
  };
}

/**
 * Record that an AI request was made
 */
export function recordRequest(): void {
  rateLimitState.requests.push(Date.now());
}

/**
 * Get queue status for a submission
 */
export async function getQueueStatus(submissionId: string): Promise<{
  status: 'not_queued' | 'queued' | 'processing' | 'completed' | 'failed';
  position?: number;
  estimatedWaitSeconds?: number;
  error?: string;
} | null> {
  const queueItem = await prisma.gradingQueue.findUnique({
    where: { submissionId }
  });

  if (!queueItem) {
    return null;
  }

  if (queueItem.status === 'QUEUED') {
    // Calculate position in queue
    const itemsAhead = await prisma.gradingQueue.count({
      where: {
        status: 'QUEUED',
        createdAt: { lt: queueItem.createdAt }
      }
    });

    // Get cached processing count or fetch if needed
    const processingCacheKey = 'grading_processing_count';
    let processingCount = cache.get<number>(processingCacheKey);
    
    if (processingCount === null) {
      processingCount = await prisma.gradingQueue.count({
        where: { status: 'PROCESSING' }
      });
      cache.set(processingCacheKey, processingCount, 3000); // 3 second cache
    }

    const estimatedWaitSeconds = Math.ceil((itemsAhead + processingCount + 1) * 4);

    return {
      status: 'queued',
      position: itemsAhead + 1,
      estimatedWaitSeconds
    };
  }

  if (queueItem.status === 'PROCESSING') {
    return { status: 'processing' };
  }

  if (queueItem.status === 'COMPLETED') {
    return { status: 'completed' };
  }

  if (queueItem.status === 'FAILED') {
    return { status: 'failed', error: queueItem.error || 'Unknown error' };
  }

  return null;
}

/**
 * Get queue position for a student (for UI display)
 */
export async function getStudentQueueInfo(studentId: string): Promise<{
  inQueue: boolean;
  submissions: Array<{
    submissionId: string;
    testId: string;
    position: number;
    status: string;
    estimatedWaitSeconds: number;
  }>;
}> {
  const queueItems = await prisma.gradingQueue.findMany({
    where: {
      studentId,
      status: { in: ['QUEUED', 'PROCESSING'] }
    },
    orderBy: { createdAt: 'asc' }
  });

  if (queueItems.length === 0) {
    return { inQueue: false, submissions: [] };
  }

  const submissions = await Promise.all(
    queueItems.map(async (item) => {
      const itemsAhead = await prisma.gradingQueue.count({
        where: {
          status: 'QUEUED',
          createdAt: { lt: item.createdAt }
        }
      });

      return {
        submissionId: item.submissionId,
        testId: item.testId,
        position: item.status === 'PROCESSING' ? 0 : itemsAhead + 1,
        status: item.status,
        estimatedWaitSeconds: Math.ceil((itemsAhead + 1) * 4)
      };
    })
  );

  return { inQueue: true, submissions };
}

/**
 * Add a submission to the grading queue
 */
export async function queueGrading(params: {
  submissionId: string;
  testId: string;
  studentId: string;
  priority?: number;
}): Promise<{ queued: true; position: number; estimatedWaitSeconds: number }> {
  const { submissionId, testId, studentId, priority = 0 } = params;

  // Check if already in queue
  const existing = await prisma.gradingQueue.findUnique({
    where: { submissionId }
  });

  if (existing) {
    // Already queued, return current status
    const status = await getQueueStatus(submissionId);
    return {
      queued: true,
      position: status?.position || 1,
      estimatedWaitSeconds: status?.estimatedWaitSeconds || 60
    };
  }

  // Count items ahead in queue
  const queueSize = await prisma.gradingQueue.count({
    where: { status: 'QUEUED' }
  });

  // Add to queue
  await prisma.gradingQueue.create({
    data: {
      submissionId,
      testId,
      studentId,
      priority,
      position: queueSize + 1
    }
  });

  // Trigger queue processing (non-blocking, debounced)
  const now = Date.now();
  if (now - lastProcessingTrigger > PROCESSING_DEBOUNCE_MS) {
    lastProcessingTrigger = now;
    processQueue().catch((err) => console.error('Queue processing error:', err));
  }

  return {
    queued: true,
    position: queueSize + 1,
    estimatedWaitSeconds: Math.ceil((queueSize + 1) * 4)
  };
}

/**
 * Try to grade immediately if rate limit allows, otherwise queue
 */
export async function gradeOrQueue(params: {
  submissionId: string;
  testId: string;
  testTitle: string;
  studentId: string;
  answers: Array<{
    id: string;
    question: string;
    correctAnswer: string;
    studentAnswer: string;
    questionType: string;
    points: number;
  }>;
  allowPartialCredit?: boolean;
  gradingHarshness?: number;
  context?: AIContext;
}): Promise<
  | { immediate: true; result: Awaited<ReturnType<typeof shuttleAI.gradeTestComprehensive>> }
  | { immediate: false; queued: true; position: number; estimatedWaitSeconds: number }
> {
  const { submissionId, testId, testTitle, studentId, answers, allowPartialCredit, gradingHarshness, context } = params;

  // Check if we can make an immediate request
  if (canMakeRequest()) {
    // Record the request
    recordRequest();

    try {
      const result = await shuttleAI.gradeTestComprehensive(
        {
          testTitle,
          answers,
          allowPartialCredit,
          gradingHarshness
        },
        context
      );

      return { immediate: true, result };
    } catch (error) {
      console.error('Immediate grading failed:', error);
      // If immediate grading fails, queue it
      const queueResult = await queueGrading({ submissionId, testId, studentId, priority: 1 });
      return { immediate: false, ...queueResult };
    }
  }

  // Rate limited - add to queue
  const queueResult = await queueGrading({ submissionId, testId, studentId });
  return { immediate: false, ...queueResult };
}

/**
 * Process the grading queue
 * This runs as a background task and processes items one at a time
 */
export async function processQueue(): Promise<void> {
  // Check for stuck processing lock - reset if it's been too long
  const now = Date.now();
  if (isProcessingQueue && lastProcessingStart > 0 && now - lastProcessingStart > PROCESSING_TIMEOUT_MS) {
    console.warn('Queue processing was stuck, resetting lock');
    isProcessingQueue = false;
  }

  // Prevent concurrent queue processing
  if (isProcessingQueue) {
    return;
  }

  // Quick check: if queue is empty, don't bother acquiring the lock
  const queuedCount = await prisma.gradingQueue.count({
    where: { status: 'QUEUED' }
  });
  if (queuedCount === 0) {
    return;
  }

  isProcessingQueue = true;
  lastProcessingStart = now;

  try {
    // First, reset any items that were stuck in PROCESSING state for too long
    const stuckProcessingItems = await prisma.gradingQueue.findMany({
      where: {
        status: 'PROCESSING',
        startedAt: { lt: new Date(now - PROCESSING_TIMEOUT_MS) }
      }
    });

    for (const item of stuckProcessingItems) {
      console.warn(`Resetting stuck processing item: ${item.submissionId}`);
      await prisma.gradingQueue.update({
        where: { id: item.id },
        data: {
          status: 'QUEUED',
          error: 'Processing timed out, re-queued'
        }
      });
      rateLimitState.processing.delete(item.submissionId);
    }

    while (true) {
      // Check rate limit
      if (!canMakeRequest()) {
        // Wait for a slot to become available
        const status = getRateLimitStatus();
        if (status.nextSlotAvailableIn !== null && status.nextSlotAvailableIn > 0) {
          await new Promise((resolve) => setTimeout(resolve, status.nextSlotAvailableIn! + 100));
        } else {
          // Wait a bit and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        continue;
      }

      // Get next item from queue
      const nextItem = await prisma.gradingQueue.findFirst({
        where: { status: 'QUEUED' },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      if (!nextItem) {
        // Queue is empty
        break;
      }

      // Skip if already being processed elsewhere
      if (rateLimitState.processing.has(nextItem.submissionId)) {
        continue;
      }

      // Mark as processing
      rateLimitState.processing.add(nextItem.submissionId);

      await prisma.gradingQueue.update({
        where: { id: nextItem.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      try {
        // Get submission details
        const submission = await prisma.testSubmission.findUnique({
          where: { id: nextItem.submissionId },
          include: {
            test: true,
            answers: {
              include: { question: true }
            },
            student: true
          }
        });

        if (!submission) {
          throw new Error('Submission not found');
        }

        // Prepare answers for grading
        const answersToGrade = submission.answers.map((a) => ({
          id: a.questionId,
          question: a.question.question,
          correctAnswer: a.question.correctAnswer || '',
          studentAnswer: a.answer || '',
          questionType: a.question.type,
          points: a.question.points
        }));

        // Record the request
        recordRequest();

        // Grade the submission
        const result = await shuttleAI.gradeTestComprehensive(
          {
            testTitle: submission.test.title,
            answers: answersToGrade,
            allowPartialCredit: submission.test.aiPartialCredit,
            gradingHarshness: submission.test.aiGradingHarshness
          },
          {
            userId: submission.studentId,
            orgId: null
          }
        );

        // Update answers and submission with grades
        await prisma.$transaction(async (tx) => {
          for (const graded of result.gradedAnswers) {
            await tx.answer.update({
              where: {
                submissionId_questionId: {
                  submissionId: submission.id,
                  questionId: graded.id
                }
              },
              data: {
                isCorrect: graded.isCorrect,
                pointsAwarded: graded.pointsAwarded,
                feedback: graded.feedback
              }
            });
          }

          await tx.testSubmission.update({
            where: { id: submission.id },
            data: {
              status: 'GRADED',
              score: result.totalScore,
              totalPoints: result.totalPoints,
              feedback: result.overallFeedback,
              gradedAt: new Date()
            }
          });
        });

        // Mark queue item as completed
        await prisma.gradingQueue.update({
          where: { id: nextItem.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        // Create notification for student
        await prisma.notification.create({
          data: {
            type: 'GRADE_READY',
            title: 'Test Graded',
            message: `Your test "${submission.test.title}" has been graded. Score: ${result.totalScore}/${result.totalPoints}`,
            link: `/student/results/${submission.id}`,
            userId: submission.studentId
          }
        });
      } catch (error) {
        console.error(`Failed to grade submission ${nextItem.submissionId}:`, error);

        // Check if we should retry
        if (nextItem.attempts < 3) {
          // Requeue for retry
          await prisma.gradingQueue.update({
            where: { id: nextItem.id },
            data: {
              status: 'QUEUED',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        } else {
          // Max retries reached, mark as failed
          await prisma.gradingQueue.update({
            where: { id: nextItem.id },
            data: {
              status: 'FAILED',
              error: error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date()
            }
          });

          // Notify student of failure
          const submission = await prisma.testSubmission.findUnique({
            where: { id: nextItem.submissionId },
            include: { test: true }
          });

          if (submission) {
            await prisma.notification.create({
              data: {
                type: 'GRADING_FAILED',
                title: 'Grading Delayed',
                message: `We couldn't grade your test "${submission.test.title}" automatically. Your teacher will grade it manually.`,
                link: `/student/assignments/${nextItem.testId}`,
                userId: nextItem.studentId
              }
            });

            // Update submission to PENDING for manual grading
            await prisma.testSubmission.update({
              where: { id: nextItem.submissionId },
              data: { status: 'PENDING' }
            });
          }
        }
      } finally {
        rateLimitState.processing.delete(nextItem.submissionId);
      }

      // Small delay between processing items to be nice to the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Get overall queue statistics
 * Cached for 5 seconds to reduce DB load from frequent polling
 */
export async function getQueueStats(): Promise<{
  queuedCount: number;
  processingCount: number;
  completedToday: number;
  failedToday: number;
  averageWaitTimeSeconds: number;
}> {
  // Check cache first
  const cacheKey = 'grading_queue_stats';
  const cached = cache.get<{
    queuedCount: number;
    processingCount: number;
    completedToday: number;
    failedToday: number;
    averageWaitTimeSeconds: number;
  }>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [queuedCount, processingCount, completedToday, failedToday, recentCompleted] = await Promise.all([
    prisma.gradingQueue.count({ where: { status: 'QUEUED' } }),
    prisma.gradingQueue.count({ where: { status: 'PROCESSING' } }),
    prisma.gradingQueue.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: today }
      }
    }),
    prisma.gradingQueue.count({
      where: {
        status: 'FAILED',
        completedAt: { gte: today }
      }
    }),
    prisma.gradingQueue.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: today },
        startedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      },
      take: 100
    })
  ]);

  // Calculate average wait time
  let averageWaitTimeSeconds = 0;
  if (recentCompleted.length > 0) {
    const totalWaitMs = recentCompleted.reduce((sum, item) => {
      if (item.completedAt) {
        return sum + (item.completedAt.getTime() - item.createdAt.getTime());
      }
      return sum;
    }, 0);
    averageWaitTimeSeconds = Math.round(totalWaitMs / recentCompleted.length / 1000);
  }

  const result = {
    queuedCount,
    processingCount,
    completedToday,
    failedToday,
    averageWaitTimeSeconds
  };
  
  // Cache for 5 seconds
  cache.set(cacheKey, result, 5000);
  
  return result;
}

/**
 * Clean up old completed/failed queue items
 */
export async function cleanupQueue(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1); // Keep items for 1 day

  const result = await prisma.gradingQueue.deleteMany({
    where: {
      status: { in: ['COMPLETED', 'FAILED'] },
      completedAt: { lt: cutoff }
    }
  });

  return result.count;
}

// Start queue processor on module load (for long-running processes)
// This will check the queue periodically
let queueProcessorInterval: NodeJS.Timeout | null = null;

export function startQueueProcessor(): void {
  if (queueProcessorInterval) return;

  queueProcessorInterval = setInterval(() => {
    processQueue().catch((err) => console.error('Queue processor error:', err));
  }, 5000); // Check every 5 seconds

  // Also process immediately on start
  processQueue().catch((err) => console.error('Initial queue processing error:', err));
}

export function stopQueueProcessor(): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
  }
}
