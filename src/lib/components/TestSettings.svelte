<script lang="ts">
  import {
    Shield,
    Clock,
    Eye,
    RefreshCw,
    AlertTriangle,
    Monitor,
    Mouse,
    Keyboard,
    Copy,
    Maximize,
    ChevronDown,
    ChevronUp,
    Lock,
    Users
  } from 'lucide-svelte';

  interface TestSettings {
    // Time & Availability
    timeLimit: number | null;
    startDate: string;
    endDate: string;
    autoUnpublishAt: string;

    // Display
    scrambleQuestions: boolean;
    scrambleOptions: boolean;
    showResultsImmediately: boolean;
    showCorrectAnswers: boolean;

    // AI Grading
    aiOpenEndedGrading: boolean;
    aiPartialCredit: boolean;
    aiGradingHarshness: number;

    // Retakes
    maxAttempts: number;
    allowLateSubmission: boolean;
    latePenaltyPercent: number;

    // Security
    requireFullscreen: boolean;
    detectTabSwitch: boolean;
    detectMouseLeave: boolean;
    blockCopyPaste: boolean;
    blockRightClick: boolean;
    blockKeyboardShortcuts: boolean;
    maxTabSwitches: number;
    maxMouseLeaves: number;
    autoSubmitOnViolation: boolean;
    showViolationWarnings: boolean;
    recordViolations: boolean;
    browserLockdown: boolean;
  }

  let {
    settings = $bindable<TestSettings>(),
    compact = false
  }: {
    settings: TestSettings;
    compact?: boolean;
  } = $props();

  let expandedSections = $state({
    availability: true,
    display: false,
    aiGrading: true,
    retakes: false,
    security: true
  });

  function toggleSection(section: keyof typeof expandedSections) {
    expandedSections[section] = !expandedSections[section];
  }

  function getHarshnessLabel(value: number): string {
    if (value <= 20) return 'Very Lenient';
    if (value <= 40) return 'Lenient';
    if (value <= 60) return 'Balanced';
    if (value <= 80) return 'Strict';
    return 'Very Strict';
  }

  function getHarshnessColor(value: number): string {
    if (value <= 20) return 'text-green-600';
    if (value <= 40) return 'text-lime-600';
    if (value <= 60) return 'text-amber-600';
    if (value <= 80) return 'text-orange-600';
    return 'text-red-600';
  }

  function enableLockdown() {
    settings.requireFullscreen = true;
    settings.detectTabSwitch = true;
    settings.detectMouseLeave = true;
    settings.blockCopyPaste = true;
    settings.blockRightClick = true;
    settings.blockKeyboardShortcuts = true;
    settings.autoSubmitOnViolation = true;
    settings.browserLockdown = true;
  }

  function disableLockdown() {
    settings.requireFullscreen = false;
    settings.detectTabSwitch = false;
    settings.detectMouseLeave = false;
    settings.blockCopyPaste = false;
    settings.blockRightClick = false;
    settings.blockKeyboardShortcuts = false;
    settings.autoSubmitOnViolation = false;
    settings.browserLockdown = false;
  }
</script>

