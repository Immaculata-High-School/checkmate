<script lang="ts">
  import {
    BarChart3,
    Users,
    GraduationCap,
    FileText,
    CheckCircle,
    TrendingUp,
    Clock,
    Award
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'overview' | 'tests' | 'classes'>('overview');

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString();
  }

  function formatScore(score: number | null) {
    if (score === null) return '-';
    return `${score.toFixed(1)}%`;
  }

  function getScoreColor(score: number | null) {
    if (score === null) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getScoreBg(score: number | null) {
    if (score === null) return 'bg-gray-100';
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <BarChart3 class="w-5 h-5 text-purple-600" />
      </div>
      Performance Dashboard
    </h1>
    <p class="text-gray-500 mt-1">Track student and class performance across your organization</p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Users class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalStudents}</div>
          <div class="stat-label">Students</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <GraduationCap class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalTeachers}</div>
          <div class="stat-label">Teachers</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <FileText class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalTests}</div>
          <div class="stat-label">Tests</div>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <CheckCircle class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalSubmissions}</div>
          <div class="stat-label">Submissions</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs mb-6">
    <button
      class="tab {activeTab === 'overview' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'overview')}
    >
      <TrendingUp class="w-4 h-4 inline mr-2" />
      Overview
    </button>
    <button
      class="tab {activeTab === 'tests' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'tests')}
    >
      <FileText class="w-4 h-4 inline mr-2" />
      Tests
    </button>
    <button
      class="tab {activeTab === 'classes' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'classes')}
    >
      <Users class="w-4 h-4 inline mr-2" />
      Classes
    </button>
  </div>

  <!-- Overview Tab -->
  {#if activeTab === 'overview'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Class Performance -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Class Performance</h2>
        </div>
        {#if data.classPerformance.length > 0}
          <div class="divide-y divide-gray-200">
            {#each data.classPerformance as cls}
              <div class="p-4 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium text-gray-900">{cls.name}</h3>
                    <p class="text-sm text-gray-500">
                      {cls.studentCount} students | {cls.testCount} tests
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-semibold {getScoreColor(cls.avgScore)}">
                        {formatScore(cls.avgScore)}
                      </span>
                      {#if cls.avgScore !== null}
                        <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            class="h-full {cls.avgScore >= 70 ? 'bg-green-500' : cls.avgScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}"
                            style="width: {Math.min(cls.avgScore, 100)}%"
                          ></div>
                        </div>
                      {/if}
                    </div>
                    <p class="text-xs text-gray-400 mt-1">avg score</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-8 text-center">
            <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No class data available yet</p>
          </div>
        {/if}
      </div>

      <!-- Recent Submissions -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Recent Submissions</h2>
        </div>
        {#if data.recentSubmissions.length > 0}
          <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {#each data.recentSubmissions as submission}
              <div class="p-3 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users class="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {submission.student.name || submission.student.email}
                      </p>
                      <p class="text-xs text-gray-500">{submission.test.title}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {
                      submission.status === 'GRADED' ? 'bg-green-100 text-green-700' :
                      submission.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }">
                      {submission.status}
                    </span>
                    {#if submission.status === 'GRADED' && submission.score !== null}
                      {@const totalScore = (submission.score || 0) + (submission.bonusPoints || 0)}
                      <p class="text-xs text-gray-500 mt-1">
                        {totalScore}/{submission.totalPoints}{submission.bonusPoints ? ` (+${submission.bonusPoints})` : ''}
                      </p>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-8 text-center">
            <Clock class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No submissions yet</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Tests Tab -->
  {#if activeTab === 'tests'}
    <div class="card overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each data.testStats as test}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{test.title}</div>
                <div class="text-xs text-gray-500">{formatDate(test.createdAt)}</div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {test.teacher.name || 'Unknown'}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {test.questionCount}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {test.submissionCount}
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium {getScoreBg(test.avgScore)} {getScoreColor(test.avgScore)}">
                  {formatScore(test.avgScore)}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="badge {test.status === 'PUBLISHED' ? 'badge-green' : test.status === 'DRAFT' ? 'badge-gray' : 'badge-amber'}">
                  {test.status}
                </span>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No tests found
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Classes Tab -->
  {#if activeTab === 'classes'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each data.classPerformance as cls}
        <div class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{cls.name}</h3>
              <p class="text-sm text-gray-500">{cls.teacher?.name || 'No teacher'}</p>
            </div>
            <div class="px-2.5 py-0.5 rounded-full text-sm font-medium {getScoreBg(cls.avgScore)} {getScoreColor(cls.avgScore)}">
              {formatScore(cls.avgScore)}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-gray-400" />
              <span class="text-gray-600">{cls.studentCount} students</span>
            </div>
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              <span class="text-gray-600">{cls.testCount} tests</span>
            </div>
          </div>
          {#if cls.avgScore !== null}
            <div class="mt-3">
              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all {cls.avgScore >= 70 ? 'bg-green-500' : cls.avgScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}"
                  style="width: {Math.min(cls.avgScore, 100)}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="col-span-full card p-8 text-center">
          <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500">No classes found</p>
        </div>
      {/each}
    </div>
  {/if}
</div>
