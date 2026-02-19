<script lang="ts">
  import { Trophy, TrendingUp, Target, Award, FileText, GraduationCap } from 'lucide-svelte';
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

  // Combine and sort all grades by date
  const allGrades = $derived([
    ...data.submissions.map(s => ({
      type: 'test' as const,
      title: s.test.title,
      score: (s.score || 0) + (s.bonusPoints || 0),
      totalPoints: s.totalPoints || 0,
      bonusPoints: s.bonusPoints || 0,
      date: s.submittedAt
    })),
    ...data.docSubmissions.map(s => ({
      type: 'document' as const,
      title: s.assignment.title || s.assignment.document.title,
      score: s.grade || 0,
      totalPoints: s.assignment.points || 0,
      bonusPoints: 0,
      date: s.submittedAt
    }))
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }));
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
        <Trophy class="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">My Grades</h1>
        <p class="text-gray-600">View your scores and progress</p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="stat-card">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Target class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div class="stat-value">{data.stats.totalTests + data.stats.totalDocs}</div>
          <div class="stat-label">Graded</div>
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
      <h2 class="font-semibold text-gray-900">All Scores</h2>
    </div>

    {#if allGrades.length === 0}
      <div class="p-8 text-center">
        <Trophy class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No graded assignments yet</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-100">
        {#each allGrades as grade}
          {@const percentage = grade.totalPoints > 0 ? Math.round(Math.min(100, grade.score / grade.totalPoints * 100)) : 0}
          <div class="p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center {grade.type === 'test' ? 'bg-blue-100' : 'bg-emerald-100'}">
                {#if grade.type === 'test'}
                  <FileText class="w-4 h-4 text-blue-600" />
                {:else}
                  <GraduationCap class="w-4 h-4 text-emerald-600" />
                {/if}
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{grade.title}</h3>
                <p class="text-sm text-gray-500">
                  {grade.date ? new Date(grade.date).toLocaleDateString() : 'Unknown date'}
                  <span class="text-xs ml-1 text-gray-400">• {grade.type === 'test' ? 'Test' : 'Document'}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-600">{grade.score}/{grade.totalPoints}{grade.bonusPoints ? ` (+${grade.bonusPoints})` : ''}</span>
              <span class="badge {getGradeBadge(percentage)}">{percentage}%</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
