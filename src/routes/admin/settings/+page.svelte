<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { Settings, Cpu, ToggleRight, CheckCircle, AlertCircle, RefreshCw, OctagonX, Trash2, Bug, Building2, BookOpen, FileText } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let selectedModel = $state(data.config.aiModel);
  let stoppingJobs = $state(false);
  let clearingGrades = $state(false);
  let selectedOrgId = $state(data.selectedOrgId || '');
  let selectedClassId = $state(data.selectedClassId || '');
  let selectedTestId = $state('');

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

  async function handleOrgChange(orgId: string) {
    selectedOrgId = orgId;
    selectedClassId = '';
    selectedTestId = '';
    if (orgId) {
      await goto(`?orgId=${orgId}`, { keepFocus: true, noScroll: true });
    } else {
      await goto('?', { keepFocus: true, noScroll: true });
    }
  }

  async function handleClassChange(classId: string) {
    selectedClassId = classId;
    selectedTestId = '';
    if (classId && selectedOrgId) {
      await goto(`?orgId=${selectedOrgId}&classId=${classId}`, { keepFocus: true, noScroll: true });
    } else if (selectedOrgId) {
      await goto(`?orgId=${selectedOrgId}`, { keepFocus: true, noScroll: true });
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

  <!-- Debug Tools -->
  <div class="card p-6 mt-6 border-2 border-dashed border-orange-300">
    <div class="flex items-center gap-3 mb-6">
      <Bug class="w-5 h-5 text-orange-500" />
      <h2 class="text-lg font-semibold text-gray-900">Debug Tools</h2>
      <span class="badge badge-orange text-xs">Admin Only</span>
    </div>

    {#if form?.success && !form?.featureSuccess}
      <div class="alert alert-success mb-6 flex items-center gap-2">
        <CheckCircle class="w-4 h-4" />
        {form.message}
      </div>
    {/if}

    <!-- Stop All AI Jobs -->
    <div class="mb-8">
      <h3 class="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <OctagonX class="w-4 h-4 text-red-500" />
        Stop All AI Jobs
      </h3>

      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div class="text-center">
            <div class="text-lg font-bold text-yellow-600">{data.jobCounts.pending}</div>
            <div class="text-gray-500">Pending Jobs</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-blue-600">{data.jobCounts.running}</div>
            <div class="text-gray-500">Running Jobs</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-yellow-600">{data.queueCounts.queued}</div>
            <div class="text-gray-500">Queued Grading</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-blue-600">{data.queueCounts.processing}</div>
            <div class="text-gray-500">Processing Grading</div>
          </div>
        </div>
      </div>

      <p class="text-sm text-gray-500 mb-3">
        Cancels all pending and running AI jobs and grading queue items. The queue processor will be restarted automatically.
      </p>

      <form method="POST" action="?/stopAllAIJobs" use:enhance={() => {
        stoppingJobs = true;
        return async ({ update }) => {
          stoppingJobs = false;
          await update();
        };
      }}>
        <button type="submit" class="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2" disabled={stoppingJobs}>
          {#if stoppingJobs}
            <RefreshCw class="w-4 h-4 animate-spin" />
            Stopping...
          {:else}
            <OctagonX class="w-4 h-4" />
            Stop All AI Jobs
          {/if}
        </button>
      </form>
    </div>

    <hr class="border-gray-200 mb-8" />

    <!-- Clear Grades -->
    <div>
      <h3 class="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Trash2 class="w-4 h-4 text-red-500" />
        Reset Grades for Test
      </h3>

      <p class="text-sm text-gray-500 mb-4">
        Select an organization, class, and test to reset all grades. Submissions and student answers are preserved — only scores, feedback, and grading status are cleared.
      </p>

      <div class="space-y-3 mb-4">
        <!-- Organization Select -->
        <div class="form-group">
          <label for="org-select" class="label flex items-center gap-2">
            <Building2 class="w-4 h-4 text-gray-400" />
            Organization
          </label>
          <select
            id="org-select"
            class="input"
            value={selectedOrgId}
            onchange={(e) => handleOrgChange(e.currentTarget.value)}
          >
            <option value="">Select an organization...</option>
            {#each data.organizations as org}
              <option value={org.id}>{org.name}</option>
            {/each}
          </select>
        </div>

        <!-- Class Select -->
        {#if selectedOrgId && data.classes.length > 0}
          <div class="form-group">
            <label for="class-select" class="label flex items-center gap-2">
              <BookOpen class="w-4 h-4 text-gray-400" />
              Class
            </label>
            <select
              id="class-select"
              class="input"
              value={selectedClassId}
              onchange={(e) => handleClassChange(e.currentTarget.value)}
            >
              <option value="">Select a class...</option>
              {#each data.classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        {:else if selectedOrgId}
          <p class="text-sm text-gray-400 italic">No classes found for this organization.</p>
        {/if}

        <!-- Test Select -->
        {#if selectedClassId && data.tests.length > 0}
          <div class="form-group">
            <label for="test-select" class="label flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              Test
            </label>
            <select
              id="test-select"
              class="input"
              bind:value={selectedTestId}
            >
              <option value="">Select a test...</option>
              {#each data.tests as test}
                <option value={test.id}>{test.title}</option>
              {/each}
            </select>
          </div>
        {:else if selectedClassId}
          <p class="text-sm text-gray-400 italic">No tests found for this class.</p>
        {/if}
      </div>

      {#if selectedTestId}
        <form method="POST" action="?/clearGrades" use:enhance={() => {
          if (!confirm('Are you sure you want to reset all grades for this test? Submissions will be kept but scores and feedback will be cleared.')) {
            return () => {};
          }
          clearingGrades = true;
          return async ({ update }) => {
            clearingGrades = false;
            selectedTestId = '';
            await update();
          };
        }}>
          <input type="hidden" name="testId" value={selectedTestId} />
          <button type="submit" class="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2" disabled={clearingGrades}>
            {#if clearingGrades}
              <RefreshCw class="w-4 h-4 animate-spin" />
              Clearing...
            {:else}
              <Trash2 class="w-4 h-4" />
              Reset All Grades
            {/if}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
