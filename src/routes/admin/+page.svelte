<script lang="ts">
  import { Users, Building2, FileText, ClipboardList, Clock } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-6xl mx-auto">
  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalUsers}</div>
      <div class="stat-label">Total Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalOrganizations}</div>
      <div class="stat-label">Organizations</div>
    </div>
    <div class="stat-card bg-yellow-50 border-yellow-200">
      <div class="stat-value text-yellow-600">{data.stats.pendingRequests}</div>
      <div class="stat-label">Pending Requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalTests}</div>
      <div class="stat-label">Tests Created</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalSubmissions}</div>
      <div class="stat-label">Submissions</div>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Pending Org Requests -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Pending Organization Requests</h3>
        <a href="/admin/requests" class="text-sm text-blue-600 hover:underline">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentRequests.length === 0}
          <p class="text-sm text-gray-500 text-center py-4">No pending requests</p>
        {:else}
          <div class="space-y-3">
            {#each data.recentRequests as request}
              <a href="/admin/requests/{request.id}" class="block p-3 rounded-lg hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-gray-900">{request.organizationName}</div>
                    <div class="text-sm text-gray-500">{request.contactEmail}</div>
                  </div>
                  <span class="badge badge-yellow">Pending</span>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Recent Users -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Recent Users</h3>
        <a href="/admin/users" class="text-sm text-blue-600 hover:underline">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentUsers.length === 0}
          <p class="text-sm text-gray-500 text-center py-4">No users yet</p>
        {:else}
          <div class="space-y-3">
            {#each data.recentUsers as user}
              <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-sm">{user.name?.charAt(0) || '?'}</div>
                  <div>
                    <div class="font-medium text-gray-900">{user.name}</div>
                    <div class="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <span class="badge {user.platformRole === 'PLATFORM_ADMIN' ? 'badge-red' : 'badge-gray'}">
                  {user.platformRole}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
