<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    Lightbulb,
    Search,
    Filter,
    MessageSquare,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Send,
    X,
    Mail,
    Building2,
    User,
    Trash2,
    ChevronDown
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let search = $state('');
  let statusFilter = $state('');
  let categoryFilter = $state('');
  let selectedRequest = $state<typeof data.requests[0] | null>(null);
  let responseText = $state('');
  let responseStatus = $state('');
  let showDeleteConfirm = $state<string | null>(null);

  // Sync filters when data changes
  $effect(() => {
    search = data.filters.search || '';
    statusFilter = data.filters.status || '';
    categoryFilter = data.filters.category || '';
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'ui', label: 'UI/UX' },
    { value: 'feature', label: 'New Feature' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'improvement', label: 'Improvement' }
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', color: 'gray' },
    { value: 'in-review', label: 'In Review', color: 'blue' },
    { value: 'planned', label: 'Planned', color: 'purple' },
    { value: 'in-progress', label: 'In Progress', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'rejected', label: 'Not Planned', color: 'red' }
  ];

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    goto(`?${params.toString()}`);
  }

  function getStatusBadge(status: string) {
    const s = statuses.find(st => st.value === status);
    return s ? `badge-${s.color}` : 'badge-gray';
  }

  function getStatusLabel(status: string) {
    const s = statuses.find(st => st.value === status);
    return s?.label || status;
  }

  function getCategoryLabel(category: string) {
    const c = categories.find(cat => cat.value === category);
    return c?.label || category;
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function openResponse(request: typeof data.requests[0]) {
    selectedRequest = request;
    responseText = request.adminResponse || '';
    responseStatus = request.status;
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Feature Requests</h1>
      <p class="text-gray-500 mt-1">Manage and respond to feature requests from users</p>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
    <button 
      onclick={() => { statusFilter = ''; applyFilters(); }}
      class="card p-4 hover:border-blue-300 transition-colors {!statusFilter ? 'border-blue-500 bg-blue-50' : ''}"
    >
      <div class="text-2xl font-bold text-gray-900">{data.counts.total}</div>
      <div class="text-sm text-gray-500">Total</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'pending'; applyFilters(); }}
      class="card p-4 hover:border-gray-400 transition-colors {statusFilter === 'pending' ? 'border-gray-500 bg-gray-50' : ''}"
    >
      <div class="text-2xl font-bold text-gray-600">{data.counts.pending}</div>
      <div class="text-sm text-gray-500">Pending</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'in-review'; applyFilters(); }}
      class="card p-4 hover:border-blue-300 transition-colors {statusFilter === 'in-review' ? 'border-blue-500 bg-blue-50' : ''}"
    >
      <div class="text-2xl font-bold text-blue-600">{data.counts['in-review']}</div>
      <div class="text-sm text-gray-500">In Review</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'planned'; applyFilters(); }}
      class="card p-4 hover:border-purple-300 transition-colors {statusFilter === 'planned' ? 'border-purple-500 bg-purple-50' : ''}"
    >
      <div class="text-2xl font-bold text-purple-600">{data.counts.planned}</div>
      <div class="text-sm text-gray-500">Planned</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'in-progress'; applyFilters(); }}
      class="card p-4 hover:border-yellow-300 transition-colors {statusFilter === 'in-progress' ? 'border-yellow-500 bg-yellow-50' : ''}"
    >
      <div class="text-2xl font-bold text-yellow-600">{data.counts['in-progress']}</div>
      <div class="text-sm text-gray-500">In Progress</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'completed'; applyFilters(); }}
      class="card p-4 hover:border-green-300 transition-colors {statusFilter === 'completed' ? 'border-green-500 bg-green-50' : ''}"
    >
      <div class="text-2xl font-bold text-green-600">{data.counts.completed}</div>
      <div class="text-sm text-gray-500">Completed</div>
    </button>
    <button 
      onclick={() => { statusFilter = 'rejected'; applyFilters(); }}
      class="card p-4 hover:border-red-300 transition-colors {statusFilter === 'rejected' ? 'border-red-500 bg-red-50' : ''}"
    >
      <div class="text-2xl font-bold text-red-600">{data.counts.rejected}</div>
      <div class="text-sm text-gray-500">Not Planned</div>
    </button>
  </div>

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search requests..."
          bind:value={search}
          onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          class="input pl-10"
        />
      </div>
      <select bind:value={categoryFilter} onchange={applyFilters} class="input w-full sm:w-40">
        <option value="">All Categories</option>
        {#each categories as cat}
          <option value={cat.value}>{cat.label}</option>
        {/each}
      </select>
      <button onclick={applyFilters} class="btn btn-secondary">
        <Filter class="w-4 h-4" />
        Apply
      </button>
    </div>
  </div>

  <!-- Requests List -->
  <div class="space-y-4">
    {#each data.requests as request}
      <div class="card p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <span class="badge {getStatusBadge(request.status)}">{getStatusLabel(request.status)}</span>
              <span class="badge badge-gray">{getCategoryLabel(request.category)}</span>
              {#if request.priority === 'high'}
                <span class="badge badge-red">High Priority</span>
              {/if}
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{request.title}</h3>
            <p class="text-gray-600 mb-4 whitespace-pre-wrap">{request.description}</p>
            
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <User class="w-4 h-4" />
                <span>{request.userName || 'Unknown'}</span>
              </div>
              <div class="flex items-center gap-1">
                <Mail class="w-4 h-4" />
                <span>{request.userEmail}</span>
              </div>
              {#if request.orgName}
                <div class="flex items-center gap-1">
                  <Building2 class="w-4 h-4" />
                  <span>{request.orgName}</span>
                </div>
              {/if}
              {#if request.userRole}
                <span class="badge badge-gray text-xs">{request.userRole}</span>
              {/if}
              <div class="flex items-center gap-1">
                <Clock class="w-4 h-4" />
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>

            {#if request.adminResponse}
              <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                  <MessageSquare class="w-4 h-4" />
                  Response from {request.respondedBy?.name || 'Admin'}
                  {#if request.respondedAt}
                    <span class="text-blue-500">• {formatDate(request.respondedAt)}</span>
                  {/if}
                </div>
                <p class="text-blue-800 whitespace-pre-wrap">{request.adminResponse}</p>
              </div>
            {/if}
          </div>

          <div class="flex flex-col gap-2">
            <button
              onclick={() => openResponse(request)}
              class="btn btn-primary text-sm"
            >
              <MessageSquare class="w-4 h-4" />
              {request.adminResponse ? 'Update' : 'Respond'}
            </button>
            <button
              onclick={() => showDeleteConfirm = request.id}
              class="btn btn-secondary text-sm text-red-600"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    {:else}
      <div class="card p-12 text-center">
        <Lightbulb class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No feature requests found</h3>
        <p class="text-gray-500">
          {#if data.filters.status || data.filters.category || data.filters.search}
            Try adjusting your filters
          {:else}
            Feature requests from users will appear here
          {/if}
        </p>
      </div>
    {/each}
  </div>
</div>

<!-- Response Modal -->
{#if selectedRequest}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Respond to Request</h2>
        <button onclick={() => selectedRequest = null} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <form method="POST" action="?/respond" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            selectedRequest = null;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{form.error}</div>
          {/if}

          <div class="p-4 bg-gray-50 rounded-lg">
            <h3 class="font-medium text-gray-900 mb-2">{selectedRequest.title}</h3>
            <p class="text-sm text-gray-600 mb-2">{selectedRequest.description}</p>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span>{selectedRequest.userName}</span>
              <span>•</span>
              <span>{selectedRequest.userEmail}</span>
            </div>
          </div>

          <input type="hidden" name="id" value={selectedRequest.id} />

          <div>
            <label for="status" class="label">Status</label>
            <select id="status" name="status" bind:value={responseStatus} class="input">
              {#each statuses as status}
                <option value={status.value}>{status.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="adminResponse" class="label">Your Response</label>
            <textarea
              id="adminResponse"
              name="adminResponse"
              bind:value={responseText}
              rows="5"
              required
              class="input"
              placeholder="Write your response to the user..."
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              This response will be emailed to {selectedRequest.userEmail}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => selectedRequest = null} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            <Send class="w-4 h-4" />
            Send Response
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Delete Request?</h2>
        <p class="text-gray-500">This will permanently delete this feature request.</p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => showDeleteConfirm = null} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/delete" use:enhance={() => {
          return async ({ update }) => {
            showDeleteConfirm = null;
            await update();
          };
        }}>
          <input type="hidden" name="id" value={showDeleteConfirm} />
          <button type="submit" class="btn btn-danger">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
