import { prisma } from './db';
import { shuttleAI, type AIContext } from './shuttleai';

export type JobType =
  | 'TEST_GENERATION'
  | 'STUDY_GUIDE'
  | 'WORKSHEET_GENERATION'
  | 'FLASHCARD_GENERATION'
  | 'TEST_GRADING';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface JobInput {
  TEST_GENERATION: {
    topic: string;
    numberOfQuestions: number;
    questionTypes: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    additionalInstructions?: string;
    title?: string;
    classId?: string;
  };
  STUDY_GUIDE: {
    testId: string;
    testTitle: string;
    testDescription: string;
    questions: Array<{
      question: string;
      type: string;
      correctAnswer: string;
      points: number;
    }>;
  };
  WORKSHEET_GENERATION: {
    topic: string;
    subject: string;
    gradeLevel?: string;
    numberOfItems: number;
    itemTypes: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    title?: string;
    classId?: string;
  };
  FLASHCARD_GENERATION: {
    topic: string;
    numberOfCards: number;
    title?: string;
    classId?: string;
  };
  TEST_GRADING: {
    submissionId: string;
    testTitle: string;
    answers: Array<{
      id: string;
      question: string;
      correctAnswer: string;
      studentAnswer: string;
      questionType: string;
      points: number;
    }>;
  };
}

// Create a new job
export async function createJob<T extends JobType>(
  type: T,
  input: JobInput[T],
  userId: string,
  orgId?: string | null
) {
  const job = await prisma.aIJob.create({
    data: {
      type,
      status: 'PENDING',
      input: input as any,
      progress: 0,
      userId,
      orgId: orgId || undefined
    }
  });

  // Start processing in background (fire and forget)
  processJob(job.id).catch((err) => {
    console.error(`Job ${job.id} failed:`, err);
  });

  return job;
}

