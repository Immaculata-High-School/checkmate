<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import {
    ArrowLeft,
    BookOpen,
    Edit,
    Trash2,
    Users,
    Printer,
    CheckCircle,
    AlertCircle,
    FileText,
    Send,
    X
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editing = $state(false);
  let title = $state(data.studyGuide.title);
  let description = $state(data.studyGuide.description || '');
  let content = $state(data.studyGuide.content);
  let showDeleteConfirm = $state(false);
  let selectedClassIds = $state<string[]>([]);

  const assignedClassIds = $derived(data.studyGuide.assignments.map(a => a.class.id));

  function toggleClass(classId: string) {
    if (selectedClassIds.includes(classId)) {
      selectedClassIds = selectedClassIds.filter(id => id !== classId);
    } else {
      selectedClassIds = [...selectedClassIds, classId];
    }
  }

  function printStudyGuide() {
    if (!browser) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the study guide.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.studyGuide.title} - Study Guide</title>
        <style>
          @page {
            margin: 0.75in;
            size: letter;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid #3b82f6;
          }
          .header h1 {
            color: #1e40af;
            font-size: 24px;
            margin: 0 0 8px 0;
          }
          .header .meta {
            color: #6b7280;
            font-size: 14px;
          }
          .student-info {
            display: flex;
            gap: 32px;
            margin-bottom: 24px;
            font-size: 14px;
          }
          .student-info label {
            font-weight: 600;
          }
          .student-info .line {
            display: inline-block;
            width: 180px;
            border-bottom: 1px solid #000;
            margin-left: 8px;
          }
          .content {
            font-size: 14px;
          }
          .content h1, .content h2 {
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 8px;
            margin-top: 24px;
          }
          .content h3 {
            color: #7c3aed;
            margin-top: 20px;
          }
          .content ul, .content ol {
            margin: 12px 0;
            padding-left: 24px;
          }
          .content li {
            margin: 8px 0;
          }
          .content p {
            margin: 12px 0;
          }
          .content div[style*="background"] {
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 8px;
            border-left: 4px solid currentColor;
            page-break-inside: avoid;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.studyGuide.title}</h1>
          ${data.studyGuide.description ? `<div class="meta">${data.studyGuide.description}</div>` : ''}
        </div>

        <div class="student-info">
          <div><label>Name:</label><span class="line"></span></div>
          <div><label>Date:</label><span class="line" style="width: 120px;"></span></div>
          <div><label>Period:</label><span class="line" style="width: 60px;"></span></div>
        </div>

        <div class="content">
          ${data.studyGuide.content}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
</script>

<svelte:head>
  <title>{data.studyGuide.title} | Checkmate</title>
</svelte:head>

<div class="max-w-5xl mx-auto">
  <div class="mb-6">
    <a href="/teacher/study-guides" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Guides
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
          <BookOpen class="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studyGuide.title}</h1>
          {#if data.studyGuide.sourceTest}
            <p class="text-gray-500 flex items-center gap-1 mt-1">
              <FileText class="w-4 h-4" />
              Based on: {data.studyGuide.sourceTest.title}
            </p>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick={printStudyGuide} class="btn btn-secondary">
          <Printer class="w-4 h-4" />
          Print / Save PDF
        </button>
        <button onclick={() => editing = true} class="btn btn-secondary">
          <Edit class="w-4 h-4" />
          Edit
        </button>
        <button onclick={() => showDeleteConfirm = true} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if form?.assignSuccess}
    <div class="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
      <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0" />
      <p class="text-green-700">Study guide assigned! {form.studentsNotified} student{form.studentsNotified !== 1 ? 's' : ''} notified.</p>
    </div>
  {/if}

  {#if form?.unassignSuccess}
    <div class="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
      <CheckCircle class="w-5 h-5 text-blue-500 flex-shrink-0" />
      <p class="text-blue-700">Class unassigned successfully.</p>
    </div>
  {/if}

  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Content -->
    <div class="lg:col-span-2">
      <div class="card">
        <div class="px-5 py-4 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Content</h2>
        </div>
        <div class="p-6">
          <div class="prose prose-sm max-w-none">
            {@html data.studyGuide.content}
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="space-y-4">
      <!-- Assign to Classes -->
      <div class="card">
        <div class="px-5 py-4 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900 flex items-center gap-2">
            <Users class="w-4 h-4" />
            Assign to Classes
          </h3>
        </div>
        <div class="p-4">
          {#if data.classes.length === 0}
            <p class="text-sm text-gray-500 text-center py-4">No classes available</p>
          {:else}
            <form method="POST" action="?/assign" use:enhance class="space-y-3">
              {#each selectedClassIds as classId}
                <input type="hidden" name="classIds" value={classId} />
              {/each}

              {#each data.classes as cls}
                {@const isAssigned = assignedClassIds.includes(cls.id)}
                {@const isSelected = selectedClassIds.includes(cls.id)}
                <button
                  type="button"
                  onclick={() => toggleClass(cls.id)}
                  class="w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors {isSelected ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}"
                >
                  <div class="w-5 h-5 rounded border-2 flex items-center justify-center {isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}">
                    {#if isSelected}
                      <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    {/if}
                  </div>
                  <span class="text-lg">{cls.emoji || '📚'}</span>
                  <span class="flex-1 font-medium text-gray-900">{cls.name}</span>
                  {#if isAssigned}
                    <span class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Assigned</span>
                  {/if}
                </button>
              {/each}

              <button
                type="submit"
                disabled={selectedClassIds.length === 0}
                class="btn btn-primary w-full"
              >
                <Send class="w-4 h-4" />
                Assign to {selectedClassIds.length} Class{selectedClassIds.length !== 1 ? 'es' : ''}
              </button>
            </form>
          {/if}
        </div>
      </div>

      <!-- Currently Assigned -->
      {#if data.studyGuide.assignments.length > 0}
        <div class="card">
          <div class="px-5 py-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-900 text-sm">Currently Assigned</h3>
          </div>
          <div class="p-4 space-y-2">
            {#each data.studyGuide.assignments as assignment}
              <div class="flex items-center gap-2 text-sm">
                <CheckCircle class="w-4 h-4 text-green-500" />
                <span>{assignment.class.emoji || '📚'}</span>
                <span class="flex-1 text-gray-600">{assignment.class.name}</span>
                <form method="POST" action="?/unassign" use:enhance>
                  <input type="hidden" name="classId" value={assignment.class.id} />
                  <button type="submit" class="text-xs text-red-500 hover:text-red-700 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Edit Modal -->
{#if editing}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Edit Study Guide</h3>
        <button onclick={() => editing = false} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form method="POST" action="?/update" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            editing = false;
          }
          await update();
        };
      }} class="p-5 space-y-4">
        <div class="form-group">
          <label for="edit-title" class="label">Title</label>
          <input
            type="text"
            id="edit-title"
            name="title"
            bind:value={title}
            required
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="edit-description" class="label">Description (Optional)</label>
          <input
            type="text"
            id="edit-description"
            name="description"
            bind:value={description}
            placeholder="Brief description of this study guide"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="edit-content" class="label">Content</label>
          <textarea
            id="edit-content"
            name="content"
            bind:value={content}
            required
            rows="15"
            class="input font-mono text-sm"
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
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="card p-6 max-w-md">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Study Guide</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <p class="text-gray-600 mb-6">
        Are you sure you want to delete "{data.studyGuide.title}"? Students will lose access to this study guide.
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
