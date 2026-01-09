<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    FileText,
    Plus,
    Trash2,
    AlertCircle,
    Save,
    GripVertical,
    Sparkles,
    Send,
    Loader2,
    MessageSquare,
    X
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

  // AI Assistant state
  let assistantOpen = $state(false);
  let assistantInput = $state('');
  let assistantLoading = $state(false);
  let assistantError = $state('');
  let assistantMessages = $state<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const questionTypes = [
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'TRUE_FALSE', label: 'True/False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
    { value: 'ESSAY', label: 'Essay' },
    { value: 'LONG_ANSWER', label: 'Long Answer' },
    { value: 'PROGRAMMING', label: 'Programming' }
  ];

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
    { value: 'go', label: 'Go' }
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
        aiGenerated: false,
        programmingLanguage: 'python'
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

  async function sendAssistantMessage() {
    if (!assistantInput.trim() || assistantLoading) return;

    const userMessage = assistantInput.trim();
    assistantInput = '';
    assistantError = '';
    assistantLoading = true;

    // Add user message to chat
    assistantMessages = [...assistantMessages, { role: 'user', content: userMessage }];

    try {
      const response = await fetch('/api/test-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'edit',
          instruction: userMessage,
          questions: questions,
          testTitle: title,
          testDescription: description,
          testId: data.test.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process request');
      }

      const result = await response.json();
      
      // Update questions with the AI's modifications
      questions = result.questions;
      
      // Add assistant response to chat
      assistantMessages = [...assistantMessages, { role: 'assistant', content: result.explanation }];
    } catch (err) {
      assistantError = err instanceof Error ? err.message : 'Something went wrong';
      // Remove the user message on error
      assistantMessages = assistantMessages.slice(0, -1);
    } finally {
      assistantLoading = false;
    }
  }

  function handleAssistantKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAssistantMessage();
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
                          checked={question.correctAnswer?.toLowerCase() === 'true'}
                          onchange={() => (question.correctAnswer = 'True')}
                          class="w-4 h-4"
                        />
                        True
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tf-{qIndex}"
                          checked={question.correctAnswer?.toLowerCase() === 'false'}
                          onchange={() => (question.correctAnswer = 'False')}
                          class="w-4 h-4"
                        />
                        False
                      </label>
                    </div>
                  </div>
                {:else if question.type === 'PROGRAMMING'}
                  <div class="space-y-3">
                    <div>
                      <label class="label">Programming Language</label>
                      <select 
                        value={(question.options as any)?.programmingLanguage || 'python'}
                        onchange={(e) => {
                          question.options = { programmingLanguage: e.currentTarget.value };
                          questions = [...questions];
                        }}
                        class="input"
                      >
                        {#each programmingLanguages as lang}
                          <option value={lang.value}>{lang.label}</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="label">Sample Solution / Key Elements</label>
                      <textarea
                        bind:value={question.correctAnswer}
                        rows="6"
                        class="input font-mono text-sm"
                        placeholder="Enter sample solution code or key elements..."
                      ></textarea>
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

<!-- AI Assistant Panel -->
<div class="fixed bottom-4 right-4 z-50">
  {#if !assistantOpen}
    <button
      onclick={() => assistantOpen = true}
      class="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      title="AI Assistant"
    >
      <Sparkles class="w-6 h-6" />
    </button>
  {:else}
    <div class="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style="max-height: 500px;">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2 text-white">
          <Sparkles class="w-5 h-5" />
          <span class="font-semibold">AI Assistant</span>
        </div>
        <button
          onclick={() => assistantOpen = false}
          class="text-white/80 hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {#if assistantMessages.length === 0}
          <div class="text-center text-gray-500 text-sm py-8">
            <MessageSquare class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p class="font-medium">How can I help?</p>
            <p class="text-xs mt-1">Try things like:</p>
            <ul class="text-xs mt-2 space-y-1 text-left max-w-[200px] mx-auto">
              <li>• "Add 3 more questions about photosynthesis"</li>
              <li>• "Delete question 5"</li>
              <li>• "Make question 2 easier"</li>
              <li>• "Change all points to 5"</li>
            </ul>
          </div>
        {:else}
          {#each assistantMessages as message}
            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[85%] rounded-lg px-3 py-2 text-sm {message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}">
                {message.content}
              </div>
            </div>
          {/each}
          {#if assistantLoading}
            <div class="flex justify-start">
              <div class="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Error -->
      {#if assistantError}
        <div class="px-4 py-2 bg-red-50 border-t border-red-100">
          <p class="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            {assistantError}
          </p>
        </div>
      {/if}

      <!-- Input -->
      <div class="border-t border-gray-200 p-3">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={assistantInput}
            onkeydown={handleAssistantKeydown}
            placeholder="Ask AI to modify your test..."
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={assistantLoading}
          />
          <button
            onclick={sendAssistantMessage}
            disabled={!assistantInput.trim() || assistantLoading}
            class="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">Each message uses 1 AI request</p>
      </div>
    </div>
  {/if}
</div>
