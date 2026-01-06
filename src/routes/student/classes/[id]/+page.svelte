<script lang="ts">
  import { ArrowLeft, Users, FileText, CheckCircle, Clock, BookMarked, ClipboardList, Library } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const hasAssignments = $derived(
    data.tests.length > 0 ||
    data.worksheets.length > 0 ||
    data.studyGuides.length > 0 ||
    data.studySets.length > 0
  );
</script>

<div class="max-w-4xl mx-auto">
  <a href="/student/classes" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
    <ArrowLeft class="w-4 h-4" />
    Back to Classes
  </a>

  <div class="card p-6 mb-6">
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">
        {data.class.emoji || '📚'}
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900">{data.class.name}</h1>
        <p class="text-gray-600">{data.class.teacher.name}</p>
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span class="flex items-center gap-1">
            <Users class="w-4 h-4" />
            {data.class._count.members} students
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200">
      <h2 class="font-semibold text-gray-900">Assignments</h2>
    </div>

    {#if !hasAssignments}
      <div class="p-8 text-center">
        <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No assignments yet</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-100">
        <!-- Tests -->
        {#each data.tests as test}
          <a href="/student/assignments/{test.id}" class="p-4 flex items-center gap-4 hover:bg-gray-50">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText class="w-5 h-5 text-blue-600" />
            </div>
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{test.title}</h3>
              <p class="text-sm text-gray-500">{test.questionCount} questions</p>
            </div>
            <div class="flex items-center gap-3">
              {#if test.submission}
                {#if test.submission.status === 'GRADED'}
                  <span class="badge badge-green flex items-center gap-1">
                    <CheckCircle class="w-3 h-3" />
                    {Math.round((test.submission.score || 0) / (test.submission.totalPoints || 1) * 100)}%
                  </span>
                {:else if test.submission.status === 'SUBMITTED'}
                  <span class="badge badge-yellow">Pending Grade</span>
                {:else}
                  <span class="badge badge-blue">In Progress</span>
                {/if}
              {:else}
                <span class="badge badge-blue">Start</span>
              {/if}
            </div>
          </a>
        {/each}

        <!-- Study Guides -->
        {#each data.studyGuides as guide}
          <a href="/student/study-guides/{guide.id}" class="p-4 flex items-center gap-4 hover:bg-gray-50">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <BookMarked class="w-5 h-5 text-amber-600" />
            </div>
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{guide.title}</h3>
              <p class="text-sm text-gray-500">Study Guide</p>
            </div>
            <span class="badge badge-amber">View</span>
          </a>
        {/each}

        <!-- Worksheets -->
        {#each data.worksheets as worksheet}
          <a href="/student/worksheets/{worksheet.id}" class="p-4 flex items-center gap-4 hover:bg-gray-50">
            <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ClipboardList class="w-5 h-5 text-green-600" />
            </div>
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{worksheet.title}</h3>
              <p class="text-sm text-gray-500">Worksheet</p>
            </div>
            <span class="badge badge-green">Start</span>
          </a>
        {/each}

        <!-- Study Sets -->
        {#each data.studySets as studySet}
          <a href="/student/study-sets/{studySet.id}" class="p-4 flex items-center gap-4 hover:bg-gray-50">
            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Library class="w-5 h-5 text-purple-600" />
            </div>
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{studySet.title}</h3>
              <p class="text-sm text-gray-500">{studySet.cardCount} cards</p>
            </div>
            <span class="badge badge-purple">Practice</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
