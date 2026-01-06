<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    ClipboardList,
    Sparkles,
    Plus,
    Trash2,
    Loader2,
    AlertCircle
  } from 'lucide-svelte';
  import type { ActionData, PageData } from './$types';

  let { form, data }: { form: ActionData; data: PageData } = $props();

  // Check if we're continuing from a saved job
  const savedJob = data.savedJob;
  const savedOutput = savedJob?.output;

  let selectedClassId = $state('');

  let mode = $state<'choose' | 'ai' | 'manual'>(savedOutput ? 'ai' : 'choose');
  let step = $state<'configure' | 'review'>(savedOutput ? 'review' : 'configure');
  let loading = $state(false);
  let items = $state<any[]>(savedOutput?.items || []);
  let currentJobId = $state<string | undefined>(savedJob?.id);

  // AI form values
  let topic = $state(savedOutput?.topic || '');
  let numberOfItems = $state(savedOutput?.numberOfItems || 10);
  let difficulty = $state<'easy' | 'medium' | 'hard'>(savedOutput?.difficulty || 'medium');
  let selectedTypes = $state<string[]>(savedOutput?.itemTypes || ['PROBLEM', 'FILL_BLANK']);

  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualItems = $state<{ type: string; content: string; answer: string }[]>([
    { type: 'PROBLEM', content: '', answer: '' }
  ]);

  const itemTypes = [
    { value: 'PROBLEM', label: 'Math Problem' },
    { value: 'FILL_BLANK', label: 'Fill in the Blank' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'MATCHING', label: 'Matching' },
    { value: 'WORD_PROBLEM', label: 'Word Problem' }
  ];

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      selectedTypes = [...selectedTypes, type];
    }
  }

  function addManualItem() {
    manualItems = [...manualItems, { type: 'PROBLEM', content: '', answer: '' }];
  }

  function removeManualItem(index: number) {
    manualItems = manualItems.filter((_, i) => i !== index);
  }

  function removeItem(index: number) {
    items = items.filter((_, i) => i !== index);
  }

  $effect(() => {
    if (form?.items) {
      items = form.items;
      step = 'review';
      currentJobId = form.jobId;
    }
  });
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/worksheets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Worksheets
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
        <ClipboardList class="w-5 h-5 text-green-600" />
      </div>
      Create Worksheet
    </h1>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if data.classes.length === 0}
    <!-- No Classes Prompt -->
    <div class="card p-8 text-center">
      <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ClipboardList class="w-8 h-8 text-yellow-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Create a Class First</h2>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        Before you can create a worksheet, you need to have at least one class to assign it to.
      </p>
      <a href="/teacher/classes/create" class="btn btn-primary">
        <Plus class="w-5 h-5" />
        Create Your First Class
      </a>
    </div>
  {:else if mode === 'choose'}
    <!-- Choose Mode -->
    <div class="grid md:grid-cols-2 gap-6">
      <button onclick={() => mode = 'ai'} class="card p-8 text-left hover:border-purple-300 transition-colors">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
          <Sparkles class="w-7 h-7 text-purple-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate with AI</h3>
        <p class="text-gray-600">
          Enter a topic and let AI create worksheet items for you. You can review and edit before saving.
        </p>
      </button>

      <button onclick={() => mode = 'manual'} class="card p-8 text-left hover:border-green-300 transition-colors">
        <div class="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
          <Plus class="w-7 h-7 text-green-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600">
          Build your worksheet from scratch by adding items one by one.
        </p>
      </button>
    </div>
  {:else if mode === 'ai'}
    {#if step === 'configure'}
      <!-- AI Configuration -->
      <form
        method="POST"
        action="?/generate"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
        class="space-y-6"
      >
        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Topic</label>
          <input
            name="topic"
            type="text"
            required
            bind:value={topic}
            class="input"
            placeholder="e.g., Two-digit multiplication, Fractions..."
          />
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Items</label>
            <input
              name="numberOfItems"
              type="range"
              min="5"
              max="25"
              bind:value={numberOfItems}
              class="w-full"
            />
            <div class="text-center mt-2 font-bold text-lg">{numberOfItems}</div>
          </div>

          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <div class="flex gap-2">
              {#each ['easy', 'medium', 'hard'] as level}
                <button
                  type="button"
                  onclick={() => difficulty = level as 'easy' | 'medium' | 'hard'}
                  class="flex-1 py-2 rounded-lg border-2 font-medium {difficulty === level
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600'}"
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              {/each}
            </div>
            <input type="hidden" name="difficulty" value={difficulty} />
          </div>
        </div>

        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-4">Item Types</label>
          <div class="flex flex-wrap gap-2">
            {#each itemTypes as type}
              <button
                type="button"
                onclick={() => toggleType(type.value)}
                class="px-4 py-2 rounded-lg border-2 {selectedTypes.includes(type.value)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600'}"
              >
                {type.label}
              </button>
            {/each}
          </div>
          {#each selectedTypes as type}
            <input type="hidden" name="itemTypes" value={type} />
          {/each}
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">
            Back
          </button>
          <button type="submit" disabled={loading || !topic} class="btn btn-primary flex-1">
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Worksheet
            {/if}
          </button>
        </div>
      </form>
    {:else}
      <!-- Review AI Generated Items -->
      <form method="POST" action="?/save" use:enhance class="space-y-6">
        <div class="card p-6">
          <div class="form-group">
            <label for="title" class="label">Worksheet Title</label>
            <input id="title" name="title" type="text" required class="input" value="{topic} Worksheet" />
          </div>
          <div class="form-group">
            <label for="description" class="label">Description (Optional)</label>
            <textarea id="description" name="description" rows="2" class="input"></textarea>
          </div>
          <div class="form-group">
            <label for="classId" class="label">Assign to Class</label>
            <select id="classId" name="classId" required bind:value={selectedClassId} class="input">
              <option value="">Select a class...</option>
              {#each data.classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="font-semibold text-gray-900 mb-4">Generated Items ({items.length})</h3>
          <div class="space-y-4">
            {#each items as item, index}
              <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <span class="badge badge-green mb-2">{item.type}</span>
                    <p class="font-medium text-gray-900">{item.content}</p>
                    {#if item.answer}
                      <p class="text-sm text-green-600 mt-2">Answer: {item.answer}</p>
                    {/if}
                  </div>
                  <button type="button" onclick={() => removeItem(index)} class="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
          <input type="hidden" name="items" value={JSON.stringify(items)} />
          {#if currentJobId}
            <input type="hidden" name="jobId" value={currentJobId} />
          {/if}
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => step = 'configure'} class="btn btn-secondary">
            Back
          </button>
          <button type="submit" class="btn btn-primary flex-1">
            Save Worksheet
          </button>
        </div>
      </form>
    {/if}
  {:else}
    <!-- Manual Creation -->
    <form method="POST" action="?/saveManual" use:enhance class="space-y-6">
      <div class="card p-6">
        <div class="form-group">
          <label for="manual-title" class="label">Worksheet Title</label>
          <input id="manual-title" name="title" type="text" required bind:value={manualTitle} class="input" />
        </div>
        <div class="form-group">
          <label for="manual-description" class="label">Description (Optional)</label>
          <textarea id="manual-description" name="description" rows="2" bind:value={manualDescription} class="input"></textarea>
        </div>
        <div class="form-group">
          <label for="manual-classId" class="label">Assign to Class</label>
          <select id="manual-classId" name="classId" required bind:value={selectedClassId} class="input">
            <option value="">Select a class...</option>
            {#each data.classes as cls}
              <option value={cls.id}>{cls.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Items ({manualItems.length})</h3>
          <button type="button" onclick={addManualItem} class="btn btn-secondary btn-sm">
            <Plus class="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div class="space-y-4">
          {#each manualItems as item, index}
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-start gap-4">
                <div class="flex-1 space-y-3">
                  <select bind:value={item.type} class="input">
                    {#each itemTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>
                  <input
                    type="text"
                    bind:value={item.content}
                    placeholder="Item content (e.g., 24 x 15 = ___)"
                    class="input"
                  />
                  <input
                    type="text"
                    bind:value={item.answer}
                    placeholder="Answer (optional)"
                    class="input"
                  />
                </div>
                <button
                  type="button"
                  onclick={() => removeManualItem(index)}
                  disabled={manualItems.length === 1}
                  class="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
        <input type="hidden" name="items" value={JSON.stringify(manualItems.filter(i => i.content.trim()))} />
      </div>

      <div class="flex gap-3">
        <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">
          Back
        </button>
        <button type="submit" disabled={!manualTitle} class="btn btn-primary flex-1">
          Save Worksheet
        </button>
      </div>
    </form>
  {/if}
</div>
