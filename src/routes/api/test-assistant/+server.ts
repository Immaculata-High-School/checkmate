import { json, error } from '@sveltejs/kit';
import { shuttleAI } from '$lib/server/shuttleai';
import { prisma } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  try {
    const body = await request.json();
    const { instruction, questions, testTitle, testDescription, testId, mode } = body;

    // If mode is 'edit', use the test editor assistant
    if (mode === 'edit') {
      if (!instruction || typeof instruction !== 'string') {
        throw error(400, 'Instruction is required');
      }

      if (!questions || !Array.isArray(questions)) {
        throw error(400, 'Questions array is required');
      }

      if (!testTitle) {
        throw error(400, 'Test title is required');
      }

      // Verify user owns this test if testId provided
      if (testId) {
        const test = await prisma.test.findUnique({
          where: { id: testId },
          select: { teacherId: true }
        });

        if (!test || test.teacherId !== locals.user.id) {
          throw error(403, 'Not authorized to edit this test');
        }
      }

      // Get org membership for AI tracking
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: locals.user.id }
      });

      const result = await shuttleAI.testEditorAssistant(
        {
          instruction,
          currentQuestions: questions,
          testTitle,
          testDescription
        },
        { userId: locals.user.id, orgId: membership?.organizationId }
      );

      return json({
        success: true,
        questions: result.questions,
        explanation: result.explanation
      });
    }

    // Default: general test assistant (shouldn't reach here normally)
    throw error(400, 'Invalid mode');
  } catch (err) {
    console.error('Test assistant error:', err);

    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }

    throw error(500, err instanceof Error ? err.message : 'Failed to process request');
  }
}
