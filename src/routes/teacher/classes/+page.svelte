<script lang="ts">
  import { Users, Plus, Search, FileText, Archive } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let showArchived = $state(false);

  const filteredClasses = $derived(
    data.classes.filter(cls =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (showArchived ? cls.archived : !cls.archived)
    )
  );

  const activeClasses = $derived(data.classes.filter(c => !c.archived));
  const archivedClasses = $derived(data.classes.filter(c => c.archived));
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <Users class="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Classes</h1>
        <p class="text-gray-600">Manage your classes and students</p>
      </div>
    </div>
    <a href="/teacher/classes/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Class
    </a>
  </div>

  <!-- Filters -->
  <div class="flex gap-4 mb-6">
    <div class="flex-1 relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search classes..."
        class="input pl-10"
      />
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => showArchived = false}
        class="btn {!showArchived ? 'btn-primary' : 'btn-secondary'} btn-sm"
      >
        Active ({activeClasses.length})
      </button>
      <button
        onclick={() => showArchived = true}
        class="btn {showArchived ? 'btn-primary' : 'btn-secondary'} btn-sm"
      >
        Archived ({archivedClasses.length})
      </button>
    </div>
  </div>

  <!-- Classes Grid -->
  {#if filteredClasses.length === 0}
    <div class="card p-12">
      <div class="empty-state">
        <Users class="empty-state-icon" />
        <div class="empty-state-title">
          {searchQuery ? 'No classes found' : showArchived ? 'No archived classes' : 'No classes yet'}
        </div>
        <div class="empty-state-text">
          {searchQuery ? 'Try a different search term' : showArchived ? 'Archived classes will appear here' : 'Create your first class to get started'}
        </div>
        {#if !searchQuery && !showArchived}
          <a href="/teacher/classes/create" class="btn btn-primary mt-4">
            <Plus class="w-4 h-4" />
            Create Class
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredClasses as cls}
        <a href="/teacher/classes/{cls.id}" class="card p-5 hover:border-blue-300 transition-colors block">
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users class="w-6 h-6 text-purple-600" />
            </div>
            {#if cls.archived}
              <span class="badge badge-gray">
                <Archive class="w-3 h-3" />
                Archived
              </span>
            {/if}
          </div>

          <h3 class="font-semibold text-gray-900 mb-1">{cls.name}</h3>
          {#if cls.description}
            <p class="text-sm text-gray-500 mb-4 line-clamp-2">{cls.description}</p>
          {/if}

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <Users class="w-4 h-4" />
              {cls._count.members} students
            </div>
            <div class="flex items-center gap-1">
              <FileText class="w-4 h-4" />
              {cls._count.tests} tests
            </div>
          </div>

          {#if cls.joinCode}
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="text-xs text-gray-500 mb-1">Join Code</div>
              <div class="font-mono font-bold text-gray-900">{cls.joinCode}</div>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>
