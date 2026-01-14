<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    Settings,
    Save,
    Loader2,
    UserPlus,
    X,
    Clock,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Send,
    Info
  } from 'lucide-svelte';
  import TestSettings from '$lib/components/TestSettings.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let saving = $state(false);
  let showAddOverride = $state(false);
  let selectedStudentId = $state('');
  let extraAttempts = $state(1);
  let extraTimeMinutes = $state(0);
  let extendedDeadline = $state('');
  let overrideNotes = $state('');

  // Initialize settings from test data
  let settings = $state({
    timeLimit: data.test.timeLimit,
    startDate: data.test.startDate ? new Date(data.test.startDate).toISOString().slice(0, 16) : '',
    endDate: data.test.endDate ? new Date(data.test.endDate).toISOString().slice(0, 16) : '',
    autoUnpublishAt: data.test.autoUnpublishAt ? new Date(data.test.autoUnpublishAt).toISOString().slice(0, 16) : '',
    scrambleQuestions: data.test.scrambleQuestions,
    scrambleOptions: data.test.scrambleOptions,
    showResultsImmediately: data.test.showResultsImmediately,
    showCorrectAnswers: data.test.showCorrectAnswers,
    aiOpenEndedGrading: data.test.aiOpenEndedGrading,
    aiPartialCredit: (data.test as any).aiPartialCredit ?? true,
    aiGradingHarshness: (data.test as any).aiGradingHarshness ?? 50,
    maxAttempts: data.test.maxAttempts,
    allowLateSubmission: data.test.allowLateSubmission,
    latePenaltyPercent: data.test.latePenaltyPercent,
    requireFullscreen: data.test.requireFullscreen,
    detectTabSwitch: data.test.detectTabSwitch,
    detectMouseLeave: data.test.detectMouseLeave,
    blockCopyPaste: data.test.blockCopyPaste,
    blockRightClick: data.test.blockRightClick,
    blockKeyboardShortcuts: data.test.blockKeyboardShortcuts,
    maxTabSwitches: data.test.maxTabSwitches,
    maxMouseLeaves: data.test.maxMouseLeaves,
    autoSubmitOnViolation: data.test.autoSubmitOnViolation,
    showViolationWarnings: data.test.showViolationWarnings,
    recordViolations: data.test.recordViolations,
    browserLockdown: data.test.browserLockdown
  });

  // Filter students who don't already have overrides
  const availableStudents = $derived(
    data.students.filter(s => !data.test.studentOverrides.some(o => o.studentId === s.id))
  );

  function resetOverrideForm() {
    selectedStudentId = '';
    extraAttempts = 1;
    extraTimeMinutes = 0;
    extendedDeadline = '';
    overrideNotes = '';
    showAddOverride = false;
  }
</script>

