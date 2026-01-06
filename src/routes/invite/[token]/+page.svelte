<script lang="ts">
  import { enhance } from '$app/forms';
  import { AlertCircle, CheckCircle } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { ActionData, PageData } from './$types';

  let { form, data }: { form: ActionData; data: PageData } = $props();
  let loading = $state(false);
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
    </div>

    <div class="card p-6">
      {#if data.error}
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle class="w-8 h-8 text-red-600" />
          </div>
          <h1 class="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p class="text-gray-600 mb-6">{data.error}</p>
          <a href="/" class="btn btn-primary">Go to Home</a>
        </div>
      {:else if data.invite}
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle class="w-8 h-8 text-blue-600" />
          </div>
          <h1 class="text-xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p class="text-gray-600">
            You've been invited to join <strong>{data.invite.organizationName}</strong> as a
            <span class="capitalize">{data.invite.role.toLowerCase().replace('_', ' ')}</span>.
          </p>
        </div>

        {#if form?.error}
          <div class="alert alert-error mb-6">
            {form.error}
          </div>
        {/if}

        {#if data.isLoggedIn}
          <!-- User is already logged in -->
          <p class="text-sm text-gray-600 mb-4 text-center">
            Signed in as <strong>{data.userEmail}</strong>
          </p>
          <form method="POST" action="?/accept" use:enhance>
            <button type="submit" class="btn btn-primary w-full">
              Accept Invitation
            </button>
          </form>
        {:else}
          <!-- User needs to create account -->
          <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600">
              Creating account for: <strong>{data.invite.email}</strong>
            </p>
          </div>

          <form
            method="POST"
            action="?/register"
            use:enhance={() => {
              loading = true;
              return async ({ update }) => {
                loading = false;
                await update();
              };
            }}
          >
            <div class="form-group">
              <label for="name" class="label">Your Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                class="input"
                placeholder="John Smith"
              />
            </div>

            <div class="form-group">
              <label for="password" class="label">Create Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minlength="8"
                class="input"
                placeholder="••••••••"
              />
              <p class="form-hint">At least 8 characters</p>
            </div>

            <button type="submit" disabled={loading} class="btn btn-primary w-full">
              {#if loading}
                <span class="spinner"></span>
                Creating account...
              {:else}
                Create Account & Join
              {/if}
            </button>
          </form>

          <p class="text-center text-sm text-gray-600 mt-4">
            Already have an account?
            <a href="/login" class="text-blue-600 hover:underline">Sign in</a>
          </p>
        {/if}
      {/if}
    </div>
  </div>
</div>
