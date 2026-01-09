<script lang="ts">
  import { Library, Plus, Search, BookOpen, Trophy } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let activeTab = $state<'mine' | 'assigned'>('mine');

  const filteredMyStudySets = $derived(
    data.myStudySets.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredAssignedStudySets = $derived(
    data.assignedStudySets.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Study Sets | Checkmate</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Library class="w-5 h-5 text-purple-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Study Sets</h1>
        <p class="text-gray-600">Create and study flashcards</p>
      </div>
    </div>
    <a href="/student/study-sets/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Study Set
    </a>
  </div>

  <!-- Tabs -->
  <div class="flex gap-2 mb-6">
    <button
      onclick={() => activeTab = 'mine'}
      class="btn {activeTab === 'mine' ? 'btn-primary' : 'btn-secondary'}"
    >
      My Study Sets ({data.myStudySets.length})
    </button>
    <button
      onclick={() => activeTab = 'assigned'}
      class="btn {activeTab === 'assigned' ? 'btn-primary' : 'btn-secondary'}"
    >
      From Classes ({data.assignedStudySets.length})
    </button>
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

  {#if activeTab === 'mine'}
    <!-- My Study Sets -->
    {#if filteredMyStudySets.length === 0}
      <div class="card p-12">
        <div class="empty-state">
          <Library class="empty-state-icon" />
          <div class="empty-state-title">
            {searchQuery ? 'No study sets found' : 'No study sets yet'}
          </div>
          <div class="empty-state-text">
            {searchQuery ? 'Try a different search term' : 'Create your first study set to start studying'}
          </div>
          {#if !searchQuery}
            <a href="/student/study-sets/create" class="btn btn-primary mt-4">
              <Plus class="w-4 h-4" />
              Create Study Set
            </a>
          {/if}
        </div>
      </div>
    {:else}
      <div class="grid md:grid-cols-2 gap-4">
        {#each filteredMyStudySets as studySet}
          <a href="/student/study-sets/{studySet.id}" class="card p-5 hover:border-purple-300 transition-colors">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Library class="w-6 h-6 text-purple-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{studySet.title}</h3>
                <p class="text-sm text-gray-500">{studySet.cardCount} cards</p>
                <div class="flex items-center gap-3 mt-2">
                  <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-purple-500 transition-all"
                      style="width: {studySet.mastery}%"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500">{studySet.mastery}%</span>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- Assigned Study Sets -->
    {#if filteredAssignedStudySets.length === 0}
      <div class="card p-12">
        <div class="empty-state">
          <BookOpen class="empty-state-icon" />
          <div class="empty-state-title">
            {searchQuery ? 'No study sets found' : 'No assigned study sets'}
          </div>
          <div class="empty-state-text">
            {searchQuery ? 'Try a different search term' : 'Study sets assigned by your teachers will appear here'}
          </div>
        </div>
      </div>
    {:else}
      <div class="grid md:grid-cols-2 gap-4">
        {#each filteredAssignedStudySets as studySet}
          <a href="/student/study-sets/{studySet.id}" class="card p-5 hover:border-blue-300 transition-colors">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                {studySet.classEmoji || '📚'}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{studySet.title}</h3>
                <p class="text-sm text-gray-500">
                  {studySet.className} • {studySet.cardCount} cards
                </p>
                {#if studySet.creatorName}
                  <p class="text-xs text-gray-400 mt-1">By {studySet.creatorName}</p>
                {/if}
                <div class="flex items-center gap-3 mt-2">
                  <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-blue-500 transition-all"
                      style="width: {studySet.mastery}%"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500">{studySet.mastery}%</span>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</div>
