<script lang="ts">
  import { enhance } from '$app/forms';
  import { Settings, User, Lock, CheckCircle, AlertCircle } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let name = $state(data.user?.name || '');
</script>

<div class="max-w-2xl mx-auto">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Settings class="w-5 h-5 text-gray-600" />
      </div>
      Settings
    </h1>
  </div>

  <!-- Profile Settings -->
  <div class="card p-6 mb-6">
    <div class="flex items-center gap-3 mb-6">
      <User class="w-5 h-5 text-gray-400" />
      <h2 class="text-lg font-semibold text-gray-900">Profile</h2>
    </div>

    {#if form?.success}
      <div class="alert alert-success mb-4 flex items-center gap-2">
        <CheckCircle class="w-4 h-4" />
        {form.message}
      </div>
    {/if}

    {#if form?.error}
      <div class="alert alert-error mb-4 flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        {form.error}
      </div>
    {/if}

    <form method="POST" action="?/updateProfile" use:enhance class="space-y-4">
      <div class="form-group">
        <label for="name" class="label">Name</label>
        <input id="name" name="name" type="text" bind:value={name} class="input" required />
      </div>

      <div class="form-group">
        <label class="label">Email</label>
        <input type="email" value={data.user?.email} class="input bg-gray-50" disabled />
        <p class="form-hint">Email cannot be changed</p>
      </div>

      <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  </div>

  <!-- Password Settings -->
  <div class="card p-6">
    <div class="flex items-center gap-3 mb-6">
      <Lock class="w-5 h-5 text-gray-400" />
      <h2 class="text-lg font-semibold text-gray-900">Change Password</h2>
    </div>

    {#if form?.passwordSuccess}
      <div class="alert alert-success mb-4 flex items-center gap-2">
        <CheckCircle class="w-4 h-4" />
        {form.message}
      </div>
    {/if}

    {#if form?.passwordError}
      <div class="alert alert-error mb-4 flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        {form.passwordError}
      </div>
    {/if}

    <form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
      <div class="form-group">
        <label for="currentPassword" class="label">Current Password</label>
        <input id="currentPassword" name="currentPassword" type="password" class="input" required />
      </div>

      <div class="form-group">
        <label for="newPassword" class="label">New Password</label>
        <input id="newPassword" name="newPassword" type="password" class="input" required minlength="8" />
      </div>

      <div class="form-group">
        <label for="confirmPassword" class="label">Confirm New Password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" class="input" required minlength="8" />
      </div>

      <button type="submit" class="btn btn-primary">Update Password</button>
    </form>
  </div>
</div>
