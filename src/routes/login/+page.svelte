<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { Mail, Lock, CheckCircle } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);

  const resetSuccess = $derived($page.url.searchParams.get('reset') === 'success');
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4">
  <div class="max-w-md mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <a href="/" class="inline-flex items-center gap-2 mb-6">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <ChessKing class="w-5 h-5 text-white" />
        </div>
        <span class="text-xl font-bold text-gray-900">Checkmate</span>
      </a>
      <h1 class="text-2xl font-bold text-gray-900">Sign in to your account</h1>
    </div>

    <div class="card p-6">
      {#if resetSuccess}
        <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-6 flex items-center gap-2">
          <CheckCircle class="w-5 h-5" />
          Password reset successfully! Please sign in with your new password.
        </div>
      {/if}

      {#if form?.error}
        <div class="alert alert-error mb-6">
          {form.error}
        </div>
      {/if}

      <form
        method="POST"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
      >
        <div class="form-group">
          <label for="email" class="label">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autocomplete="email"
            value={form?.email ?? ''}
            class="input"
            placeholder="you@example.com"
          />
        </div>

        <div class="form-group">
          <div class="flex items-center justify-between">
            <label for="password" class="label">Password</label>
            <a href="/forgot-password" class="text-sm text-blue-600 hover:underline">Forgot password?</a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
            class="input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading} class="btn btn-primary w-full">
          {#if loading}
            <span class="spinner"></span>
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-gray-600">
        <p class="mb-2">
          Student? <a href="/join" class="text-blue-600 hover:underline">Join a class with a code</a>
        </p>
        <p>
          School admin? <a href="/register" class="text-blue-600 hover:underline">Request access</a>
        </p>
      </div>
    </div>
  </div>
</div>
