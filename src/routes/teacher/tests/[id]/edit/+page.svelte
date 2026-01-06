<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    FileText,
    Plus,
    Trash2,
    AlertCircle,
    Save,
    GripVertical
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let title = $state(data.test.title);
  let description = $state(data.test.description || '');
  let autoGrade = $state(data.test.autoGrade);
  let questions = $state(
    data.test.questions.map((q) => ({
      type: q.type,
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer || '',
      points: q.points,
      aiGenerated: q.aiGenerated
    }))
  );

  const questionTypes = [
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'TRUE_FALSE', label: 'True/False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
    { value: 'ESSAY', label: 'Essay' }
  ];

  function addQuestion() {
    questions = [
      ...questions,
      {
        type: 'MULTIPLE_CHOICE',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        aiGenerated: false
      }
    ];
  }

  function removeQuestion(index: number) {
    questions = questions.filter((_, i) => i !== index);
  }

  function addOption(questionIndex: number) {
    const q = questions[questionIndex];
    const currentOptions = Array.isArray(q.options) ? q.options as string[] : [];
    q.options = [...currentOptions, ''];
    questions = [...questions];
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const q = questions[questionIndex];
    if (Array.isArray(q.options)) {
      q.options = (q.options as string[]).filter((_, i) => i !== optionIndex);
      questions = [...questions];
    }
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const q = questions[questionIndex];
    if (Array.isArray(q.options)) {
      const opts = q.options as string[];
      opts[optionIndex] = value;
      q.options = opts;
      questions = [...questions];
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a
      href="/teacher/tests/{data.test.id}"
      class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft class="w-4 h-4" />
      Back to Test
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-blue-600" />
      </div>
      Edit Test
    </h1>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  <form method="POST" action="?/update" use:enhance class="space-y-6">
    <!-- Basic Info -->
    <div class="card p-6">
      <h2 class="font-semibold text-gray-900 mb-4">Test Details</h2>

      <div class="space-y-4">
        <div class="form-group">
          <label for="title" class="label">Title</label>
          <input id="title" name="title" type="text" required bind:value={title} class="input" />
        </div>

        <div class="form-group">
          <label for="description" class="label">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            rows="2"
            bind:value={description}
            class="input"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={autoGrade} class="w-4 h-4 rounded" />
            <span class="text-sm font-medium text-gray-700">Auto-grade objective questions</span>
          </label>
          <input type="hidden" name="autoGrade" value={autoGrade.toString()} />
        </div>
      </div>
    </div>

    <!-- Questions -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-gray-900">Questions ({questions.length})</h2>
        <button type="button" onclick={addQuestion} class="btn btn-secondary btn-sm">
          <Plus class="w-4 h-4" />
          Add Question
        </button>
      </div>

      <div class="space-y-6">
        {#each questions as question, qIndex}
          <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div class="flex items-start gap-3 mb-4">
              <div class="p-2 text-gray-400 cursor-move">
                <GripVertical class="w-4 h-4" />
              </div>

              <div class="flex-1 space-y-4">
                <div class="flex items-start gap-4">
                  <div class="flex-1">
                    <label class="label">Question {qIndex + 1}</label>
                    <textarea
                      bind:value={question.question}
                      rows="2"
                      class="input"
                      placeholder="Enter your question..."
                    ></textarea>
                  </div>

                  <div class="w-32">
                    <label class="label">Points</label>
                    <input
                      type="number"
                      min="1"
                      bind:value={question.points}
                      class="input text-center"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="flex-1">
                    <label class="label">Type</label>
                    <select bind:value={question.type} class="input">
                      {#each questionTypes as type}
                        <option value={type.value}>{type.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                {#if question.type === 'MULTIPLE_CHOICE' && Array.isArray(question.options)}
                  <div>
                    <label class="label">Options</label>
                    <div class="space-y-2">
                      {#each (question.options as string[]) as option, oIndex}
                        <div class="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct-{qIndex}"
                            checked={question.correctAnswer === option}
                            onchange={() => (question.correctAnswer = option)}
                            class="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={option}
                            oninput={(e) => updateOption(qIndex, oIndex, e.currentTarget.value)}
                            class="input flex-1"
                            placeholder="Option {String.fromCharCode(65 + oIndex)}"
                          />
                          {#if Array.isArray(question.options) && question.options.length > 2}
                            <button
                              type="button"
                              onclick={() => removeOption(qIndex, oIndex)}
                              class="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 class="w-4 h-4" />
                            </button>
                          {/if}
                        </div>
                      {/each}
                    </div>
                    {#if Array.isArray(question.options) && question.options.length < 6}
                      <button
                        type="button"
                        onclick={() => addOption(qIndex)}
                        class="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Option
                      </button>
                    {/if}
                  </div>
                {:else if question.type === 'TRUE_FALSE'}
                  <div>
                    <label class="label">Correct Answer</label>
                    <div class="flex gap-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tf-{qIndex}"
                          checked={question.correctAnswer === 'true'}
                          onchange={() => (question.correctAnswer = 'true')}
                          class="w-4 h-4"
                        />
                        True
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tf-{qIndex}"
                          checked={question.correctAnswer === 'false'}
                          onchange={() => (question.correctAnswer = 'false')}
                          class="w-4 h-4"
                        />
                        False
                      </label>
                    </div>
                  </div>
                {:else}
                  <div>
                    <label class="label">Correct Answer</label>
                    <input
                      type="text"
                      bind:value={question.correctAnswer}
                      class="input"
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                {/if}
              </div>

              <button
                type="button"
                onclick={() => removeQuestion(qIndex)}
                disabled={questions.length === 1}
                class="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        {/each}

        {#if questions.length === 0}
          <div class="text-center py-8 text-gray-500">
            <p>No questions yet. Click "Add Question" to get started.</p>
          </div>
        {/if}
      </div>

      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <a href="/teacher/tests/{data.test.id}" class="btn btn-secondary">Cancel</a>
      <button type="submit" disabled={!title || questions.length === 0} class="btn btn-primary flex-1">
        <Save class="w-4 h-4" />
        Save Changes
      </button>
    </div>
  </form>
</div>
