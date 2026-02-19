<script lang="ts">
  import { Users, Building2, FileText, ClipboardList, Clock, TrendingUp, BarChart3 } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-7xl mx-auto space-y-8">
  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-blue-500 to-blue-600">
        <Users class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalUsers}</div>
        <div class="text-sm text-gray-500">Total Users</div>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-purple-500 to-purple-600">
        <Building2 class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalOrganizations}</div>
        <div class="text-sm text-gray-500">Organizations</div>
      </div>
    </div>
    <div class="stats-card border-amber-200 bg-amber-50/50">
      <div class="stats-icon bg-gradient-to-br from-amber-500 to-orange-500">
        <Clock class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-amber-600">{data.stats.pendingRequests}</div>
        <div class="text-sm text-gray-500">Pending Requests</div>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-green-500 to-emerald-600">
        <FileText class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalTests}</div>
        <div class="text-sm text-gray-500">Tests Created</div>
      </div>
    </div>
    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-rose-500 to-pink-600">
        <BarChart3 class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalSubmissions}</div>
        <div class="text-sm text-gray-500">Submissions</div>
      </div>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Pending Org Requests -->
    <div class="card">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Pending Organization Requests</h3>
        <a href="/admin/requests" class="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentRequests.length === 0}
          <div class="text-center py-8">
            <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No pending requests</p>
            <p class="text-sm text-gray-400 mt-1">New requests will appear here.</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each data.recentRequests as request}
              <a href="/admin/requests/{request.id}" class="block p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Building2 class="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{request.organizationName}</div>
                      <div class="text-sm text-gray-500">{request.contactEmail}</div>
                    </div>
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
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Recent Users</h3>
        <a href="/admin/users" class="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentUsers.length === 0}
          <div class="text-center py-8">
            <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No users yet</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each data.recentUsers as user}
              <div class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span class="text-sm font-semibold text-gray-600">{user.name?.charAt(0) || '?'}</span>
                  </div>
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
