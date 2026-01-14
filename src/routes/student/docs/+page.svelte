<script lang="ts">
  import { goto } from '$app/navigation';
  import { 
    FileText, 
    Plus, 
    Search,
    Calendar,
    Users,
    MoreVertical,
    Trash2,
    ExternalLink,
    Lock,
    Eye,
    Edit3,
    BookOpen
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let creating = $state(false);
  let filter = $state<'all' | 'mine' | 'shared'>('all');
  let showDeleteConfirm = $state<string | null>(null);
  let openMenu = $state<string | null>(null);

  const filteredDocs = $derived(
    data.documents.filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' 
        || (filter === 'mine' && d.isOwner)
        || (filter === 'shared' && !d.isOwner);
      return matchesSearch && matchesFilter;
    })
  );

  const myDocs = $derived(data.documents.filter(d => d.isOwner));
  const sharedDocs = $derived(data.documents.filter(d => !d.isOwner));

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatRelativeTime(date: string | Date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  }

  async function createDocument() {
    creating = true;
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Document', content: '' })
      });

      if (res.ok) {
        const { document } = await res.json();
        goto(`/student/docs/${document.id}`);
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      creating = false;
    }
  }

  async function deleteDocument(id: string) {
    try {
      const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
    showDeleteConfirm = null;
  }
</script>

<svelte:head>
  <title>Documents | Checkmate</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Documents</h1>
        <p class="text-gray-500">Your documents and shared resources</p>
      </div>
    </div>
    <button 
      onclick={createDocument}
      disabled={creating}
      class="btn btn-primary"
    >
      {#if creating}
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating...
      {:else}
        <Plus class="w-4 h-4" />
        New Document
      {/if}
    </button>
  </div>

  <!-- Search & Filter -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search documents..."
        class="input pl-10"
      />
    </div>
    
    <div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onclick={() => filter = 'all'}
        class="px-3 py-1.5 text-sm rounded-md transition-colors {filter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
      >
        All ({data.documents.length})
      </button>
      <button
        onclick={() => filter = 'mine'}
        class="px-3 py-1.5 text-sm rounded-md transition-colors {filter === 'mine' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
      >
        My Docs ({myDocs.length})
      </button>
      <button
        onclick={() => filter = 'shared'}
        class="px-3 py-1.5 text-sm rounded-md transition-colors {filter === 'shared' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
      >
        Shared ({sharedDocs.length})
      </button>
    </div>
  </div>

  {#if filteredDocs.length === 0}
    <div class="bg-white rounded-xl border border-gray-200 p-12">
      <div class="text-center">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText class="w-8 h-8 text-emerald-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {#if searchQuery}
            No documents found
          {:else if filter === 'shared'}
            No shared documents
          {:else}
            No Documents Yet
          {/if}
        </h3>
        <p class="text-gray-500 mb-6 max-w-md mx-auto">
          {#if searchQuery}
            Try a different search term
          {:else if filter === 'shared'}
            Documents shared by your teachers will appear here
          {:else}
            Create documents for notes, assignments, and more
          {/if}
        </p>
        {#if !searchQuery && filter !== 'shared'}
          <button onclick={createDocument} disabled={creating} class="btn btn-primary">
            <Plus class="w-4 h-4" />
            Create Your First Document
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredDocs as doc}
        <div class="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all group relative">
          <a href="/student/docs/{doc.id}" class="block p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 {doc.isOwner ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-purple-50 group-hover:bg-purple-100'} rounded-lg flex items-center justify-center transition-colors">
                {#if doc.isOwner}
                  <FileText class="w-5 h-5 text-emerald-500" />
                {:else}
                  <BookOpen class="w-5 h-5 text-purple-500" />
                {/if}
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                {#if doc.canEdit}
                  <Edit3 class="w-3 h-3" />
                {:else}
                  <Eye class="w-3 h-3" />
                {/if}
              </div>
            </div>
            
            <h3 class="font-semibold text-gray-900 mb-1 truncate group-hover:text-emerald-600 transition-colors">
              {doc.title}
            </h3>
            
            {#if !doc.isOwner}
              <div class="text-xs text-gray-500 mb-2">
                By {doc.owner.name || doc.owner.email}
              </div>
            {/if}
            
            <div class="flex items-center gap-2 text-xs text-gray-400 mt-3">
              <Calendar class="w-3 h-3" />
              <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
            </div>

            {#if doc.sharedVia}
              <div class="flex items-center gap-1 mt-2">
                <span class="text-lg">{doc.sharedVia.emoji || '📚'}</span>
                <span class="text-xs text-purple-600">
                  via {doc.sharedVia.name}
                </span>
              </div>
            {/if}
          </a>

          <!-- Actions menu (only for own documents) -->
          {#if doc.isOwner}
            <div class="absolute top-4 right-4">
              <button
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); openMenu = openMenu === doc.id ? null : doc.id; }}
                class="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical class="w-4 h-4 text-gray-400" />
              </button>

              {#if openMenu === doc.id}
                <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <a
                    href="/student/docs/{doc.id}"
                    class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink class="w-4 h-4" />
                    Open
                  </a>
                  <hr class="my-1 border-gray-100" />
                  <button
                    onclick={(e) => { e.preventDefault(); e.stopPropagation(); showDeleteConfirm = doc.id; openMenu = null; }}
                    class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 class="w-4 h-4" />
                    Delete
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
      <p class="text-gray-600 mb-6">
        This action cannot be undone. The document will be permanently deleted.
      </p>
      <div class="flex justify-end gap-3">
        <button
          onclick={() => showDeleteConfirm = null}
          class="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onclick={() => deleteDocument(showDeleteConfirm!)}
          class="btn bg-red-600 text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Click outside to close menu -->
{#if openMenu}
  <div
    class="fixed inset-0 z-0"
    onclick={() => openMenu = null}
    role="button"
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && (openMenu = null)}
  ></div>
{/if}
