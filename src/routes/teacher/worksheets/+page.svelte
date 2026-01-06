<script lang="ts">
  import { ClipboardList, Plus, Search, Printer } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  const filteredWorksheets = $derived(
    data.worksheets.filter(ws =>
      ws.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Worksheets</h1>
      <p class="text-gray-600">Create printable worksheets for your students</p>
    </div>
    <a href="/teacher/worksheets/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Worksheet
    </a>
  </div>

  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search worksheets..."
        class="input pl-10"
      />
    </div>
  </div>

  <!-- Worksheets List -->
  {#if filteredWorksheets.length === 0}
    <div class="card p-12">
      <div class="empty-state">
        <ClipboardList class="empty-state-icon" />
        <div class="empty-state-title">
          {searchQuery ? 'No worksheets found' : 'No worksheets yet'}
        </div>
        <div class="empty-state-text">
          {searchQuery ? 'Try a different search term' : 'Create your first worksheet to get started'}
        </div>
        {#if !searchQuery}
          <a href="/teacher/worksheets/create" class="btn btn-primary mt-4">
            <Plus class="w-4 h-4" />
            Create Worksheet
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredWorksheets as worksheet}
        <a href="/teacher/worksheets/{worksheet.id}" class="card p-5 hover:border-blue-300 transition-colors block">
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ClipboardList class="w-6 h-6 text-green-600" />
            </div>
            <button class="btn btn-ghost btn-sm">
              <Printer class="w-4 h-4" />
            </button>
          </div>

          <h3 class="font-semibold text-gray-900 mb-1">{worksheet.title}</h3>
          {#if worksheet.description}
            <p class="text-sm text-gray-500 mb-3 line-clamp-2">{worksheet.description}</p>
          {/if}

          <div class="text-sm text-gray-500">
            {worksheet._count.items} items
          </div>

          <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            Created {new Date(worksheet.createdAt).toLocaleDateString()}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
