<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import {
    Lightbulb,
    Send,
    Clock,
    CheckCircle,
    XCircle,
    MessageSquare,
    Plus,
    ChevronDown
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showForm = $state(false);
  let title = $state('');
  let description = $state('');
  let category = $state('feature');
  let priority = $state('medium');
  let isSubmitting = $state(false);

  const categories = [
    { value: 'general', label: 'General Feedback' },
    { value: 'ui', label: 'UI/UX Improvement' },
    { value: 'feature', label: 'New Feature' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'improvement', label: 'Existing Feature Improvement' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - Nice to have' },
    { value: 'medium', label: 'Medium - Would be helpful' },
    { value: 'high', label: 'High - Critical for workflow' }
  ];

  const statuses: Record<string, { label: string; color: string; icon: any }> = {
    'pending': { label: 'Pending Review', color: 'gray', icon: Clock },
    'in-review': { label: 'In Review', color: 'blue', icon: MessageSquare },
    'planned': { label: 'Planned', color: 'purple', icon: Lightbulb },
    'in-progress': { label: 'In Progress', color: 'yellow', icon: Clock },
    'completed': { label: 'Completed', color: 'green', icon: CheckCircle },
    'rejected': { label: 'Not Planned', color: 'red', icon: XCircle }
  };

  function getStatusInfo(status: string) {
    return statuses[status] || statuses['pending'];
  }

  function getCategoryLabel(cat: string) {
    return categories.find(c => c.value === cat)?.label || cat;
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function resetForm() {
    title = '';
    description = '';
    category = 'feature';
    priority = 'medium';
    showForm = false;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Feature Requests</h1>
      <p class="text-sm text-gray-500 mt-1">Submit ideas and feedback to help improve Checkmate. We'll implement most requested features if they're doable!</p>
    </div>
    <button onclick={() => showForm = !showForm} class="btn btn-primary">
      <Plus class="w-5 h-5" />
      New Request
    </button>
  </div>

  <!-- Submit Form -->
  {#if showForm}
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Submit a Feature Request</h2>
      
      {#if form?.error}
        <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{form.error}</div>
      {/if}

      {#if form?.success}
        <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">
          Your request has been submitted! We'll review it and get back to you.
        </div>
      {/if}

      <form method="POST" action="?/submit" use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            resetForm();
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              bind:value={title}
              required
              minlength="5"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of your request"
            />
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                id="category"
                name="category"
                bind:value={category}
                class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {#each categories as cat}
                  <option value={cat.value}>{cat.label}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                id="priority"
                name="priority"
                bind:value={priority}
                class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {#each priorities as p}
                  <option value={p.value}>{p.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              bind:value={description}
              required
              minlength="20"
              rows="5"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe your request in detail. Include the problem you're trying to solve and how this feature would help."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" onclick={() => showForm = false} class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} class="btn btn-primary">
              {#if isSubmitting}
                Submitting...
              {:else}
                <Send class="w-4 h-4" />
                Submit Request
              {/if}
            </button>
          </div>
        </div>
      </form>
    </div>
  {/if}

  <!-- Requests List -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-gray-900">Your Requests</h2>
    
    {#if data.requests.length === 0}
      <div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Lightbulb class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
        <p class="text-gray-500 mb-4">Submit your first feature request to help improve the platform!</p>
        <button onclick={() => showForm = true} class="btn btn-primary">
          <Plus class="w-4 h-4" />
          Submit Request
        </button>
      </div>
    {:else}
      {#each data.requests as request}
        {@const statusInfo = getStatusInfo(request.status)}
        {@const StatusIcon = statusInfo.icon}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-3">
              <span class="badge badge-{statusInfo.color}">
                <StatusIcon class="w-3 h-3" />
                {statusInfo.label}
              </span>
              <span class="badge badge-gray">{getCategoryLabel(request.category)}</span>
            </div>
            <span class="text-sm text-gray-500">{formatDate(request.createdAt)}</span>
          </div>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{request.title}</h3>
          <p class="text-gray-600 whitespace-pre-wrap">{request.description}</p>

          {#if request.adminResponse}
            <div class="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div class="flex items-center gap-2 text-indigo-700 text-sm font-medium mb-2">
                <MessageSquare class="w-4 h-4" />
                Response from the team
                {#if request.respondedAt}
                  <span class="text-indigo-500">• {formatDate(request.respondedAt)}</span>
                {/if}
              </div>
              <p class="text-indigo-800 whitespace-pre-wrap">{request.adminResponse}</p>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
