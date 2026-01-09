<script lang="ts">
  import { enhance } from '$app/forms';
  import { BookOpen, Sparkles, FileText, ArrowLeft, Loader2, AlertCircle, PenLine, Wand2, CheckCircle } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let mode = $state<'choose' | 'generate' | 'manual'>(data.fromTestId ? 'generate' : 'choose');
  let selectedTestId = $state(data.fromTestId || '');
  let generating = $state(false);
  let title = $state('');
  let content = $state('');
  let additionalInstructions = $state('');

  const selectedTest = $derived(data.tests.find(t => t.id === selectedTestId));
</script>

<svelte:head>
  <title>Create Study Guide | Checkmate</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
  <div class="mb-8">
    <a href="/teacher/study-guides" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Guides
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
        <BookOpen class="w-5 h-5 text-slate-600" />
      </div>
      Create Study Guide
    </h1>
    <p class="text-gray-500 mt-2 ml-13">Create study materials to help students prepare</p>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if mode === 'choose'}
    <div class="grid md:grid-cols-2 gap-6">
      <button
        type="button"
        onclick={() => mode = 'generate'}
        class="bg-white rounded-xl border-2 border-gray-200 p-8 text-left hover:border-violet-300 hover:shadow-md transition-all group"
      >
        <div class="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
          <Wand2 class="w-7 h-7 text-violet-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate from Test</h3>
        <p class="text-gray-600 text-sm">
          Use AI to automatically create a comprehensive study guide based on one of your tests.
        </p>
      </button>

      <button
        type="button"
        onclick={() => mode = 'manual'}
        class="bg-white rounded-xl border-2 border-gray-200 p-8 text-left hover:border-slate-300 hover:shadow-md transition-all group"
      >
        <div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
          <PenLine class="w-7 h-7 text-slate-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600 text-sm">
          Write your own study guide content from scratch with full control.
        </p>
      </button>
    </div>
  {:else if mode === 'generate'}
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Wand2 class="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Generate from Test</h2>
            <p class="text-sm text-gray-500">AI will create a study guide based on your test questions</p>
          </div>
        </div>
      </div>

      <form
        method="POST"
        action="?/generate"
        use:enhance={() => {
          generating = true;
          return async ({ update }) => {
            generating = false;
            await update();
          };
        }}
        class="p-6 space-y-6"
      >
        <div class="form-group">
          <label for="testId" class="block text-sm font-medium text-gray-700 mb-1">Select a Test</label>
          {#if data.tests.length === 0}
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              You don't have any tests yet. <a href="/teacher/tests/create" class="font-medium underline">Create a test first</a>.
            </div>
          {:else}
            <select
              id="testId"
              name="testId"
              bind:value={selectedTestId}
              required
              class="input"
            >
              <option value="">Choose a test...</option>
              {#each data.tests as test}
                <option value={test.id}>{test.title} ({test.questions.length} questions)</option>
              {/each}
            </select>
          {/if}
        </div>

        {#if selectedTest}
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-slate-500" />
              <div>
                <p class="font-medium text-gray-900">{selectedTest.title}</p>
                <p class="text-sm text-gray-500">{selectedTest.questions.length} questions will be analyzed</p>
              </div>
            </div>
          </div>
        {/if}

        <div class="form-group">
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Study Guide Title (Optional)</label>
          <input
            type="text"
            id="title"
            name="title"
            bind:value={title}
            placeholder="Leave blank to auto-generate"
            class="input"
          />
          <p class="text-xs text-gray-500 mt-1">If left blank, a title will be generated based on the test</p>
        </div>

        <div class="form-group">
          <label for="instructions" class="block text-sm font-medium text-gray-700 mb-1">Additional AI Instructions (Optional)</label>
          <textarea
            id="instructions"
            name="additionalInstructions"
            rows="3"
            bind:value={additionalInstructions}
            placeholder="e.g., Focus on key concepts, include memory tips, add practice examples..."
            class="input"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">Provide any specific instructions for the AI to follow</p>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">
            <ArrowLeft class="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={generating || !selectedTestId}
            class="btn btn-primary flex-1"
          >
            {#if generating}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Study Guide
            {/if}
          </button>
        </div>
      </form>
    </div>
  {:else if mode === 'manual'}
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <PenLine class="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Create Manually</h2>
            <p class="text-sm text-gray-500">Write your own study guide content</p>
          </div>
        </div>
      </div>

      <form method="POST" action="?/create" use:enhance class="p-6 space-y-6">
        <div class="form-group">
          <label for="manual-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="manual-title"
            name="title"
            bind:value={title}
            required
            placeholder="e.g., World War I Study Guide"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="content" class="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <p class="text-xs text-gray-500 mb-2">You can use HTML for formatting (headings, lists, tables, etc.)</p>
          <textarea
            id="content"
            name="content"
            bind:value={content}
            required
            rows="15"
            placeholder="<h2>Key Concepts</h2>
<ul>
  <li>Important topic 1</li>
  <li>Important topic 2</li>
</ul>

<h2>Definitions</h2>
<p><strong>Term 1:</strong> Definition here...</p>"
            class="input font-mono text-sm"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">
            <ArrowLeft class="w-4 h-4" />
            Back
          </button>
          <button type="submit" disabled={!title || !content} class="btn btn-primary flex-1">
            <CheckCircle class="w-4 h-4" />
            Create Study Guide
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>
