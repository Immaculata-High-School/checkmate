<script lang="ts">
  import { enhance } from '$app/forms';
  import { Settings, Cpu, ToggleRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let selectedModel = $state(data.config.aiModel);
  
  const defaultFeatures = {
    aiTestGeneration: true,
    aiGrading: true,
    aiStudyGuides: true,
    aiWorksheets: true
  };
  
  let features = $state(
    typeof data.config.features === 'object' && data.config.features !== null && !Array.isArray(data.config.features)
      ? { ...defaultFeatures, ...data.config.features }
      : defaultFeatures
  );

  function getPlanBadge(plan: string) {
    switch (plan) {
      case 'premium': return 'badge-purple';
      case 'pro': return 'badge-blue';
      case 'free': return 'badge-green';
      default: return 'badge-gray';
    }
  }
</script>

<div class="max-w-3xl mx-auto">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Settings class="w-5 h-5 text-gray-600" />
      </div>
      System Settings
    </h1>
  </div>

  <!-- AI Model Settings -->
  <div class="card p-6 mb-6">
    <div class="flex items-center gap-3 mb-6">
      <Cpu class="w-5 h-5 text-gray-400" />
      <h2 class="text-lg font-semibold text-gray-900">AI Model Configuration</h2>
    </div>

    {#if form?.success}
      <div class="alert alert-success mb-6 flex items-center gap-2">
        <CheckCircle class="w-4 h-4" />
        {form.message}
      </div>
    {/if}

    {#if form?.error}
      <div class="alert alert-error mb-6 flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        {form.error}
      </div>
    {/if}

    <form method="POST" action="?/updateAI" use:enhance class="space-y-4">
      <div class="form-group">
        <label for="aiModel" class="label">AI Model</label>
        <select id="aiModel" name="aiModel" bind:value={selectedModel} class="input">
          {#each data.availableModels as model}
            <option value={model.id}>{model.name} ({model.plan})</option>
          {/each}
        </select>
        <p class="form-hint">
          This model will be used for test generation, grading, and study guide creation.
          Models are fetched from the ShuttleAI API.
        </p>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-500 mb-2">Available Models ({data.availableModels.length}):</p>
        <div class="flex flex-wrap gap-2">
          {#each data.availableModels.slice(0, 10) as model}
            <span class="badge {getPlanBadge(model.plan)}">{model.name}</span>
          {/each}
          {#if data.availableModels.length > 10}
            <span class="badge badge-gray">+{data.availableModels.length - 10} more</span>
          {/if}
        </div>
      </div>

      <button type="submit" class="btn btn-primary">
        Save AI Settings
      </button>
    </form>
  </div>

  <!-- Feature Toggles -->
  <div class="card p-6">
    <div class="flex items-center gap-3 mb-6">
      <ToggleRight class="w-5 h-5 text-gray-400" />
      <h2 class="text-lg font-semibold text-gray-900">AI Feature Toggles</h2>
    </div>

    {#if form?.featureSuccess}
      <div class="alert alert-success mb-6 flex items-center gap-2">
        <CheckCircle class="w-4 h-4" />
        {form.message}
      </div>
    {/if}

    <form method="POST" action="?/updateFeatures" use:enhance class="space-y-4">
      <div class="space-y-4">
        <label class="flex items-center justify-between p-4 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <div class="font-medium text-gray-900">AI Test Generation</div>
            <div class="text-sm text-gray-500">Allow teachers to generate tests using AI</div>
          </div>
          <input
            type="checkbox"
            name="aiTestGeneration"
            checked={features.aiTestGeneration}
            class="w-5 h-5 rounded"
          />
        </label>

        <label class="flex items-center justify-between p-4 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <div class="font-medium text-gray-900">AI Grading</div>
            <div class="text-sm text-gray-500">Enable automatic grading of student submissions</div>
          </div>
          <input
            type="checkbox"
            name="aiGrading"
            checked={features.aiGrading}
            class="w-5 h-5 rounded"
          />
        </label>

        <label class="flex items-center justify-between p-4 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <div class="font-medium text-gray-900">AI Study Guides</div>
            <div class="text-sm text-gray-500">Allow generation of study guides from tests</div>
          </div>
          <input
            type="checkbox"
            name="aiStudyGuides"
            checked={features.aiStudyGuides}
            class="w-5 h-5 rounded"
          />
        </label>

        <label class="flex items-center justify-between p-4 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <div class="font-medium text-gray-900">AI Worksheets</div>
            <div class="text-sm text-gray-500">Allow generation of worksheets using AI</div>
          </div>
          <input
            type="checkbox"
            name="aiWorksheets"
            checked={features.aiWorksheets}
            class="w-5 h-5 rounded"
          />
        </label>
      </div>

      <button type="submit" class="btn btn-primary">
        Save Feature Settings
      </button>
    </form>
  </div>
</div>
