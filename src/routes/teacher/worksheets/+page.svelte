<script lang="ts">
  import { 
    ClipboardList, 
    Plus, 
    Search, 
    Printer, 
    FileText,
    Calculator,
    Calendar,
    MoreVertical,
    ExternalLink
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  const filteredWorksheets = $derived(
    data.worksheets.filter(ws =>
      ws.title.toLowerCase().includes(searchQuery.toLowerCase())
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

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
        <ClipboardList class="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Worksheets</h1>
        <p class="text-gray-600">Create and manage printable worksheets for your students</p>
      </div>
    </div>
    <a href="/teacher/worksheets/create" class="btn btn-primary">
      <Plus class="w-4 h-4" />
      Create Worksheet
    </a>
  </div>

  <!-- Search & Stats -->
  <div class="flex items-center gap-4 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search worksheets..."
        class="input pl-10"
      />
    </div>
    <div class="text-sm text-gray-500">
      {filteredWorksheets.length} worksheet{filteredWorksheets.length !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Worksheets List -->
  {#if filteredWorksheets.length === 0}
    <div class="bg-white rounded-xl border border-gray-200 p-12">
      <div class="text-center">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList class="w-8 h-8 text-slate-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {searchQuery ? 'No worksheets found' : 'No worksheets yet'}
        </h3>
        <p class="text-gray-500 mb-6">
          {searchQuery ? 'Try a different search term' : 'Create your first worksheet to get started'}
        </p>
        {#if !searchQuery}
          <a href="/teacher/worksheets/create" class="btn btn-primary">
            <Plus class="w-4 h-4" />
            Create Worksheet
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-slate-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Worksheet</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each filteredWorksheets as worksheet}
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <a href="/teacher/worksheets/{worksheet.id}" class="block group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText class="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {worksheet.title}
                      </div>
                      {#if worksheet.description}
                        <p class="text-sm text-gray-500 line-clamp-1">{worksheet.description}</p>
                      {/if}
                    </div>
                  </div>
                </a>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calculator class="w-4 h-4 text-gray-400" />
                  {worksheet._count.items} items
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar class="w-4 h-4 text-gray-400" />
                  {formatDate(worksheet.createdAt)}
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <a 
                    href="/teacher/worksheets/{worksheet.id}" 
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View worksheet"
                  >
                    <ExternalLink class="w-4 h-4" />
                  </a>
                  <button 
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Print worksheet"
                    onclick={() => window.open(`/teacher/worksheets/${worksheet.id}`, '_blank')}
                  >
                    <Printer class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
