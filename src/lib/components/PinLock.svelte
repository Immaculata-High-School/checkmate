<script lang="ts">
  import { browser } from '$app/environment';
  import { Lock, ShieldCheck } from 'lucide-svelte';

  const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  let locked = $state(false);
  let pin = $state('');
  let error = $state('');
  let verifying = $state(false);
  let lockTimer: ReturnType<typeof setTimeout> | null = null;

  function resetTimer() {
    if (lockTimer) clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      locked = true;
      pin = '';
      error = '';
    }, LOCK_TIMEOUT_MS);
  }

  function handleActivity() {
    if (!locked) {
      resetTimer();
    }
  }

  $effect(() => {
    if (browser) {
      resetTimer();

      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      for (const event of events) {
        window.addEventListener(event, handleActivity, { passive: true });
      }

      return () => {
        if (lockTimer) clearTimeout(lockTimer);
        for (const event of events) {
          window.removeEventListener(event, handleActivity);
        }
      };
    }
  });

  function handleDigit(digit: string) {
    if (pin.length < 6) {
      pin += digit;
      error = '';
    }
    if (pin.length === 6) {
      verifyPin();
    }
  }

  function handleBackspace() {
    pin = pin.slice(0, -1);
    error = '';
  }

  async function verifyPin() {
    verifying = true;
    error = '';

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        locked = false;
        pin = '';
        resetTimer();
      } else {
        error = 'Incorrect PIN';
        pin = '';
      }
    } catch {
      error = 'Failed to verify PIN';
      pin = '';
    } finally {
      verifying = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!locked) return;
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    }
  }
</script>

{#if locked}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center"
    onkeydown={handleKeydown}
  >
    <div class="w-full max-w-sm mx-4">
      <!-- Lock Icon -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Lock class="w-10 h-10 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-white">Dashboard Locked</h2>
        <p class="text-slate-400 mt-2 text-sm">Enter your 6-digit PIN to unlock</p>
      </div>

      <!-- PIN Dots -->
      <div class="flex justify-center gap-3 mb-8">
        {#each Array(6) as _, i}
          <div
            class="w-4 h-4 rounded-full transition-all duration-200 {i < pin.length
              ? 'bg-white scale-110'
              : 'bg-white/20'}"
          ></div>
        {/each}
      </div>

      <!-- Error Message -->
      {#if error}
        <p class="text-red-400 text-center text-sm mb-4">{error}</p>
      {/if}

      <!-- Number Pad -->
      <div class="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
        {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
          <button
            type="button"
            onclick={() => handleDigit(digit)}
            disabled={verifying}
            class="w-full aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-all duration-150 backdrop-blur-sm disabled:opacity-50"
          >
            {digit}
          </button>
        {/each}
        <div></div>
        <button
          type="button"
          onclick={() => handleDigit('0')}
          disabled={verifying}
          class="w-full aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-all duration-150 backdrop-blur-sm disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onclick={handleBackspace}
          disabled={verifying}
          class="w-full aspect-square rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-lg font-medium transition-all duration-150 backdrop-blur-sm disabled:opacity-50 flex items-center justify-center"
        >
          ←
        </button>
      </div>

      {#if verifying}
        <div class="flex items-center justify-center gap-2 mt-6 text-slate-400 text-sm">
          <ShieldCheck class="w-4 h-4 animate-pulse" />
          Verifying...
        </div>
      {/if}
    </div>
  </div>
{/if}
