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
    Archive,
    Share2,
    ExternalLink,
    Lock,
    Globe,
    ClipboardList,
    GraduationCap
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let creating = $state(false);
  let showDeleteConfirm = $state<string | null>(null);
  let openMenu = $state<string | null>(null);

  const filteredDocs = $derived(
    data.documents.filter(d =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

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
        goto(`/teacher/docs/${document.id}`);
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
        // Refresh the page data
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
    showDeleteConfirm = null;
  }

  async function archiveDocument(id: string) {
    try {
      const res = await fetch(`/api/docs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
    openMenu = null;
  }
</script>

<svelte:head>
  <title>Documents | Checkmate</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Documents</h1>
        <p class="text-gray-500">Create and share documents with your students</p>
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

  <!-- Search -->
  <div class="flex items-center gap-4 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search documents..."
        class="input pl-10"
      />
    </div>
    <div class="text-sm text-gray-500">
      {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
    </div>
  </div>

  {#if filteredDocs.length === 0}
    <div class="bg-white rounded-xl border border-gray-200 p-12">
      <div class="text-center">
        <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText class="w-8 h-8 text-indigo-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">
          {searchQuery ? 'No documents found' : 'No Documents Yet'}
        </h3>
        <p class="text-gray-500 mb-6 max-w-md mx-auto">
          {searchQuery ? 'Try a different search term' : 'Create documents to share notes, instructions, and resources with your students.'}
        </p>
        {#if !searchQuery}
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
        <div class="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group relative">
          <a href="/teacher/docs/{doc.id}" class="block p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <FileText class="w-5 h-5 text-indigo-500" />
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-400">
                {#if doc.visibility === 'PRIVATE'}
                  <Lock class="w-3 h-3" />
                {:else if doc.visibility === 'PUBLIC'}
                  <Globe class="w-3 h-3" />
                {:else}
                  <Users class="w-3 h-3" />
                {/if}
              </div>
            </div>
            
            <h3 class="font-semibold text-gray-900 mb-1 truncate group-hover:text-indigo-600 transition-colors">
              {doc.title}
            </h3>
            
            <div class="flex items-center gap-2 text-xs text-gray-400 mt-3">
              <Calendar class="w-3 h-3" />
              <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
            </div>

            {#if doc.classShares.length > 0}
              <div class="flex items-center gap-1 mt-2">
                <Users class="w-3 h-3 text-gray-400" />
                <span class="text-xs text-gray-500">
                  Shared with {doc.classShares.length} class{doc.classShares.length !== 1 ? 'es' : ''}
                </span>
              </div>
            {/if}

            {#if doc.assignments.length > 0}
              <div class="flex items-center gap-2 mt-2">
                <div class="flex items-center gap-1">
                  <ClipboardList class="w-3 h-3 text-emerald-500" />
                  <span class="text-xs text-emerald-600 font-medium">
                    {doc.assignments.length} assignment{doc.assignments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {#if doc.totalSubmissions > 0}
                  <a 
                    href="/teacher/docs/{doc.id}/submissions"
                    onclick={(e) => e.stopPropagation()}
                    class="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-200 transition-colors"
                  >
                    <GraduationCap class="w-3 h-3" />
                    {doc.totalSubmissions} to review
                  </a>
                {/if}
              </div>
            {/if}
          </a>

          <!-- Actions menu -->
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
                  href="/teacher/docs/{doc.id}"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink class="w-4 h-4" />
                  Open
                </a>
                <a
                  href="/teacher/docs/{doc.id}?share=true"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Share2 class="w-4 h-4" />
                  Share
                </a>
                <button
                  onclick={(e) => { e.preventDefault(); e.stopPropagation(); archiveDocument(doc.id); }}
                  class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Archive class="w-4 h-4" />
                  Archive
                </button>
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
