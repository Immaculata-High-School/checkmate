<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { assistantStore } from '$lib/stores/assistant';
  import {
    Sparkles,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    ArrowLeft,
    FileText,
    Save,
    CheckCircle2,
    BookOpen,
    Upload,
    X,
    File as FileIcon
  } from 'lucide-svelte';
  import type { ActionData, PageData } from './$types';

  let { form, data }: { form: ActionData; data: PageData } = $props();

  // Check if we're continuing from a saved job
  const savedJob = data.savedJob;
  const savedOutput = savedJob?.output;

  let mode = $state<'choose' | 'ai' | 'manual'>(savedOutput ? 'ai' : 'choose');
  let step = $state<'configure' | 'review'>(savedOutput ? 'review' : 'configure');
  let loading = $state(false);
  let questions = $state<any[]>(savedOutput?.questions || []);
  let currentJobId = $state<string | undefined>(savedJob?.id);

  // AI form values
  let topic = $state(savedOutput?.topic || '');
  let numberOfQuestions = $state(savedOutput?.numberOfQuestions || 10);
  let difficulty = $state<'easy' | 'medium' | 'hard'>(savedOutput?.difficulty || 'medium');
  let selectedTypes = $state<string[]>(savedOutput?.questionTypes || ['MULTIPLE_CHOICE', 'SHORT_ANSWER']);
  let additionalInstructions = $state('');
  let testTitle = $state(savedOutput ? `${savedOutput.topic} Test` : '');
  let testDescription = $state('');
  let autoGrade = $state(true);
  let selectedClassId = $state('');
  let totalPoints = $state<number | null>(null);

  // File upload state
  let uploadedFile = $state<globalThis.File | null>(null);
  let extractedText = $state('');
  let extracting = $state(false);
  let extractError = $state('');
  let useFileContent = $state(false);

  // Check for prefill data from AI assistant
  onMount(() => {
    const unsubscribe = assistantStore.subscribe(state => {
      if (state.prefill && state.prefill.type === 'test') {
        const prefillData = state.prefill.data;
        if (prefillData.topic) topic = prefillData.topic;
        if (prefillData.numberOfQuestions) numberOfQuestions = prefillData.numberOfQuestions;
        if (prefillData.difficulty) difficulty = prefillData.difficulty;
        if (prefillData.questionTypes) selectedTypes = prefillData.questionTypes;
        if (prefillData.additionalInstructions) additionalInstructions = prefillData.additionalInstructions;
        if (prefillData.title) testTitle = prefillData.title;
        if (prefillData.description) testDescription = prefillData.description;
        
        // Switch to AI mode if prefill has topic
        if (prefillData.topic) {
          mode = 'ai';
        }
        
        // Clear the prefill after applying
        assistantStore.clearPrefill();
      }
    });
    
    return unsubscribe;
  });


  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualAutoGrade = $state(true);
  let manualClassId = $state('');
  let manualTotalPoints = $state<number | null>(null);
  let manualQuestions = $state<{ type: string; question: string; options: string[]; correctAnswer: string; points: number; programmingLanguage: string }[]>([
    { type: 'MULTIPLE_CHOICE', question: '', options: ['', '', '', ''], correctAnswer: '', points: 1, programmingLanguage: 'python' }
  ]);

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

  // Calculate current total points for manual questions
  let manualCurrentPoints = $derived(manualQuestions.reduce((sum, q) => sum + q.points, 0));

  const questionTypes = [
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'TRUE_FALSE', label: 'True/False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'LONG_ANSWER', label: 'Long Answer' },
    { value: 'ESSAY', label: 'Essay' },
    { value: 'FILL_IN_BLANK', label: 'Fill in Blank' },
    { value: 'PROGRAMMING', label: 'Programming' }
  ];

  // Programming language options
  const programmingLanguages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' }
  ];

  // Point allocation strategy
  let pointAllocationStrategy = $state<'equal' | 'difficulty' | 'length' | 'type'>('difficulty');
  let harderQuestionsMorePoints = $state(true);
  let longerQuestionsMorePoints = $state(true);
  let pointAllocationInstructions = $state('');

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      selectedTypes = [...selectedTypes, type];
    }
  }

  function removeQuestion(index: number) {
    questions = questions.filter((_, i) => i !== index);
  }

  function addManualQuestion() {
    manualQuestions = [...manualQuestions, {
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      programmingLanguage: 'python'
    }];
  }

  function removeManualQuestion(index: number) {
    manualQuestions = manualQuestions.filter((_, i) => i !== index);
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    manualQuestions[qIndex].options[optIndex] = value;
  }

  $effect(() => {
    if (form?.questions) {
      questions = form.questions;
      step = 'review';
      testTitle = `${form.topic} Test`;
      currentJobId = form.jobId;
    }
  });
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/tests" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Tests
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-blue-600" />
      </div>
      Create Test
    </h1>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if data.classes.length === 0}
    <!-- No Classes - Prompt to Create -->
    <div class="card p-8 text-center">
      <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen class="w-8 h-8 text-yellow-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Create a Class First</h2>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        Before you can create a test, you need to have at least one class to assign it to.
        Create a class first, then come back to create your test.
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
          Enter a topic and let AI create test questions for you. Review and edit before saving.
        </p>
      </button>

      <button onclick={() => mode = 'manual'} class="card p-8 text-left hover:border-blue-300 transition-colors">
        <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
          <Plus class="w-7 h-7 text-blue-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600">
          Build your test from scratch by adding questions one by one.
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
            placeholder="e.g., World War II, Photosynthesis, Algebra equations..."
          />
          <p class="text-sm text-gray-500 mt-2">Be specific for better results.</p>
        </div>

        <!-- File Upload Section -->
        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload Source Material (Optional)
          </label>
          <p class="text-sm text-gray-500 mb-4">
            Upload a PDF with content to base the test on. AI will extract and use the text to generate questions. 
            <span class="text-amber-600 font-medium">Beta Feature</span>
          </p>

          {#if !uploadedFile}
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload class="w-8 h-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-600">
                  <span class="font-medium text-blue-600">Click to upload</span> or drag and drop
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
                <div class="flex items-center gap-2 text-sm text-blue-600">
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
                    class="w-4 h-4 rounded text-blue-600"
                  />
                  <span class="text-sm text-gray-700">Use this content to generate questions</span>
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
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
            <input
              name="numberOfQuestions"
              type="range"
              min="5"
              max="40"
              bind:value={numberOfQuestions}
              class="w-full"
            />
            <div class="text-center mt-2 font-bold text-lg">{numberOfQuestions}</div>
          </div>

          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Total Points (Optional)</label>
            <input
              name="totalPoints"
              type="number"
              min="1"
              max="1000"
              bind:value={totalPoints}
              class="input"
              placeholder="e.g., 100"
            />
            <p class="text-xs text-gray-500 mt-1">AI will distribute points per question. Leave blank for default (1 pt each).</p>
          </div>
        </div>

        {#if totalPoints}
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-4">Point Allocation Strategy</label>
            <div class="grid sm:grid-cols-2 gap-3 mb-4">
              {#each [
                { value: 'equal', label: 'Equal Distribution', desc: 'All questions get similar points' },
                { value: 'difficulty', label: 'By Difficulty', desc: 'Harder questions worth more' },
                { value: 'length', label: 'By Answer Length', desc: 'Longer answers worth more' },
                { value: 'type', label: 'By Question Type', desc: 'Different types have different values' }
              ] as strategy}
                <button
                  type="button"
                  onclick={() => pointAllocationStrategy = strategy.value as any}
                  class="p-3 rounded-lg border-2 text-left transition-all {pointAllocationStrategy === strategy.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'}"
                >
                  <div class="font-medium text-gray-900">{strategy.label}</div>
                  <div class="text-xs text-gray-500">{strategy.desc}</div>
                </button>
              {/each}
            </div>
            <input type="hidden" name="pointAllocationStrategy" value={pointAllocationStrategy} />

            {#if pointAllocationStrategy === 'difficulty'}
              <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={harderQuestionsMorePoints}
                    class="w-4 h-4 rounded"
                  />
                  <div>
                    <span class="font-medium text-gray-700">Harder questions get more points</span>
                    <p class="text-xs text-gray-500">
                      {harderQuestionsMorePoints 
                        ? 'Essays & long answers will be worth more than multiple choice'
                        : 'Easier questions will be worth more to encourage completion'}
                    </p>
                  </div>
                </label>
                <input type="hidden" name="harderQuestionsMorePoints" value={harderQuestionsMorePoints.toString()} />
              </div>
            {/if}

            {#if pointAllocationStrategy === 'length'}
              <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={longerQuestionsMorePoints}
                    class="w-4 h-4 rounded"
                  />
                  <div>
                    <span class="font-medium text-gray-700">Longer answers get more points</span>
                    <p class="text-xs text-gray-500">
                      {longerQuestionsMorePoints 
                        ? 'Questions requiring detailed responses will be worth more'
                        : 'Concise answers will be rewarded with higher points'}
                    </p>
                  </div>
                </label>
                <input type="hidden" name="longerQuestionsMorePoints" value={longerQuestionsMorePoints.toString()} />
              </div>
            {/if}

            <div class="mt-4">
              <label for="pointAllocationInstructions" class="block text-sm font-medium text-gray-700 mb-2">
                Custom Point Allocation Instructions (Optional)
              </label>
              <textarea
                id="pointAllocationInstructions"
                name="pointAllocationInstructions"
                bind:value={pointAllocationInstructions}
                rows="2"
                class="input text-sm"
                placeholder="e.g., Give programming questions 2x points, essay questions should be worth at least 10 points each..."
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">Add specific instructions for how AI should distribute points.</p>
            </div>
          </div>
        {/if}

        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
          <div class="flex gap-2">
            {#each ['easy', 'medium', 'hard'] as level}
              <button
                type="button"
                onclick={() => difficulty = level as 'easy' | 'medium' | 'hard'}
                class="flex-1 py-2 rounded-lg border-2 font-medium {difficulty === level
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'}"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            {/each}
          </div>
          <input type="hidden" name="difficulty" value={difficulty} />
        </div>

        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-4">Question Types</label>
          <div class="flex flex-wrap gap-2">
            {#each questionTypes as type}
              <button
                type="button"
                onclick={() => toggleType(type.value)}
                class="px-4 py-2 rounded-lg border-2 {selectedTypes.includes(type.value)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'}"
              >
                {type.label}
              </button>
            {/each}
          </div>
          {#each selectedTypes as type}
            <input type="hidden" name="questionTypes" value={type} />
          {/each}
        </div>

        <div class="card p-6">
          <label for="instructions" class="block text-sm font-medium text-gray-700 mb-2">
            Additional Instructions (Optional)
          </label>
          <textarea
            id="instructions"
            name="additionalInstructions"
            rows="2"
            bind:value={additionalInstructions}
            class="input"
            placeholder="e.g., Focus on key dates, avoid essay questions..."
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
          <button type="submit" disabled={loading || !topic || selectedTypes.length === 0} class="btn btn-primary flex-1">
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Questions
            {/if}
          </button>
        </div>
      </form>
    {:else}
      <!-- Review AI Generated Questions -->
      <form
        method="POST"
        action="?/save"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
        class="space-y-6"
      >
        <div class="card p-6 space-y-4">
          <div class="form-group">
            <label for="classId" class="label flex items-center gap-2">
              <BookOpen class="w-4 h-4" />
              Create for Class
            </label>
            <p class="text-xs text-gray-500 mb-2">The test will be linked to this class (you'll open it for students later)</p>
            {#if data.classes.length > 0}
              <select id="classId" name="classId" bind:value={selectedClassId} required class="input">
                <option value="">Select a class...</option>
                {#each data.classes as cls}
                  <option value={cls.id}>{cls.emoji || '📚'} {cls.name}</option>
                {/each}
              </select>
            {:else}
              <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <p class="font-medium">No classes available</p>
                <p class="text-sm mt-1">You need to create a class first before creating a test.</p>
                <a href="/teacher/classes/create" class="text-sm text-yellow-700 underline mt-2 inline-block">Create a class</a>
              </div>
            {/if}
          </div>
          <div class="form-group">
            <label for="title" class="label">Test Title</label>
            <input id="title" name="title" type="text" required bind:value={testTitle} class="input" />
          </div>
          <div class="form-group">
            <label for="description" class="label">Description (Optional)</label>
            <textarea id="description" name="description" rows="2" bind:value={testDescription} class="input"></textarea>
          </div>
          <div class="flex items-center gap-3">
            <input type="checkbox" id="autoGrade" bind:checked={autoGrade} class="w-5 h-5 rounded" />
            <label for="autoGrade" class="font-medium text-gray-700">Enable AI Auto-Grading</label>
          </div>
          <input type="hidden" name="autoGrade" value={autoGrade.toString()} />
        </div>

        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900">Generated Questions ({questions.length})</h3>
            <button type="button" onclick={() => step = 'configure'} class="btn btn-ghost btn-sm">Regenerate</button>
          </div>

          <div class="space-y-4">
            {#each questions as question, index}
              <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="badge badge-primary">{question.type.replace('_', ' ')}</span>
                      <span class="text-sm text-gray-500">{question.points} pts</span>
                    </div>
                    <p class="font-medium text-gray-900">{question.question}</p>

                    {#if question.options?.length > 0}
                      <div class="mt-3 space-y-2">
                        {#each question.options as option, optIndex}
                          {@const isCorrect = option?.toLowerCase() === question.correctAnswer?.toLowerCase()}
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span class="{isCorrect ? 'text-green-700 font-medium' : 'text-gray-600'}">{option}</span>
                          </div>
                        {/each}
                      </div>
                    {:else if question.correctAnswer}
                      <div class="mt-2 text-sm text-green-600">
                        <strong>Answer:</strong> {question.correctAnswer}
                      </div>
                    {/if}
                  </div>
                  <button type="button" onclick={() => removeQuestion(index)} class="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
          <input type="hidden" name="questions" value={JSON.stringify(questions)} />
          {#if currentJobId}
            <input type="hidden" name="jobId" value={currentJobId} />
          {/if}
        </div>

        <div class="flex gap-3">
          <button type="submit" name="status" value="DRAFT" disabled={loading} class="btn btn-primary flex-1">
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
              <Save class="w-4 h-4" />
            {/if}
            Save as Draft
          </button>
        </div>
        <p class="text-center text-sm text-gray-500">Your test will be saved but won't be visible to students yet. You can open it for students from the test details page.</p>
      </form>
    {/if}
  {:else}
    <!-- Manual Creation -->
    <form
      method="POST"
      action="?/saveManual"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          await update();
        };
      }}
      class="space-y-6"
    >
      <div class="card p-6 space-y-4">
        <div class="form-group">
          <label for="manual-classId" class="label flex items-center gap-2">
            <BookOpen class="w-4 h-4" />
            Create for Class
          </label>
          <p class="text-xs text-gray-500 mb-2">The test will be linked to this class (you'll open it for students later)</p>
          {#if data.classes.length > 0}
            <select id="manual-classId" name="classId" bind:value={manualClassId} required class="input">
              <option value="">Select a class...</option>
              {#each data.classes as cls}
                <option value={cls.id}>{cls.emoji || '📚'} {cls.name}</option>
              {/each}
            </select>
          {:else}
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <p class="font-medium">No classes available</p>
              <p class="text-sm mt-1">You need to create a class first before creating a test.</p>
              <a href="/teacher/classes/create" class="text-sm text-yellow-700 underline mt-2 inline-block">Create a class</a>
            </div>
          {/if}
        </div>
        <div class="form-group">
          <label for="manual-title" class="label">Test Title</label>
          <input id="manual-title" name="title" type="text" required bind:value={manualTitle} class="input" />
        </div>
        <div class="form-group">
          <label for="manual-description" class="label">Description (Optional)</label>
          <textarea id="manual-description" name="description" rows="2" bind:value={manualDescription} class="input"></textarea>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="form-group">
            <label for="manual-totalPoints" class="label">Total Points (Optional)</label>
            <input id="manual-totalPoints" name="totalPoints" type="number" min="1" max="1000" bind:value={manualTotalPoints} class="input" placeholder="e.g., 100" />
            <p class="text-xs text-gray-500 mt-1">Current: {manualCurrentPoints} pts</p>
          </div>
          <div class="flex items-center gap-3 pt-6">
            <input type="checkbox" id="manualAutoGrade" bind:checked={manualAutoGrade} class="w-5 h-5 rounded" />
            <label for="manualAutoGrade" class="font-medium text-gray-700">Enable AI Auto-Grading</label>
          </div>
        </div>
        <input type="hidden" name="autoGrade" value={manualAutoGrade.toString()} />
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Questions ({manualQuestions.length})</h3>
          <button type="button" onclick={addManualQuestion} class="btn btn-secondary btn-sm">
            <Plus class="w-4 h-4" />
            Add Question
          </button>
        </div>

        <div class="space-y-6">
          {#each manualQuestions as q, qIndex}
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-start justify-between gap-4 mb-4">
                <span class="text-sm font-medium text-gray-500">Question {qIndex + 1}</span>
                <button
                  type="button"
                  onclick={() => removeManualQuestion(qIndex)}
                  disabled={manualQuestions.length === 1}
                  class="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <div class="space-y-4">
                <div class="grid md:grid-cols-2 gap-4">
                  <select bind:value={q.type} class="input">
                    {#each questionTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>
                  <input
                    type="number"
                    bind:value={q.points}
                    min="1"
                    max="100"
                    class="input"
                    placeholder="Points"
                  />
                </div>

                <textarea
                  bind:value={q.question}
                  rows="2"
                  class="input"
                  placeholder="Enter your question..."
                ></textarea>

                {#if q.type === 'MULTIPLE_CHOICE'}
                  <div class="space-y-2">
                    <label class="text-sm text-gray-500">Answer Options</label>
                    {#each q.options as opt, optIndex}
                      <div class="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct-{qIndex}"
                          checked={q.correctAnswer === opt && opt !== ''}
                          onchange={() => q.correctAnswer = opt}
                          class="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={opt}
                          oninput={(e) => {
                            const newVal = (e.target as HTMLInputElement).value;
                            if (q.correctAnswer === opt) q.correctAnswer = newVal;
                            updateOption(qIndex, optIndex, newVal);
                          }}
                          class="input flex-1"
                          placeholder="Option {String.fromCharCode(65 + optIndex)}"
                        />
                      </div>
                    {/each}
                  </div>
                {:else if q.type === 'TRUE_FALSE'}
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2">
                      <input type="radio" name="tf-{qIndex}" value="True" bind:group={q.correctAnswer} class="w-4 h-4" />
                      True
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="radio" name="tf-{qIndex}" value="False" bind:group={q.correctAnswer} class="w-4 h-4" />
                      False
                    </label>
                  </div>
                {:else if q.type === 'PROGRAMMING'}
                  <div class="space-y-3">
                    <div>
                      <label class="text-sm text-gray-500 mb-1 block">Programming Language</label>
                      <select bind:value={q.programmingLanguage} class="input">
                        {#each programmingLanguages as lang}
                          <option value={lang.value}>{lang.label}</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="text-sm text-gray-500 mb-1 block">Sample Solution / Key Elements (for grading)</label>
                      <textarea
                        bind:value={q.correctAnswer}
                        rows="6"
                        class="input font-mono text-sm"
                        placeholder="Enter sample solution code or key elements the AI should look for..."
                      ></textarea>
                    </div>
                  </div>
                {:else}
                  <input
                    type="text"
                    bind:value={q.correctAnswer}
                    class="input"
                    placeholder="Correct answer (for grading)"
                  />
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <input type="hidden" name="questions" value={JSON.stringify(manualQuestions.filter(q => q.question.trim()))} />
      </div>

      <div class="flex gap-3">
        <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
        <button type="submit" name="status" value="DRAFT" disabled={loading || !manualTitle || !manualClassId} class="btn btn-primary flex-1">
          {#if loading}
            <Loader2 class="w-4 h-4 animate-spin" />
          {:else}
            <Save class="w-4 h-4" />
          {/if}
          Save as Draft
        </button>
      </div>
      <p class="text-center text-sm text-gray-500 mt-3">Your test will be saved but won't be visible to students yet. You can open it for students from the test details page.</p>
    </form>
  {/if}
</div>
