<script lang="ts">
  import {
    BookOpen,
    FileText,
    Trophy,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Play,
    Sparkles
  } from 'lucide-svelte';
  import { formatDate, formatRelativeTime, calculatePercentage, getGradeColor, getGradeLetter } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-7xl mx-auto space-y-8">
  <!-- Welcome Section -->
  <div class="card-ai p-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 mb-1">
          Hey, {data.user?.name?.split(' ')[0]}!
        </h2>
        <p class="text-gray-600">
          {#if data.upcomingAssignments.length > 0}
            You have <span class="font-semibold text-primary-600">{data.upcomingAssignments.length} upcoming assignments</span>. Keep up the great work!
          {:else}
            You're all caught up! No pending assignments.
          {/if}
        </p>
      </div>
      <div class="flex gap-3">
        <a href="/student/study" class="btn btn-secondary">
          <BookOpen class="w-5 h-5" />
          Study Materials
        </a>
        <a href="/student/assignments" class="btn btn-primary">
          <Play class="w-5 h-5" />
          My Assignments
        </a>
      </div>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-blue-500 to-blue-600">
        <BookOpen class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalClasses}</div>
        <div class="text-sm text-gray-500">Classes</div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-purple-500 to-purple-600">
        <FileText class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.totalTests}</div>
        <div class="text-sm text-gray-500">Completed</div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-green-500 to-green-600">
        <Trophy class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold {getGradeColor(data.stats.averageScore)}">
          {data.stats.averageScore}%
        </div>
        <div class="text-sm text-gray-500">Average</div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-icon bg-gradient-to-br from-amber-500 to-orange-500">
        <Sparkles class="w-6 h-6" />
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-900">{data.stats.studySets}</div>
        <div class="text-sm text-gray-500">Study Sets</div>
      </div>
    </div>
  </div>

  <!-- Two column layout -->
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Upcoming Assignments -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Upcoming Assignments</h3>
        <a href="/student/assignments" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all
        </a>
      </div>

      {#if data.upcomingAssignments.length === 0}
        <div class="text-center py-8">
          <CheckCircle2 class="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p class="text-gray-500">No upcoming assignments!</p>
          <p class="text-sm text-gray-400">Enjoy your free time.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each data.upcomingAssignments as assignment}
            <a
              href={assignment.test
                ? `/student/assignments/${assignment.test.id}`
                : assignment.studySet
                  ? `/student/study/${assignment.studySet.id}`
                  : '#'}
              class="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center gap-4">
                <span class="text-2xl">{assignment.class.emoji || '📚'}</span>
                <div>
                  <div class="font-medium text-gray-900">
                    {assignment.test?.title || assignment.studySet?.title || assignment.title}
                  </div>
                  <div class="text-sm text-gray-500">{assignment.class.name}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                {#if assignment.dueDate}
                  <div class="text-sm text-right">
                    <div class="text-gray-400">Due</div>
                    <div class="font-medium text-gray-700">{formatDate(assignment.dueDate)}</div>
                  </div>
                {/if}
                <ArrowRight class="w-5 h-5 text-gray-300" />
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Test Results -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Recent Results</h3>
        <a href="/student/grades" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all
        </a>
      </div>

      {#if data.recentSubmissions.length === 0}
        <div class="text-center py-8">
          <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500">No test results yet</p>
          <p class="text-sm text-gray-400">Complete a test to see your results here.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each data.recentSubmissions as submission}
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <div class="font-medium text-gray-900">{submission.test.title}</div>
                <div class="text-sm text-gray-500">
                  {formatRelativeTime(submission.submittedAt || submission.startedAt)}
                </div>
              </div>
              <div class="flex items-center gap-2">
                {#if submission.status === 'GRADED' && submission.score !== null}
                  {@const totalScore = (submission.score || 0) + (submission.bonusPoints || 0)}
                  {@const percentage = calculatePercentage(Math.min(totalScore, submission.totalPoints || totalScore), submission.totalPoints || 1)}
                  <div
                    class="px-3 py-1 rounded-full text-sm font-bold {getGradeColor(percentage)} {percentage >= 70
                      ? 'bg-green-100'
                      : percentage >= 50
                        ? 'bg-yellow-100'
                        : 'bg-red-100'}"
                  >
                    {getGradeLetter(percentage)} ({percentage}%)
                  </div>
                {:else if submission.status === 'SUBMITTED'}
                  <span class="badge badge-warning">
                    <Clock class="w-3 h-3 mr-1" />
                    Grading
                  </span>
                {:else if submission.status === 'IN_PROGRESS'}
                  <span class="badge bg-blue-100 text-blue-700">
                    <AlertCircle class="w-3 h-3 mr-1" />
                    In Progress
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Join Class Prompt -->
  {#if data.stats.totalClasses === 0}
    <div class="card p-8 text-center">
      <BookOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Join Your First Class</h3>
      <p class="text-gray-600 mb-6">
        Get a class code from your teacher and enter it above to join a class.
      </p>
    </div>
  {/if}
</div>
