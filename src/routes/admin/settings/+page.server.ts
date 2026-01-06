import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { fetchAvailableModels } from '$lib/server/shuttleai';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [config, models] = await Promise.all([
    prisma.systemConfig.findUnique({
      where: { id: 'singleton' }
    }),
    fetchAvailableModels()
  ]);

  return {
    config: config || {
      aiModel: 'gpt-4o',
      features: {
        aiTestGeneration: true,
        aiGrading: true,
        aiStudyGuides: true,
        aiWorksheets: true
      }
    },
    availableModels: models
  };
};

export const actions: Actions = {
  updateAI: async ({ request }) => {
    const formData = await request.formData();
    const aiModel = formData.get('aiModel')?.toString();

    if (!aiModel) {
      return fail(400, { error: 'AI model is required' });
    }

    await prisma.systemConfig.upsert({
      where: { id: 'singleton' },
      update: { aiModel },
      create: {
        id: 'singleton',
        aiModel
      }
    });

    return { success: true, message: 'AI settings updated successfully' };
  },

  updateFeatures: async ({ request }) => {
    const formData = await request.formData();
    const features = {
      aiTestGeneration: formData.get('aiTestGeneration') === 'on',
      aiGrading: formData.get('aiGrading') === 'on',
      aiStudyGuides: formData.get('aiStudyGuides') === 'on',
      aiWorksheets: formData.get('aiWorksheets') === 'on'
    };

    await prisma.systemConfig.upsert({
      where: { id: 'singleton' },
      update: { features },
      create: {
        id: 'singleton',
        aiModel: 'anthropic/claude-opus-4-1-20250805',
        features
      }
    });

    return { featureSuccess: true, message: 'Feature settings updated successfully' };
  }
};
