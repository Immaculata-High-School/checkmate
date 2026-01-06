<script lang="ts">
  import {
    BookOpen,
    Users,
    FileText,
    Calendar,
    Search,
    Edit,
    Trash2,
    X,
    AlertCircle
  } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import type { ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let searchQuery = $state('');
  let filterArchived = $state<'all' | 'active' | 'archived'>('active');

  let editingClass = $state<(typeof data.classes)[number] | null>(null);
  let showDeleteConfirm = $state<(typeof data.classes)[number] | null>(null);

  let editName = $state('');
  let editDescription = $state('');
  let editEmoji = $state('');
  let editArchived = $state(false);

  const filteredClasses = $derived(() => {
    let classes = data.classes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      classes = classes.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.teacher.name?.toLowerCase().includes(query) ||
          c.teacher.email.toLowerCase().includes(query)
      );
    }

    if (filterArchived === 'active') {
      classes = classes.filter((c) => !c.archived);
    } else if (filterArchived === 'archived') {
      classes = classes.filter((c) => c.archived);
    }

    return classes;
  });

  function formatDate(date: Date | string | null) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function openEditModal(cls: (typeof data.classes)[number]) {
    editingClass = cls;
    editName = cls.name;
    editDescription = cls.description || '';
    editEmoji = cls.emoji || '';
    editArchived = !!cls.archived;
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Classes</h1>
      <p class="text-gray-500 mt-1">View all classes in your organization</p>
    </div>
    <div class="text-sm text-gray-500">
      {filteredClasses().length} of {data.classes.length} classes
    </div>
  </div>

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search classes or teachers..."
          bind:value={searchQuery}
          class="input pl-10"
        />
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {filterArchived === 'all'
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => (filterArchived = 'all')}
        >
          All
        </button>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {filterArchived === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => (filterArchived = 'active')}
        >
          Active
        </button>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {filterArchived === 'archived'
            ? 'bg-gray-200 text-gray-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => (filterArchived = 'archived')}
        >
          Archived
        </button>
      </div>
    </div>
  </div>

  <!-- Classes Grid -->
  {#if filteredClasses().length > 0}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredClasses() as cls}
        <div class="card p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="text-3xl">{cls.emoji || '📚'}</div>
              <div>
                <h3 class="font-semibold text-gray-900">{cls.name}</h3>
                <p class="text-sm text-gray-500">{cls.teacher.name || cls.teacher.email}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if cls.archived}
                <span class="badge badge-gray">Archived</span>
              {:else}
                <span class="badge badge-green">Active</span>
              {/if}

              <button
                class="btn btn-secondary btn-sm"
                type="button"
                onclick={() => openEditModal(cls)}
                aria-label="Edit class"
                title="Edit"
              >
                <Edit class="w-4 h-4" />
              </button>

              <button
                class="btn btn-ghost btn-sm text-red-600"
                type="button"
                onclick={() => (showDeleteConfirm = cls)}
                aria-label="Delete class"
                title="Delete"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          {#if cls.description}
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">{cls.description}</p>
          {/if}

          <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div class="flex items-center gap-1">
              <Users class="w-4 h-4" />
              <span>{cls._count.members} students</span>
            </div>
            <div class="flex items-center gap-1">
              <FileText class="w-4 h-4" />
              <span>{cls._count.tests} tests</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <div class="flex items-center gap-1 text-xs text-gray-400">
              <Calendar class="w-3 h-3" />
              Created {formatDate(cls.createdAt)}
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-400 font-mono">
              Code: {cls.joinCode}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="card p-12 text-center">
      <BookOpen class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
      <p class="text-gray-500">
        {#if searchQuery}
          No classes match your search. Try a different query.
        {:else}
          Classes created by teachers will appear here.
        {/if}
      </p>
    </div>
  {/if}
</div>

<!-- Edit Modal -->
{#if editingClass}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Edit Class</h2>
        <button onclick={() => (editingClass = null)} class="p-1 hover:bg-gray-100 rounded" type="button">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form
        method="POST"
        action="?/update"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              editingClass = null;
              await invalidateAll();
            }
            await update();
          };
        }}
      >
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="alert alert-error">
              <AlertCircle class="w-5 h-5" />
              {form.error}
            </div>
          {/if}

          <input type="hidden" name="classId" value={editingClass.id} />

          <div>
            <label for="edit-name" class="label">Class Name</label>
            <input id="edit-name" name="name" type="text" required class="input" bind:value={editName} />
          </div>

          <div>
            <label for="edit-description" class="label">Description</label>
            <textarea
              id="edit-description"
              name="description"
              rows="3"
              class="input"
              bind:value={editDescription}
            ></textarea>
          </div>

          <div>
            <label for="edit-emoji" class="label">Emoji (optional)</label>
            <input id="edit-emoji" name="emoji" type="text" class="input" bind:value={editEmoji} placeholder="📚" />
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="archived" bind:checked={editArchived} />
            Archived
          </label>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (editingClass = null)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Delete Class?</h2>
        <p class="text-gray-600">
          This will permanently delete <strong>{showDeleteConfirm.name}</strong>.
        </p>
        {#if form?.error}
          <div class="alert alert-error mt-4">
            <AlertCircle class="w-5 h-5" />
            {form.error}
          </div>
        {/if}
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button type="button" onclick={() => (showDeleteConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form
          method="POST"
          action="?/delete"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                showDeleteConfirm = null;
                await invalidateAll();
              }
              await update();
            };
          }}
        >
          <input type="hidden" name="classId" value={showDeleteConfirm.id} />
          <button type="submit" class="btn btn-danger">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