<svelte:head>
  <title>Test Settings - {data.test.title} | Checkmate</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/tests/{data.test.id}" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Test
    </a>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Settings class="w-5 h-5 text-gray-600" />
        </div>
        Test Settings
      </h1>
    </div>
    <p class="text-gray-500 mt-2">{data.test.title}</p>
  </div>

  {#if form?.success}
    <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
      <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <p class="text-green-700">Settings saved successfully!</p>
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if data.publishIntent}
    <div class="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <h3 class="font-semibold text-indigo-900">Review Settings Before Opening</h3>
          <p class="text-indigo-700 text-sm mt-1">
            Please review and configure your test settings below. When you're ready, click the button to make the test available to students.
          </p>
          <form method="POST" action="?/publishTest" use:enhance class="mt-4">
            <button type="submit" class="btn btn-primary">
              <Send class="w-4 h-4" />
              Open for Students
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings Form -->
  <form
    method="POST"
    action="?/updateSettings"
    use:enhance={() => {
      saving = true;
      return async ({ update }) => {
        saving = false;
        await update();
      };
    }}
  >
    <TestSettings bind:settings />

    <!-- Hidden inputs to pass all settings -->
    <input type="hidden" name="timeLimit" value={settings.timeLimit || ''} />
    <input type="hidden" name="startDate" value={settings.startDate} />
    <input type="hidden" name="endDate" value={settings.endDate} />
    <input type="hidden" name="autoUnpublishAt" value={settings.autoUnpublishAt} />
    <input type="hidden" name="scrambleQuestions" value={settings.scrambleQuestions} />
    <input type="hidden" name="scrambleOptions" value={settings.scrambleOptions} />
    <input type="hidden" name="showResultsImmediately" value={settings.showResultsImmediately} />
    <input type="hidden" name="showCorrectAnswers" value={settings.showCorrectAnswers} />
    <input type="hidden" name="aiOpenEndedGrading" value={settings.aiOpenEndedGrading} />
    <input type="hidden" name="aiPartialCredit" value={settings.aiPartialCredit} />
    <input type="hidden" name="aiGradingHarshness" value={settings.aiGradingHarshness} />
    <input type="hidden" name="maxAttempts" value={settings.maxAttempts} />
    <input type="hidden" name="allowLateSubmission" value={settings.allowLateSubmission} />
    <input type="hidden" name="latePenaltyPercent" value={settings.latePenaltyPercent} />
    <input type="hidden" name="requireFullscreen" value={settings.requireFullscreen} />
    <input type="hidden" name="detectTabSwitch" value={settings.detectTabSwitch} />
    <input type="hidden" name="detectMouseLeave" value={settings.detectMouseLeave} />
    <input type="hidden" name="blockCopyPaste" value={settings.blockCopyPaste} />
    <input type="hidden" name="blockRightClick" value={settings.blockRightClick} />
    <input type="hidden" name="blockKeyboardShortcuts" value={settings.blockKeyboardShortcuts} />
    <input type="hidden" name="maxTabSwitches" value={settings.maxTabSwitches} />
    <input type="hidden" name="maxMouseLeaves" value={settings.maxMouseLeaves} />
    <input type="hidden" name="autoSubmitOnViolation" value={settings.autoSubmitOnViolation} />
    <input type="hidden" name="showViolationWarnings" value={settings.showViolationWarnings} />
    <input type="hidden" name="recordViolations" value={settings.recordViolations} />
    <input type="hidden" name="browserLockdown" value={settings.browserLockdown} />

    <div class="mt-6">
      <button type="submit" disabled={saving} class="btn btn-primary">
        {#if saving}
          <Loader2 class="w-4 h-4 animate-spin" />
          Saving...
        {:else}
          <Save class="w-4 h-4" />
          Save Settings
        {/if}
      </button>
    </div>
  </form>

  <!-- Student Overrides Section -->
  <div class="mt-8">
    <div class="card">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <UserPlus class="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Student Accommodations</h2>
            <p class="text-sm text-gray-500">Grant extra time or attempts to specific students</p>
          </div>
        </div>

        {#if availableStudents.length > 0}
          <button
            type="button"
            onclick={() => showAddOverride = true}
            class="btn btn-secondary btn-sm"
          >
            <UserPlus class="w-4 h-4" />
            Add Override
          </button>
        {/if}
      </div>

      <div class="p-4">
        {#if data.test.studentOverrides.length > 0}
          <div class="space-y-3">
            {#each data.test.studentOverrides as override}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-sm">
                    {override.student.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{override.student.name}</p>
                    <p class="text-sm text-gray-500">{override.student.email}</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right text-sm">
                    {#if override.extraAttempts > 0}
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
                        <RefreshCw class="w-3 h-3" />
                        +{override.extraAttempts} attempts
                      </span>
                    {/if}
                    {#if override.extraTimeMinutes > 0}
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 ml-1">
                        <Clock class="w-3 h-3" />
                        +{override.extraTimeMinutes} min
                      </span>
                    {/if}
                  </div>

                  <form method="POST" action="?/removeStudentOverride" use:enhance>
                    <input type="hidden" name="overrideId" value={override.id} />
                    <button type="submit" class="p-2 text-gray-400 hover:text-red-500">
                      <X class="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-gray-500">
            <p>No student overrides configured.</p>
            <p class="text-sm mt-1">Add overrides to grant extra time or attempts to specific students.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Add Override Modal -->
{#if showAddOverride}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Add Student Override</h3>
        <button onclick={resetOverrideForm} class="p-2 hover:bg-gray-100 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form
        method="POST"
        action="?/addStudentOverride"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
            resetOverrideForm();
          };
        }}
        class="p-4 space-y-4"
      >
        <div class="form-group">
          <label class="label">Student</label>
          <select name="studentId" bind:value={selectedStudentId} required class="input">
            <option value="">Select a student...</option>
            {#each availableStudents as student}
              <option value={student.id}>{student.name} ({student.email})</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="label">Extra Attempts</label>
            <input
              type="number"
              name="extraAttempts"
              min="0"
              max="10"
              bind:value={extraAttempts}
              class="input"
            />
          </div>

          <div class="form-group">
            <label class="label">Extra Time (minutes)</label>
            <input
              type="number"
              name="extraTimeMinutes"
              min="0"
              max="240"
              bind:value={extraTimeMinutes}
              class="input"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="label">Extended Deadline (Optional)</label>
          <input
            type="datetime-local"
            name="extendedDeadline"
            bind:value={extendedDeadline}
            class="input"
          />
        </div>

        <div class="form-group">
          <label class="label">Notes (Optional)</label>
          <textarea
            name="notes"
            bind:value={overrideNotes}
            rows="2"
            class="input"
            placeholder="e.g., IEP accommodation, medical reason..."
          ></textarea>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="button" onclick={resetOverrideForm} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={!selectedStudentId} class="btn btn-primary flex-1">
            Add Override
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
