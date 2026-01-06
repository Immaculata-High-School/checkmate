<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    ArrowLeft,
    FileText,
    User,
    Clock,
    CheckCircle,
    AlertCircle,
    X,
    Search,
    Sparkles,
    Loader2,
    Download,
    Users,
    BarChart3,
    TrendingUp,
    TrendingDown,
    MessageSquare
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let aiGrading = $state(false);
  let aiGradingAll = $state(false);
  let generatingFeedback = $state(false);
  let showGradeModal = $state<any>(null);
  let showClassFeedback = $state(false);
  let statusFilter = $state(data.filters.status);
  let searchQuery = $state(data.filters.search);
  let selectedSubmissions = $state<Set<string>>(new Set());

  function applyFilters() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery) params.set('search', searchQuery);
    goto(`?${params.toString()}`);
  }

  function handleSearch(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'GRADED': return { class: 'badge-green', text: 'Graded' };
      case 'SUBMITTED': return { class: 'badge-yellow', text: 'Needs Grading' };
      case 'PENDING': return { class: 'badge-orange', text: 'Pending Review' };
      case 'IN_PROGRESS': return { class: 'badge-gray', text: 'In Progress' };
      default: return { class: 'badge-gray', text: status };
    }
  }

  function formatDate(date: Date | string | null) {
    if (!date) return 'Not submitted';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatScore(submission: any) {
    if (submission.status !== 'GRADED') return '-';
    const percentage = Math.round((submission.score / submission.totalPoints) * 100);
    return `${submission.score}/${submission.totalPoints} (${percentage}%)`;
  }

  function getGradeColor(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  function toggleSelection(id: string) {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    selectedSubmissions = newSet;
  }

  function selectAll() {
    if (selectedSubmissions.size === data.submissions.length) {
      selectedSubmissions = new Set();
    } else {
      selectedSubmissions = new Set(data.submissions.map(s => s.id));
    }
  }

  async function downloadReport() {
    // Simple CSV export
    const headers = ['Student', 'Email', 'Status', 'Score', 'Total Points', 'Percentage', 'Submitted At', 'Graded At'];
    const rows = data.submissions
      .filter(s => selectedSubmissions.size === 0 || selectedSubmissions.has(s.id))
      .map(s => [
        s.student.name || '',
        s.student.email,
        s.status,
        s.score?.toString() || '',
        s.totalPoints?.toString() || '',
        s.totalPoints ? Math.round((s.score || 0) / s.totalPoints * 100).toString() + '%' : '',
        s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
        s.gradedAt ? new Date(s.gradedAt).toISOString() : ''
      ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.test.title.replace(/[^a-z0-9]/gi, '_')}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Submissions - {data.test.title} | Checkmate</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a href="/teacher/tests/{data.test.id}" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Test
    </a>

    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Submissions</h1>
        <p class="text-gray-500 mt-1">{data.test.title}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        {#if data.stats.pending > 0}
          <form method="POST" action="?/aiGradeAll" use:enhance={() => {
            aiGradingAll = true;
            return async ({ result, update }) => {
              aiGradingAll = false;
              await update();
              await invalidateAll();
            };
          }}>
            <button type="submit" class="btn btn-secondary" disabled={aiGradingAll}>
              {#if aiGradingAll}
                <Loader2 class="w-4 h-4 animate-spin" />
                Grading...
              {:else}
                <Sparkles class="w-4 h-4" />
                AI Grade All ({data.stats.pending})
              {/if}
            </button>
          </form>
        {/if}

        <form method="POST" action="?/generateClassFeedback" use:enhance={() => {
          generatingFeedback = true;
          return async ({ result, update }) => {
            generatingFeedback = false;
            if (result.type === 'success') {
              showClassFeedback = true;
            }
            await update();
          };
        }}>
          <button type="submit" class="btn btn-secondary" disabled={generatingFeedback || data.stats.graded === 0}>
            {#if generatingFeedback}
              <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
              <BarChart3 class="w-4 h-4" />
            {/if}
            Class Analytics
          </button>
        </form>

        <button onclick={downloadReport} class="btn btn-secondary">
          <Download class="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  </div>

  {#if form?.aiSuccess}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message || 'AI grading completed successfully!'}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-error mb-6">
      <AlertCircle class="w-5 h-5" />
      {form.error}
    </div>
  {/if}

  <!-- Stats Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
    <div class="stat-card">
      <div class="stat-value">{data.stats.total}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-green-600">{data.stats.graded}</div>
      <div class="stat-label">Graded</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-yellow-600">{data.stats.pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-gray-600">{data.stats.inProgress}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-value {data.stats.averageScore !== null ? getGradeColor(data.stats.averageScore) : ''}">
        {data.stats.averageScore !== null ? `${data.stats.averageScore}%` : '-'}
      </div>
      <div class="stat-label">Average</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          onkeydown={handleSearch}
          placeholder="Search students..."
          class="input pl-9 w-full"
        />
      </div>
      <select bind:value={statusFilter} onchange={applyFilters} class="input w-full sm:w-48">
        <option value="">All Status</option>
        <option value="SUBMITTED">Needs Grading</option>
        <option value="PENDING">Pending Review</option>
        <option value="GRADED">Graded</option>
        <option value="IN_PROGRESS">In Progress</option>
      </select>
      <button onclick={applyFilters} class="btn btn-secondary">
        Filter
      </button>
    </div>
  </div>

  <!-- Submissions Table -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left">
            <input
              type="checkbox"
              checked={selectedSubmissions.size === data.submissions.length && data.submissions.length > 0}
              onchange={selectAll}
              class="w-4 h-4 rounded"
            />
          </th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Submitted</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Score</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.submissions as submission}
          {@const status = getStatusBadge(submission.status)}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <input
                type="checkbox"
                checked={selectedSubmissions.has(submission.id)}
                onchange={() => toggleSelection(submission.id)}
                class="w-4 h-4 rounded"
              />
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">{submission.student.name?.charAt(0) || '?'}</div>
                <div>
                  <div class="font-medium text-gray-900">{submission.student.name}</div>
                  <div class="text-sm text-gray-500">{submission.student.email}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
              {formatDate(submission.submittedAt)}
            </td>
            <td class="px-4 py-4 text-center font-medium">
              {formatScore(submission)}
            </td>
            <td class="px-4 py-4 text-center">
              <span class="badge {status.class}">{status.text}</span>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                {#if submission.status === 'SUBMITTED' || submission.status === 'PENDING'}
                  <form method="POST" action="?/aiGrade" use:enhance={() => {
                    aiGrading = true;
                    return async ({ update }) => {
                      aiGrading = false;
                      await update();
                      await invalidateAll();
                    };
                  }}>
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <button type="submit" class="btn btn-sm btn-secondary" disabled={aiGrading} title="AI Auto-Grade">
                      {#if aiGrading}
                        <Loader2 class="w-4 h-4 animate-spin" />
                      {:else}
                        <Sparkles class="w-4 h-4" />
                      {/if}
                    </button>
                  </form>
                  <button
                    onclick={() => (showGradeModal = submission)}
                    class="btn btn-sm btn-primary"
                  >
                    Grade
                  </button>
                {:else if submission.status === 'GRADED'}
                  <button
                    onclick={() => (showGradeModal = submission)}
                    class="btn btn-sm btn-secondary"
                  >
                    Review
                  </button>
                {:else}
                  <span class="text-sm text-gray-400">In progress</span>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
              No submissions found
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Grade Modal -->
{#if showGradeModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-4">
      <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Grade Submission</h2>
          <p class="text-sm text-gray-500">{showGradeModal.student.name}</p>
        </div>
        <div class="flex items-center gap-2">
          <form method="POST" action="?/aiGrade" use:enhance={() => {
            aiGrading = true;
            return async ({ result, update }) => {
              aiGrading = false;
              if (result.type === 'success') {
                showGradeModal = null;
                await invalidateAll();
              }
              await update();
            };
          }}>
            <input type="hidden" name="submissionId" value={showGradeModal.id} />
            <button type="submit" class="btn btn-sm btn-secondary" disabled={aiGrading}>
              {#if aiGrading}
                <Loader2 class="w-4 h-4 animate-spin" />
              {:else}
                <Sparkles class="w-4 h-4" />
              {/if}
              AI Grade All
            </button>
          </form>
          <button onclick={() => (showGradeModal = null)} class="p-1 hover:bg-gray-100 rounded">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <form method="POST" action="?/grade" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showGradeModal = null;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <input type="hidden" name="submissionId" value={showGradeModal.id} />

        <div class="p-6 space-y-6">
          {#each showGradeModal.answers as answer, i}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <span class="badge badge-gray">{answer.question.type.replace('_', ' ')}</span>
                  <span class="text-sm text-gray-500 ml-2">Max: {answer.question.points} pts</span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    name="points_{answer.id}"
                    value={answer.pointsAwarded || 0}
                    min="0"
                    max={answer.question.points}
                    step="0.5"
                    class="input w-20 text-center"
                  />
                  <span class="text-gray-500">/ {answer.question.points}</span>
                </div>
              </div>

              <div class="text-gray-900 mb-3">
                {@html answer.question.question}
              </div>

              <div class="bg-gray-50 rounded-lg p-3 mb-3">
                <div class="text-sm text-gray-500 mb-1">Student Answer:</div>
                <div class="text-gray-900">{answer.answer || 'No answer provided'}</div>
              </div>

              {#if answer.question.correctAnswer}
                <div class="bg-green-50 rounded-lg p-3 mb-3">
                  <div class="text-sm text-green-600 mb-1">Correct Answer:</div>
                  <div class="text-green-900">{answer.question.correctAnswer}</div>
                </div>
              {/if}

              <div>
                <label class="text-sm text-gray-500">Feedback (optional)</label>
                <input
                  type="text"
                  name="feedback_{answer.id}"
                  value={answer.feedback || ''}
                  class="input mt-1"
                  placeholder="Add feedback for this answer..."
                />
              </div>
            </div>
          {/each}

          <div class="border-t border-gray-200 pt-4">
            <label class="label">Overall Feedback (optional)</label>
            <textarea
              name="feedback"
              rows="3"
              class="input"
              placeholder="Add overall feedback for the student..."
            >{showGradeModal.feedback || ''}</textarea>
          </div>
        </div>

        <div class="sticky bottom-0 bg-gray-50 flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button" onclick={() => (showGradeModal = null)} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            <CheckCircle class="w-4 h-4" />
            Save Grade
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Class Feedback Modal -->
{#if showClassFeedback && form?.feedbackSuccess}
  {@const feedback = form.classFeedback}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-4">
      <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Class Analytics</h2>
          <p class="text-sm text-gray-500">{feedback.totalSubmissions} graded submissions</p>
        </div>
        <button onclick={() => (showClassFeedback = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- Score Overview -->
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <div class="text-3xl font-bold {getGradeColor(feedback.averageScore)}">{feedback.averageScore}%</div>
            <div class="text-sm text-gray-500">Average</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-3xl font-bold text-green-600">{feedback.highestScore}%</div>
            <div class="text-sm text-gray-500">Highest</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-3xl font-bold text-red-600">{feedback.lowestScore}%</div>
            <div class="text-sm text-gray-500">Lowest</div>
          </div>
        </div>

        <!-- Grade Distribution -->
        <div>
          <h3 class="font-semibold text-gray-900 mb-3">Grade Distribution</h3>
          <div class="space-y-2">
            {#each [
              { letter: 'A', count: feedback.distribution.a, color: 'bg-green-500', range: '90-100%' },
              { letter: 'B', count: feedback.distribution.b, color: 'bg-blue-500', range: '80-89%' },
              { letter: 'C', count: feedback.distribution.c, color: 'bg-yellow-500', range: '70-79%' },
              { letter: 'D', count: feedback.distribution.d, color: 'bg-orange-500', range: '60-69%' },
              { letter: 'F', count: feedback.distribution.f, color: 'bg-red-500', range: '0-59%' }
            ] as grade}
              <div class="flex items-center gap-3">
                <div class="w-8 font-bold text-gray-700">{grade.letter}</div>
                <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    class="{grade.color} h-full transition-all duration-500"
                    style="width: {feedback.totalSubmissions > 0 ? (grade.count / feedback.totalSubmissions) * 100 : 0}%"
                  ></div>
                </div>
                <div class="w-12 text-right text-sm text-gray-600">{grade.count}</div>
                <div class="w-16 text-right text-xs text-gray-400">{grade.range}</div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Trouble Questions -->
        {#if feedback.troubleQuestions.length > 0}
          <div>
            <h3 class="font-semibold text-gray-900 mb-3">Questions Needing Review</h3>
            <p class="text-sm text-gray-500 mb-3">Questions with lowest success rates:</p>
            <div class="space-y-2">
              {#each feedback.troubleQuestions as q}
                <div class="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-red-700">{q.successRate}% success rate</span>
                  </div>
                  <div class="text-sm text-gray-700 line-clamp-2">{@html q.question}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="sticky bottom-0 bg-gray-50 flex justify-end px-6 py-4 border-t border-gray-200">
        <button onclick={() => (showClassFeedback = false)} class="btn btn-primary">
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
