<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, User, Mail, Lock } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { ActionData, PageData } from './$types';

  let { form, data }: { form: ActionData; data: PageData } = $props();
  let loading = $state(false);
  let step = $state<'code' | 'auth'>(form?.step === 'register' || form?.step === 'login' ? 'auth' : 'code');
  let isNewUser = $state(true);
  let classCode = $state<string>(data.code || (form && 'classCode' in form ? form.classCode as string : '') || '');
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
      <h1 class="text-2xl font-bold text-gray-900">Join a Class</h1>
      <p class="text-gray-600 mt-2">Enter the class code from your teacher</p>
    </div>

    <div class="card p-6">
      {#if form?.error}
        <div class="alert alert-error mb-6">
          {form.error}
        </div>
      {/if}

      {#if step === 'code'}
        <form
          method="POST"
          use:enhance={({ formData }) => {
            loading = true;
            // Don't include auth fields when just checking code
            return async ({ result, update }) => {
              loading = false;
              if (result.type === 'failure' && result.data?.step === 'code') {
                await update();
              } else if (result.type === 'failure') {
                step = 'auth';
                await update();
              } else {
                await update();
              }
            };
          }}
        >
          <div class="form-group">
            <label for="classCode" class="label">Class Code</label>
            <input
              id="classCode"
              name="classCode"
              type="text"
              required
              maxlength="6"
              bind:value={classCode}
              class="input text-center text-2xl tracking-widest uppercase font-mono"
              placeholder="ABC123"
              style="letter-spacing: 0.5em;"
            />
            <p class="form-hint">Enter the 6-character code your teacher gave you</p>
          </div>

          <input type="hidden" name="isNewUser" value="true" />

          <button type="submit" disabled={loading || classCode.length < 6} class="btn btn-primary w-full">
            {#if loading}
              <span class="spinner"></span>
              Checking...
            {:else}
              Continue
            {/if}
          </button>
        </form>
      {:else}
        <!-- Auth step -->
        <div class="mb-6">
          <button onclick={() => { step = 'code'; }} class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ArrowLeft class="w-4 h-4" />
            Change class code
          </button>
          {#if form && 'className' in form && form.className}
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-800">
                Joining: <strong>{form.className}</strong>
              </p>
            </div>
          {/if}
        </div>

        <!-- Tabs -->
        <div class="tabs mb-6">
          <button
            type="button"
            class="tab {isNewUser ? 'tab-active' : ''}"
            onclick={() => (isNewUser = true)}
          >
            Create Account
          </button>
          <button
            type="button"
            class="tab {!isNewUser ? 'tab-active' : ''}"
            onclick={() => (isNewUser = false)}
          >
            Sign In
          </button>
        </div>

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
          <input type="hidden" name="classCode" value={classCode} />
          <input type="hidden" name="isNewUser" value={isNewUser.toString()} />

          {#if isNewUser}
            <div class="form-group">
              <label for="name" class="label">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                class="input"
                placeholder="Your name"
              />
            </div>
          {/if}

          <div class="form-group">
            <label for="email" class="label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              class="input"
              placeholder="you@example.com"
            />
          </div>

          <div class="form-group">
            <label for="password" class="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minlength={isNewUser ? 8 : undefined}
              class="input"
              placeholder="••••••••"
            />
            {#if isNewUser}
              <p class="form-hint">At least 8 characters</p>
            {/if}
          </div>

          <button type="submit" disabled={loading} class="btn btn-primary w-full">
            {#if loading}
              <span class="spinner"></span>
              {isNewUser ? 'Creating account...' : 'Signing in...'}
            {:else}
              {isNewUser ? 'Create Account & Join' : 'Sign In & Join'}
            {/if}
          </button>
        </form>
      {/if}

      <p class="text-center text-sm text-gray-600 mt-6">
        Need to request school access?
        <a href="/register" class="text-blue-600 hover:underline">Request here</a>
      </p>
    </div>
  </div>
</div>
