<script lang="ts">
  import {
    BarChart3,
    Cpu,
    Coins,
    TrendingUp,
    Users,
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    BookOpen,
    ClipboardList,
    Sparkles,
    RefreshCw
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let refreshing = $state(false);
  let selectedTab = $state<'overview' | 'users' | 'orgs' | 'logs'>('overview');

  async function refresh() {
    refreshing = true;
    await invalidateAll();
    refreshing = false;
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }

  function getTypeInfo(type: string) {
    const types: Record<string, { label: string; icon: typeof FileText; color: string }> = {
      TEST_GENERATION: { label: 'Test Generation', icon: FileText, color: 'blue' },
      STUDY_GUIDE: { label: 'Study Guide', icon: BookOpen, color: 'amber' },
      WORKSHEET_GENERATION: { label: 'Worksheet', icon: ClipboardList, color: 'green' },
      FLASHCARD_GENERATION: { label: 'Flashcards', icon: Sparkles, color: 'purple' },
      TEST_GRADING: { label: 'Grading', icon: CheckCircle, color: 'indigo' },
      generateTestQuestions: { label: 'Test Questions', icon: FileText, color: 'blue' },
      generateStudyGuide: { label: 'Study Guide', icon: BookOpen, color: 'amber' },
      generateWorksheetItems: { label: 'Worksheet', icon: ClipboardList, color: 'green' },
      generateFlashcards: { label: 'Flashcards', icon: Sparkles, color: 'purple' },
      gradeTestComprehensive: { label: 'Grading', icon: CheckCircle, color: 'indigo' }
    };
    return types[type] || { label: type, icon: Cpu, color: 'gray' };
  }

  function getStatusInfo(status: string) {
    const statuses: Record<string, { label: string; color: string; bgColor: string }> = {
      PENDING: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      RUNNING: { label: 'Running', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
      FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return statuses[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }

  // Calculate max for chart scaling (handle empty arrays)
  const maxDailyTokens = $derived(
    data.dailyUsage.length === 0 ? 1 : Math.max(...data.dailyUsage.map((d) => Number(d.tokens)), 1)
  );
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <BarChart3 class="w-5 h-5 text-purple-600" />
        </div>
        AI Analytics
      </h1>
      <p class="text-gray-500 mt-1">Monitor AI usage, tokens, and costs across the platform</p>
    </div>
    <button onclick={refresh} disabled={refreshing} class="btn btn-secondary">
      <RefreshCw class="w-4 h-4 {refreshing ? 'animate-spin' : ''}" />
      Refresh
    </button>
  </div>

  <!-- Overall Stats -->
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
    <div class="stat-card">
      <div class="stat-value text-purple-600">{formatNumber(data.stats.totalRequests)}</div>
      <div class="stat-label">Total Requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-blue-600">{formatNumber(data.stats.totalTokens)}</div>
      <div class="stat-label">Total Tokens</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-green-600">{formatCost(data.stats.totalCost)}</div>
      <div class="stat-label">Total Cost</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{formatNumber(data.stats.totalJobs)}</div>
      <div class="stat-label">AI Jobs</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-amber-600">{formatNumber(data.stats.last7Days.requests)}</div>
      <div class="stat-label">7-Day Requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-indigo-600">{formatCost(data.stats.last7Days.cost)}</div>
      <div class="stat-label">7-Day Cost</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <nav class="flex gap-4">
      {#each [
        { id: 'overview', label: 'Overview' },
        { id: 'users', label: 'Top Users' },
        { id: 'orgs', label: 'Organizations' },
        { id: 'logs', label: 'Recent Activity' }
      ] as tab}
        <button
          onclick={() => (selectedTab = tab.id as typeof selectedTab)}
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {selectedTab === tab.id
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          {tab.label}
        </button>
      {/each}
    </nav>
  </div>

  {#if selectedTab === 'overview'}
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Usage by Type -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Usage by Operation Type</h3>
        </div>
        <div class="p-4">
          {#if data.usageByType.length === 0}
            <p class="text-sm text-gray-500 text-center py-8">No usage data yet</p>
          {:else}
            <div class="space-y-3">
              {#each data.usageByType as usage}
                {@const typeInfo = getTypeInfo(usage.type)}
                {@const TypeIcon = typeInfo.icon}
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center bg-{typeInfo.color}-100"
                  >
                    <TypeIcon class="w-4 h-4 text-{typeInfo.color}-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-gray-900">{typeInfo.label}</span>
                      <span class="text-sm text-gray-500">{usage._count} requests</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatNumber(usage._sum.totalTokens || 0)} tokens</span>
                      <span>{formatCost(usage._sum.cost || 0)}</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Job Stats -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Job Statistics</h3>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-4 gap-4">
            <div class="text-center p-3 rounded-lg bg-gray-50">
              <div class="text-2xl font-bold text-gray-600">{data.jobStats.PENDING || 0}</div>
              <div class="text-xs text-gray-500">Pending</div>
            </div>
            <div class="text-center p-3 rounded-lg bg-blue-50">
              <div class="text-2xl font-bold text-blue-600">{data.jobStats.RUNNING || 0}</div>
              <div class="text-xs text-blue-600">Running</div>
            </div>
            <div class="text-center p-3 rounded-lg bg-green-50">
              <div class="text-2xl font-bold text-green-600">{data.jobStats.COMPLETED || 0}</div>
              <div class="text-xs text-green-600">Completed</div>
            </div>
            <div class="text-center p-3 rounded-lg bg-red-50">
              <div class="text-2xl font-bold text-red-600">{data.jobStats.FAILED || 0}</div>
              <div class="text-xs text-red-600">Failed</div>
            </div>
          </div>

          <div class="mt-4 space-y-2">
            {#each data.jobsByType as job}
              {@const typeInfo = getTypeInfo(job.type)}
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-700">{typeInfo.label}</span>
                <span class="font-medium text-gray-900">{job._count} jobs</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Daily Usage Chart -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Daily Usage (Last 30 Days)</h3>
        </div>
        <div class="p-4">
          {#if data.dailyUsage.length === 0}
            <p class="text-sm text-gray-500 text-center py-8">No usage data yet</p>
          {:else}
            <div class="h-48 flex items-end gap-1">
              {#each data.dailyUsage as day}
                {@const height = (Number(day.tokens) / maxDailyTokens) * 100}
                <div class="flex-1 group relative">
                  <div
                    class="bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style="height: {Math.max(height, 2)}%"
                  ></div>
                  <div
                    class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                  >
                    {new Date(day.date).toLocaleDateString()}<br />
                    {formatNumber(Number(day.tokens))} tokens<br />
                    {day.count} requests
                  </div>
                </div>
              {/each}
            </div>
            <div class="mt-2 flex justify-between text-xs text-gray-500">
              <span
                >{data.dailyUsage[0]
                  ? new Date(data.dailyUsage[0].date).toLocaleDateString()
                  : ''}</span
              >
              <span
                >{data.dailyUsage[data.dailyUsage.length - 1]
                  ? new Date(data.dailyUsage[data.dailyUsage.length - 1].date).toLocaleDateString()
                  : ''}</span
              >
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else if selectedTab === 'users'}
    <!-- Top Users -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200">
        <h3 class="font-semibold text-gray-900">Top Users by AI Usage</h3>
      </div>
      {#if data.topUsers.length === 0}
        <div class="p-8 text-center">
          <Users class="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p class="text-gray-500">No usage data yet</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Requests</th
                >
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Total Tokens</th
                >
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Est. Cost</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each data.topUsers as usage, i}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <span
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {i <
                      3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'}"
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{usage.user?.name || 'Unknown'}</div>
                    <div class="text-sm text-gray-500">{usage.user?.email || ''}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium">{usage._count}</td>
                  <td class="px-4 py-3 text-right font-medium">
                    {formatNumber(usage._sum.totalTokens || 0)}
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-green-600">
                    {formatCost(usage._sum.cost || 0)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else if selectedTab === 'orgs'}
    <!-- Top Organizations -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200">
        <h3 class="font-semibold text-gray-900">Top Organizations by AI Usage</h3>
      </div>
      {#if data.topOrgs.length === 0}
        <div class="p-8 text-center">
          <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p class="text-gray-500">No organization usage data yet</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Organization</th
                >
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Requests</th
                >
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Total Tokens</th
                >
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >Est. Cost</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each data.topOrgs as usage, i}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <span
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {i <
                      3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'}"
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{usage.org?.name || 'Unknown'}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium">{usage._count}</td>
                  <td class="px-4 py-3 text-right font-medium">
                    {formatNumber(usage._sum.totalTokens || 0)}
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-green-600">
                    {formatCost(usage._sum.cost || 0)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else if selectedTab === 'logs'}
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent Usage Logs -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Recent AI Requests</h3>
        </div>
        <div class="max-h-[600px] overflow-y-auto">
          {#if data.recentLogs.length === 0}
            <div class="p-8 text-center">
              <Clock class="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p class="text-gray-500">No recent activity</p>
            </div>
          {:else}
            <div class="divide-y divide-gray-200">
              {#each data.recentLogs as log}
                {@const typeInfo = getTypeInfo(log.type)}
                {@const TypeIcon = typeInfo.icon}
                <div class="p-4 hover:bg-gray-50">
                  <div class="flex items-start gap-3">
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center bg-{typeInfo.color}-100 flex-shrink-0"
                    >
                      <TypeIcon class="w-4 h-4 text-{typeInfo.color}-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-gray-900 text-sm">{typeInfo.label}</span>
                        <span
                          class="text-xs px-2 py-0.5 rounded-full {log.success
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'}"
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <div class="text-sm text-gray-500">{log.user?.name || 'Unknown user'}</div>
                      <div class="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>{formatNumber(log.totalTokens)} tokens</span>
                        <span>{formatCost(log.cost)}</span>
                        <span>{log.duration}ms</span>
                      </div>
                      <div class="text-xs text-gray-400 mt-1">{formatDate(log.createdAt)}</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Recent Jobs -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Recent AI Jobs</h3>
        </div>
        <div class="max-h-[600px] overflow-y-auto">
          {#if data.recentJobs.length === 0}
            <div class="p-8 text-center">
              <Cpu class="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p class="text-gray-500">No recent jobs</p>
            </div>
          {:else}
            <div class="divide-y divide-gray-200">
              {#each data.recentJobs as job}
                {@const typeInfo = getTypeInfo(job.type)}
                {@const statusInfo = getStatusInfo(job.status)}
                {@const TypeIcon = typeInfo.icon}
                <div class="p-4 hover:bg-gray-50">
                  <div class="flex items-start gap-3">
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center bg-{typeInfo.color}-100 flex-shrink-0"
                    >
                      <TypeIcon class="w-4 h-4 text-{typeInfo.color}-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-gray-900 text-sm">{typeInfo.label}</span>
                        <span
                          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full {statusInfo.bgColor} {statusInfo.color}"
                        >
                          {#if job.status === 'RUNNING'}
                            <Loader2 class="w-3 h-3 animate-spin" />
                          {:else if job.status === 'COMPLETED'}
                            <CheckCircle class="w-3 h-3" />
                          {:else if job.status === 'FAILED'}
                            <XCircle class="w-3 h-3" />
                          {/if}
                          {statusInfo.label}
                        </span>
                      </div>
                      <div class="text-sm text-gray-500">{job.user?.name || 'Unknown user'}</div>
                      {#if job.error}
                        <div class="text-xs text-red-600 mt-1 truncate">{job.error}</div>
                      {/if}
                      <div class="text-xs text-gray-400 mt-1">{formatDate(job.createdAt)}</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