<div class="space-y-4">
  <!-- Time & Availability Section -->
  <div class="card overflow-hidden">
    <button
      type="button"
      onclick={() => toggleSection('availability')}
      class="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Clock class="w-4 h-4 text-blue-600" />
        </div>
        <span class="font-medium text-gray-900">Time & Availability</span>
      </div>
      {#if expandedSections.availability}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </button>

    {#if expandedSections.availability}
      <div class="p-4 border-t border-gray-100 space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="label">Time Limit (minutes)</label>
            <input
              type="number"
              min="0"
              max="480"
              bind:value={settings.timeLimit}
              class="input"
              placeholder="No limit"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for no time limit</p>
          </div>

          <div class="form-group">
            <label class="label">Auto-Unpublish At</label>
            <input
              type="datetime-local"
              bind:value={settings.autoUnpublishAt}
              class="input"
            />
            <p class="text-xs text-gray-500 mt-1">Test will be automatically unpublished</p>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="label">Available From</label>
            <input
              type="datetime-local"
              bind:value={settings.startDate}
              class="input"
            />
          </div>

          <div class="form-group">
            <label class="label">Available Until</label>
            <input
              type="datetime-local"
              bind:value={settings.endDate}
              class="input"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Display Options Section -->
  <div class="card overflow-hidden">
    <button
      type="button"
      onclick={() => toggleSection('display')}
      class="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Eye class="w-4 h-4 text-purple-600" />
        </div>
        <span class="font-medium text-gray-900">Display Options</span>
      </div>
      {#if expandedSections.display}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </button>

    {#if expandedSections.display}
      <div class="p-4 border-t border-gray-100 space-y-3">
        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" bind:checked={settings.scrambleQuestions} class="w-4 h-4 rounded" />
          <div>
            <span class="font-medium text-gray-900">Scramble Questions</span>
            <p class="text-sm text-gray-500">Randomize question order for each student</p>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" bind:checked={settings.scrambleOptions} class="w-4 h-4 rounded" />
          <div>
            <span class="font-medium text-gray-900">Scramble Answer Options</span>
            <p class="text-sm text-gray-500">Randomize multiple choice options</p>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" bind:checked={settings.showResultsImmediately} class="w-4 h-4 rounded" />
          <div>
            <span class="font-medium text-gray-900">Show Results Immediately</span>
            <p class="text-sm text-gray-500">Students see their score right after submitting</p>
          </div>
        </label>

        {#if settings.showResultsImmediately}
          <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer ml-7">
            <input type="checkbox" bind:checked={settings.showCorrectAnswers} class="w-4 h-4 rounded" />
            <div>
              <span class="font-medium text-gray-900">Show Correct Answers</span>
              <p class="text-sm text-gray-500">Display correct answers on the results page</p>
            </div>
          </label>

          {#if settings.showCorrectAnswers && settings.maxAttempts !== 1}
            <div class="ml-7 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-sm text-amber-800">
                <p class="font-medium">Warning: Retakes Enabled</p>
                <p class="mt-1">Students will see correct answers after their first attempt, which may affect retake scores. Consider disabling "Show Correct Answers" if you want fair retakes.</p>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>

  <!-- AI Grading Section -->
  <div class="card overflow-hidden border-2 {settings.aiOpenEndedGrading ? 'border-indigo-200' : 'border-gray-200'}">
    <button
      type="button"
      onclick={() => toggleSection('aiGrading')}
      class="w-full p-4 flex items-center justify-between {settings.aiOpenEndedGrading ? 'bg-indigo-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg {settings.aiOpenEndedGrading ? 'bg-indigo-100' : 'bg-gray-100'} flex items-center justify-center">
          <svg class="w-4 h-4 {settings.aiOpenEndedGrading ? 'text-indigo-600' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div class="text-left">
          <span class="font-medium text-gray-900">AI Grading</span>
          {#if settings.aiOpenEndedGrading}
            <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
              ENABLED
            </span>
          {/if}
        </div>
      </div>
      {#if expandedSections.aiGrading}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </button>

    {#if expandedSections.aiGrading}
      <div class="p-4 border-t border-gray-100 space-y-4">
        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" bind:checked={settings.aiOpenEndedGrading} class="w-4 h-4 rounded" />
          <div>
            <span class="font-medium text-gray-900">AI Open-Ended Grading</span>
            <p class="text-sm text-gray-500">Automatically grade short answer, long answer, and essay questions using AI when students submit</p>
          </div>
        </label>

        {#if settings.aiOpenEndedGrading}
          <!-- Partial Credit Toggle -->
          <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
            <input type="checkbox" bind:checked={settings.aiPartialCredit} class="w-4 h-4 rounded" />
            <div class="flex-1">
              <span class="font-medium text-gray-900">Allow Partial Credit</span>
              <p class="text-sm text-gray-500">AI can award partial points for partially correct answers</p>
            </div>
            {#if settings.aiPartialCredit}
              <span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">ON</span>
            {:else}
              <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">OFF</span>
            {/if}
          </label>

          <!-- Grading Harshness Slider -->
          <div class="p-4 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-3">
              <span class="font-medium text-gray-900">Grading Strictness</span>
              <span class="px-3 py-1 text-sm font-medium rounded-full {getHarshnessColor(settings.aiGradingHarshness)} bg-gray-100">
                {getHarshnessLabel(settings.aiGradingHarshness)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              bind:value={settings.aiGradingHarshness}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div class="flex justify-between mt-2 text-xs text-gray-500">
              <span>Lenient</span>
              <span>Balanced</span>
              <span>Strict</span>
            </div>
            <p class="text-xs text-gray-500 mt-3">
              {#if settings.aiGradingHarshness <= 30}
                AI will be generous with partial credit and accept answers that demonstrate understanding.
              {:else if settings.aiGradingHarshness <= 70}
                AI will give fair partial credit and expect reasonably accurate answers.
              {:else}
                AI will require precise answers and be strict with partial credit.
              {/if}
            </p>
          </div>

          <div class="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-sm text-indigo-800">
                <p class="font-medium mb-1">How AI Grading Works</p>
                <ul class="space-y-1 text-indigo-700">
                  <li>• Multiple choice and true/false questions are graded instantly</li>
                  <li>• Short answer, long answer, and essay questions are graded by AI</li>
                  <li>• AI provides detailed feedback for each question</li>
                  <li>• You can review and adjust AI grades at any time</li>
                </ul>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Retakes Section -->
  <div class="card overflow-hidden">
    <button
      type="button"
      onclick={() => toggleSection('retakes')}
      class="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <RefreshCw class="w-4 h-4 text-green-600" />
        </div>
        <span class="font-medium text-gray-900">Retakes & Late Submissions</span>
      </div>
      {#if expandedSections.retakes}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </button>

    {#if expandedSections.retakes}
      <div class="p-4 border-t border-gray-100 space-y-4">
        <div class="form-group">
          <label class="label">Maximum Attempts</label>
          <select bind:value={settings.maxAttempts} class="input">
            <option value={1}>1 attempt (no retakes)</option>
            <option value={2}>2 attempts</option>
            <option value={3}>3 attempts</option>
            <option value={5}>5 attempts</option>
            <option value={0}>Unlimited attempts</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">You can grant extra attempts to specific students</p>
        </div>

        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" bind:checked={settings.allowLateSubmission} class="w-4 h-4 rounded" />
          <div>
            <span class="font-medium text-gray-900">Allow Late Submissions</span>
            <p class="text-sm text-gray-500">Students can submit after the deadline</p>
          </div>
        </label>

        {#if settings.allowLateSubmission}
          <div class="form-group ml-7">
            <label class="label">Late Penalty (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              bind:value={settings.latePenaltyPercent}
              class="input w-32"
            />
            <p class="text-xs text-gray-500 mt-1">Percentage deducted from late submissions</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Security Section -->
  <div class="card overflow-hidden border-2 {settings.browserLockdown ? 'border-red-200' : 'border-gray-200'}">
    <button
      type="button"
      onclick={() => toggleSection('security')}
      class="w-full p-4 flex items-center justify-between {settings.browserLockdown ? 'bg-red-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg {settings.browserLockdown ? 'bg-red-100' : 'bg-orange-100'} flex items-center justify-center">
          <Shield class="w-4 h-4 {settings.browserLockdown ? 'text-red-600' : 'text-orange-600'}" />
        </div>
        <div class="text-left">
          <span class="font-medium text-gray-900">Security & Anti-Cheating</span>
          {#if settings.browserLockdown}
            <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              LOCKDOWN ENABLED
            </span>
          {/if}
        </div>
      </div>
      {#if expandedSections.security}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </button>

    {#if expandedSections.security}
      <div class="p-4 border-t border-gray-100 space-y-4">
        <!-- Quick Presets -->
        <div class="flex gap-2 mb-4">
          <button
            type="button"
            onclick={enableLockdown}
            class="btn btn-sm {settings.browserLockdown ? 'btn-danger' : 'btn-secondary'}"
          >
            <Lock class="w-4 h-4" />
            Full Lockdown
          </button>
          <button
            type="button"
            onclick={disableLockdown}
            class="btn btn-sm btn-ghost"
          >
            Disable All
          </button>
        </div>

        {#if settings.browserLockdown}
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p class="font-medium">Full Lockdown Mode Enabled</p>
                <p class="mt-1">All security features are enabled. Students will have strict limitations during the test.</p>
              </div>
            </div>
          </div>
        {/if}

        <div class="grid md:grid-cols-2 gap-3">
          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.requireFullscreen} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Maximize class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Require Fullscreen</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Force fullscreen mode during test</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.detectTabSwitch} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Monitor class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Detect Tab Switches</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Track when student leaves test tab</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.detectMouseLeave} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Mouse class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Detect Mouse Leave</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Track when mouse exits browser window</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.blockCopyPaste} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Copy class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Block Copy/Paste</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Disable clipboard operations</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.blockRightClick} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Mouse class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Block Right-Click</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Disable context menu</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" bind:checked={settings.blockKeyboardShortcuts} class="w-4 h-4 rounded mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Keyboard class="w-4 h-4 text-gray-500" />
                <span class="font-medium text-gray-900">Block Shortcuts</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Disable common keyboard shortcuts</p>
            </div>
          </label>
        </div>

        <!-- Violation Limits -->
        <div class="pt-4 border-t border-gray-200">
          <h4 class="font-medium text-gray-900 mb-3">Violation Limits</h4>

          <div class="grid md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="label text-sm">Max Tab Switches</label>
              <input
                type="number"
                min="0"
                max="20"
                bind:value={settings.maxTabSwitches}
                class="input"
              />
              <p class="text-xs text-gray-500 mt-1">0 = unlimited warnings</p>
            </div>

            <div class="form-group">
              <label class="label text-sm">Max Mouse Leaves</label>
              <input
                type="number"
                min="0"
                max="20"
                bind:value={settings.maxMouseLeaves}
                class="input"
              />
              <p class="text-xs text-gray-500 mt-1">0 = unlimited warnings</p>
            </div>
          </div>

          <div class="space-y-3 mt-4">
            <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" bind:checked={settings.autoSubmitOnViolation} class="w-4 h-4 rounded" />
              <div>
                <span class="font-medium text-gray-900">Auto-Submit on Max Violations</span>
                <p class="text-sm text-gray-500">Automatically submit test when limits are reached</p>
              </div>
            </label>

            <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" bind:checked={settings.showViolationWarnings} class="w-4 h-4 rounded" />
              <div>
                <span class="font-medium text-gray-900">Show Warning Modals</span>
                <p class="text-sm text-gray-500">Display alerts when violations occur</p>
              </div>
            </label>

            <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" bind:checked={settings.recordViolations} class="w-4 h-4 rounded" />
              <div>
                <span class="font-medium text-gray-900">Record All Violations</span>
                <p class="text-sm text-gray-500">Save detailed violation log for review</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
