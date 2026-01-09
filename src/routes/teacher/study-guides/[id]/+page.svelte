<script lang="ts">
  import { enhance } from '$app/forms';
  import { 
    BookOpen, 
    ArrowLeft, 
    Printer, 
    Edit3, 
    Trash2, 
    Users, 
    FileText,
    Calendar,
    CheckCircle2,
    X,
    Save,
    AlertCircle,
    Plus
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editing = $state(false);
  let editTitle = $state(data.studyGuide.title);
  let editContent = $state(data.studyGuide.content || '');
  let showAssignModal = $state(false);
  let showDeleteConfirm = $state(false);
  let selectedClasses = $state<string[]>([]);

  const assignedClassIds = $derived(new Set(data.studyGuide.assignments.map(a => a.class.id)));
  const availableClasses = $derived(data.classes.filter(c => !assignedClassIds.has(c.id)));

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function handlePrint() {
    window.print();
  }
</script>

<svelte:head>
  <title>{data.studyGuide.title} | Study Guides | Checkmate</title>
</svelte:head>

<style>
  @media print {
    /* Hide UI elements */
    :global(nav),
    :global(header),
    :global(aside),
    .no-print {
      display: none !important;
    }

    /* Reset page */
    :global(body) {
      background: white !important;
    }

    .print-container {
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .print-content {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }

    /* Page setup */
    @page {
      size: letter;
      margin: 0.75in;
    }

    /* Typography */
    .study-content {
      font-family: Georgia, 'Times New Roman', serif !important;
      font-size: 12pt !important;
      line-height: 1.6 !important;
      color: black !important;
    }

    .study-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 18pt !important;
      font-weight: bold !important;
      margin-bottom: 0.5in !important;
      padding-bottom: 12pt !important;
      border-bottom: 2px solid #333 !important;
    }

    /* Content styles */
    .study-content :global(h2) {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 14pt !important;
      font-weight: 600 !important;
      margin-top: 18pt !important;
      margin-bottom: 9pt !important;
      page-break-after: avoid !important;
    }

    .study-content :global(h3) {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 12pt !important;
      font-weight: 600 !important;
      margin-top: 12pt !important;
      margin-bottom: 6pt !important;
    }

    .study-content :global(p) {
      margin-bottom: 9pt !important;
      text-align: justify !important;
    }

    .study-content :global(ul),
    .study-content :global(ol) {
      margin-bottom: 9pt !important;
      padding-left: 20pt !important;
    }

    .study-content :global(li) {
      margin-bottom: 4pt !important;
    }

    .study-content :global(table) {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 12pt 0 !important;
    }

    .study-content :global(th),
    .study-content :global(td) {
      border: 1px solid #333 !important;
      padding: 6pt 8pt !important;
      text-align: left !important;
    }

    .study-content :global(th) {
      background: #f0f0f0 !important;
      font-weight: 600 !important;
    }

    .study-content :global(blockquote) {
      border-left: 3pt solid #666 !important;
      padding-left: 12pt !important;
      margin: 12pt 0 !important;
      font-style: italic !important;
    }

    .study-content :global(.key-concept),
    .study-content :global(.tip),
    .study-content :global(.warning),
    .study-content :global(.practice-question) {
      border: 1pt solid #666 !important;
      border-left: 4pt solid #333 !important;
      background: #f9f9f9 !important;
      padding: 10pt 12pt !important;
      margin: 12pt 0 !important;
    }
    
    .study-content :global(.fas),
    .study-content :global(.far) {
      margin-right: 6pt !important;
    }
  }

  /* FontAwesome icon styling */
  .study-content :global(.fas),
  .study-content :global(.far),
  .study-content :global(.fab) {
    margin-right: 0.5rem;
  }
  .study-content :global(h2 .fas),
  .study-content :global(h2 .far),
  .study-content :global(h3 .fas),
  .study-content :global(h3 .far) {
    color: #3b82f6;
  }
  .study-content :global(.key-concept .fas),
  .study-content :global(.key-concept .far) {
    color: #1d4ed8;
  }
  .study-content :global(.tip .fas),
  .study-content :global(.tip .far) {
    color: #059669;
  }
  .study-content :global(.warning .fas),
  .study-content :global(.warning .far) {
    color: #d97706;
  }
  .study-content :global(.practice-question .fas),
  .study-content :global(.practice-question .far) {
    color: #7c3aed;
  }

  /* On-screen styles for styled boxes */
  .study-content :global(.key-concept) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #3b82f6;
    border-left: 4px solid #3b82f6;
    background: #eff6ff;
    border-radius: 0.5rem;
  }
  .study-content :global(.tip) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #10b981;
    border-left: 4px solid #10b981;
    background: #ecfdf5;
    border-radius: 0.5rem;
  }
  .study-content :global(.warning) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #f59e0b;
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
    border-radius: 0.5rem;
  }
  .study-content :global(.practice-question) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #8b5cf6;
    border-left: 4px solid #8b5cf6;
    background: #f5f3ff;
    border-radius: 0.5rem;
  }
  .study-content :global(.checklist) {
    list-style: none;
    padding-left: 0;
  }
  .study-content :global(.checklist li) {
    padding: 0.25rem 0;
  }
  .study-content :global(.checklist li .far) {
    color: #6b7280;
  }
  .study-content :global(.steps) {
    counter-reset: step;
    list-style: none;
    padding-left: 0;
  }
  .study-content :global(.steps li) {
    counter-increment: step;
    padding-left: 2.5rem;
    position: relative;
    margin: 0.75rem 0;
  }
  .study-content :global(.steps li::before) {
    content: counter(step);
    position: absolute;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    background: #334155;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .study-content :global(details) {
    margin-top: 0.75rem;
  }
  .study-content :global(summary) {
    cursor: pointer;
    color: #6366f1;
    font-weight: 500;
  }
  .study-content :global(summary .fas),
  .study-content :global(summary .far) {
    color: #6366f1;
  }
  .study-content :global(details[open] summary) {
    margin-bottom: 0.5rem;
  }
  .study-content :global(details p) {
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  
  /* Definition list styling */
  .study-content :global(dl) {
    margin: 1rem 0;
  }
  .study-content :global(dt) {
    font-weight: 600;
    color: #1f2937;
    margin-top: 0.75rem;
  }
  .study-content :global(dt .fas),
  .study-content :global(dt .far) {
    color: #6366f1;
  }
  .study-content :global(dd) {
    margin-left: 1.5rem;
    color: #4b5563;
  }
</style>

<div class="print-container max-w-4xl mx-auto">
  <!-- Header -->
  <div class="no-print mb-6">
    <a href="/teacher/study-guides" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Guides
    </a>
    
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studyGuide.title}</h1>
          <div class="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span class="flex items-center gap-1">
              <Calendar class="w-4 h-4" />
              Created {formatDate(data.studyGuide.createdAt)}
            </span>
            {#if data.studyGuide.sourceTest}
              <span class="flex items-center gap-1">
                <FileText class="w-4 h-4" />
                From: {data.studyGuide.sourceTest.title}
              </span>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button onclick={handlePrint} class="btn btn-secondary">
          <Printer class="w-4 h-4" />
          Print
        </button>
        <button onclick={() => editing = !editing} class="btn btn-secondary">
          <Edit3 class="w-4 h-4" />
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button onclick={() => showDeleteConfirm = true} class="btn btn-secondary text-red-600 hover:bg-red-50">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="no-print mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if form?.assignSuccess}
    <div class="no-print mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
      <CheckCircle2 class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <p class="text-green-700">Study guide assigned! {form.studentsNotified} student(s) notified.</p>
    </div>
  {/if}

  <!-- Assignment Section -->
  <div class="no-print mb-6">
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 bg-slate-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Users class="w-5 h-5 text-slate-500" />
            <h2 class="font-semibold text-gray-900">Assigned Classes</h2>
          </div>
          {#if availableClasses.length > 0}
            <button onclick={() => showAssignModal = true} class="btn btn-primary btn-sm">
              <Plus class="w-4 h-4" />
              Assign to Class
            </button>
          {/if}
        </div>
      </div>
      
      <div class="p-6">
        {#if data.studyGuide.assignments.length === 0}
          <p class="text-gray-500 text-center py-4">This study guide hasn't been assigned to any classes yet.</p>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each data.studyGuide.assignments as assignment}
              <div class="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <span class="text-lg">{assignment.class.emoji}</span>
                <span class="font-medium text-gray-700">{assignment.class.name}</span>
                <form method="POST" action="?/unassign" use:enhance class="inline">
                  <input type="hidden" name="classId" value={assignment.class.id} />
                  <button type="submit" class="text-gray-400 hover:text-red-500 transition-colors ml-1">
                    <X class="w-4 h-4" />
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Content Section -->
  <div class="print-content bg-white rounded-xl border border-gray-200 overflow-hidden">
    {#if editing}
      <form method="POST" action="?/update" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            editing = false;
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div class="form-group">
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              bind:value={editTitle}
              required
              class="input"
            />
          </div>
          
          <div class="form-group">
            <label for="content" class="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
            <textarea
              id="content"
              name="content"
              bind:value={editContent}
              rows="20"
              class="input font-mono text-sm"
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button type="button" onclick={() => editing = false} class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              <Save class="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </form>
    {:else}
      <div class="p-8">
        <h1 class="study-title text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-200">
          {data.studyGuide.title}
        </h1>
        
        {#if data.studyGuide.content}
          <div class="study-content prose prose-slate max-w-none
            prose-headings:text-gray-900 prose-headings:font-semibold
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-li:text-gray-700
            prose-strong:text-gray-900
            prose-table:border-collapse
            prose-th:bg-slate-50 prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2
            prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2
            prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:italic prose-blockquote:text-gray-600
          ">
            {@html data.studyGuide.content}
          </div>
        {:else}
          <p class="text-gray-500 italic">No content yet. Click Edit to add content.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Assign Modal -->
{#if showAssignModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Assign to Classes</h2>
        <button onclick={() => showAssignModal = false} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <form method="POST" action="?/assign" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showAssignModal = false;
            selectedClasses = [];
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if availableClasses.length === 0}
            <p class="text-gray-500 text-center">All classes have been assigned this study guide.</p>
          {:else}
            <p class="text-sm text-gray-600 mb-3">Select classes to assign this study guide to:</p>
            <div class="space-y-2 max-h-60 overflow-y-auto">
              {#each availableClasses as cls}
                <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="classIds"
                    value={cls.id}
                    bind:group={selectedClasses}
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-lg">{cls.emoji}</span>
                  <span class="font-medium text-gray-700">{cls.name}</span>
                </label>
              {/each}
            </div>
          {/if}
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onclick={() => showAssignModal = false} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={selectedClasses.length === 0} class="btn btn-primary">
            <Users class="w-4 h-4" />
            Assign to {selectedClasses.length || ''} Class{selectedClasses.length !== 1 ? 'es' : ''}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
      <div class="p-6">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 class="w-6 h-6 text-red-600" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete Study Guide?</h2>
        <p class="text-gray-500 text-center text-sm">
          This will permanently delete "{data.studyGuide.title}" and remove it from all assigned classes.
        </p>
      </div>
      
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary">
          Cancel
        </button>
        <form method="POST" action="?/delete" use:enhance>
          <button type="submit" class="btn bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}
