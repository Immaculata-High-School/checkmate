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
    AlertTriangle,
    X,
    Search,
    Sparkles,
    Loader2,
    Download,
    Users,
    BarChart3,
    TrendingUp,
    TrendingDown,
    MessageSquare,
    Trash2,
    Gift,
    Plus,
    Minus,
    School,
    Upload,
    ExternalLink,
    Link,
    Save,
    Calendar
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let aiGrading = $state(false);
  let aiGradingAll = $state(false);
  let generatingFeedback = $state(false);
  let deleting = $state(false);
  let showGradeModal = $state<any>(null);
  let showDeleteConfirm = $state<any>(null);
  let showBulkDeleteConfirm = $state(false);
  let showClassFeedback = $state(false);
  let showBonusModal = $state(false);
  let showPowerSchoolModal = $state(false);
  let showPsJobStartedModal = $state(false);
  let showRosterSyncNeededModal = $state(false);
  let psReleasing = $state(false);
  let bonusAmount = $state(0);
  let bonusTarget = $state<'selected' | 'all' | 'single'>('selected');
  let bonusSubmissionId = $state<string | null>(null);
  let statusFilter = $state(data.filters.status);
  let searchQuery = $state(data.filters.search);
  let selectedSubmissions = $state<Set<string>>(new Set());
  
  // PowerSchool release form state - auto-select linked class if only one
  let psSelectedClass = $state('');
  let psAssignmentName = $state(data.test.title);
  let psSelectedCategory = $state('');
  let psDueDate = $state(new Date().toISOString().split('T')[0]);
  let psSelectedTerm = $state('');
  let psForceRerelease = $state(false);
  let psMarkMissing = $state(false);
  
  // PowerSchool lazy-loaded data
  let psCategories = $state<any[]>([]);
  let psTerms = $state<{ current_term: string; store_codes: string[] } | null>(null);
  let psLoadingData = $state(false);
  let psDataError = $state<string | null>(null);

  // PowerSchool stats - computed from submissions
  let psGradedCount = $derived(
    data.submissions.filter((s: any) => s.status === 'GRADED' && !(s as any).powerSchoolRelease?.success).length
  );
  let psAlreadyReleased = $derived(
    data.submissions.filter((s: any) => (s as any).powerSchoolRelease?.success).length
  );
  
  // Check if selected class has roster synced
  let selectedClassRosterSynced = $derived(() => {
    if (!psSelectedClass) return false;
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    const cls = linkedClasses.find((c: any) => c.id === psSelectedClass);
    return cls?.rosterSynced ?? false;
  });
  
  // Get the linked class info
  let linkedClass = $derived(() => {
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    return linkedClasses.length > 0 ? linkedClasses[0] : null;
  });

  // Load PowerSchool data when opening the modal
  async function loadPowerSchoolData() {
    if (psCategories.length > 0) return; // Already loaded
    
    psLoadingData = true;
    psDataError = null;
    
    try {
      const response = await fetch('/api/powerschool?action=sync-data');
      const result = await response.json();
      
      if (result.error) {
        psDataError = result.error;
      } else {
        psCategories = result.categories || [];
        psTerms = result.terms;
        
        // Set default term to current term
        if (result.terms?.current_term) {
          psSelectedTerm = result.terms.current_term;
        }
        
        // Set default category from linked class if available
        const cls = linkedClass();
        if (cls?.psCategoryId) {
          psSelectedCategory = cls.psCategoryId.toString();
        }
      }
    } catch (e) {
      psDataError = 'Failed to load PowerSchool data';
      console.error('Error loading PS data:', e);
    } finally {
      psLoadingData = false;
    }
  }

  // Check if any linked class has unsynced roster
  async function checkRosterAndOpenModal() {
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    const hasUnsyncedClass = linkedClasses.some((c: any) => !c.rosterSynced);
    
    // Auto-select the first linked class
    if (linkedClasses.length > 0) {
      psSelectedClass = linkedClasses[0].id;
    }
    
    if (hasUnsyncedClass && linkedClasses.length > 0) {
      // Show warning modal first
      showRosterSyncNeededModal = true;
    } else {
      showPowerSchoolModal = true;
      await loadPowerSchoolData();
    }
  }

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

  function openBonusModal(target: 'selected' | 'all' | 'single', submissionId?: string) {
    bonusTarget = target;
    bonusSubmissionId = submissionId || null;
    bonusAmount = 0;
    showBonusModal = true;
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
    const bonus = submission.bonusPoints || 0;
    // Cap final score at totalPoints (100%)
    const finalScore = Math.min(submission.totalPoints, submission.score + bonus);
    const percentage = Math.round((finalScore / submission.totalPoints) * 100);
    if (bonus > 0) {
      return `${finalScore}/${submission.totalPoints} (${percentage}%) +${bonus}`;
    }
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
    const headers = ['Student', 'Email', 'Status', 'Score', 'Bonus', 'Total Points', 'Percentage', 'Submitted At', 'Graded At'];
    const rows = data.submissions
      .filter(s => selectedSubmissions.size === 0 || selectedSubmissions.has(s.id))
      .map(s => {
        const totalScore = (s.score || 0) + (s.bonusPoints || 0);
        return [
          s.student.name || '',
          s.student.email,
          s.status,
          s.score?.toString() || '',
          s.bonusPoints?.toString() || '0',
          s.totalPoints?.toString() || '',
          s.totalPoints ? Math.round(Math.min(100, totalScore / s.totalPoints * 100)).toString() + '%' : '',
          s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
          s.gradedAt ? new Date(s.gradedAt).toISOString() : ''
        ];
      });

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
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <CheckCircle class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Submissions</h1>
          <p class="text-gray-500 mt-1">{data.test.title}</p>
        </div>
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

        {#if data.stats.graded > 0}
          <button onclick={() => openBonusModal('all')} class="btn btn-secondary">
            <Gift class="w-4 h-4" />
            Bonus Points
          </button>
        {/if}

        <!-- PowerSchool Button - Always visible -->
        {#if (data as any).powerSchool?.configured}
          {#if !(data as any).powerSchool?.connected}
            <a href="/teacher/settings" class="btn btn-secondary bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
              <School class="w-4 h-4" />
              Connect PowerSchool
            </a>
          {:else if (data as any).powerSchool.linkedClasses.length === 0}
            <a href="/teacher/settings" class="btn btn-secondary bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
              <School class="w-4 h-4" />
              Link Classes
            </a>
          {:else}
            <button onclick={checkRosterAndOpenModal} class="btn btn-secondary bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" disabled={data.stats.graded === 0}>
              <School class="w-4 h-4" />
              Release to PowerSchool
            </button>
          {/if}
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

  {#if form?.bonusSuccess}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message || 'Bonus points added successfully!'}
    </div>
  {/if}

  {#if (form as any)?.mappingSaved}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form?.message || 'Student mappings saved! You can now retry releasing grades.'}
    </div>
  {/if}

  {#if form?.aiSuccess}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message || 'AI grading completed successfully!'}
    </div>
  {/if}

  {#if form?.deleteSuccess}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message || 'Submission deleted successfully!'}
    </div>
  {/if}

  {#if (form as any)?.psSuccess}
    <div class="alert alert-success mb-6">
      <School class="w-5 h-5" />
      {form?.message || 'Grades released to PowerSchool successfully!'}
    </div>
  {/if}

  {#if (form as any)?.psPartial}
    <div class="alert alert-warning mb-6">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <div class="flex-1">
        <p class="font-medium">{form?.message}</p>
        {#if (form as any).errors?.length}
          <details class="mt-2" open={(form as any).errors?.length <= 5}>
            <summary class="text-sm cursor-pointer hover:underline">
              {(form as any).errors.length} student{(form as any).errors.length !== 1 ? 's' : ''} couldn't be matched
            </summary>
            <ul class="text-sm mt-1 list-disc list-inside max-h-40 overflow-y-auto">
              {#each (form as any).errors as err}
                <li>{err}</li>
              {/each}
            </ul>
          </details>
        {/if}
      </div>
    </div>
  {/if}
  {#if form?.error}
    <div class="alert alert-error mb-6">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <div class="flex-1">
        <p class="font-medium">{form.error}</p>
        {#if (form as any).errors?.length > 1}
          <details class="mt-2">
            <summary class="text-sm cursor-pointer hover:underline">
              Show {(form as any).errors.length - 1} more error{(form as any).errors.length - 1 !== 1 ? 's' : ''}
            </summary>
            <ul class="text-sm mt-1 list-disc list-inside max-h-40 overflow-y-auto">
              {#each (form as any).errors.slice(1) as err}
                <li>{err}</li>
              {/each}
            </ul>
          </details>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Bulk Actions (when submissions selected) -->
  {#if selectedSubmissions.size > 0}
    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-center justify-between">
      <span class="text-indigo-700 font-medium">
        {selectedSubmissions.size} submission{selectedSubmissions.size !== 1 ? 's' : ''} selected
      </span>
      <div class="flex items-center gap-2">
        <button
          onclick={() => (selectedSubmissions = new Set())}
          class="btn btn-sm btn-secondary"
        >
          Clear Selection
        </button>
        <button
          onclick={() => (showBulkDeleteConfirm = true)}
          class="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 class="w-4 h-4" />
          Delete Selected
        </button>
      </div>
    </div>
  {/if}

  <!-- Stats Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-{(data as any).powerSchool?.connected ? '6' : '5'} gap-4 mb-6">
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
    {#if (data as any).powerSchool?.connected}
      <div class="stat-card">
        <div class="stat-value text-blue-600 flex items-center justify-center gap-1">
          <School class="w-5 h-5" />
          {(data.stats as any).releasedToPowerSchool}
        </div>
        <div class="stat-label">Released to PS</div>
      </div>
    {/if}
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
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Attempt</th>
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
                  <div class="font-medium text-gray-900">
                    {submission.student.name}
                    {#if submission.attemptNumber > 1}
                      <span class="ml-1 text-xs text-gray-400 sm:hidden">(#{submission.attemptNumber})</span>
                    {/if}
                  </div>
                  <div class="text-sm text-gray-500">{submission.student.email}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 text-center hidden sm:table-cell">
              {#if submission.attemptNumber === 1}
                <span class="badge badge-blue">1st</span>
              {:else if submission.attemptNumber === 2}
                <span class="badge badge-purple">2nd</span>
              {:else if submission.attemptNumber === 3}
                <span class="badge badge-orange">3rd</span>
              {:else}
                <span class="badge badge-gray">{submission.attemptNumber}th</span>
              {/if}
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
              {formatDate(submission.submittedAt)}
            </td>
            <td class="px-4 py-4 text-center font-medium">
              {formatScore(submission)}
            </td>
            <td class="px-4 py-4 text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="badge {status.class}">{status.text}</span>
                {#if (submission as any).powerSchoolRelease?.success}
                  <span title="Released to PowerSchool" class="text-blue-500">
                    <School class="w-4 h-4" />
                  </span>
                {/if}
              </div>
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
                <button
                  onclick={() => (showDeleteConfirm = submission)}
                  class="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                  title="Delete submission"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">
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

<!-- Delete Single Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 class="w-6 h-6 text-red-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete Submission?</h3>
        <p class="text-gray-500 text-center mb-6">
          Are you sure you want to delete the submission from <strong>{showDeleteConfirm.student.name}</strong>? 
          This action cannot be undone and all answers will be permanently removed.
        </p>
        <div class="flex gap-3">
          <button onclick={() => (showDeleteConfirm = null)} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <form method="POST" action="?/deleteSubmission" class="flex-1" use:enhance={() => {
            deleting = true;
            return async ({ update }) => {
              deleting = false;
              showDeleteConfirm = null;
              await update();
              await invalidateAll();
            };
          }}>
            <input type="hidden" name="submissionId" value={showDeleteConfirm.id} />
            <button type="submit" class="btn bg-red-600 hover:bg-red-700 text-white w-full" disabled={deleting}>
              {#if deleting}
                <Loader2 class="w-4 h-4 animate-spin" />
              {:else}
                Delete
              {/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Bulk Delete Confirmation Modal -->
{#if showBulkDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 class="w-6 h-6 text-red-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete {selectedSubmissions.size} Submission{selectedSubmissions.size !== 1 ? 's' : ''}?</h3>
        <p class="text-gray-500 text-center mb-6">
          Are you sure you want to delete the selected submissions? 
          This action cannot be undone and all answers will be permanently removed.
        </p>
        <div class="flex gap-3">
          <button onclick={() => (showBulkDeleteConfirm = false)} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <form method="POST" action="?/deleteSelected" class="flex-1" use:enhance={() => {
            deleting = true;
            return async ({ update }) => {
              deleting = false;
              showBulkDeleteConfirm = false;
              selectedSubmissions = new Set();
              await update();
              await invalidateAll();
            };
          }}>
            {#each [...selectedSubmissions] as id}
              <input type="hidden" name="submissionIds" value={id} />
            {/each}
            <button type="submit" class="btn bg-red-600 hover:bg-red-700 text-white w-full" disabled={deleting}>
              {#if deleting}
                <Loader2 class="w-4 h-4 animate-spin" />
              {:else}
                Delete All
              {/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Bonus Points Modal -->
{#if showBonusModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add Bonus Points</h3>
          <button onclick={() => (showBonusModal = false)} class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <p class="text-gray-500 text-sm mb-4">
          {#if bonusTarget === 'all'}
            Add bonus points to all {data.stats.graded} graded submissions.
          {:else if bonusTarget === 'selected'}
            Add bonus points to {selectedSubmissions.size} selected submission{selectedSubmissions.size !== 1 ? 's' : ''}.
          {:else}
            Add bonus points to this submission.
          {/if}
          Points are capped at the maximum test score (100%).
        </p>

        <form method="POST" action="?/addBonusPoints" use:enhance={() => {
          return async ({ update }) => {
            showBonusModal = false;
            bonusAmount = 0;
            await update();
            await invalidateAll();
          };
        }}>
          <input type="hidden" name="target" value={bonusTarget} />
          {#if bonusSubmissionId}
            <input type="hidden" name="submissionId" value={bonusSubmissionId} />
          {/if}
          {#if bonusTarget === 'selected'}
            {#each [...selectedSubmissions] as id}
              <input type="hidden" name="submissionIds" value={id} />
            {/each}
          {/if}

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Bonus Points</label>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                onclick={() => bonusAmount = Math.max(-10, bonusAmount - 1)}
                class="btn btn-secondary p-2"
              >
                <Minus class="w-4 h-4" />
              </button>
              <input 
                type="number" 
                name="bonusAmount" 
                bind:value={bonusAmount}
                class="input text-center flex-1"
                step="0.5"
                min="-100"
                max="100"
              />
              <button 
                type="button" 
                onclick={() => bonusAmount = Math.min(10, bonusAmount + 1)}
                class="btn btn-secondary p-2"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">Use negative values to remove bonus points</p>
          </div>

          <div class="flex gap-3">
            <button type="button" onclick={() => (showBonusModal = false)} class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary flex-1">
              <Gift class="w-4 h-4" />
              Apply Bonus
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- PowerSchool Release Modal -->
{#if showPowerSchoolModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <School class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">Release to PowerSchool</h3>
            <p class="text-sm text-gray-500">Push graded scores to your gradebook</p>
          </div>
        </div>
        <button onclick={() => (showPowerSchoolModal = false)} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if psAlreadyReleased > 0}
        <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle class="w-4 h-4 inline mr-1" />
          {psAlreadyReleased} grade{psAlreadyReleased !== 1 ? 's' : ''} already released to PowerSchool
        </div>
      {/if}

      <form method="POST" action="?/releaseToPowerSchool" use:enhance={() => {
        psReleasing = true;
        return async ({ result, update }) => {
          psReleasing = false;
          showPowerSchoolModal = false;
          
          // Check if job was started - show the success modal
          if (result.type === 'success' && result.data?.psJobStarted) {
            showPsJobStartedModal = true;
          }
          
          await update();
          await invalidateAll();
        };
      }}>
        <!-- Hidden class ID - auto-selected -->
        <input type="hidden" name="classId" value={psSelectedClass} />
        
        <!-- Loading state -->
        {#if psLoadingData}
          <div class="text-center py-8">
            <Loader2 class="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
            <p class="text-gray-500">Loading PowerSchool data...</p>
          </div>
        {:else if psDataError}
          <div class="text-center py-8">
            <AlertCircle class="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p class="text-red-600 mb-3">{psDataError}</p>
            <button type="button" onclick={loadPowerSchoolData} class="btn btn-secondary">
              Try Again
            </button>
          </div>
        {:else}
          <!-- Linked Class Info -->
          {@const cls = linkedClass()}
          {#if cls}
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-800">{cls.name}</p>
                  <p class="text-xs text-blue-600">→ {cls.psSection} ({cls.mappedStudents} students synced)</p>
                </div>
                {#if cls.rosterSynced}
                  <CheckCircle class="w-5 h-5 text-green-500" />
                {:else}
                  <a href="/teacher/classes/{cls.id}" class="text-amber-600 hover:text-amber-700 text-xs underline">
                    Sync Roster
                  </a>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Assignment Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Assignment Name in PowerSchool
            </label>
            <input 
              type="text" 
              name="assignmentName" 
              bind:value={psAssignmentName}
              class="input w-full"
              placeholder={data.test.title}
            />
          </div>

          <!-- Category -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Category <span class="text-red-500">*</span>
            </label>
            <select 
              name="categoryId" 
              bind:value={psSelectedCategory}
              class="input w-full"
              required
            >
              <option value="">Select a category...</option>
              {#each psCategories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">e.g. Quiz, Major Grade, Homework</p>
            </div>

          <!-- Term Selection -->
          {#if psTerms && psTerms.store_codes && psTerms.store_codes.length > 0}
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Grading Period / Term
              </label>
              <select 
                name="term" 
                bind:value={psSelectedTerm}
                class="input w-full"
              >
                {#each psTerms.store_codes as term}
                  <option value={term}>
                    {term} {term === psTerms.current_term ? '(Current)' : ''}
                  </option>
                {/each}
              </select>
              <p class="text-xs text-gray-500 mt-1">Select the grading period for this assignment</p>
            </div>
          {/if}

          <!-- Due Date -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input 
            type="date" 
            name="dueDate" 
            bind:value={psDueDate}
            class="input w-full"
          />
        </div>

        <!-- Re-release option -->
        {#if psAlreadyReleased > 0}
          <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <label class="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="forceRerelease" 
                value="true"
                bind:checked={psForceRerelease}
                class="mt-0.5"
              />
              <div>
                <span class="text-sm font-medium text-amber-800">Update existing grades</span>
                <p class="text-xs text-amber-700 mt-0.5">
                  Re-release {psAlreadyReleased} grade{psAlreadyReleased !== 1 ? 's' : ''} that were already sent to PowerSchool
                </p>
              </div>
            </label>
          </div>
          {/if}

          <!-- Mark missing students option -->
          <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <label class="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="markMissing" 
                value="true"
                bind:checked={psMarkMissing}
                class="mt-0.5"
              />
              <div>
                <span class="text-sm font-medium text-gray-800">Mark missing students</span>
                <p class="text-xs text-gray-600 mt-0.5">
                  Students who haven't submitted will be marked as "Missing" with a 0 in PowerSchool
                </p>
              </div>
            </label>
          </div>

          <!-- Summary -->
          {#if psSelectedClass && !selectedClassRosterSynced()}
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p class="text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                <span>This class hasn't synced its roster with PowerSchool. <a href="/teacher/classes/{psSelectedClass}" class="underline font-medium">Sync roster first →</a></span>
              </p>
            </div>
          {/if}
          <div class="p-3 bg-gray-50 rounded-lg mb-4">
            <p class="text-sm text-gray-600">
              {#if psForceRerelease}
                <strong>{data.stats.graded}</strong> graded submission{data.stats.graded !== 1 ? 's' : ''} will be released/updated.
              {:else}
                <strong>{psGradedCount}</strong> graded submission{psGradedCount !== 1 ? 's' : ''} will be released.
              {/if}
              {#if selectedSubmissions.size > 0}
                <br /><span class="text-indigo-600">(Only {selectedSubmissions.size} selected)</span>
              {/if}
            </p>
          </div>

          <!-- Hidden submission IDs if any selected -->
          {#if selectedSubmissions.size > 0}
            {#each [...selectedSubmissions] as id}
              <input type="hidden" name="submissionIds" value={id} />
            {/each}
          {/if}

          <div class="flex gap-3">
            <button type="button" onclick={() => (showPowerSchoolModal = false)} class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn-primary flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={psReleasing || !psSelectedClass || !psSelectedCategory || (psGradedCount === 0 && !psForceRerelease) || !selectedClassRosterSynced()}
            >
              {#if psReleasing}
                <Loader2 class="w-4 h-4 animate-spin" />
                {psForceRerelease ? 'Updating...' : 'Releasing...'}
              {:else}
                <Upload class="w-4 h-4" />
                {psForceRerelease ? 'Update Grades' : 'Release Grades'}
              {/if}
            </button>
          </div>
        {/if}
      </form>
    </div>
  </div>
{/if}

<!-- PowerSchool Job Started Success Modal -->
{#if showPsJobStartedModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <School class="w-8 h-8 text-blue-600" />
      </div>
      
      <h2 class="text-xl font-bold text-gray-900 mb-2">Syncing to PowerSchool!</h2>
      
      <p class="text-gray-600 mb-4">
        Check back later! We're working on sending over your scores.
      </p>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3 text-blue-700">
          <Loader2 class="w-5 h-5 animate-spin flex-shrink-0" />
          <p class="text-sm text-left">
            You can close this page — we'll notify you when it's done.
          </p>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button 
          onclick={() => (showPsJobStartedModal = false)} 
          class="btn btn-secondary flex-1"
        >
          Stay Here
        </button>
        <a href="/teacher/jobs" class="btn btn-primary flex-1">
          <ExternalLink class="w-4 h-4" />
          View Compute Jobs
        </a>
      </div>
    </div>
  </div>
{/if}
<!-- Roster Sync Needed Modal -->
{#if showRosterSyncNeededModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertTriangle class="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900">Student Accounts Not Linked</h2>
          <p class="text-sm text-gray-500">Some classes need roster sync</p>
        </div>
      </div>
      
      <p class="text-gray-600 mb-4">
        Before you can sync grades to PowerSchool, you need to connect your Checkmate students to their PowerSchool accounts.
      </p>
      
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h3 class="font-medium text-amber-800 mb-2">Classes needing roster sync:</h3>
        <ul class="space-y-2">
          {#each (data as any).powerSchool?.linkedClasses?.filter((c: any) => !c.rosterSynced) || [] as cls}
            <li class="flex items-center justify-between text-sm">
              <span class="text-amber-700">{cls.name}</span>
              <a 
                href="/teacher/classes/{cls.id}" 
                class="text-amber-800 hover:text-amber-900 underline font-medium"
              >
                Sync Roster →
              </a>
            </li>
          {/each}
        </ul>
      </div>
      
      <div class="flex gap-3">
        <button 
          onclick={() => (showRosterSyncNeededModal = false)} 
          class="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        <button 
          onclick={async () => { showRosterSyncNeededModal = false; showPowerSchoolModal = true; await loadPowerSchoolData(); }} 
          class="btn btn-primary flex-1"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  </div>
{/if}