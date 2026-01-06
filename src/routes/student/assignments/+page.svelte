<script lang="ts">
  import {
    FileText,
    Clock,
    Play,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    BookOpen,
    ClipboardList,
    Library
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusBadge(submission: any) {
    if (!submission) return { class: 'badge-blue', text: 'Not Started' };
    switch (submission.status) {
      case 'IN_PROGRESS': return { class: 'badge-yellow', text: 'In Progress' };
      case 'SUBMITTED': return { class: 'badge-purple', text: 'Submitted' };
      case 'PENDING': return { class: 'badge-orange', text: 'Pending Review' };
      case 'GRADED': return { class: 'badge-green', text: 'Graded' };
      default: return { class: 'badge-gray', text: submission.status };
    }
  }

  function formatScore(submission: any) {
    if (!submission || submission.status !== 'GRADED') return null;
    const percentage = Math.round((submission.score / submission.totalPoints) * 100);
    return `${submission.score}/${submission.totalPoints} (${percentage}%)`;
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">My Assignments</h1>
    <p class="text-gray-500 mt-1">View and complete assignments from your classes</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-8">
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-blue-600">{data.available.length}</div>
      <div class="text-sm text-gray-500">Available</div>
    </div>
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-yellow-600">{data.inProgress.length}</div>
      <div class="text-sm text-gray-500">In Progress</div>
    </div>
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-green-600">{data.completed.length}</div>
      <div class="text-sm text-gray-500">Completed</div>
    </div>
  </div>

  <!-- In Progress Tests -->
  {#if data.inProgress.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertCircle class="w-5 h-5 text-yellow-500" />
        Continue Where You Left Off
      </h2>
      <div class="space-y-3">
        {#each data.inProgress as test}
          <a href="/student/assignments/{test.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-yellow-500">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Play class="w-6 h-6 text-yellow-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500">{test.class.emoji} {test.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-yellow">Continue</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Available Assignments -->
  {#if data.available.filter(t => !t.submission).length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText class="w-5 h-5 text-blue-500" />
        Available Assignments
      </h2>
      <div class="space-y-3">
        {#each data.available.filter(t => !t.submission) as test}
          <a href="/student/assignments/{test.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
              {test.class.emoji || '📝'}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500 flex items-center gap-3">
                <span>{test.class.name}</span>
                <span class="text-gray-300">|</span>
                <span>{test.questionCount} questions</span>
                {#if test.timeLimit}
                  <span class="text-gray-300">|</span>
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {test.timeLimit} min
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-blue">Start</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Study Materials -->
  {#if data.studyGuides.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen class="w-5 h-5 text-amber-500" />
        Study Guides
      </h2>
      <div class="space-y-3">
        {#each data.studyGuides as guide}
          <a href="/student/study-guides/{guide.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-amber-400">
            <div class="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <BookOpen class="w-6 h-6 text-amber-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{guide.title}</div>
              <div class="text-sm text-gray-500">{guide.class.emoji || '📚'} {guide.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-amber">View</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Worksheets -->
  {#if data.worksheets && data.worksheets.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ClipboardList class="w-5 h-5 text-green-500" />
        Worksheets
      </h2>
      <div class="space-y-3">
        {#each data.worksheets as worksheet}
          <a href="/student/worksheets/{worksheet.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-green-400">
            <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <ClipboardList class="w-6 h-6 text-green-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{worksheet.title}</div>
              <div class="text-sm text-gray-500">
                {worksheet.class.emoji || '📚'} {worksheet.class.name}
                <span class="text-gray-300 mx-2">|</span>
                {worksheet.itemCount} items
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-green">Start</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Study Sets -->
  {#if data.studySets && data.studySets.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Library class="w-5 h-5 text-purple-500" />
        Flashcard Sets
      </h2>
      <div class="space-y-3">
        {#each data.studySets as studySet}
          <a href="/student/study-sets/{studySet.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-purple-400">
            <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Library class="w-6 h-6 text-purple-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{studySet.title}</div>
              <div class="text-sm text-gray-500">
                {studySet.class.emoji || '📚'} {studySet.class.name}
                <span class="text-gray-300 mx-2">|</span>
                {studySet.cardCount} cards
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-purple">Practice</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Completed Assignments -->
  {#if data.completed.length > 0}
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle class="w-5 h-5 text-green-500" />
        Completed
      </h2>
      <div class="space-y-3">
        {#each data.completed as test}
          {@const status = getStatusBadge(test.submission)}
          {@const score = formatScore(test.submission)}
          <a href="/student/assignments/{test.id}/results" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
              {test.class.emoji || '📝'}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500">{test.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              {#if score}
                <span class="font-medium text-gray-900">{score}</span>
              {/if}
              <span class="badge {status.class}">{status.text}</span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if data.totalTests === 0 && (!data.worksheets || data.worksheets.length === 0) && (!data.studySets || data.studySets.length === 0) && data.studyGuides.length === 0}
    <div class="card p-12 text-center">
      <BookOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Assignments Yet</h3>
      <p class="text-gray-500">Assignments from your classes will appear here.</p>
    </div>
  {/if}
</div>
