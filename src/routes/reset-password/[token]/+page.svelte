<script lang="ts">
  import { enhance } from '$app/forms';
  import { Lock, Eye, EyeOff } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let loading = $state(false);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-4">
        <ChessKing class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Set New Password</h1>
      <p class="text-gray-500 mt-2">for {data.email}</p>
    </div>

    <div class="card p-6">
      <form method="POST" use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}>
        {#if form?.error}
          <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
            {form.error}
          </div>
        {/if}

        <div class="mb-4">
          <label for="password" class="label">New Password</label>
          <div class="relative">
            <Lock class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              required
              minlength="8"
              class="input pl-10 pr-10"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {#if showPassword}
                <EyeOff class="w-5 h-5" />
              {:else}
                <Eye class="w-5 h-5" />
              {/if}
            </button>
          </div>
        </div>

        <div class="mb-6">
          <label for="confirmPassword" class="label">Confirm Password</label>
          <div class="relative">
            <Lock class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              required
              class="input pl-10 pr-10"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onclick={() => (showConfirmPassword = !showConfirmPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {#if showConfirmPassword}
                <EyeOff class="w-5 h-5" />
              {:else}
                <Eye class="w-5 h-5" />
              {/if}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} class="btn btn-primary w-full">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  </div>
</div>
