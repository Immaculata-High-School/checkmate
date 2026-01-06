<script lang="ts">
  import { navigating } from '$app/stores';
  import { Loader2 } from 'lucide-svelte';
</script>

{#if $navigating}
  <div class="loading-overlay">
    <div class="loading-bar"></div>
    <div class="loading-spinner">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
  }

  .loading-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4f46e5, #7c3aed, #4f46e5);
    background-size: 200% 100%;
    animation: loading-bar 1s ease-in-out infinite;
  }

  .loading-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }

  @keyframes loading-bar {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
