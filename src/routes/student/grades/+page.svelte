<script lang="ts">
  import { Trophy, TrendingUp, Target, Award } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getGradeColor(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getGradeBadge(percentage: number): string {
    if (percentage >= 90) return 'badge-green';
    if (percentage >= 80) return 'badge-blue';
    if (percentage >= 70) return 'badge-yellow';
    return 'badge-red';
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">My Grades</h1>
    <p class="text-gray-600">View your test scores and progress</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Target class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalTests}</div>
          <div class="stat-label">Tests Taken</div>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Trophy class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalScore}</div>
          <div class="stat-label">Points Earned</div>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Award class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalPoints}</div>
          <div class="stat-label">Total Points</div>
        </div>
      </div>
    </div>

    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <TrendingUp class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div class="stat-value {data.stats.overallPercentage !== null ? getGradeColor(data.stats.overallPercentage) : ''}">
            {data.stats.overallPercentage !== null ? `${data.stats.overallPercentage}%` : '-'}
          </div>
          <div class="stat-label">Overall</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Grades List -->
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200">
      <h2 class="font-semibold text-gray-900">Test Scores</h2>
    </div>

    {#if data.submissions.length === 0}
      <div class="p-8 text-center">
        <Trophy class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No graded tests yet</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-100">
        {#each data.submissions as submission}
          {@const totalScore = (submission.score || 0) + (submission.bonusPoints || 0)}
          {@const percentage = Math.round(Math.min(100, totalScore / (submission.totalPoints || 1) * 100))}
          <div class="p-4 flex items-center justify-between">
            <div>
              <h3 class="font-medium text-gray-900">{submission.test.title}</h3>
              <p class="text-sm text-gray-500">
                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Unknown date'}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-600">{totalScore}/{submission.totalPoints}{submission.bonusPoints ? ` (+${submission.bonusPoints})` : ''}</span>
              <span class="badge {getGradeBadge(percentage)}">{percentage}%</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
