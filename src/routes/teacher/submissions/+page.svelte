<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    FileText,
    User,
    Clock,
    CheckCircle,
    AlertCircle,
    X,
    ChevronDown,
    Search,
    Sparkles,
    Loader2,
    GraduationCap,
    Eye,
    MessageSquare
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let aiGrading = $state(false);

  // Track grading queue status
  let gradingQueue = $derived(data.gradingQueue || []);
  let gradingInProgress = $derived(gradingQueue.length > 0);
  let gradingSubmissionIds = $derived(new Set(gradingQueue.map((q: any) => q.submissionId)));

  // Poll for updates when grading is in progress
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    if (gradingInProgress) {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          invalidateAll();
        }, 3000);
      }
    } else {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  });

  let showGradeModal = $state<any>(null);
  let statusFilter = $state(data.filters.status);
  let testFilter = $state(data.filters.testId);
  let typeFilter = $state(data.filters.type);

  function applyFilters() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (testFilter) params.set('test', testFilter);
    if (typeFilter) params.set('type', typeFilter);
    goto(`?${params.toString()}`);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'GRADED': return { class: 'badge-green', text: 'Graded' };
      case 'SUBMITTED': return { class: 'badge-yellow', text: 'Needs Grading' };
      case 'PENDING': return { class: 'badge-orange', text: 'Pending Review' };
      case 'IN_PROGRESS': return { class: 'badge-gray', text: 'In Progress' };
      case 'RETURNED': return { class: 'badge-blue', text: 'Returned' };
      case 'RESUBMITTED': return { class: 'badge-purple', text: 'Resubmitted' };
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
    const totalScore = (submission.score || 0) + (submission.bonusPoints || 0);
    const percentage = Math.round(Math.min(100, (totalScore / submission.totalPoints) * 100));
    return `${totalScore}/${submission.totalPoints} (${percentage}%)${submission.bonusPoints ? ` +${submission.bonusPoints}` : ''}`;
  }

  function formatDocScore(doc: any) {
    if (doc.grade === null) return '-';
    const pts = doc.assignment?.points;
    if (pts) {
      const pct = Math.round(Math.min(100, (doc.grade / pts) * 100));
      return `${doc.grade}/${pts} (${pct}%)`;
    }
    return `${doc.grade}`;
  }

  function getDocStatus(doc: any) {
    if (doc.grade !== null) return 'GRADED';
    return doc.status || 'NOT_STARTED';
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
        <CheckCircle class="w-5 h-5 text-orange-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Submissions</h1>
        <p class="text-gray-500 mt-1">Review and grade student submissions</p>
      </div>
    </div>
  </div>

  {#if form?.aiSuccess}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message || 'AI grading completed successfully!'}
    </div>
  {/if}

  {#if (form as any)?.aiQueued}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form?.message || 'Submission queued for AI grading.'}
    </div>
  {/if}

  {#if gradingInProgress}
    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-3">
        <Loader2 class="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
        <div>
          <p class="font-medium text-indigo-900">AI Grading in Progress</p>
          <p class="text-sm text-indigo-600">
            {gradingQueue.length} submission{gradingQueue.length !== 1 ? 's' : ''} being graded. This page will update automatically.
          </p>
        </div>
      </div>
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-error mb-6">
      <AlertCircle class="w-5 h-5" />
      {form.error}
    </div>
  {/if}

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <select bind:value={typeFilter} onchange={applyFilters} class="input flex-1">
        <option value="">All Types</option>
        <option value="test">Tests</option>
        <option value="document">Documents</option>
      </select>
      <select bind:value={statusFilter} onchange={applyFilters} class="input flex-1">
        <option value="">All Status</option>
        <option value="SUBMITTED">Needs Grading</option>
        <option value="PENDING">Pending Review</option>
        <option value="GRADED">Graded</option>
        <option value="IN_PROGRESS">In Progress</option>
      </select>
      {#if typeFilter !== 'document'}
        <select bind:value={testFilter} onchange={applyFilters} class="input flex-1">
          <option value="">All Tests</option>
          {#each data.tests as test}
            <option value={test.id}>{test.title}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>

  <!-- Submissions List -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignment</th>
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
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">{submission.student.name?.charAt(0) || '?'}</div>
                <div>
                  <div class="font-medium text-gray-900">{submission.student.name}</div>
                  <div class="text-sm text-gray-500">{submission.student.email}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <a href="/teacher/tests/{submission.test.id}" class="font-medium text-blue-600 hover:underline">
                {submission.test.title}
              </a>
              <div class="text-xs text-gray-400">Test</div>
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
              {formatDate(submission.submittedAt)}
            </td>
            <td class="px-4 py-4 text-center font-medium">
              {formatScore(submission)}
            </td>
            <td class="px-4 py-4 text-center">
              {#if gradingSubmissionIds.has(submission.id)}
                <span class="badge bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center gap-1 justify-center">
                  <Loader2 class="w-3 h-3 animate-spin" />
                  Grading
                </span>
              {:else}
                <span class="badge {status.class}">{status.text}</span>
              {/if}
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                {#if gradingSubmissionIds.has(submission.id)}
                  <span class="text-sm text-indigo-500 flex items-center gap-1">
                    <Loader2 class="w-4 h-4 animate-spin" />
                    Grading...
                  </span>
                {:else if submission.status === 'SUBMITTED' || submission.status === 'PENDING'}
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
                      AI
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
                {/if}
              </div>
            </td>
          </tr>
        {/each}

        <!-- Document submissions -->
        {#each data.docSubmissions as doc}
          {@const docStatus = getDocStatus(doc)}
          {@const status = getStatusBadge(docStatus)}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm">{doc.student.name?.charAt(0) || '?'}</div>
                <div>
                  <div class="font-medium text-gray-900">{doc.student.name}</div>
                  <div class="text-sm text-gray-500">{doc.student.email}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <a href="/teacher/docs/{doc.assignment.document.id}/submissions" class="font-medium text-teal-600 hover:underline">
                {doc.assignment.title || doc.assignment.document.title}
              </a>
              <div class="text-xs text-gray-400">Document</div>
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
              {formatDate(doc.submittedAt)}
            </td>
            <td class="px-4 py-4 text-center font-medium">
              {formatDocScore(doc)}
            </td>
            <td class="px-4 py-4 text-center">
              <span class="badge {status.class}">{status.text}</span>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <a
                  href="/teacher/docs/{doc.assignment.document.id}/review/{doc.id}"
                  class="btn btn-sm btn-secondary"
                >
                  <Eye class="w-4 h-4" />
                  {docStatus === 'GRADED' ? 'Review' : 'Grade'}
                </a>
              </div>
            </td>
          </tr>
        {/each}

        {#if data.submissions.length === 0 && data.docSubmissions.length === 0}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
              No submissions found
            </td>
          </tr>
        {/if}
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
          <p class="text-sm text-gray-500">{showGradeModal.student.name} - {showGradeModal.test.title}</p>
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

              {#if answer.feedback}
                <div class="bg-indigo-50 rounded-lg p-3 mb-3 border border-indigo-100">
                  <div class="flex items-center gap-2 text-sm text-indigo-600 mb-1">
                    <Sparkles class="w-4 h-4" />
                    <span class="font-medium">AI Feedback:</span>
                  </div>
                  <div class="text-indigo-900">{answer.feedback}</div>
                </div>
              {/if}

              <div>
                <label class="text-sm text-gray-500">{answer.feedback ? 'Edit Feedback' : 'Add Feedback (optional)'}</label>
                <input
                  type="text"
                  name="feedback_{answer.id}"
                  value={answer.feedback || ''}
                  class="input mt-1"
                  placeholder="Add or edit feedback for this answer..."
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