// Process a job
async function processJob(jobId: string) {
  const job = await prisma.aIJob.findUnique({
    where: { id: jobId },
    include: { user: true }
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Update status to running
  await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      progress: 10
    }
  });

  const context: AIContext = {
    userId: job.userId,
    orgId: job.orgId
  };

  try {
    let result: any;
    let entityId: string | undefined;
    let entityType: string | undefined;
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationLink: string;

    switch (job.type as JobType) {
      case 'TEST_GENERATION': {
        const input = job.input as JobInput['TEST_GENERATION'];

        // Update progress
        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 30 }
        });

        // Generate questions
        const questions = await shuttleAI.generateTestQuestions(
          {
            topic: input.topic,
            numberOfQuestions: input.numberOfQuestions,
            questionTypes: input.questionTypes,
            difficulty: input.difficulty,
            additionalInstructions: input.additionalInstructions
          },
          context
        );

        // Update progress
        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 70 }
        });

        // Create test
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const test = await prisma.test.create({
          data: {
            title: input.title || `${input.topic} Test`,
            description: `AI-generated test about ${input.topic}`,
            accessCode,
            teacherId: job.userId,
            status: 'DRAFT',
            autoGrade: true,
            questions: {
              create: questions.map((q, i) => ({
                type: q.type,
                question: q.question,
                options: q.options || [],
                correctAnswer: q.correctAnswer,
                points: q.points,
                order: i,
                aiGenerated: true
              }))
            }
          }
        });

        // Assign to class if specified
        if (input.classId) {
          await prisma.classTest.create({
            data: {
              classId: input.classId,
              testId: test.id
            }
          });
        }

        result = { testId: test.id, questionCount: questions.length };
        entityId = test.id;
        entityType = 'TEST';
        notificationTitle = 'Test Generated';
        notificationMessage = `Your test "${test.title}" with ${questions.length} questions is ready.`;
        notificationLink = `/teacher/tests/${test.id}`;
        break;
      }

      case 'STUDY_GUIDE': {
        const input = job.input as JobInput['STUDY_GUIDE'];

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 30 }
        });

        const studyGuide = await shuttleAI.generateStudyGuide(
          {
            testTitle: input.testTitle,
            testDescription: input.testDescription,
            questions: input.questions
          },
          context
        );

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 80 }
        });

        // Update test with study guide
        await prisma.test.update({
          where: { id: input.testId },
          data: { studyGuide }
        });

        result = { testId: input.testId };
        entityId = input.testId;
        entityType = 'STUDY_GUIDE';
        notificationTitle = 'Study Guide Ready';
        notificationMessage = `Your study guide for "${input.testTitle}" is ready.`;
        notificationLink = `/teacher/tests/${input.testId}`;
        break;
      }

      case 'WORKSHEET_GENERATION': {
        const input = job.input as JobInput['WORKSHEET_GENERATION'];

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 30 }
        });

        const items = await shuttleAI.generateWorksheetItems(
          {
            topic: input.topic,
            subject: input.subject,
            gradeLevel: input.gradeLevel,
            numberOfItems: input.numberOfItems,
            itemTypes: input.itemTypes,
            difficulty: input.difficulty
          },
          context
        );

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 70 }
        });

        // Create worksheet
        const worksheet = await prisma.worksheet.create({
          data: {
            title: input.title || `${input.topic} Worksheet`,
            description: `AI-generated worksheet about ${input.topic}`,
            subject: input.subject,
            gradeLevel: input.gradeLevel,
            teacherId: job.userId,
            status: 'DRAFT',
            items: {
              create: items.map((item, i) => ({
                type: item.type,
                content: item.content,
                imageUrl: item.imageUrl,
                imageCaption: item.imageCaption,
                options: item.options || [],
                answer: item.answer,
                hint: item.hint,
                difficulty: item.difficulty,
                order: i,
                aiGenerated: true
              }))
            }
          }
        });

        result = { worksheetId: worksheet.id, itemCount: items.length };
        entityId = worksheet.id;
        entityType = 'WORKSHEET';
        notificationTitle = 'Worksheet Generated';
        notificationMessage = `Your worksheet "${worksheet.title}" with ${items.length} items is ready.`;
        notificationLink = `/teacher/worksheets/${worksheet.id}`;
        break;
      }

      case 'FLASHCARD_GENERATION': {
        const input = job.input as JobInput['FLASHCARD_GENERATION'];

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 30 }
        });

        const cards = await shuttleAI.generateFlashcards(
          {
            topic: input.topic,
            numberOfCards: input.numberOfCards
          },
          context
        );

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 70 }
        });

        // Create study set
        const studySet = await prisma.studySet.create({
          data: {
            title: input.title || `${input.topic} Flashcards`,
            description: `AI-generated flashcards about ${input.topic}`,
            creatorId: job.userId,
            classId: input.classId,
            cards: {
              create: cards.map((card, i) => ({
                front: card.front,
                back: card.back,
                order: i
              }))
            }
          }
        });

        result = { studySetId: studySet.id, cardCount: cards.length };
        entityId = studySet.id;
        entityType = 'STUDY_SET';
        notificationTitle = 'Flashcards Generated';
        notificationMessage = `Your flashcard set "${studySet.title}" with ${cards.length} cards is ready.`;
        notificationLink = `/teacher/study-sets/${studySet.id}`;
        break;
      }

      case 'TEST_GRADING': {
        const input = job.input as JobInput['TEST_GRADING'];

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 30 }
        });

        const gradingResult = await shuttleAI.gradeTestComprehensive(
          {
            testTitle: input.testTitle,
            answers: input.answers
          },
          context
        );

        await prisma.aIJob.update({
          where: { id: jobId },
          data: { progress: 70 }
        });

        // Update submission with grades
        await prisma.$transaction(async (tx) => {
          // Update individual answers
          for (const graded of gradingResult.gradedAnswers) {
            await tx.answer.update({
              where: {
                submissionId_questionId: {
                  submissionId: input.submissionId,
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

          // Update submission
          await tx.testSubmission.update({
            where: { id: input.submissionId },
            data: {
              status: 'GRADED',
              score: gradingResult.totalScore,
              totalPoints: gradingResult.totalPoints,
              feedback: gradingResult.overallFeedback,
              gradedAt: new Date()
            }
          });
        });

        result = {
          submissionId: input.submissionId,
          score: gradingResult.totalScore,
          totalPoints: gradingResult.totalPoints
        };
        entityId = input.submissionId;
        entityType = 'SUBMISSION';
        notificationTitle = 'Test Graded';
        notificationMessage = `Test "${input.testTitle}" has been graded: ${gradingResult.totalScore}/${gradingResult.totalPoints} points.`;
        notificationLink = `/teacher/tests`; // Could link to specific submission
        break;
      }

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Update job as completed
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        output: result,
        entityId,
        entityType,
        completedAt: new Date()
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'JOB_COMPLETE',
        title: notificationTitle!,
        message: notificationMessage!,
        link: notificationLink!,
        userId: job.userId,
        jobId: job.id
      }
    });
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    // Update job as failed
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    });

    // Create failure notification
    await prisma.notification.create({
      data: {
        type: 'JOB_FAILED',
        title: 'Job Failed',
        message: `Your ${job.type.toLowerCase().replace('_', ' ')} job failed. Please try again.`,
        userId: job.userId,
        jobId: job.id
      }
    });
  }
}

// Get job status
export async function getJobStatus(jobId: string) {
  return prisma.aIJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      type: true,
      status: true,
      progress: true,
      error: true,
      output: true,
      entityId: true,
      entityType: true,
      createdAt: true,
      completedAt: true
    }
  });
}

// Get user's jobs
export async function getUserJobs(userId: string, limit = 20) {
  return prisma.aIJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      progress: true,
      error: true,
      input: true,
      output: true,
      entityId: true,
      entityType: true,
      createdAt: true,
      startedAt: true,
      completedAt: true
    }
  });
}
