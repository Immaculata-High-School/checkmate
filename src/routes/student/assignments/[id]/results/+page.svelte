<script lang="ts">
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Trophy,
    AlertCircle,
    Sparkles,
    RefreshCw,
    Target,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Loader2
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const aiGraded = $derived($page.url.searchParams.get('aiGraded') === 'true');
  const isQueued = $derived($page.url.searchParams.get('queued') === 'true');
  const queuePosition = $derived(parseInt($page.url.searchParams.get('position') || '0'));
  
  let expandedQuestions = $state<Set<number>>(new Set());
  let pollingInterval: NodeJS.Timeout | null = null;

  // Poll for updates if submission is pending/queued
  onMount(() => {
    if (data.submission.status === 'PENDING' || isQueued) {
      pollingInterval = setInterval(() => {
        invalidateAll();
      }, 5000); // Check every 5 seconds
    }
  });

  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });

  // Stop polling when graded
  $effect(() => {
    if (data.submission.status === 'GRADED' && pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  });

  function toggleQuestion(index: number) {
    const newSet = new Set(expandedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    expandedQuestions = newSet;
  }

  function expandAll() {
    expandedQuestions = new Set(data.questions.map((_: unknown, i: number) => i));
  }

  function collapseAll() {
    expandedQuestions = new Set();
  }

  function getGradeLetter(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  function getGradeColor(percentage: number): string {
    if (percentage >= 90) return 'from-emerald-500 to-green-600';
    if (percentage >= 80) return 'from-blue-500 to-indigo-600';
    if (percentage >= 70) return 'from-yellow-500 to-amber-600';
    if (percentage >= 60) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-700';
  }

  function getGradeTextColor(percentage: number): string {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  function getGradeBg(percentage: number): string {
    if (percentage >= 90) return 'bg-emerald-50 border-emerald-200';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  }

  function formatDate(date: Date | string | null) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getQuestionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MULTIPLE_CHOICE: 'Multiple Choice',
      TRUE_FALSE: 'True/False',
      SHORT_ANSWER: 'Short Answer',
      LONG_ANSWER: 'Long Answer',
      ESSAY: 'Essay',
      FILL_IN_BLANK: 'Fill in the Blank',
      PROGRAMMING: 'Programming'
    };
    return labels[type] || type.replace('_', ' ');
  }

  const correctCount = $derived(data.questions.filter((q: { isCorrect: boolean | null }) => q.isCorrect === true).length);
  const incorrectCount = $derived(data.questions.filter((q: { isCorrect: boolean | null }) => q.isCorrect === false).length);
</script>

<svelte:head>
  <title>Results - {data.test.title} | Checkmate</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <a href="/student/assignments" class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
        <ArrowLeft class="w-5 h-5" />
        <span>Back to Assignments</span>
      </a>
      {#if data.retakeInfo.canRetake}
        <a href="/student/assignments/{data.test.id}" class="btn btn-primary">
          <RefreshCw class="w-4 h-4" />
          Retake Test
        </a>
      {/if}
    </div>

    <!-- Hero Score Section -->
    <div class="rounded-2xl bg-white shadow-lg border border-gray-200 mb-8">
      {#if data.submission.status === 'GRADED'}
        <div class="p-8 md:p-10">
          <div class="flex flex-col md:flex-row items-center gap-8">
            <!-- Score Display -->
            <div class="text-center">
              <div class="text-7xl font-black {getGradeTextColor(data.submission.percentage)}">{getGradeLetter(data.submission.percentage)}</div>
              <div class="text-2xl font-bold text-gray-900 mt-1">{data.submission.percentage}%</div>
              {#if data.submission.percentage >= 90}
                <div class="flex items-center justify-center gap-1.5 mt-2 text-amber-500">
                  <Trophy class="w-5 h-5" />
                  <span class="text-sm font-medium">Excellent!</span>
                </div>
              {/if}
            </div>

            <!-- Score Details -->
            <div class="flex-1 text-center md:text-left">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{data.test.title}</h1>
              <p class="text-gray-500 mb-4">by {data.test.teacher.name}</p>
              
              <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                <div class="flex items-center gap-2 px-4 py-2 rounded-full {getGradeBg(data.submission.percentage)} border">
                  <Target class="w-4 h-4 {getGradeTextColor(data.submission.percentage)}" />
                  <span class="font-semibold {getGradeTextColor(data.submission.percentage)}">
                    {(data.submission.score || 0) + (data.submission.bonusPoints || 0)}/{data.submission.totalPoints} points{data.submission.bonusPoints ? ` (+${data.submission.bonusPoints} bonus)` : ''}
                  </span>
                </div>
                {#if data.retakeInfo.maxAttempts !== 1}
                  <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border border-gray-200">
                    <RefreshCw class="w-4 h-4 text-gray-600" />
                    <span class="font-medium text-gray-700">
                      Attempt {data.submission.attemptNumber} of {data.retakeInfo.maxAttempts === 0 ? '∞' : data.retakeInfo.maxAttempts}
                    </span>
                  </div>
                {/if}
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div class="text-2xl font-bold text-emerald-600">{correctCount}</div>
                  <div class="text-xs text-emerald-600 font-medium">Correct</div>
                </div>
                <div class="text-center p-3 rounded-xl bg-red-50 border border-red-100">
                  <div class="text-2xl font-bold text-red-600">{incorrectCount}</div>
                  <div class="text-xs text-red-600 font-medium">Incorrect</div>
                </div>
                <div class="text-center p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div class="text-2xl font-bold text-gray-600">{data.questions.length}</div>
                  <div class="text-xs text-gray-600 font-medium">Total</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4" />
              <span>Submitted {formatDate(data.submission.submittedAt)}</span>
            </div>
            {#if data.submission.gradedAt}
              <div class="flex items-center gap-2">
                <CheckCircle class="w-4 h-4" />
                <span>Graded {formatDate(data.submission.gradedAt)}</span>
              </div>
            {/if}
            {#if aiGraded}
              <div class="flex items-center gap-2 text-indigo-600">
                <Sparkles class="w-4 h-4" />
                <span>AI Graded</span>
              </div>
            {/if}
          </div>
        </div>

      {:else if data.submission.status === 'PENDING'}
        <div class="p-12 text-center">
          {#if isQueued}
            <!-- Queued for AI Grading -->
            <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">{data.test.title}</h1>
            <p class="text-gray-500 mb-4">by {data.test.teacher.name}</p>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
              <Sparkles class="w-4 h-4" />
              Grading in Progress
            </div>
            <p class="text-gray-600 mt-6">Your test is being graded by AI.</p>
            {#if queuePosition > 0}
              <p class="text-sm text-gray-500 mt-2">Queue position: {queuePosition}</p>
            {/if}
            <p class="text-sm text-gray-400 mt-2">This page will automatically update when grading is complete.</p>
          {:else}
            <!-- Pending Manual Review -->
            <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock class="w-12 h-12 text-amber-600" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">{data.test.title}</h1>
            <p class="text-gray-500 mb-4">by {data.test.teacher.name}</p>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
              <Clock class="w-4 h-4" />
              Pending Review
            </div>
            <p class="text-gray-500 mt-6">Your submission is waiting to be graded by your teacher.</p>
          {/if}
          <p class="text-sm text-gray-400 mt-2">Submitted {formatDate(data.submission.submittedAt)}</p>
        </div>

      {:else}
        <div class="p-12 text-center">
          <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
            <CheckCircle class="w-12 h-12 text-purple-600" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{data.test.title}</h1>
          <p class="text-gray-500 mb-4">by {data.test.teacher.name}</p>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-medium">
            <CheckCircle class="w-4 h-4" />
            Submitted
          </div>
          <p class="text-gray-500 mt-6">Your answers have been recorded.</p>
        </div>
      {/if}
    </div>

    <!-- Feedback Section -->
    {#if data.submission.feedback}
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 {aiGraded ? 'border-indigo-500' : 'border-blue-500'}">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-full {aiGraded ? 'bg-indigo-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0">
            {#if aiGraded}
              <Sparkles class="w-5 h-5 text-indigo-600" />
            {:else}
              <MessageSquare class="w-5 h-5 text-blue-600" />
            {/if}
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 mb-2">
              {aiGraded ? 'AI Feedback' : 'Teacher Feedback'}
            </h3>
            <p class="text-gray-700 leading-relaxed">{data.submission.feedback}</p>
          </div>
        </div>
      </div>
    {/if}

    {#if aiGraded}
      <div class="bg-indigo-50 rounded-xl p-4 mb-8 flex items-center gap-3 border border-indigo-100">
        <Sparkles class="w-5 h-5 text-indigo-600 flex-shrink-0" />
        <p class="text-sm text-indigo-700">
          This test was automatically graded by AI. Your teacher may review and adjust scores.
        </p>
      </div>
    {/if}

    <!-- Retake Banner -->
    {#if data.retakeInfo.canRetake}
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <RefreshCw class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-semibold text-lg">Ready to improve your score?</h3>
              <p class="text-white/80 text-sm">
                You have {data.retakeInfo.maxAttempts === 0 ? 'unlimited' : (data.retakeInfo.maxAttempts - data.retakeInfo.attemptsUsed)} attempt{data.retakeInfo.maxAttempts - data.retakeInfo.attemptsUsed !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>
          <a href="/student/assignments/{data.test.id}" class="btn bg-white text-indigo-600 hover:bg-gray-100 shadow-lg">
            <RefreshCw class="w-4 h-4" />
            Retake Test
          </a>
        </div>
      </div>
    {/if}

    <!-- Questions Review -->
    {#if data.test.showResultsImmediately && data.submission.status === 'GRADED'}
      <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">Question Review</h2>
          <div class="flex items-center gap-2">
            <button onclick={expandAll} class="btn btn-sm btn-secondary">Expand All</button>
            <button onclick={collapseAll} class="btn btn-sm btn-secondary">Collapse All</button>
          </div>
        </div>

        <div class="divide-y divide-gray-100">
          {#each data.questions as question, i}
            {@const isExpanded = expandedQuestions.has(i)}
            <div class="transition-colors {question.isCorrect ? 'bg-white' : question.isCorrect === false ? 'bg-red-50/30' : 'bg-gray-50/30'}">
              <!-- Question Header (Clickable) -->
              <button
                onclick={() => toggleQuestion(i)}
                class="w-full p-6 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <!-- Status Icon -->
                <div class="flex-shrink-0">
                  {#if question.isCorrect === true}
                    <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle class="w-5 h-5 text-emerald-600" />
                    </div>
                  {:else if question.isCorrect === false}
                    <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle class="w-5 h-5 text-red-600" />
                    </div>
                  {:else}
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <AlertCircle class="w-5 h-5 text-gray-400" />
                    </div>
                  {/if}
                </div>

                <!-- Question Summary -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-gray-900">Question {i + 1}</span>
                    <span class="badge badge-gray text-xs">{getQuestionTypeLabel(question.type)}</span>
                  </div>
                  <p class="text-gray-600 text-sm truncate">{question.question.replace(/<[^>]*>/g, '')}</p>
                </div>

                <!-- Points -->
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="font-bold {question.isCorrect ? 'text-emerald-600' : question.isCorrect === false ? 'text-red-600' : 'text-gray-600'}">
                      {question.pointsAwarded}/{question.points}
                    </div>
                    <div class="text-xs text-gray-500">points</div>
                  </div>
                  {#if isExpanded}
                    <ChevronUp class="w-5 h-5 text-gray-400" />
                  {:else}
                    <ChevronDown class="w-5 h-5 text-gray-400" />
                  {/if}
                </div>
              </button>

              <!-- Expanded Content -->
              {#if isExpanded}
                <div class="px-6 pb-6 pt-0 ml-14 space-y-4">
                  <!-- Question Text -->
                  <div class="prose max-w-none text-gray-900">
                    {@html question.question}
                  </div>

                  <!-- Student Answer -->
                  <div class="p-4 rounded-xl {question.isCorrect ? 'bg-emerald-50 border border-emerald-100' : question.isCorrect === false ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-200'}">
                    <div class="text-sm font-medium {question.isCorrect ? 'text-emerald-700' : question.isCorrect === false ? 'text-red-700' : 'text-gray-700'} mb-1">
                      Your Answer
                    </div>
                    {#if question.type === 'PROGRAMMING'}
                      <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap"><code>{question.studentAnswer || 'No answer provided'}</code></pre>
                    {:else}
                      <div class="text-gray-900">
                        {question.studentAnswer || 'No answer provided'}
                      </div>
                    {/if}
                  </div>

                  <!-- Correct Answer (if wrong and allowed to show) -->
                  {#if question.correctAnswer && !question.isCorrect}
                    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div class="text-sm font-medium text-emerald-700 mb-1">Correct Answer</div>
                      {#if question.type === 'PROGRAMMING'}
                        <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap"><code>{question.correctAnswer}</code></pre>
                      {:else}
                        <div class="text-emerald-900">{question.correctAnswer}</div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Feedback -->
                  {#if question.feedback}
                    <div class="p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <div class="text-sm font-medium text-blue-700 mb-1">Feedback</div>
                      <div class="text-blue-900">{question.feedback}</div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

    {:else if !data.test.showResultsImmediately}
      <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
        <AlertCircle class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Results Not Available Yet</h3>
        <p class="text-gray-500 max-w-md mx-auto">
          Detailed results will be available after your teacher reviews your submission.
        </p>
      </div>
    {/if}

    <!-- Back Button -->
    <div class="mt-8 text-center">
      <a href="/student/assignments" class="btn btn-secondary">
        <ArrowLeft class="w-4 h-4" />
        Back to Assignments
      </a>
    </div>
  </div>
</div>
