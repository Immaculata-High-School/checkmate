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
    BookOpen,
    ClipboardList,
    CheckCircle,
    Clock,
    Send,
    AlertCircle
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');
  let creating = $state(false);
  let tab = $state<'assigned' | 'mydocs'>('assigned');
  let showDeleteConfirm = $state<string | null>(null);
  let openMenu = $state<string | null>(null);

  // Filter my docs
  const filteredMyDocs = $derived(
    data.documents.filter(d => 
      d.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Combine and filter assigned work
  const assignedWork = $derived(() => {
    const viewOnly = data.viewOnlyAssignments.map(a => ({
      id: a.document.id,
      title: a.document.title,
      type: 'VIEW_ONLY' as const,
      status: null,
      dueDate: a.dueDate,
      className: a.class.name,
      classEmoji: a.class.emoji,
      teacherName: a.document.owner.name || a.document.owner.email,
      updatedAt: a.document.updatedAt,
      href: `/student/docs/${a.document.id}`
    }));
    
    const copies = data.studentDocuments.map(sd => ({
      id: sd.id,
      title: sd.title,
      type: 'MAKE_COPY' as const,
      status: sd.status,
      dueDate: sd.assignment.dueDate,
      className: sd.assignment.class.name,
      classEmoji: sd.assignment.class.emoji,
      teacherName: sd.assignment.document.owner.name || sd.assignment.document.owner.email,
      updatedAt: sd.updatedAt,
      grade: sd.grade,
      feedback: sd.feedback,
      href: `/student/docs/work/${sd.id}`
    }));
    
    return [...copies, ...viewOnly].filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.className.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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

  function getStatusInfo(status: string | null) {
    switch (status) {
      case 'NOT_STARTED': return { label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: Clock };
      case 'IN_PROGRESS': return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Edit3 };
      case 'SUBMITTED': return { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Send };
      case 'RESUBMITTED': return { label: 'Resubmitted', color: 'bg-purple-100 text-purple-700', icon: Send };
      case 'RETURNED': return { label: 'Returned', color: 'bg-orange-100 text-orange-700', icon: AlertCircle };
      default: return { label: 'View Only', color: 'bg-emerald-100 text-emerald-700', icon: Eye };
    }
  }

  function isDueSoon(dueDate: string | Date | null) {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / 3600000;
    return diffHours > 0 && diffHours < 48;
  }

  function isOverdue(dueDate: string | Date | null, status: string | null) {
    if (!dueDate || status === 'SUBMITTED' || status === 'RESUBMITTED') return false;
    return new Date(dueDate) < new Date();
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
        <p class="text-gray-500">Your work and class materials</p>
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

  <!-- Tabs -->
  <div class="flex items-center gap-4 mb-6 border-b border-gray-200">
    <button
      onclick={() => tab = 'assigned'}
      class="pb-3 px-1 text-sm font-medium border-b-2 transition-colors {tab === 'assigned' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
    >
      <div class="flex items-center gap-2">
        <ClipboardList class="w-4 h-4" />
        Assigned Work
        {#if data.studentDocuments.length > 0 || data.viewOnlyAssignments.length > 0}
          <span class="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
            {data.studentDocuments.length + data.viewOnlyAssignments.length}
          </span>
        {/if}
      </div>
    </button>
    <button
      onclick={() => tab = 'mydocs'}
      class="pb-3 px-1 text-sm font-medium border-b-2 transition-colors {tab === 'mydocs' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
    >
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4" />
        My Documents
        {#if data.documents.length > 0}
          <span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {data.documents.length}
          </span>
        {/if}
      </div>
    </button>
  </div>

  <!-- Search -->
  <div class="relative mb-6">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search documents..."
      class="input pl-10 w-full"
    />
  </div>

  <!-- Assigned Work Tab -->
  {#if tab === 'assigned'}
    {#if assignedWork().length === 0}
      <div class="bg-white rounded-xl border border-gray-200 p-12">
        <div class="text-center">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList class="w-8 h-8 text-emerald-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? 'No matches found' : 'No Assigned Work'}
          </h3>
          <p class="text-gray-500 max-w-md mx-auto">
            {searchQuery ? 'Try a different search term' : 'When your teacher assigns documents, they\'ll appear here'}
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        {#each assignedWork() as work}
          {@const statusInfo = getStatusInfo(work.status)}
          <a
            href={work.href}
            class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 {work.type === 'VIEW_ONLY' ? 'bg-gray-100' : 'bg-emerald-100'} rounded-lg flex items-center justify-center flex-shrink-0">
                {#if work.type === 'VIEW_ONLY'}
                  <Eye class="w-6 h-6 text-gray-500" />
                {:else}
                  <Edit3 class="w-6 h-6 text-emerald-600" />
                {/if}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-semibold text-gray-900 truncate">{work.title}</h3>
                    <div class="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>{work.classEmoji} {work.className}</span>
                      <span>·</span>
                      <span>From {work.teacherName}</span>
                    </div>
                  </div>
                  
                  <div class="flex flex-col items-end gap-2">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium {statusInfo.color}">
                      <svelte:component this={statusInfo.icon} class="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                    
                    {#if work.grade !== null && work.grade !== undefined}
                      <span class="text-sm font-medium text-emerald-600">
                        Grade: {work.grade}
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  {#if work.dueDate}
                    <span class="flex items-center gap-1" class:text-red-500={isOverdue(work.dueDate, work.status)} class:text-orange-500={isDueSoon(work.dueDate)}>
                      <Calendar class="w-3 h-3" />
                      Due {formatDate(work.dueDate)}
                      {#if isOverdue(work.dueDate, work.status)}
                        (Overdue)
                      {:else if isDueSoon(work.dueDate)}
                        (Due soon)
                      {/if}
                    </span>
                  {/if}
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    Updated {formatRelativeTime(work.updatedAt)}
                  </span>
                </div>

                {#if work.feedback}
                  <div class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div class="text-xs font-medium text-orange-700 mb-1">Teacher Feedback</div>
                    <p class="text-sm text-orange-800">{work.feedback}</p>
                  </div>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- My Documents Tab -->
  {#if tab === 'mydocs'}
    {#if filteredMyDocs.length === 0}
      <div class="bg-white rounded-xl border border-gray-200 p-12">
        <div class="text-center">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText class="w-8 h-8 text-emerald-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? 'No documents found' : 'No Documents Yet'}
          </h3>
          <p class="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery ? 'Try a different search term' : 'Create documents for notes, assignments, and more'}
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
        {#each filteredMyDocs as doc}
          <div class="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all group relative">
            <a href="/student/docs/{doc.id}" class="block p-5">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 bg-emerald-50 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors">
                  <FileText class="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              
              <h3 class="font-semibold text-gray-900 mb-1 truncate group-hover:text-emerald-600 transition-colors">
                {doc.title}
              </h3>
              
              <div class="flex items-center gap-2 text-xs text-gray-400 mt-3">
                <Calendar class="w-3 h-3" />
                <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
              </div>
            </a>

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
          </div>
        {/each}
      </div>
    {/if}
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
        <button onclick={() => showDeleteConfirm = null} class="btn btn-secondary">
          Cancel
        </button>
        <button onclick={() => deleteDocument(showDeleteConfirm!)} class="btn bg-red-600 text-white hover:bg-red-700">
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

{#if openMenu}
  <div
    class="fixed inset-0 z-0"
    onclick={() => openMenu = null}
    role="button"
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && (openMenu = null)}
  ></div>
{/if}
