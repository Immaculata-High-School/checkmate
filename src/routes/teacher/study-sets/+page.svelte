<script lang="ts">
  import { BookOpen, Plus, Search, Layers } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  const filteredSets = $derived(
    data.studySets.filter(set =>
      set.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Study Sets</h1>
      <p class="text-gray-600">Create flashcard sets for student learning</p>
    </div>
    <a href="/teacher/study-sets/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Study Set
    </a>
  </div>

  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search study sets..."
        class="input pl-10"
      />
    </div>
  </div>

  <!-- Study Sets Grid -->
  {#if filteredSets.length === 0}
    <div class="card p-12">
      <div class="empty-state">
        <BookOpen class="empty-state-icon" />
        <div class="empty-state-title">
          {searchQuery ? 'No study sets found' : 'No study sets yet'}
        </div>
        <div class="empty-state-text">
          {searchQuery ? 'Try a different search term' : 'Create your first study set to get started'}
        </div>
        {#if !searchQuery}
          <a href="/teacher/study-sets/create" class="btn btn-primary mt-4">
            <Plus class="w-4 h-4" />
            Create Study Set
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredSets as studySet}
        <a href="/teacher/study-sets/{studySet.id}" class="card p-5 hover:border-blue-300 transition-colors block">
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <BookOpen class="w-6 h-6 text-amber-600" />
            </div>
          </div>

          <h3 class="font-semibold text-gray-900 mb-1">{studySet.title}</h3>
          {#if studySet.description}
            <p class="text-sm text-gray-500 mb-3 line-clamp-2">{studySet.description}</p>
          {/if}

          <div class="flex items-center gap-2 text-sm text-gray-500">
            <Layers class="w-4 h-4" />
            {studySet._count.cards} cards
          </div>

          <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            Created {new Date(studySet.createdAt).toLocaleDateString()}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
