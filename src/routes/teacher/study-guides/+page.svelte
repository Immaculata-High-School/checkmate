<script lang="ts">
  import { BookOpen, Plus, Users, FileText } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Study Guides | Checkmate</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Study Guides</h1>
      <p class="text-gray-500 mt-1">Create and manage study materials for your students</p>
    </div>
    <a href="/teacher/study-guides/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Study Guide
    </a>
  </div>

  {#if data.studyGuides.length === 0}
    <div class="card p-12 text-center">
      <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen class="w-8 h-8 text-amber-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">No Study Guides Yet</h2>
      <p class="text-gray-500 mb-6 max-w-md mx-auto">
        Create study guides to help your students prepare for tests. You can generate them from existing tests or create them from scratch.
      </p>
      <a href="/teacher/study-guides/create" class="btn btn-primary">
        <Plus class="w-4 h-4" />
        Create Your First Study Guide
      </a>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each data.studyGuides as guide}
        <a href="/teacher/study-guides/{guide.id}" class="card p-5 hover:shadow-lg transition-all group">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
              <BookOpen class="w-6 h-6 text-amber-600" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 truncate">{guide.title}</h3>
              {#if guide.sourceTest}
                <p class="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <FileText class="w-3 h-3" />
                  Based on: {guide.sourceTest.title}
                </p>
              {/if}
              {#if guide.assignments.length > 0}
                <div class="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <Users class="w-3 h-3" />
                  <span>Assigned to {guide.assignments.length} class{guide.assignments.length !== 1 ? 'es' : ''}</span>
                </div>
              {:else}
                <p class="text-sm text-gray-400 mt-2">Not assigned</p>
              {/if}
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
