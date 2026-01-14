<script lang="ts">
  import {
    Cpu,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    FileText,
    BookOpen,
    ClipboardList,
    Sparkles,
    ExternalLink,
    RefreshCw
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  let refreshing = $state(false);

  async function refresh() {
    refreshing = true;
    await invalidateAll();
    refreshing = false;
  }

  function getJobTypeInfo(type: string) {
    const types: Record<string, { label: string; icon: typeof FileText; color: string }> = {
      TEST_GENERATION: { label: 'Test Generation', icon: FileText, color: 'blue' },
      STUDY_GUIDE: { label: 'Study Guide', icon: BookOpen, color: 'amber' },
      WORKSHEET_GENERATION: { label: 'Worksheet', icon: ClipboardList, color: 'green' },
      FLASHCARD_GENERATION: { label: 'Flashcards', icon: Sparkles, color: 'purple' },
      TEST_GRADING: { label: 'Grading', icon: CheckCircle, color: 'indigo' },
      POWERSCHOOL_SYNC: { label: 'PowerSchool Sync', icon: ExternalLink, color: 'teal' }
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

  function getJobTitle(job: (typeof data.jobs)[0]) {
    const input = job.input as Record<string, any>;
    if (input.topic) return input.topic;
    if (input.testTitle) return input.testTitle;
    if (input.title) return input.title;
    return job.type.replace('_', ' ');
  }

  function getEntityLink(job: (typeof data.jobs)[0]) {
    if (!job.entityId || !job.entityType) return null;
    const links: Record<string, string> = {
      TEST: `/teacher/tests/${job.entityId}`,
      STUDY_GUIDE: `/teacher/study-guides/${job.entityId}`,
      WORKSHEET: `/teacher/worksheets/${job.entityId}`,
      STUDY_SET: `/teacher/study-sets/${job.entityId}`,
      SUBMISSION: `/teacher/tests`
    };
    return links[job.entityType];
  }

  function getContinueLink(job: (typeof data.jobs)[0]) {
    // For completed jobs without an entity, allow continuing to finish setup
    if (job.status !== 'COMPLETED' || job.entityId) return null;
    const links: Record<string, string> = {
      TEST_GENERATION: `/teacher/tests/create?jobId=${job.id}`,
      WORKSHEET_GENERATION: `/teacher/worksheets/create?jobId=${job.id}`,
      FLASHCARD_GENERATION: `/teacher/study-sets/create?jobId=${job.id}`
    };
    return links[job.type] || null;
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleString();
  }

  function formatDuration(start: Date | string, end: Date | string) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  // Auto-refresh if there are running jobs
  $effect(() => {
    if (data.stats.running > 0 || data.stats.pending > 0) {
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }
  });
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Cpu class="w-5 h-5 text-purple-600" />
        </div>
        Compute Jobs
      </h1>
      <p class="text-gray-500 mt-1">Track your AI tasks and compute usage. These are metered and billed accordingly since they use resources.</p>
    </div>
    <button onclick={refresh} disabled={refreshing} class="btn btn-secondary">
      <RefreshCw class="w-4 h-4 {refreshing ? 'animate-spin' : ''}" />
      Refresh
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
    <div class="stat-card">
      <div class="stat-value">{data.stats.total}</div>
      <div class="stat-label">Total Jobs</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-green-600">{data.stats.completed}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-blue-600">{data.stats.running}</div>
      <div class="stat-label">Running</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-gray-600">{data.stats.pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-red-600">{data.stats.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
  </div>

  <!-- Jobs List -->
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200">
      <h2 class="font-semibold text-gray-900">Recent Jobs</h2>
    </div>

    {#if data.jobs.length === 0}
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Cpu class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">No Compute Jobs Yet</h3>
        <p class="text-gray-500">
          Jobs will appear here when you generate tests, study guides, worksheets, or sync grades.
        </p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200">
        {#each data.jobs as job}
          {@const typeInfo = getJobTypeInfo(job.type)}
          {@const statusInfo = getStatusInfo(job.status)}
          {@const entityLink = getEntityLink(job)}
          {@const continueLink = getContinueLink(job)}
          {@const TypeIcon = typeInfo.icon}
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-{typeInfo.color}-100"
                >
                  <TypeIcon class="w-5 h-5 text-{typeInfo.color}-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-medium text-gray-900 truncate">{getJobTitle(job)}</h3>
                    <span class="badge badge-{typeInfo.color} text-xs">{typeInfo.label}</span>
                  </div>
                  <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{formatDate(job.createdAt)}</span>
                    {#if job.startedAt && job.completedAt}
                      <span>Duration: {formatDuration(job.startedAt, job.completedAt)}</span>
                    {/if}
                  </div>
                  {#if job.error}
                    <p class="text-sm text-red-600 mt-1">{job.error}</p>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-3">
                {#if job.status === 'RUNNING'}
                  <div class="flex items-center gap-2">
                    <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-blue-500 transition-all duration-500"
                        style="width: {job.progress}%"
                      ></div>
                    </div>
                    <span class="text-sm text-blue-600">{job.progress}%</span>
                  </div>
                {/if}

                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium {statusInfo.bgColor} {statusInfo.color}"
                >
                  {#if job.status === 'PENDING'}
                    <Clock class="w-3 h-3" />
                  {:else if job.status === 'RUNNING'}
                    <Loader2 class="w-3 h-3 animate-spin" />
                  {:else if job.status === 'COMPLETED'}
                    <CheckCircle class="w-3 h-3" />
                  {:else if job.status === 'FAILED'}
                    <XCircle class="w-3 h-3" />
                  {/if}
                  {statusInfo.label}
                </span>

                {#if entityLink && job.status === 'COMPLETED'}
                  <a href={entityLink} class="btn btn-secondary btn-sm">
                    <ExternalLink class="w-4 h-4" />
                    View
                  </a>
                {:else if continueLink}
                  <a href={continueLink} class="btn btn-primary btn-sm">
                    <Sparkles class="w-4 h-4" />
                    Continue
                  </a>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
