<script lang="ts">
  import { enhance } from '$app/forms';
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
    BookOpen
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

  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualAutoGrade = $state(true);
  let manualClassId = $state('');
  let manualTotalPoints = $state<number | null>(null);
  let manualQuestions = $state<{ type: string; question: string; options: string[]; correctAnswer: string; points: number }[]>([
    { type: 'MULTIPLE_CHOICE', question: '', options: ['', '', '', ''], correctAnswer: '', points: 1 }
  ]);

  // Calculate current total points for manual questions
  let manualCurrentPoints = $derived(manualQuestions.reduce((sum, q) => sum + q.points, 0));

  const questionTypes = [
    { value: 'TRUE_FALSE', label: 'True/False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'LONG_ANSWER', label: 'Long Answer' },
    { value: 'ESSAY', label: 'Essay' },
    { value: 'FILL_IN_BLANK', label: 'Fill in Blank' }
  ];

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
      points: 1
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

        <div class="grid md:grid-cols-2 gap-6">
          <div class="card p-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
            <input
              name="numberOfQuestions"
              type="range"
              min="5"
              max="30"
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
              Assign to Class
            </label>
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
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {option === question.correctAnswer ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span class="{option === question.correctAnswer ? 'text-green-700 font-medium' : 'text-gray-600'}">{option}</span>
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
            Save Test
          </button>
        </div>
        <p class="text-center text-sm text-gray-500">You can publish the test later from the test details page.</p>
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
            Assign to Class
          </label>
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
          Save Test
        </button>
      </div>
      <p class="text-center text-sm text-gray-500 mt-3">You can publish the test later from the test details page.</p>
    </form>
  {/if}
</div>
