<script lang="ts">
  import {
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    User,
    Building2,
    Clock,
    Filter,
    Eye,
    Globe,
    Calendar,
    X
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();

  let search = $state(data.filters.search);
  let actionFilter = $state(data.filters.action);
  let selectedOrg = $state(data.filters.orgId);
  let selectedEntityType = $state(data.filters.entityType);
  let userIdFilter = $state(data.filters.userId);
  let dateFrom = $state(data.filters.dateFrom);
  let dateTo = $state(data.filters.dateTo);

  function buildFilterParams() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (actionFilter) params.set('action', actionFilter);
    if (selectedOrg) params.set('orgId', selectedOrg);
    if (selectedEntityType) params.set('entityType', selectedEntityType);
    if (userIdFilter) params.set('userId', userIdFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params;
  }

  function applyFilters() {
    const params = buildFilterParams();
    goto(`/admin/audit-logs?${params.toString()}`);
  }

  function clearFilters() {
    search = '';
    actionFilter = '';
    selectedOrg = '';
    selectedEntityType = '';
    userIdFilter = '';
    dateFrom = '';
    dateTo = '';
    goto('/admin/audit-logs');
  }

  function paginationUrl(targetPage: number) {
    const params = buildFilterParams();
    params.set('page', String(targetPage));
    return `/admin/audit-logs?${params.toString()}`;
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleString();
  }

  function getActionColor(action: string) {
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('REJECTED')) return 'text-red-600 bg-red-100';
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('APPROVED')) return 'text-green-600 bg-green-100';
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('CHANGED')) return 'text-blue-600 bg-blue-100';
    if (action.includes('LOGIN') || action.includes('AUTH') || action.includes('LOGOUT') || action.includes('PASSWORD')) return 'text-purple-600 bg-purple-100';
    if (action.includes('ADMIN') || action.includes('IMPERSONATE')) return 'text-orange-600 bg-orange-100';
    if (action.includes('SUSPEND') || action.includes('BLOCK') || action.includes('DISABLE')) return 'text-red-600 bg-red-100';
    if (action.includes('PUBLISH') || action.includes('ASSIGN') || action.includes('SHARE')) return 'text-teal-600 bg-teal-100';
    if (action.includes('SYSTEM') || action.includes('BILLING')) return 'text-gray-600 bg-gray-200';
    return 'text-gray-600 bg-gray-100';
  }

  function formatDetails(details: any) {
    if (!details) return null;
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  let expandedLogs = $state<Set<string>>(new Set());

  function toggleExpand(id: string) {
    const newSet = new Set(expandedLogs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedLogs = newSet;
  }

  let hasActiveFilters = $derived(
    search || actionFilter || selectedOrg || selectedEntityType || userIdFilter || dateFrom || dateTo
  );

  // Generate page numbers for pagination
  function getPageNumbers(current: number, total: number) {
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <FileText class="w-5 h-5 text-indigo-600" />
        </div>
        Audit Logs
      </h1>
      <p class="text-gray-500 mt-1">System activity and security audit trail</p>
    </div>
    <div class="text-sm text-gray-500">
      {data.total.toLocaleString()} total entries
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Filter class="w-4 h-4 text-gray-500" />
          <span class="font-medium text-gray-700">Filters</span>
        </div>
        {#if hasActiveFilters}
          <button onclick={clearFilters} class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X class="w-3 h-3" />
            Clear all
          </button>
        {/if}
      </div>

      <!-- Search bar -->
      <div class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            bind:value={search}
            placeholder="Search by action, entity, user name or email..."
            class="input pl-10 w-full"
            onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label class="label">Action</label>
          <select bind:value={actionFilter} class="input">
            <option value="">All Actions</option>
            {#each data.filterOptions.actions as action}
              <option value={action}>{action}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="label">Organization</label>
          <select bind:value={selectedOrg} class="input">
            <option value="">All Organizations</option>
            {#each data.filterOptions.organizations as org}
              <option value={org.id}>{org.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="label">Entity Type</label>
          <select bind:value={selectedEntityType} class="input">
            <option value="">All Types</option>
            {#each data.filterOptions.entityTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="label">User ID</label>
          <input
            type="text"
            bind:value={userIdFilter}
            placeholder="Filter by user ID..."
            class="input"
          />
        </div>

        <div>
          <label class="label">From Date</label>
          <input
            type="date"
            bind:value={dateFrom}
            class="input"
          />
        </div>

        <div>
          <label class="label">To Date</label>
          <input
            type="date"
            bind:value={dateTo}
            class="input"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 mt-4">
        <button onclick={applyFilters} class="btn btn-primary">
          Apply Filters
        </button>
        {#if hasActiveFilters}
          <button onclick={clearFilters} class="btn btn-secondary">
            Clear
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Logs Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each data.logs as log}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <Clock class="w-4 h-4" />
                  {formatDate(log.createdAt)}
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getActionColor(log.action)}">
                  {log.action}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if log.user}
                  <div class="flex items-center gap-2">
                    <User class="w-4 h-4 text-gray-400" />
                    <div>
                      <div class="text-sm font-medium text-gray-900">{log.user.name || 'Unknown'}</div>
                      <div class="text-xs text-gray-500">{log.user.email}</div>
                    </div>
                  </div>
                {:else}
                  <span class="text-gray-400 text-sm">System</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if log.organization}
                  <div class="flex items-center gap-2">
                    <Building2 class="w-4 h-4 text-gray-400" />
                    <span class="text-sm">{log.organization.name}</span>
                  </div>
                {:else}
                  <span class="text-gray-400 text-sm">-</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if log.entityType}
                  <div class="text-sm">
                    <span class="font-medium text-gray-700">{log.entityType}</span>
                    {#if log.entityId}
                      <span class="text-gray-400 text-xs ml-1">({log.entityId.slice(0, 8)}...)</span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-gray-400 text-sm">-</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if log.ipAddress}
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <Globe class="w-4 h-4" />
                    {log.ipAddress}
                  </div>
                {:else}
                  <span class="text-gray-400 text-sm">-</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if log.details}
                  <button
                    onclick={() => toggleExpand(log.id)}
                    class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Eye class="w-4 h-4" />
                    {expandedLogs.has(log.id) ? 'Hide' : 'View'}
                  </button>
                {:else}
                  <span class="text-gray-400 text-sm">-</span>
                {/if}
              </td>
            </tr>
            {#if expandedLogs.has(log.id) && log.details}
              <tr class="bg-gray-50">
                <td colspan="7" class="px-4 py-3">
                  <pre class="text-xs bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">{formatDetails(log.details)}</pre>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    {#if data.logs.length === 0}
      <div class="p-8 text-center">
        <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No audit logs found</p>
      </div>
    {/if}

    <!-- Pagination -->
    {#if data.totalPages > 1}
      <div class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          Showing {((data.page - 1) * 50) + 1}–{Math.min(data.page * 50, data.total)} of {data.total.toLocaleString()} entries
        </div>
        <div class="flex items-center gap-1">
          <a
            href={paginationUrl(Math.max(1, data.page - 1))}
            class="btn btn-secondary btn-sm {data.page === 1 ? 'opacity-50 pointer-events-none' : ''}"
          >
            <ChevronLeft class="w-4 h-4" />
          </a>
          {#each getPageNumbers(data.page, data.totalPages) as p}
            {#if p === '...'}
              <span class="px-2 text-gray-400">…</span>
            {:else}
              <a
                href={paginationUrl(p)}
                class="btn btn-sm {p === data.page ? 'btn-primary' : 'btn-secondary'}"
              >
                {p}
              </a>
            {/if}
          {/each}
          <a
            href={paginationUrl(Math.min(data.totalPages, data.page + 1))}
            class="btn btn-secondary btn-sm {data.page === data.totalPages ? 'opacity-50 pointer-events-none' : ''}"
          >
            <ChevronRight class="w-4 h-4" />
          </a>
        </div>
      </div>
    {/if}
  </div>
</div>
