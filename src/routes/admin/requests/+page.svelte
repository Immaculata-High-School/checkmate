<script lang="ts">
  import { Building2, Clock, CheckCircle, XCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-6xl mx-auto">
  <!-- Filters -->
  <div class="flex gap-2 mb-6">
    <a
      href="/admin/requests?status=PENDING"
      class="btn {data.currentStatus === 'PENDING' ? 'btn-primary' : 'btn-secondary'} btn-sm"
    >
      Pending ({data.counts.PENDING})
    </a>
    <a
      href="/admin/requests?status=APPROVED"
      class="btn {data.currentStatus === 'APPROVED' ? 'btn-primary' : 'btn-secondary'} btn-sm"
    >
      Approved ({data.counts.APPROVED})
    </a>
    <a
      href="/admin/requests?status=REJECTED"
      class="btn {data.currentStatus === 'REJECTED' ? 'btn-primary' : 'btn-secondary'} btn-sm"
    >
      Rejected ({data.counts.REJECTED})
    </a>
    <a
      href="/admin/requests?status=ALL"
      class="btn {data.currentStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm"
    >
      All ({data.counts.ALL})
    </a>
  </div>

  <!-- Requests List -->
  {#if data.requests.length === 0}
    <div class="card p-12">
      <div class="empty-state">
        <Building2 class="empty-state-icon" />
        <div class="empty-state-title">No requests found</div>
        <div class="empty-state-text">
          {#if data.currentStatus === 'PENDING'}
            No pending organization requests at this time.
          {:else}
            No {data.currentStatus.toLowerCase()} requests.
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      {#each data.requests as request}
        <a href="/admin/requests/{request.id}" class="card p-4 hover:border-blue-300 transition-colors block">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 class="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{request.organizationName}</h3>
                <div class="text-sm text-gray-500">
                  {request.contactName} · {request.contactEmail}
                </div>
                <div class="text-xs text-gray-400 mt-1">
                  {request.organizationType} · {request.city}, {request.state}
                </div>
              </div>
            </div>
            <div class="text-right">
              {#if request.status === 'PENDING'}
                <span class="badge badge-yellow">
                  <Clock class="w-3 h-3" />
                  Pending
                </span>
              {:else if request.status === 'APPROVED'}
                <span class="badge badge-green">
                  <CheckCircle class="w-3 h-3" />
                  Approved
                </span>
              {:else}
                <span class="badge badge-red">
                  <XCircle class="w-3 h-3" />
                  Rejected
                </span>
              {/if}
              <div class="text-xs text-gray-400 mt-1">
                {new Date(request.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
