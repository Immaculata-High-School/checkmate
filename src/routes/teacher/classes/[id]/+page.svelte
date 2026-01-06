<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    Users,
    FileText,
    Copy,
    Edit,
    Trash2,
    Archive,
    ArchiveRestore,
    UserMinus,
    AlertCircle,
    BookMarked,
    ClipboardList,
    Library
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showDeleteConfirm = $state(false);
  let editing = $state(false);
  let name = $state(data.class.name);
  let description = $state(data.class.description || '');

  const hasAssignments = $derived(data.class.tests.length > 0 || data.class.assignments.length > 0);

  function copyCode() {
    navigator.clipboard.writeText(data.class.joinCode || '');
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a href="/teacher/classes" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Classes
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
          <Users class="w-7 h-7 text-purple-600" />
        </div>
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-2xl font-bold text-gray-900">{data.class.name}</h1>
            {#if data.class.archived}
              <span class="badge badge-gray">
                <Archive class="w-3 h-3" />
                Archived
              </span>
            {/if}
          </div>
          {#if data.class.description}
            <p class="text-gray-600">{data.class.description}</p>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick={() => editing = true} class="btn btn-secondary">
          <Edit class="w-4 h-4" />
          Edit
        </button>

        {#if data.class.archived}
          <form method="POST" action="?/unarchive" use:enhance>
            <button type="submit" class="btn btn-secondary">
              <ArchiveRestore class="w-4 h-4" />
              Restore
            </button>
          </form>
        {:else}
          <form method="POST" action="?/archive" use:enhance>
            <button type="submit" class="btn btn-secondary">
              <Archive class="w-4 h-4" />
              Archive
            </button>
          </form>
        {/if}

        <button onclick={() => showDeleteConfirm = true} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Join Code -->
  {#if data.class.joinCode}
    <div class="card p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500 mb-1">Class Join Code</div>
          <div class="text-3xl font-mono font-bold text-gray-900">{data.class.joinCode}</div>
          <p class="text-sm text-gray-500 mt-1">Share this code with students to join the class</p>
        </div>
        <button onclick={copyCode} class="btn btn-secondary">
          <Copy class="w-4 h-4" />
          Copy Code
        </button>
      </div>
    </div>
  {/if}

  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Students -->
    <div class="lg:col-span-2">
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">Students ({data.class.members.length})</h2>
        </div>

        {#if data.class.members.length === 0}
          <div class="p-8">
            <div class="empty-state">
              <Users class="empty-state-icon" />
              <div class="empty-state-title">No students yet</div>
              <div class="empty-state-text">
                Share the join code with students to add them to this class.
              </div>
            </div>
          </div>
        {:else}
          <div class="divide-y divide-gray-100">
            {#each data.class.members as member}
              <div class="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-sm">{member.user.name?.charAt(0) || '?'}</div>
                  <div>
                    <div class="font-medium text-gray-900">{member.user.name}</div>
                    <div class="text-sm text-gray-500">{member.user.email}</div>
                  </div>
                </div>
                <form method="POST" action="?/removeStudent" use:enhance>
                  <input type="hidden" name="studentId" value={member.user.id} />
                  <button type="submit" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <UserMinus class="w-4 h-4" />
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Assignments -->
    <div>
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Assignments</h3>
        </div>

        {#if !hasAssignments}
          <div class="p-6">
            <p class="text-sm text-gray-500 text-center">
              No assignments yet. Assign tests, worksheets, or study sets to this class.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-gray-100">
            <!-- Tests -->
            {#each data.class.tests as { test }}
              <a href="/teacher/tests/{test.id}" class="block px-4 py-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <FileText class="w-4 h-4 text-blue-500" />
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 text-sm truncate">{test.title}</div>
                    <div class="text-xs text-gray-500">{test._count.questions} questions</div>
                  </div>
                  <span class="badge {test.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'} text-xs">
                    {test.status}
                  </span>
                </div>
              </a>
            {/each}

            <!-- Worksheets, Study Sets, and Study Guides -->
            {#each data.class.assignments as assignment}
              {#if assignment.worksheet}
                <a href="/teacher/worksheets/{assignment.worksheet.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <ClipboardList class="w-4 h-4 text-green-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.worksheet.title}</div>
                      <div class="text-xs text-gray-500">Worksheet</div>
                    </div>
                  </div>
                </a>
              {/if}
              {#if assignment.studySet}
                <a href="/teacher/study-sets/{assignment.studySet.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <Library class="w-4 h-4 text-purple-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.studySet.title}</div>
                      <div class="text-xs text-gray-500">Flashcard Set</div>
                    </div>
                  </div>
                </a>
              {/if}
              {#if assignment.studyGuide}
                <a href="/teacher/study-guides/{assignment.studyGuide.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <BookMarked class="w-4 h-4 text-amber-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.studyGuide.title}</div>
                      <div class="text-xs text-gray-500">Study Guide</div>
                    </div>
                  </div>
                </a>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Edit Modal -->
{#if editing}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => editing = false}>
    <div class="card p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-semibold text-gray-900 mb-4">Edit Class</h3>

      {#if form?.error}
        <div class="alert alert-error mb-4">{form.error}</div>
      {/if}

      <form method="POST" action="?/update" use:enhance class="space-y-4">
        <div class="form-group">
          <label for="edit-name" class="label">Class Name</label>
          <input
            id="edit-name"
            name="name"
            type="text"
            required
            bind:value={name}
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="edit-description" class="label">Description</label>
          <textarea
            id="edit-description"
            name="description"
            rows="3"
            bind:value={description}
            class="input"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => editing = false} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary flex-1">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showDeleteConfirm = false}>
    <div class="card p-6 max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Class</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <p class="text-gray-600 mb-6">
        Are you sure you want to delete "{data.class.name}"? All student data will be removed.
      </p>
      <div class="flex gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary flex-1">
          Cancel
        </button>
        <form method="POST" action="?/delete" use:enhance class="flex-1">
          <button type="submit" class="btn btn-primary w-full bg-red-600 hover:bg-red-700">
            Delete
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}
