<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    AlertTriangle,
    CheckCircle,
    Circle,
    Bookmark,
    Flag,
    Loader2,
    Sparkles
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let currentIndex = $state(0);
  let answers = $state<Record<string, string>>({});
  let flagged = $state<Set<string>>(new Set());
  let showSubmitConfirm = $state(false);
  let showReviewMode = $state(false);
  let saving = $state(false);
  let submitting = $state(false);
  let timeRemaining = $state<number | null>(null);

  // Initialize answers from saved data
  $effect(() => {
    const initialAnswers: Record<string, string> = {};
    for (const q of data.questions) {
      if (q.currentAnswer) {
        initialAnswers[q.id] = q.currentAnswer;
      }
    }
    answers = initialAnswers;
  });

  // Timer
  $effect(() => {
    if (data.test.timeLimit) {
      const startTime = new Date(data.submission.startedAt).getTime();
      const endTime = startTime + data.test.timeLimit * 60 * 1000;

      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        timeRemaining = Math.floor(remaining / 1000);

        if (remaining <= 0) {
          const form = document.getElementById('submit-form') as HTMLFormElement | null;
          form?.requestSubmit();
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const currentQuestion = $derived(data.questions[currentIndex]);
  const answeredCount = $derived(Object.keys(answers).filter((k) => answers[k]).length);
  const progress = $derived((answeredCount / data.questions.length) * 100);
  const totalPoints = $derived(data.questions.reduce((sum, q) => sum + q.points, 0));

  function goTo(index: number) {
    if (index >= 0 && index < data.questions.length) {
      currentIndex = index;
      showReviewMode = false;
    }
  }

  function toggleFlag(questionId: string) {
    const newFlagged = new Set(flagged);
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    flagged = newFlagged;
  }

  async function saveAnswer(questionId: string, answer: string) {
    answers[questionId] = answer;
    saving = true;

    const formData = new FormData();
    formData.append('questionId', questionId);
    formData.append('answer', answer);

    await fetch(`?/saveAnswer`, {
      method: 'POST',
      body: formData
    });

    saving = false;
  }

  function getQuestionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MULTIPLE_CHOICE: 'Multiple Choice',
      TRUE_FALSE: 'True / False',
      SHORT_ANSWER: 'Short Answer',
      LONG_ANSWER: 'Long Answer',
      ESSAY: 'Essay',
      FILL_IN_BLANK: 'Fill in the Blank'
    };
    return labels[type] || type;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <!-- Floating Header -->
  <div
    class="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-20 shadow-sm"
  >
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h1 class="font-semibold text-gray-900 truncate">{data.test.title}</h1>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span class="font-medium text-blue-600"
              >Question {currentIndex + 1} of {data.questions.length}</span
            >
            <span class="hidden sm:inline">|</span>
            <span class="hidden sm:inline">{totalPoints} total points</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          {#if saving}
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <div
                class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              ></div>
              <span class="hidden sm:inline">Saving...</span>
            </div>
          {/if}

          {#if timeRemaining !== null}
            <div
              class="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all {timeRemaining <
              300
                ? 'bg-red-100 text-red-700 animate-pulse'
                : timeRemaining < 600
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'}"
            >
              <Clock class="w-4 h-4" />
              <span class="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Progress Bar with Dots -->
      <div class="mt-3">
        <div class="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {#each data.questions as q, i}
            {@const isAnswered = !!answers[q.id]}
            {@const isCurrent = i === currentIndex}
            {@const isFlagged = flagged.has(q.id)}
            <button
              onclick={() => goTo(i)}
              class="relative group flex-shrink-0"
              title="Question {i + 1}"
            >
              <div
                class="w-3 h-3 rounded-full transition-all duration-200 {isCurrent
                  ? 'w-6 bg-blue-600 ring-4 ring-blue-100'
                  : isAnswered
                    ? 'bg-emerald-500'
                    : 'bg-gray-300 hover:bg-gray-400'}"
              ></div>
              {#if isFlagged}
                <div class="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
              {/if}
            </button>
          {/each}
        </div>
        <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{answeredCount} answered</span>
          <span>{data.questions.length - answeredCount} remaining</span>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    {#if showReviewMode}
      <!-- Review Mode -->
      <div class="space-y-4">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Review Your Answers</h2>
          <button onclick={() => (showReviewMode = false)} class="btn btn-secondary">
            <ChevronLeft class="w-4 h-4" />
            Back to Test
          </button>
        </div>

        {#each data.questions as q, i}
          {@const isAnswered = !!answers[q.id]}
          {@const isFlagged = flagged.has(q.id)}
          <button
            onclick={() => goTo(i)}
            class="w-full text-left card p-4 hover:shadow-md transition-all border-2 {isFlagged
              ? 'border-orange-200 bg-orange-50'
              : isAnswered
                ? 'border-emerald-200'
                : 'border-red-200 bg-red-50'}"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-gray-900">Question {i + 1}</span>
                  <span class="badge badge-gray text-xs">{getQuestionTypeLabel(q.type)}</span>
                  {#if isFlagged}
                    <Flag class="w-4 h-4 text-orange-500" />
                  {/if}
                </div>
                <p class="text-gray-600 text-sm truncate">{q.question.replace(/<[^>]*>/g, '')}</p>
              </div>
              <div class="flex-shrink-0">
                {#if isAnswered}
                  <CheckCircle class="w-6 h-6 text-emerald-500" />
                {:else}
                  <Circle class="w-6 h-6 text-gray-300" />
                {/if}
              </div>
            </div>
            {#if isAnswered && answers[q.id]}
              <div class="mt-2 pt-2 border-t border-gray-100">
                <p class="text-sm text-gray-500">Your answer:</p>
                <p class="text-sm font-medium text-gray-800 truncate">{answers[q.id]}</p>
              </div>
            {/if}
          </button>
        {/each}

        <div class="sticky bottom-4 mt-8">
          <button onclick={() => (showSubmitConfirm = true)} class="w-full btn btn-primary btn-lg">
            <Send class="w-5 h-5" />
            Submit Test
          </button>
        </div>
      </div>
    {:else}
      <!-- Question View -->
      <div class="grid lg:grid-cols-4 gap-6">
        <!-- Sidebar (Desktop) -->
        <div class="hidden lg:block lg:col-span-1">
          <div class="card p-4 sticky top-32">
            <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bookmark class="w-4 h-4" />
              Questions
            </h3>
            <div class="grid grid-cols-4 gap-2">
              {#each data.questions as q, i}
                {@const isAnswered = !!answers[q.id]}
                {@const isCurrent = i === currentIndex}
                {@const isFlagged = flagged.has(q.id)}
                <button
                  onclick={() => goTo(i)}
                  class="relative w-10 h-10 rounded-lg text-sm font-medium transition-all {isCurrent
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                    : isAnswered
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                >
                  {i + 1}
                  {#if isFlagged}
                    <div
                      class="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
                    ></div>
                  {/if}
                </button>
              {/each}
            </div>

            <div class="mt-6 space-y-3 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div>
                <span class="text-gray-600">Answered ({answeredCount})</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                <span class="text-gray-600"
                  >Unanswered ({data.questions.length - answeredCount})</span
                >
              </div>
              {#if flagged.size > 0}
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                  <span class="text-gray-600">Flagged ({flagged.size})</span>
                </div>
              {/if}
            </div>

            <button
              onclick={() => (showReviewMode = true)}
              class="w-full mt-6 btn btn-secondary btn-sm"
            >
              Review All
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-3">
          <!-- Question Card -->
          <div
            class="card overflow-hidden shadow-lg shadow-gray-200/50 border-0 bg-white"
          >
            <!-- Question Header -->
            <div
              class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between"
            >
              <div>
                <div class="flex items-center gap-2 text-blue-100 text-sm mb-1">
                  <span>{getQuestionTypeLabel(currentQuestion.type)}</span>
                  <span>|</span>
                  <span
                    >{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</span
                  >
                </div>
                <h2 class="text-lg font-semibold">Question {currentIndex + 1}</h2>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onclick={() => toggleFlag(currentQuestion.id)}
                  class="p-2 rounded-lg transition-all {flagged.has(currentQuestion.id)
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'}"
                  title="Flag for review"
                >
                  <Flag class="w-5 h-5" />
                </button>
                {#if answers[currentQuestion.id]}
                  <div class="p-2 rounded-lg bg-emerald-500">
                    <CheckCircle class="w-5 h-5" />
                  </div>
                {/if}
              </div>
            </div>

            <!-- Question Content -->
            <div class="p-6 sm:p-8">
              <!-- Question Text -->
              <div class="text-lg text-gray-900 mb-8 leading-relaxed prose prose-blue max-w-none">
                {@html currentQuestion.question}
              </div>

              <!-- Answer Input -->
              <div class="space-y-3">
                {#if currentQuestion.type === 'MULTIPLE_CHOICE'}
                  {#each (currentQuestion.options as string[]) || [] as option, i}
                    {@const isSelected = answers[currentQuestion.id] === option}
                    <label
                      class="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 {isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                        : 'border-gray-200 bg-white'}"
                    >
                      <div
                        class="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold transition-all {isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 text-gray-500'}"
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={isSelected}
                        onchange={() => saveAnswer(currentQuestion.id, option)}
                        class="sr-only"
                      />
                      <span class="text-gray-900 flex-1">{option}</span>
                      {#if isSelected}
                        <CheckCircle class="w-6 h-6 text-blue-500 flex-shrink-0" />
                      {/if}
                    </label>
                  {/each}
                {:else if currentQuestion.type === 'TRUE_FALSE'}
                  <div class="grid grid-cols-2 gap-4">
                    {#each ['True', 'False'] as option}
                      {@const isSelected = answers[currentQuestion.id] === option}
                      <label
                        class="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-blue-300 {isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                          : 'border-gray-200 bg-white'}"
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={isSelected}
                          onchange={() => saveAnswer(currentQuestion.id, option)}
                          class="sr-only"
                        />
                        <div
                          class="w-12 h-12 rounded-full flex items-center justify-center transition-all {isSelected
                            ? option === 'True'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-500'}"
                        >
                          {#if option === 'True'}
                            <CheckCircle class="w-6 h-6" />
                          {:else}
                            <svg
                              class="w-6 h-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          {/if}
                        </div>
                        <span class="font-semibold text-gray-900">{option}</span>
                      </label>
                    {/each}
                  </div>
                {:else if currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'FILL_IN_BLANK'}
                  <div class="relative">
                    <input
                      type="text"
                      value={answers[currentQuestion.id] || ''}
                      oninput={(e) => saveAnswer(currentQuestion.id, e.currentTarget.value)}
                      placeholder="Type your answer here..."
                      class="input text-lg py-4 pr-12"
                    />
                    {#if answers[currentQuestion.id]}
                      <CheckCircle
                        class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500"
                      />
                    {/if}
                  </div>
                {:else}
                  <div class="relative">
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      oninput={(e) => saveAnswer(currentQuestion.id, e.currentTarget.value)}
                      placeholder="Write your answer here..."
                      rows="8"
                      class="input text-base leading-relaxed resize-none"
                    ></textarea>
                    <div class="absolute bottom-3 right-3 text-xs text-gray-400">
                      {(answers[currentQuestion.id] || '').length} characters
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex items-center justify-between mt-6 gap-4">
            <button
              onclick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              class="btn btn-secondary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft class="w-5 h-5" />
              <span class="hidden sm:inline">Previous</span>
            </button>

            <div class="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <span
                class="font-medium {answeredCount === data.questions.length
                  ? 'text-emerald-600'
                  : ''}"
              >
                {answeredCount}/{data.questions.length}
              </span>
              answered
            </div>

            {#if currentIndex === data.questions.length - 1}
              <button
                onclick={() => (showSubmitConfirm = true)}
                class="btn btn-primary flex-1 sm:flex-none"
              >
                <Send class="w-5 h-5" />
                <span>Submit</span>
              </button>
            {:else}
              <button onclick={() => goTo(currentIndex + 1)} class="btn btn-primary flex-1 sm:flex-none">
                <span class="hidden sm:inline">Next</span>
                <ChevronRight class="w-5 h-5" />
              </button>
            {/if}
          </div>

          <!-- Mobile Review Button -->
          <button
            onclick={() => (showReviewMode = true)}
            class="lg:hidden w-full mt-4 btn btn-secondary"
          >
            <Bookmark class="w-4 h-4" />
            Review All Questions
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Submit Confirmation Modal -->
{#if showSubmitConfirm}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && (showSubmitConfirm = false)}
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
      <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center text-white">
        <div
          class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"
        >
          <AlertTriangle class="w-8 h-8" />
        </div>
        <h2 class="text-xl font-bold">Ready to Submit?</h2>
        <p class="text-amber-100 mt-1">You cannot change your answers after submitting.</p>
      </div>

      <div class="p-6">
        <div class="bg-gray-50 rounded-xl p-4 mb-4">
          <div class="flex justify-between items-center mb-3">
            <span class="text-gray-600">Progress</span>
            <span class="font-bold text-gray-900"
              >{answeredCount} / {data.questions.length} answered</span
            >
          </div>
          <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style="width: {progress}%"
            ></div>
          </div>
        </div>

        {#if answeredCount < data.questions.length}
          <div
            class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
          >
            <AlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">Incomplete Test</p>
              <p class="text-sm mt-0.5">
                You have {data.questions.length - answeredCount} unanswered question{data.questions
                  .length -
                  answeredCount !==
                1
                  ? 's'
                  : ''}.
              </p>
            </div>
          </div>
        {:else}
          <div
            class="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"
          >
            <CheckCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">All Questions Answered</p>
              <p class="text-sm mt-0.5">Great job! You've completed all questions.</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button onclick={() => (showSubmitConfirm = false)} class="btn btn-secondary flex-1" disabled={submitting}>
          Review Answers
        </button>
        <form id="submit-form" method="POST" action="?/submit" use:enhance={() => {
          submitting = true;
          return async () => {
            // Don't reset submitting - page will redirect
          };
        }} class="flex-1">
          <button type="submit" class="w-full btn btn-primary" disabled={submitting}>
            {#if submitting}
              <Loader2 class="w-4 h-4 animate-spin" />
              Submitting...
            {:else}
              <Send class="w-4 h-4" />
              Submit Test
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Grading Modal (shows while AI is grading) -->
{#if submitting}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center animate-in">
      <div class="w-20 h-20 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
        <Sparkles class="w-10 h-10 text-indigo-600 animate-pulse" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Grading Your Test</h2>
      <p class="text-gray-600 mb-4">
        Your answers are being submitted and graded. This may take a moment...
      </p>
      <div class="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
        <Loader2 class="w-4 h-4 animate-spin" />
        Please wait
      </div>
      <div class="border-t pt-4">
        <p class="text-xs text-gray-500 mb-3">You can check back later for your results</p>
        <a 
          href="/student" 
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
          Back to Home
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  @keyframes zoom-in-95 {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-in {
    animation: zoom-in-95 0.2s ease-out;
  }
</style>
