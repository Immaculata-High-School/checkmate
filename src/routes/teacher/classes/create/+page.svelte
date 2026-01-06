<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, Users } from 'lucide-svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<div class="max-w-2xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/classes" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Classes
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Users class="w-5 h-5 text-purple-600" />
      </div>
      Create Class
    </h1>
    <p class="text-gray-600 mt-2">Create a new class for your students to join.</p>
  </div>

  <div class="card p-6">
    {#if form?.error}
      <div class="alert alert-error mb-6">{form.error}</div>
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
      class="space-y-6"
    >
      <div class="form-group">
        <label for="name" class="label">Class Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          class="input"
          placeholder="e.g., Algebra I - Period 3"
        />
      </div>

      <div class="form-group">
        <label for="description" class="label">Description (Optional)</label>
        <textarea
          id="description"
          name="description"
          rows="3"
          class="input"
          placeholder="Brief description of the class..."
        ></textarea>
      </div>

      <div class="flex gap-3">
        <a href="/teacher/classes" class="btn btn-secondary flex-1">Cancel</a>
        <button type="submit" disabled={loading} class="btn btn-primary flex-1">
          {#if loading}
            <span class="spinner"></span>
            Creating...
          {:else}
            Create Class
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
