<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    ClipboardList,
    Sparkles,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    Calculator,
    PenLine,
    FileText,
    ArrowLeftRight,
    BookOpen,
    Wand2,
    CheckCircle,
    Upload,
    X,
    File as FileIcon
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
  let additionalInstructions = $state('');

  // File upload state
  let uploadedFile = $state<globalThis.File | null>(null);
  let extractedText = $state('');
  let extracting = $state(false);
  let extractError = $state('');
  let useFileContent = $state(false);

  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualItems = $state<{ type: string; content: string; answer: string }[]>([
    { type: 'PROBLEM', content: '', answer: '' }
  ]);

  const itemTypes = [
    { value: 'PROBLEM', label: 'Math Problem', icon: Calculator, description: 'Numerical or equation problems' },
    { value: 'FILL_BLANK', label: 'Fill in the Blank', icon: PenLine, description: 'Complete the sentence' },
    { value: 'SHORT_ANSWER', label: 'Short Answer', icon: FileText, description: 'Written response questions' },
    { value: 'MATCHING', label: 'Matching', icon: ArrowLeftRight, description: 'Match items from two columns' },
    { value: 'WORD_PROBLEM', label: 'Word Problem', icon: BookOpen, description: 'Story-based problems' }
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', description: 'Basic concepts' },
    { value: 'medium', label: 'Medium', description: 'Standard difficulty' },
    { value: 'hard', label: 'Hard', description: 'Challenging problems' }
  ];

  // File upload functions
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      extractError = 'File too large. Maximum size is 1MB.';
      return;
    }

    if (file.type !== 'application/pdf') {
      extractError = 'Only PDF files are supported.';
      return;
    }

    uploadedFile = file;
    extractError = '';
    extracting = true;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extract text');
      }

      const result = await response.json();
      extractedText = result.text;
      useFileContent = true;
    } catch (err) {
      extractError = err instanceof Error ? err.message : 'Failed to extract text from file';
      uploadedFile = null;
    } finally {
      extracting = false;
    }
  }

  function removeFile() {
    uploadedFile = null;
    extractedText = '';
    useFileContent = false;
    extractError = '';
  }

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

  function getItemIcon(type: string) {
    const found = itemTypes.find(t => t.value === type);
    return found?.icon || FileText;
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
      <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
        <ClipboardList class="w-5 h-5 text-slate-600" />
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
    <div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle class="w-8 h-8 text-amber-500" />
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
      <button 
        onclick={() => mode = 'ai'} 
        class="bg-white rounded-xl border-2 border-gray-200 p-8 text-left hover:border-violet-300 hover:shadow-md transition-all group"
      >
        <div class="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
          <Wand2 class="w-7 h-7 text-violet-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate with AI</h3>
        <p class="text-gray-600 text-sm">
          Enter a topic and let AI create worksheet items for you. Review and edit before saving.
        </p>
      </button>

      <button 
        onclick={() => mode = 'manual'} 
        class="bg-white rounded-xl border-2 border-gray-200 p-8 text-left hover:border-slate-300 hover:shadow-md transition-all group"
      >
        <div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
          <PenLine class="w-7 h-7 text-slate-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600 text-sm">
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
        <!-- Topic -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Topic or Subject</label>
          <input
            name="topic"
            type="text"
            required
            bind:value={topic}
            class="input"
            placeholder="e.g., Two-digit multiplication, Balancing chemical equations..."
          />
          <p class="text-xs text-gray-500 mt-1.5">Be specific for better results</p>
        </div>

        <!-- File Upload Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload Source Material (Optional)
          </label>
          <p class="text-sm text-gray-500 mb-4">
            Upload a PDF with content to base the worksheet on. AI will extract and use the text to generate items. 
            <span class="text-amber-600 font-medium">Uses 2x AI credits.</span>
          </p>

          {#if !uploadedFile}
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-colors"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload class="w-8 h-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-600">
                  <span class="font-medium text-violet-600">Click to upload</span> or drag and drop
                </p>
                <p class="text-xs text-gray-500 mt-1">PDF only, max 1MB, 3 pages</p>
              </div>
              <input
                type="file"
                class="hidden"
                accept=".pdf,application/pdf"
                onchange={handleFileUpload}
              />
            </label>
          {:else}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileIcon class="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{uploadedFile.name}</p>
                    <p class="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onclick={removeFile}
                  class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              {#if extracting}
                <div class="flex items-center gap-2 text-sm text-violet-600">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  Extracting text from file...
                </div>
              {:else if extractedText}
                <div class="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p class="text-xs text-gray-500 mb-2 font-medium">Extracted Content Preview:</p>
                  <p class="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{extractedText.slice(0, 500)}{extractedText.length > 500 ? '...' : ''}</p>
                </div>
                <label class="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={useFileContent}
                    class="w-4 h-4 rounded text-violet-600"
                  />
                  <span class="text-sm text-gray-700">Use this content to generate worksheet items</span>
                </label>
              {/if}
            </div>
          {/if}

          {#if extractError}
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p class="text-sm text-red-700">{extractError}</p>
            </div>
          {/if}

          {#if useFileContent && extractedText}
            <input type="hidden" name="extractedText" value={extractedText} />
            <input type="hidden" name="useFileContent" value="true" />
          {/if}
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Number of Items -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Items</label>
            <input
              name="numberOfItems"
              type="range"
              min="5"
              max="25"
              bind:value={numberOfItems}
              class="w-full accent-slate-600"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span class="font-bold text-lg text-gray-900">{numberOfItems}</span>
              <span>25</span>
            </div>
          </div>

          <!-- Difficulty -->
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">Difficulty Level</label>
            <div class="flex gap-2">
              {#each difficultyOptions as level}
                <button
                  type="button"
                  onclick={() => difficulty = level.value as 'easy' | 'medium' | 'hard'}
                  class="flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all {difficulty === level.value
                    ? 'border-slate-600 bg-slate-50 text-slate-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}"
                >
                  {level.label}
                </button>
              {/each}
            </div>
            <input type="hidden" name="difficulty" value={difficulty} />
          </div>
        </div>

        <!-- Item Types -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <label class="block text-sm font-medium text-gray-700 mb-4">Question Types</label>
          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {#each itemTypes as type}
              {@const Icon = type.icon}
              <button
                type="button"
                onclick={() => toggleType(type.value)}
                class="p-3 rounded-lg border-2 text-left transition-all {selectedTypes.includes(type.value)
                  ? 'border-slate-600 bg-slate-50'
                  : 'border-gray-200 hover:border-gray-300'}"
              >
                <div class="flex items-center gap-2 mb-1">
                  <Icon class="w-4 h-4 {selectedTypes.includes(type.value) ? 'text-slate-700' : 'text-gray-400'}" />
                  <span class="text-sm font-medium {selectedTypes.includes(type.value) ? 'text-slate-800' : 'text-gray-700'}">
                    {type.label}
                  </span>
                </div>
                <p class="text-xs text-gray-500">{type.description}</p>
              </button>
            {/each}
          </div>
          {#each selectedTypes as type}
            <input type="hidden" name="itemTypes" value={type} />
          {/each}
          {#if selectedTypes.length === 0}
            <p class="text-xs text-amber-600 mt-2">Select at least one question type</p>
          {/if}
        </div>

        <!-- Additional Instructions -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <label for="instructions" class="block text-sm font-medium text-gray-700 mb-2">
            Additional AI Instructions (Optional)
          </label>
          <p class="text-xs text-gray-500 mb-3">Be as detailed as possible for the best results.</p>
          <textarea
            id="instructions"
            name="additionalInstructions"
            rows="3"
            bind:value={additionalInstructions}
            class="input"
            placeholder="e.g., Focus on word problems, include step-by-step solutions, avoid fractions..."
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">
            <ArrowLeft class="w-4 h-4" />
            Back
          </button>
          <button type="submit" disabled={loading || !topic || selectedTypes.length === 0} class="btn btn-primary flex-1">
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
        <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div class="form-group">
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Worksheet Title</label>
            <input id="title" name="title" type="text" required class="input" value="{topic} Worksheet" />
          </div>
          <div class="form-group">
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea id="description" name="description" rows="2" class="input" placeholder="Brief description of the worksheet..."></textarea>
          </div>
          <div class="form-group">
            <label for="classId" class="block text-sm font-medium text-gray-700 mb-1">Assign to Class</label>
            <select id="classId" name="classId" required bind:value={selectedClassId} class="input">
              <option value="">Select a class...</option>
              {#each data.classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-2">
              <CheckCircle class="w-5 h-5 text-slate-600" />
              <h3 class="font-semibold text-gray-900">Generated Items</h3>
              <span class="text-sm text-gray-500">({items.length} items)</span>
            </div>
          </div>
          <div class="divide-y divide-gray-100">
            {#each items as item, index}
              {@const Icon = getItemIcon(item.type)}
              <div class="p-4 hover:bg-slate-50/50 transition-colors">
                <div class="flex items-start gap-4">
                  <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-600">
                    {index + 1}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <Icon class="w-4 h-4 text-slate-500" />
                      <span class="text-xs font-medium text-slate-500 uppercase">{item.type.replace('_', ' ')}</span>
                    </div>
                    <p class="text-gray-900">{item.content}</p>
                    {#if item.answer}
                      <p class="text-sm text-slate-600 mt-2 flex items-center gap-1">
                        <span class="font-medium">Answer:</span> {item.answer}
                      </p>
                    {/if}
                  </div>
                  <button type="button" onclick={() => removeItem(index)} class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
            <ArrowLeft class="w-4 h-4" />
            Back
          </button>
          <button type="submit" disabled={items.length === 0 || !selectedClassId} class="btn btn-primary flex-1">
            <CheckCircle class="w-4 h-4" />
            Save Worksheet
          </button>
        </div>
      </form>
    {/if}
  {:else}
    <!-- Manual Creation -->
    <form method="POST" action="?/saveManual" use:enhance class="space-y-6">
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="form-group">
          <label for="manual-title" class="block text-sm font-medium text-gray-700 mb-1">Worksheet Title</label>
          <input id="manual-title" name="title" type="text" required bind:value={manualTitle} class="input" placeholder="e.g., Chapter 5 Review" />
        </div>
        <div class="form-group">
          <label for="manual-description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea id="manual-description" name="description" rows="2" bind:value={manualDescription} class="input" placeholder="Brief description of the worksheet..."></textarea>
        </div>
        <div class="form-group">
          <label for="manual-classId" class="block text-sm font-medium text-gray-700 mb-1">Assign to Class</label>
          <select id="manual-classId" name="classId" required bind:value={selectedClassId} class="input">
            <option value="">Select a class...</option>
            {#each data.classes as cls}
              <option value={cls.id}>{cls.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-slate-600" />
            <h3 class="font-semibold text-gray-900">Worksheet Items</h3>
            <span class="text-sm text-gray-500">({manualItems.length} items)</span>
          </div>
          <button type="button" onclick={addManualItem} class="btn btn-secondary btn-sm">
            <Plus class="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div class="divide-y divide-gray-100">
          {#each manualItems as item, index}
            {@const Icon = getItemIcon(item.type)}
            <div class="p-4">
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-600">
                  {index + 1}
                </div>
                <div class="flex-1 space-y-3">
                  <select bind:value={item.type} class="input text-sm">
                    {#each itemTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>
                  <input
                    type="text"
                    bind:value={item.content}
                    placeholder="Question or problem (e.g., 24 × 15 = ___)"
                    class="input"
                  />
                  <input
                    type="text"
                    bind:value={item.answer}
                    placeholder="Answer (optional, for answer key)"
                    class="input text-sm"
                  />
                </div>
                <button
                  type="button"
                  onclick={() => removeManualItem(index)}
                  disabled={manualItems.length === 1}
                  class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
        <button type="submit" disabled={!manualTitle || !selectedClassId || manualItems.filter(i => i.content.trim()).length === 0} class="btn btn-primary flex-1">
          <CheckCircle class="w-4 h-4" />
          Save Worksheet
        </button>
      </div>
    </form>
  {/if}
</div>
