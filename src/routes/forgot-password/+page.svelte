<script lang="ts">
  import { enhance } from '$app/forms';
  import { Mail, ArrowLeft, CheckCircle } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-4">
        <ChessKing class="w-8 h-8 text-white" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>
      <p class="text-gray-500 mt-2">Enter your email to receive a reset link</p>
    </div>

    <div class="card p-6">
      {#if form?.success}
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle class="w-8 h-8 text-green-600" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h2>
          <p class="text-gray-500 mb-6">
            If an account exists with that email, we've sent you a password reset link.
          </p>
          <a href="/login" class="btn btn-primary w-full">
            Return to Login
          </a>
        </div>
      {:else}
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
            <label for="email" class="label">Email Address</label>
            <div class="relative">
              <Mail class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                id="email"
                name="email"
                value={form?.email || ''}
                required
                class="input pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} class="btn btn-primary w-full">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="/login" class="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            <ArrowLeft class="w-4 h-4" />
            Back to Login
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>
