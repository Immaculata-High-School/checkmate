<script lang="ts">
  import { 
    BookOpen, 
    Plus, 
    FileText, 
    Search,
    Calendar,
    ExternalLink,
    CheckCircle2,
    Printer
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  const filteredGuides = $derived(
    data.studyGuides.filter(g =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Study Guides | Checkmate</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
        <BookOpen class="w-5 h-5 text-slate-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Study Guides</h1>
        <p class="text-gray-500">Create and manage study materials for your students</p>
      </div>
    </div>
    <a href="/teacher/study-guides/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Study Guide
    </a>
  </div>

  <!-- Search & Stats -->
  <div class="flex items-center gap-4 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search study guides..."
        class="input pl-10"
      />
    </div>
    <div class="text-sm text-gray-500">
      {filteredGuides.length} guide{filteredGuides.length !== 1 ? 's' : ''}
    </div>
  </div>

  {#if filteredGuides.length === 0}
    <div class="bg-white rounded-xl border border-gray-200 p-12">
      <div class="text-center">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen class="w-8 h-8 text-slate-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {searchQuery ? 'No study guides found' : 'No Study Guides Yet'}
        </h3>
        <p class="text-gray-500 mb-6 max-w-md mx-auto">
          {searchQuery ? 'Try a different search term' : 'Create study guides to help your students prepare for tests. Generate from existing tests or create from scratch.'}
        </p>
        {#if !searchQuery}
          <a href="/teacher/study-guides/create" class="btn btn-primary">
            <Plus class="w-4 h-4" />
            Create Your First Study Guide
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-slate-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Study Guide</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each filteredGuides as guide}
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <a href="/teacher/study-guides/{guide.id}" class="block group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen class="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {guide.title}
                      </div>
                    </div>
                  </div>
                </a>
              </td>
              <td class="px-6 py-4">
                {#if guide.sourceTest}
                  <div class="flex items-center gap-1.5 text-sm text-gray-600">
                    <FileText class="w-4 h-4 text-gray-400" />
                    <span class="truncate max-w-[150px]">{guide.sourceTest.title}</span>
                  </div>
                {:else}
                  <span class="text-sm text-gray-400">Manual</span>
                {/if}
              </td>
              <td class="px-6 py-4">
                {#if guide.assignments.length > 0}
                  <div class="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle2 class="w-4 h-4" />
                    {guide.assignments.length} class{guide.assignments.length !== 1 ? 'es' : ''}
                  </div>
                {:else}
                  <span class="text-sm text-gray-400">Not assigned</span>
                {/if}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar class="w-4 h-4 text-gray-400" />
                  {formatDate(guide.createdAt)}
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <a 
                  href="/teacher/study-guides/{guide.id}" 
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                  title="View study guide"
                >
                  <ExternalLink class="w-4 h-4" />
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
