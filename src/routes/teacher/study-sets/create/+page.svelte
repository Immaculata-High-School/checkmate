<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    BookOpen,
    Sparkles,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    FileText,
    ClipboardList,
    BookMarked,
    ChevronRight,
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

  let mode = $state<'choose' | 'ai' | 'fromContent' | 'manual'>(savedOutput ? 'ai' : 'choose');
  let step = $state<'configure' | 'review'>(savedOutput ? 'review' : 'configure');
  let loading = $state(false);
  let cards = $state<any[]>(form?.cards || savedOutput?.cards || []);
  let currentJobId = $state<string | undefined>(form?.jobId || savedJob?.id);

  // AI form values
  let topic = $state(savedOutput?.topic || form?.topic || '');
  let numberOfCards = $state(savedOutput?.numberOfCards || 20);
  let additionalInstructions = $state('');

  // File upload state for AI mode
  let uploadedFile = $state<globalThis.File | null>(null);
  let extractedText = $state('');
  let extracting = $state(false);
  let extractError = $state('');
  let useFileContent = $state(false);

  // From content form values
  let selectedContentType = $state<'test' | 'worksheet' | 'study_guide' | ''>('');
  let selectedContentId = $state('');
  let numberOfCardsFromContent = $state(20);

  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualCards = $state<{ front: string; back: string }[]>([
    { front: '', back: '' }
  ]);

  // Get available content based on selected type
  const availableContent = $derived(() => {
    if (selectedContentType === 'test') return data.existingContent.tests;
    if (selectedContentType === 'worksheet') return data.existingContent.worksheets;
    if (selectedContentType === 'study_guide') return data.existingContent.studyGuides;
    return [];
  });

  // File upload functions
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file - 1MB max, PDF only
    const maxSize = 1 * 1024 * 1024;
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

  function addManualCard() {
    manualCards = [...manualCards, { front: '', back: '' }];
  }

  function removeManualCard(index: number) {
    manualCards = manualCards.filter((_, i) => i !== index);
  }

  function removeCard(index: number) {
    cards = cards.filter((_, i) => i !== index);
  }

  $effect(() => {
    if (form?.cards) {
      cards = form.cards;
      step = 'review';
      currentJobId = form.jobId;
      if (form.topic) topic = form.topic;
    }
  });
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/study-sets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Sets
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
        <BookOpen class="w-5 h-5 text-amber-600" />
      </div>
      Create Study Set
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
        <BookOpen class="w-8 h-8 text-yellow-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Create a Class First</h2>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        Before you can create a study set, you need to have at least one class to assign it to.
      </p>
      <a href="/teacher/classes/create" class="btn btn-primary">
        <Plus class="w-5 h-5" />
        Create Your First Class
      </a>
    </div>
  {:else if mode === 'choose'}
    <!-- Choose Mode -->
    <div class="grid md:grid-cols-3 gap-6">
      <button onclick={() => mode = 'ai'} class="card p-8 text-left hover:border-purple-300 transition-colors">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
          <Sparkles class="w-7 h-7 text-purple-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate with AI</h3>
        <p class="text-gray-600 text-sm">
          Enter a topic and let AI create flashcards for you.
        </p>
      </button>

      <button onclick={() => mode = 'fromContent'} class="card p-8 text-left hover:border-blue-300 transition-colors">
        <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
          <FileText class="w-7 h-7 text-blue-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">From Existing Content</h3>
        <p class="text-gray-600 text-sm">
          Generate flashcards from your tests, worksheets, or study guides.
        </p>
      </button>

      <button onclick={() => mode = 'manual'} class="card p-8 text-left hover:border-amber-300 transition-colors">
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
          <Plus class="w-7 h-7 text-amber-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600 text-sm">
          Add flashcards one by one.
        </p>
      </button>
    </div>
  {:else if mode === 'fromContent'}
    {#if step === 'configure'}
      <!-- From Content Configuration -->
      <form
        method="POST"
        action="?/generateFromContent"
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
          <label class="block text-sm font-medium text-gray-700 mb-4">Select Content Type</label>
          <div class="grid grid-cols-3 gap-3">
            <button
              type="button"
              onclick={() => { selectedContentType = 'test'; selectedContentId = ''; }}
              class="p-4 rounded-lg border-2 text-left transition-all {selectedContentType === 'test'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}"
            >
              <FileText class="w-6 h-6 {selectedContentType === 'test' ? 'text-blue-600' : 'text-gray-400'} mb-2" />
              <div class="font-medium {selectedContentType === 'test' ? 'text-blue-700' : 'text-gray-700'}">Tests</div>
              <div class="text-xs text-gray-500">{data.existingContent.tests.length} available</div>
            </button>
            <button
              type="button"
              onclick={() => { selectedContentType = 'worksheet'; selectedContentId = ''; }}
              class="p-4 rounded-lg border-2 text-left transition-all {selectedContentType === 'worksheet'
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-200 hover:border-gray-300'}"
            >
              <ClipboardList class="w-6 h-6 {selectedContentType === 'worksheet' ? 'text-violet-600' : 'text-gray-400'} mb-2" />
              <div class="font-medium {selectedContentType === 'worksheet' ? 'text-violet-700' : 'text-gray-700'}">Worksheets</div>
              <div class="text-xs text-gray-500">{data.existingContent.worksheets.length} available</div>
            </button>
            <button
              type="button"
              onclick={() => { selectedContentType = 'study_guide'; selectedContentId = ''; }}
              class="p-4 rounded-lg border-2 text-left transition-all {selectedContentType === 'study_guide'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}"
            >
              <BookMarked class="w-6 h-6 {selectedContentType === 'study_guide' ? 'text-green-600' : 'text-gray-400'} mb-2" />
              <div class="font-medium {selectedContentType === 'study_guide' ? 'text-green-700' : 'text-gray-700'}">Study Guides</div>
              <div class="text-xs text-gray-500">{data.existingContent.studyGuides.length} available</div>
            </button>
          </div>
          <input type="hidden" name="contentType" value={selectedContentType} />
        </div>

        {#if selectedContentType}
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">Select {selectedContentType === 'study_guide' ? 'Study Guide' : selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)}</label>
            {#if availableContent().length === 0}
              <p class="text-gray-500 text-sm py-4 text-center">No {selectedContentType === 'study_guide' ? 'study guides' : selectedContentType + 's'} available yet.</p>
            {:else}
              <div class="space-y-2 max-h-64 overflow-y-auto">
                {#each availableContent() as content}
                  <button
                    type="button"
                    onclick={() => selectedContentId = content.id}
                    class="w-full p-3 rounded-lg border-2 text-left flex items-center justify-between transition-all {selectedContentId === content.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'}"
                  >
                    <div>
                      <div class="font-medium text-gray-900">{content.title}</div>
                      <div class="text-xs text-gray-500">
                        {#if 'questionCount' in content}
                          {content.questionCount} questions
                        {:else if 'itemCount' in content}
                          {content.itemCount} items
                        {:else}
                          Study guide
                        {/if}
                      </div>
                    </div>
                    {#if selectedContentId === content.id}
                      <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <ChevronRight class="w-3 h-3 text-white" />
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
            <input type="hidden" name="contentId" value={selectedContentId} />
          </div>
        {/if}

        {#if selectedContentId}
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Cards</label>
            <input
              name="numberOfCards"
              type="range"
              min="10"
              max="50"
              bind:value={numberOfCardsFromContent}
              class="w-full"
            />
            <div class="text-center mt-2 font-bold text-lg">{numberOfCardsFromContent}</div>
          </div>
        {/if}

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
          <button 
            type="submit" 
            disabled={loading || !selectedContentType || !selectedContentId} 
            class="btn btn-primary flex-1"
          >
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Flashcards
            {/if}
          </button>
        </div>
      </form>
    {:else}
      <!-- Same review form as AI mode -->
      <form method="POST" action="?/save" use:enhance class="space-y-6">
        <div class="card p-6">
          <div class="form-group">
            <label for="title" class="label">Study Set Title</label>
            <input id="title" name="title" type="text" required class="input" value="{topic} Flashcards" />
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
          <h3 class="font-semibold text-gray-900 mb-4">Generated Cards ({cards.length})</h3>
          <div class="space-y-3">
            {#each cards as card, index}
              <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 grid md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Front</label>
                      <textarea
                        bind:value={card.front}
                        class="input text-sm"
                        rows="2"
                      ></textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Back</label>
                      <textarea
                        bind:value={card.back}
                        class="input text-sm"
                        rows="2"
                      ></textarea>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={() => removeCard(index)}
                    class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <input type="hidden" name="cards" value={JSON.stringify(cards)} />
        {#if currentJobId}
          <input type="hidden" name="jobId" value={currentJobId} />
        {/if}

        <div class="flex gap-3">
          <button type="button" onclick={() => { step = 'configure'; cards = []; }} class="btn btn-secondary">
            Start Over
          </button>
          <button type="submit" disabled={cards.length === 0 || !selectedClassId} class="btn btn-primary flex-1">
            <BookOpen class="w-4 h-4" />
            Create Study Set
          </button>
        </div>
      </form>
    {/if}
  {:else if mode === 'ai'}
    {#if step === 'configure'}
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
            placeholder="e.g., US Presidents, Spanish Vocabulary..."
          />
        </div>

        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Number of Cards</label>
          <input
            name="numberOfCards"
            type="range"
            min="10"
            max="50"
            bind:value={numberOfCards}
            class="w-full"
          />
          <div class="text-center mt-2 font-bold text-lg">{numberOfCards}</div>
        </div>

        <!-- PDF Upload -->
        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload Source Material (Optional)
          </label>
          <p class="text-sm text-gray-500 mb-4">
            Upload a PDF with content to base the flashcards on. AI will extract and use the text to generate cards.
            <span class="text-amber-600 font-medium">Uses 2x AI credits.</span>
          </p>

          {#if !uploadedFile}
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload class="w-8 h-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-600">
                  <span class="font-medium text-emerald-600">Click to upload</span> or drag and drop
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
                <div class="flex items-center gap-2 text-sm text-emerald-600">
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
                    class="w-4 h-4 rounded text-emerald-600"
                  />
                  <span class="text-sm text-gray-700">Use this content to generate flashcards</span>
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

        <!-- Additional Instructions -->
        <div class="card p-6">
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
            placeholder="e.g., Include example sentences, focus on key vocabulary, add context..."
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
          <button type="submit" disabled={loading || !topic} class="btn btn-primary flex-1">
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Flashcards
            {/if}
          </button>
        </div>
      </form>
    {:else}
      <form method="POST" action="?/save" use:enhance class="space-y-6">
        <div class="card p-6">
          <div class="form-group">
            <label for="title" class="label">Study Set Title</label>
            <input id="title" name="title" type="text" required class="input" value="{topic} Flashcards" />
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
          <h3 class="font-semibold text-gray-900 mb-4">Generated Cards ({cards.length})</h3>
          <div class="space-y-3">
            {#each cards as card, index}
              <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 grid md:grid-cols-2 gap-4">
                    <div>
                      <div class="text-xs text-gray-500 mb-1">Front</div>
                      <p class="font-medium text-gray-900">{card.front}</p>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500 mb-1">Back</div>
                      <p class="text-gray-600">{card.back}</p>
                    </div>
                  </div>
                  <button type="button" onclick={() => removeCard(index)} class="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
          <input type="hidden" name="cards" value={JSON.stringify(cards)} />
          {#if currentJobId}
            <input type="hidden" name="jobId" value={currentJobId} />
          {/if}
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => step = 'configure'} class="btn btn-secondary">Back</button>
          <button type="submit" class="btn btn-primary flex-1">Save Study Set</button>
        </div>
      </form>
    {/if}
  {:else}
    <!-- Manual Creation -->
    <form method="POST" action="?/saveManual" use:enhance class="space-y-6">
      <div class="card p-6">
        <div class="form-group">
          <label for="manual-title" class="label">Study Set Title</label>
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
          <h3 class="font-semibold text-gray-900">Cards ({manualCards.length})</h3>
          <button type="button" onclick={addManualCard} class="btn btn-secondary btn-sm">
            <Plus class="w-4 h-4" />
            Add Card
          </button>
        </div>

        <div class="space-y-3">
          {#each manualCards as card, index}
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-start gap-4">
                <div class="flex-1 grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    bind:value={card.front}
                    placeholder="Front (term)"
                    class="input"
                  />
                  <input
                    type="text"
                    bind:value={card.back}
                    placeholder="Back (definition)"
                    class="input"
                  />
                </div>
                <button
                  type="button"
                  onclick={() => removeManualCard(index)}
                  disabled={manualCards.length === 1}
                  class="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
        <input type="hidden" name="cards" value={JSON.stringify(manualCards.filter(c => c.front.trim() && c.back.trim()))} />
      </div>

      <div class="flex gap-3">
        <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
        <button type="submit" disabled={!manualTitle} class="btn btn-primary flex-1">Save Study Set</button>
      </div>
    </form>
  {/if}
</div>
