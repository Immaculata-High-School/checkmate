<script lang="ts">
  import { browser } from '$app/environment';
  import { beforeNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { AlertTriangle, Maximize2, Shield, X, Mouse, Monitor, Copy, Keyboard } from 'lucide-svelte';
  import type { LayoutData } from './$types';

  let { children, data }: { children: any; data: LayoutData } = $props();

  // Security settings from server
  const security = $derived(data.testSecurity);

  let isFullscreen = $state(false);
  let showExitWarning = $state(false);
  let testStarted = $state(false);

  // Violation tracking
  let tabSwitchCount = $state(0);
  let mouseLeaveCount = $state(0);
  let copyPasteAttempts = $state(0);
  let rightClickAttempts = $state(0);

  // Warning modals
  let showTabWarning = $state(false);
  let showMouseLeaveWarning = $state(false);
  let showCopyPasteWarning = $state(false);
  let autoSubmitting = $state(false);

  // Check if we're on the results page
  const isResultsPage = $derived($page.url.pathname.includes('/results'));

  // Record violation to server
  async function recordViolation(type: string) {
    if (!security.recordViolations) return;

    try {
      const formData = new FormData();
      formData.append('type', type);

      await fetch(`?/recordViolation`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.error('Failed to record violation:', e);
    }
  }

  // Check if should auto-submit
  function checkAutoSubmit() {
    if (!security.autoSubmitOnViolation) return;

    const tabLimit = security.maxTabSwitches > 0 && tabSwitchCount >= security.maxTabSwitches;
    const mouseLimit = security.maxMouseLeaves > 0 && mouseLeaveCount >= security.maxMouseLeaves;

    if (tabLimit || mouseLimit) {
      autoSubmit();
    }
  }

  async function autoSubmit() {
    autoSubmitting = true;
    // Trigger form submission
    const form = document.getElementById('submit-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    } else {
      // Fallback: navigate to submit
      await goto(`/student/assignments/${security.id}/results`);
    }
  }

  // Track fullscreen state
  $effect(() => {
    if (!browser || isResultsPage) return;

    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      isFullscreen = !!document.fullscreenElement;

      if (wasFullscreen && !isFullscreen && testStarted && security.requireFullscreen) {
        recordViolation('fullscreenExit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  });

  // Prevent right-click
  $effect(() => {
    if (!browser || isResultsPage || !testStarted || !security.blockRightClick) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      rightClickAttempts++;
      recordViolation('rightClick');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  });

  // Detect tab switching (disabled on results page)
  $effect(() => {
    if (!browser || !testStarted || !security.detectTabSwitch || isResultsPage) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount++;
        recordViolation('tabSwitch');

        if (security.showViolationWarnings) {
          showTabWarning = true;
        }

        checkAutoSubmit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // Detect mouse leaving window (disabled on results page)
  $effect(() => {
    if (!browser || !testStarted || !security.detectMouseLeave || isResultsPage) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only count if mouse actually left the window
      if (e.clientY <= 0 || e.clientX <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        mouseLeaveCount++;
        recordViolation('mouseLeave');

        if (security.showViolationWarnings) {
          showMouseLeaveWarning = true;
        }

        checkAutoSubmit();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  });

  // Block copy/paste
  $effect(() => {
    if (!browser || isResultsPage || !testStarted || !security.blockCopyPaste) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteAttempts++;
      recordViolation('copyPaste');

      if (security.showViolationWarnings) {
        showCopyPasteWarning = true;
        setTimeout(() => showCopyPasteWarning = false, 2000);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteAttempts++;
      recordViolation('copyPaste');

      if (security.showViolationWarnings) {
        showCopyPasteWarning = true;
        setTimeout(() => showCopyPasteWarning = false, 2000);
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCopy);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCopy);
    };
  });

  // Block keyboard shortcuts
  $effect(() => {
    if (!browser || isResultsPage || !testStarted || !security.blockKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'p', 'f', 'u', 's', 'a'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      // Block F keys
      if (['F1', 'F3', 'F5', 'F12'].includes(e.key)) {
        e.preventDefault();
      }
      // Block Alt+Tab (partial - browser dependent)
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Warn before leaving (allow navigation from results page)
  beforeNavigate(({ cancel, to }) => {
    if (to?.url.pathname.includes('/results') || isResultsPage) return;

    if (testStarted && !showExitWarning && !autoSubmitting) {
      cancel();
      showExitWarning = true;
    }
  });

  // Browser beforeunload warning (disabled on results page)
  $effect(() => {
    if (!browser || !testStarted || isResultsPage) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  async function enterFullscreen() {
    if (!browser) return;
    try {
      await document.documentElement.requestFullscreen();
      isFullscreen = true;
    } catch {
      // Fullscreen not supported or denied
    }
  }

  function startTest() {
    if (security.requireFullscreen) {
      enterFullscreen();
    }
    testStarted = true;
  }

  function exitTest() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    window.location.href = '/student/assignments';
  }

  // Build dynamic rules list based on settings
  const securityRules = $derived(() => {
    const rules = [];
    if (security.requireFullscreen) {
      rules.push({ icon: Maximize2, text: 'The test will open in fullscreen mode for focused testing' });
    }
    if (security.detectTabSwitch) {
      rules.push({ icon: Monitor, text: `Tab switching will be monitored${security.maxTabSwitches > 0 ? ` (max ${security.maxTabSwitches} allowed)` : ''}` });
    }
    if (security.detectMouseLeave) {
      rules.push({ icon: Mouse, text: `Mouse leaving the window will be tracked${security.maxMouseLeaves > 0 ? ` (max ${security.maxMouseLeaves} allowed)` : ''}` });
    }
    if (security.blockCopyPaste) {
      rules.push({ icon: Copy, text: 'Copy/paste is disabled during the test' });
    }
    if (security.blockKeyboardShortcuts) {
      rules.push({ icon: Keyboard, text: 'Keyboard shortcuts are disabled' });
    }
    rules.push({ icon: Shield, text: 'Your answers are saved automatically' });
    return rules;
  });
</script>

{#if isResultsPage}
  <!-- Results Page - Normal layout without lockdown -->
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
    {@render children()}
  </div>
{:else if !testStarted}
  <!-- Pre-test Screen -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full p-8">
      <div class="text-center mb-6">
        <div class="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
          <Shield class="w-7 h-7 text-indigo-600" />
        </div>
        <h1 class="text-xl font-bold text-gray-900">{security.title}</h1>
        <p class="text-gray-500 text-sm mt-1">Secure test mode</p>
      </div>

      {#if security.autoSubmitOnViolation}
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-700">
              Your test will be automatically submitted if you leave the test window too many times.
            </p>
          </div>
        </div>
      {:else}
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-amber-700">
              Make sure you have a stable internet connection before starting.
            </p>
          </div>
        </div>
      {/if}

      <div class="flex gap-3">
        <a href="/student/assignments" class="btn btn-secondary flex-1">
          Cancel
        </a>
        <button onclick={startTest} class="btn btn-primary flex-1">
          Start Test
        </button>
      </div>
    </div>
  </div>
{:else}
  <!-- Test Content - Secure mode -->
  <div class="min-h-screen bg-gray-50 {security.blockCopyPaste ? 'select-none' : ''}">
    <!-- Security Header -->
    {#if security.requireFullscreen && !isFullscreen}
      <div class="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
        <button onclick={enterFullscreen} class="flex items-center justify-center gap-2 w-full">
          <Maximize2 class="w-4 h-4" />
          Click to return to fullscreen mode
        </button>
      </div>
    {/if}

    <!-- Violation Counter Bar (if violations occurred) -->
    {#if (tabSwitchCount > 0 || mouseLeaveCount > 0) && security.showViolationWarnings}
      <div class="bg-red-100 border-b border-red-200 text-red-800 text-center py-1 px-4 text-xs font-medium flex items-center justify-center gap-4">
        {#if tabSwitchCount > 0}
          <span>Tab Switches: {tabSwitchCount}{security.maxTabSwitches > 0 ? `/${security.maxTabSwitches}` : ''}</span>
        {/if}
        {#if mouseLeaveCount > 0}
          <span>Mouse Leaves: {mouseLeaveCount}{security.maxMouseLeaves > 0 ? `/${security.maxMouseLeaves}` : ''}</span>
        {/if}
      </div>
    {/if}

    {@render children()}
  </div>
{/if}

<!-- Copy/Paste Warning Toast -->
{#if showCopyPasteWarning}
  <div class="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-[100] animate-pulse">
    <div class="flex items-center gap-2">
      <Copy class="w-4 h-4" />
      <span class="text-sm font-medium">Copy/Paste is disabled!</span>
    </div>
  </div>
{/if}

<!-- Tab Switch Warning Modal -->
{#if showTabWarning}
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
      <div class="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
        <AlertTriangle class="w-12 h-12 mx-auto mb-3" />
        <h2 class="text-xl font-bold">Tab Switch Detected</h2>
      </div>
      <div class="p-6">
        <p class="text-gray-600 text-center mb-4">
          You switched away from the test. This has been recorded and reported to your teacher.
        </p>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6">
          <p class="text-sm text-red-800">
            Tab switches: <span class="font-bold">{tabSwitchCount}</span>
            {#if security.maxTabSwitches > 0}
              <span class="text-red-600"> / {security.maxTabSwitches} allowed</span>
            {/if}
          </p>
          {#if security.autoSubmitOnViolation && security.maxTabSwitches > 0}
            <p class="text-xs text-red-600 mt-1">
              Your test will be auto-submitted at {security.maxTabSwitches} violations
            </p>
          {/if}
        </div>
        <button onclick={() => { showTabWarning = false; if (security.requireFullscreen) enterFullscreen(); }} class="btn btn-primary w-full">
          Return to Test
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Mouse Leave Warning Modal -->
{#if showMouseLeaveWarning}
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
      <div class="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white text-center">
        <Mouse class="w-12 h-12 mx-auto mb-3" />
        <h2 class="text-xl font-bold">Mouse Left Window</h2>
      </div>
      <div class="p-6">
        <p class="text-gray-600 text-center mb-4">
          Your mouse left the test window. This activity has been recorded.
        </p>
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center mb-6">
          <p class="text-sm text-orange-800">
            Mouse leaves: <span class="font-bold">{mouseLeaveCount}</span>
            {#if security.maxMouseLeaves > 0}
              <span class="text-orange-600"> / {security.maxMouseLeaves} allowed</span>
            {/if}
          </p>
        </div>
        <button onclick={() => { showMouseLeaveWarning = false; }} class="btn btn-primary w-full">
          Continue Test
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Exit Warning Modal -->
{#if showExitWarning}
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
      <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
        <AlertTriangle class="w-12 h-12 mx-auto mb-3" />
        <h2 class="text-xl font-bold">Leave Test?</h2>
      </div>
      <div class="p-6">
        <p class="text-gray-600 text-center mb-6">
          Are you sure you want to leave? Your progress has been saved, but you'll need to continue from where you left off.
        </p>
        <div class="flex gap-3">
          <button onclick={() => (showExitWarning = false)} class="btn btn-secondary flex-1">
            Continue Test
          </button>
          <button onclick={exitTest} class="btn btn-danger flex-1">
            Leave Test
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Auto-Submit Overlay -->
{#if autoSubmitting}
  <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[200]">
    <div class="text-center text-white">
      <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h2 class="text-2xl font-bold mb-2">Auto-Submitting Test</h2>
      <p class="text-gray-300">Maximum violations reached. Your test is being submitted...</p>
    </div>
  </div>
{/if}
