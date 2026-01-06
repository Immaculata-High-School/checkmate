<script lang="ts">
  import { enhance } from '$app/forms';
  import { BookOpen, Sparkles, FileText, ArrowLeft, Loader2, AlertCircle, PenLine } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let mode = $state<'choose' | 'generate' | 'manual'>(data.fromTestId ? 'generate' : 'choose');
  let selectedTestId = $state(data.fromTestId || '');
  let generating = $state(false);
  let title = $state('');
  let content = $state('');

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
    <h1 class="text-2xl font-bold text-gray-900">Create Study Guide</h1>
    <p class="text-gray-500 mt-1">Create study materials to help students prepare</p>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if mode === 'choose'}
    <div class="grid md:grid-cols-2 gap-4">
      <button
        type="button"
        onclick={() => mode = 'generate'}
        class="card p-6 text-left hover:shadow-lg hover:border-amber-300 transition-all group"
      >
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
          <Sparkles class="w-7 h-7 text-amber-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate from Test</h3>
        <p class="text-gray-500 text-sm">
          Use AI to automatically create a comprehensive study guide based on one of your tests.
        </p>
      </button>

      <button
        type="button"
        onclick={() => mode = 'manual'}
        class="card p-6 text-left hover:shadow-lg hover:border-blue-300 transition-all group"
      >
        <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
          <PenLine class="w-7 h-7 text-blue-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-500 text-sm">
          Write your own study guide content from scratch with full control.
        </p>
      </button>
    </div>
  {:else if mode === 'generate'}
    <div class="card">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Sparkles class="w-5 h-5 text-amber-600" />
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
          <label for="testId" class="label">Select a Test</label>
          {#if data.tests.length === 0}
            <p class="text-gray-500 text-sm">You don't have any tests yet. <a href="/teacher/tests/create" class="text-blue-600 hover:underline">Create a test first</a>.</p>
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
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-900">{selectedTest.title}</p>
                <p class="text-sm text-gray-500">{selectedTest.questions.length} questions will be analyzed</p>
              </div>
            </div>
          </div>
        {/if}

        <div class="form-group">
          <label for="title" class="label">Study Guide Title (Optional)</label>
          <input
            type="text"
            id="title"
            name="title"
            bind:value={title}
            placeholder="Leave blank to auto-generate"
            class="input"
          />
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary flex-1">
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
    <div class="card">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <PenLine class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Create Manually</h2>
            <p class="text-sm text-gray-500">Write your own study guide content</p>
          </div>
        </div>
      </div>

      <form method="POST" action="?/create" use:enhance class="p-6 space-y-6">
        <div class="form-group">
          <label for="manual-title" class="label">Title</label>
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
          <label for="content" class="label">Content</label>
          <p class="text-sm text-gray-500 mb-2">You can use HTML for formatting (headings, lists, etc.)</p>
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
<p>Term 1: Definition here...</p>"
            class="input font-mono text-sm"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary flex-1">
            Back
          </button>
          <button type="submit" class="btn btn-primary flex-1">
            <BookOpen class="w-4 h-4" />
            Create Study Guide
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>
