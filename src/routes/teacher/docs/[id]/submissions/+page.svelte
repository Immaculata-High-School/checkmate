<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    FileText,
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    AlertTriangle,
    Eye,
    MessageSquare,
    Send,
    Search,
    GraduationCap,
    X,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    TriangleAlert,
    Download,
    School,
    Upload,
    Loader2,
    ExternalLink
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const powerSchoolEnabled = $derived($page.data.powerSchoolEnabled ?? true);
  
  let searchQuery = $state('');
  let statusFilter = $state<string>('all');
  let selectedSubmission = $state<any>(null);
  let showGradeModal = $state(false);
  let gradeValue = $state('');
  let feedbackValue = $state('');
  let saving = $state(false);

  // PowerSchool state
  let showPowerSchoolModal = $state(false);
  let showPsJobStartedModal = $state(false);
  let showRosterSyncNeededModal = $state(false);
  let psReleasing = $state(false);
  let psSelectedClass = $state('');
  let psAssignmentName = $state(data.document.title);
  let psSelectedCategory = $state('');
  let psDueDate = $state(new Date().toISOString().split('T')[0]);
  let psSelectedTerm = $state('');
  let psForceRerelease = $state(false);
  let psMarkMissing = $state(false);
  let psTotalPoints = $state('100');
  let psCategories = $state<any[]>([]);
  let psTerms = $state<{ current_term: string; store_codes: string[] } | null>(null);
  let psLoadingData = $state(false);
  let psDataError = $state<string | null>(null);

  // Flatten all student copies from all assignments for display
  const allSubmissions = $derived(
    data.assignments.flatMap(a => 
      a.studentCopies.map(sc => ({
        ...sc,
        assignment: a,
        className: a.class.name,
        classEmoji: a.class.emoji
      }))
    )
  );

  const filteredSubmissions = $derived(
    allSubmissions.filter(s => {
      const matchesSearch = 
        (s.student.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        s.student.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
  );

  // Group by status for quick stats
  const stats = $derived({
    total: allSubmissions.length,
    notStarted: allSubmissions.filter(s => s.status === 'NOT_STARTED').length,
    inProgress: allSubmissions.filter(s => s.status === 'IN_PROGRESS').length,
    submitted: allSubmissions.filter(s => s.status === 'SUBMITTED' || s.status === 'RESUBMITTED').length,
    returned: allSubmissions.filter(s => s.status === 'RETURNED').length,
    graded: allSubmissions.filter(s => s.grade !== null).length,
    releasedToPowerSchool: allSubmissions.filter(s => (s as any).powerSchoolRelease?.success).length
  });

  // PowerSchool computed
  let psGradedCount = $derived(
    allSubmissions.filter(s => s.grade !== null && !(s as any).powerSchoolRelease?.success).length
  );
  let psAlreadyReleased = $derived(
    allSubmissions.filter(s => (s as any).powerSchoolRelease?.success).length
  );
  let linkedClass = $derived(() => {
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    return linkedClasses.length > 0 ? linkedClasses[0] : null;
  });

  // Check if selected class has roster synced
  let selectedClassRosterSynced = $derived(() => {
    if (!psSelectedClass) return false;
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    const cls = linkedClasses.find((c: any) => c.id === psSelectedClass);
    return cls?.rosterSynced ?? false;
  });

  async function loadPowerSchoolData() {
    if (psCategories.length > 0) return;
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
        if (result.terms?.current_term) psSelectedTerm = result.terms.current_term;
        const cls = linkedClass();
        if (cls?.psCategoryId) psSelectedCategory = cls.psCategoryId.toString();
      }
    } catch {
      psDataError = 'Failed to load PowerSchool data';
    } finally {
      psLoadingData = false;
    }
  }

  async function checkRosterAndOpenModal() {
    const linkedClasses = (data as any).powerSchool?.linkedClasses || [];
    const hasUnsyncedClass = linkedClasses.some((c: any) => !c.rosterSynced);
    
    if (linkedClasses.length > 0) {
      psSelectedClass = linkedClasses[0].id;
    }
    
    const firstAssignment = data.assignments.find(a => a.points);
    if (firstAssignment?.points) psTotalPoints = firstAssignment.points.toString();
    
    if (hasUnsyncedClass && linkedClasses.length > 0) {
      showRosterSyncNeededModal = true;
    } else {
      showPowerSchoolModal = true;
      await loadPowerSchoolData();
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-600';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-700';
      case 'RESUBMITTED': return 'bg-purple-100 text-purple-700';
      case 'RETURNED': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'NOT_STARTED': return 'Not Started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'SUBMITTED': return 'Submitted';
      case 'RESUBMITTED': return 'Resubmitted';
      case 'RETURNED': return 'Returned';
      default: return status;
    }
  }

  function getIntegrityInfo(submission: any) {
    const summary = submission.activitySummary;
    if (!summary) return null;
    const totalChars = summary.totalKeystrokes + summary.totalPastedChars;
    if (totalChars === 0) return null;

    const pasteRatio = summary.totalPastedChars / totalChars;
    let score = Math.round((1 - pasteRatio) * 100);

    if (summary.focusLostCount > 20) score -= 10;
    else if (summary.focusLostCount > 10) score -= 5;
    if (summary.avgTypingSpeed > 20 && summary.avgTypingSpeed < 120) score += 3;
    score = Math.max(0, Math.min(100, score));

    const pastePercent = Math.round(pasteRatio * 100);

    if (score >= 85) return { score, pastePercent, label: 'Authentic', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'shield-check' };
    if (score >= 65) return { score, pastePercent, label: 'Mostly Original', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'shield-check' };
    if (score >= 40) return { score, pastePercent, label: 'Review', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'shield-alert' };
    if (score >= 20) return { score, pastePercent, label: 'Suspicious', color: 'text-orange-600', bg: 'bg-orange-50', icon: 'triangle-alert' };
    return { score, pastePercent, label: 'Flagged', color: 'text-red-600', bg: 'bg-red-50', icon: 'shield-x' };
  }

  function formatDate(date: string | Date | null) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function openGradeModal(submission: any) {
    selectedSubmission = submission;
    gradeValue = submission.grade?.toString() || '';
    feedbackValue = submission.feedback || '';
    showGradeModal = true;
  }

  async function saveGrade(returnToStudent = false) {
    if (!selectedSubmission) return;
    
    saving = true;
    try {
      const res = await fetch(`/api/student-docs/${selectedSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: gradeValue ? parseFloat(gradeValue) : null,
          feedback: feedbackValue || null,
          returnToStudent
        })
      });

      if (res.ok) {
        showGradeModal = false;
        selectedSubmission = null;
        await invalidateAll();
      }
    } catch (err) {
      console.error('Failed to save grade:', err);
    } finally {
      saving = false;
    }
  }

  function handleClassChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const classId = select.value;
    if (classId) {
      goto(`/teacher/docs/${data.document.id}/submissions?classId=${classId}`);
    } else {
      goto(`/teacher/docs/${data.document.id}/submissions`);
    }
  }

  function downloadReport() {
    const headers = ['Student', 'Email', 'Class', 'Status', 'Grade', 'Points', 'Integrity', 'Submitted At', 'Feedback'];
    const rows = allSubmissions.map(s => {
      const integrity = getIntegrityInfo(s);
      return [
        s.student.name || '',
        s.student.email,
        s.className,
        s.status,
        s.grade?.toString() || '',
        s.assignment.points?.toString() || '',
        integrity ? `${integrity.score}% (${integrity.label})` : '',
        s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
        s.feedback || ''
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.document.title.replace(/[^a-z0-9]/gi, '_')}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Submissions - {data.document.title} | Checkmate</title>
</svelte:head>

<div class="max-w-6xl mx-auto py-6 px-4">
  <!-- Header -->
  <div class="mb-6">
    <a href="/teacher/docs/{data.document.id}" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to document
    </a>
    
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <FileText class="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.document.title}</h1>
          <p class="text-gray-500">Student Submissions</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- PowerSchool Button -->
        {#if powerSchoolEnabled && (data as any).powerSchool?.configured}
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
            <button onclick={checkRosterAndOpenModal} class="btn btn-secondary bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" disabled={stats.graded === 0}>
              <School class="w-4 h-4" />
              Release to PowerSchool
              {#if stats.releasedToPowerSchool > 0}
                <span class="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">{stats.releasedToPowerSchool}</span>
              {/if}
            </button>
          {/if}
        {/if}

        <button onclick={downloadReport} class="btn btn-secondary">
          <Download class="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class={`grid grid-cols-2 gap-4 mb-6 ${powerSchoolEnabled && (data as any).powerSchool?.connected ? 'md:grid-cols-7' : 'md:grid-cols-6'}`}>
    <button 
      onclick={() => statusFilter = 'all'}
      class="p-4 bg-white border rounded-lg text-center transition-all {statusFilter === 'all' ? 'ring-2 ring-emerald-500' : 'hover:shadow-md'}"
    >
      <div class="text-2xl font-bold text-gray-900">{stats.total}</div>
      <div class="text-sm text-gray-500">Total</div>
    </button>
    <button 
      onclick={() => statusFilter = 'NOT_STARTED'}
      class="p-4 bg-white border rounded-lg text-center transition-all {statusFilter === 'NOT_STARTED' ? 'ring-2 ring-gray-400' : 'hover:shadow-md'}"
    >
      <div class="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
      <div class="text-sm text-gray-500">Not Started</div>
    </button>
    <button 
      onclick={() => statusFilter = 'IN_PROGRESS'}
      class="p-4 bg-white border rounded-lg text-center transition-all {statusFilter === 'IN_PROGRESS' ? 'ring-2 ring-yellow-400' : 'hover:shadow-md'}"
    >
      <div class="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
      <div class="text-sm text-gray-500">In Progress</div>
    </button>
    <button 
      onclick={() => statusFilter = 'SUBMITTED'}
      class="p-4 bg-white border rounded-lg text-center transition-all {statusFilter === 'SUBMITTED' ? 'ring-2 ring-blue-400' : 'hover:shadow-md'}"
    >
      <div class="text-2xl font-bold text-blue-600">{stats.submitted}</div>
      <div class="text-sm text-gray-500">Submitted</div>
    </button>
    <button 
      onclick={() => statusFilter = 'RETURNED'}
      class="p-4 bg-white border rounded-lg text-center transition-all {statusFilter === 'RETURNED' ? 'ring-2 ring-orange-400' : 'hover:shadow-md'}"
    >
      <div class="text-2xl font-bold text-orange-600">{stats.returned}</div>
      <div class="text-sm text-gray-500">Returned</div>
    </button>
    <button 
      onclick={() => statusFilter = 'all'}
      class="p-4 bg-white border rounded-lg text-center transition-all {stats.graded > 0 ? 'hover:shadow-md' : ''}"
    >
      <div class="text-2xl font-bold text-emerald-600">{stats.graded}</div>
      <div class="text-sm text-gray-500">Graded</div>
    </button>
    {#if powerSchoolEnabled && (data as any).powerSchool?.connected}
      <button 
        onclick={() => statusFilter = 'all'}
        class="p-4 bg-white border rounded-lg text-center transition-all hover:shadow-md"
      >
        <div class="text-2xl font-bold text-blue-600">{stats.releasedToPowerSchool}</div>
        <div class="text-sm text-gray-500">Released to PS</div>
      </button>
    {/if}
  </div>

  <!-- Filters -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search students..."
        class="input pl-10 w-full"
      />
    </div>
    
    {#if data.classes.length > 1}
      <select onchange={handleClassChange} class="input">
        <option value="">All classes</option>
        {#each data.classes as cls}
          <option value={cls.id} selected={cls.id === data.selectedClassId}>
            {cls.emoji} {cls.name}
          </option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Submissions Table -->
  {#if filteredSubmissions.length === 0}
    <div class="text-center py-12">
      <Users class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
      <p class="text-gray-500">
        {#if searchQuery || statusFilter !== 'all'}
          Try adjusting your filters
        {:else}
          Students haven't started their work yet
        {/if}
      </p>
    </div>
  {:else}
    <div class="bg-white border rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Student</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Class</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Integrity</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Grade</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each filteredSubmissions as submission}
            {@const integrity = getIntegrityInfo(submission)}
            <tr class="hover:bg-gray-50 {integrity && integrity.score < 40 ? 'bg-red-50/40' : ''}">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {(submission.student.name || submission.student.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{submission.student.name || 'Unknown'}</div>
                    <div class="text-xs text-gray-500">{submission.student.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-gray-600">
                  {submission.classEmoji} {submission.className}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(submission.status)}">
                  {getStatusLabel(submission.status)}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if integrity}
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {integrity.bg} {integrity.color}">
                      {#if integrity.icon === 'shield-check'}
                        <ShieldCheck class="w-3.5 h-3.5" />
                      {:else if integrity.icon === 'shield-alert'}
                        <ShieldAlert class="w-3.5 h-3.5" />
                      {:else if integrity.icon === 'triangle-alert'}
                        <TriangleAlert class="w-3.5 h-3.5" />
                      {:else}
                        <ShieldX class="w-3.5 h-3.5" />
                      {/if}
                      {integrity.score}%
                    </span>
                    {#if integrity.pastePercent > 50}
                      <span class="text-[10px] text-gray-400">{integrity.pastePercent}% pasted</span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs text-gray-300">—</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {formatDate(submission.submittedAt)}
              </td>
              <td class="px-4 py-3">
                {#if submission.grade !== null}
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                      <GraduationCap class="w-4 h-4" />
                      {submission.grade}
                      {#if submission.assignment.points}
                        / {submission.assignment.points}
                        {@const pct = Math.round(Math.min(100, submission.grade / submission.assignment.points * 100))}
                        <span class="text-xs ml-1 {pct >= 90 ? 'text-green-600' : pct >= 80 ? 'text-blue-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600'}">({pct}%)</span>
                      {/if}
                    </span>
                    {#if (submission as any).powerSchoolRelease?.success}
                      <span title="Released to PowerSchool" class="text-blue-500">
                        <School class="w-3.5 h-3.5" />
                      </span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-sm text-gray-400">-</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <a
                    href="/teacher/docs/{data.document.id}/review/{submission.id}"
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="View submission"
                  >
                    <Eye class="w-4 h-4" />
                  </a>
                  <button
                    onclick={() => openGradeModal(submission)}
                    class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Grade & feedback"
                  >
                    <MessageSquare class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Grade Modal -->
{#if showGradeModal && selectedSubmission}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl max-w-md w-full mx-4">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Grade Submission</h2>
          <button onclick={() => showGradeModal = false} class="p-2 hover:bg-gray-100 rounded-lg">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-1">
          {selectedSubmission.student.name || selectedSubmission.student.email}
        </p>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Grade {#if selectedSubmission.assignment.points}(out of {selectedSubmission.assignment.points}){/if}
          </label>
          <input
            type="number"
            bind:value={gradeValue}
            placeholder="Enter grade..."
            class="input w-full"
            step="0.5"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
          <textarea
            bind:value={feedbackValue}
            placeholder="Add feedback for the student..."
            class="input w-full"
            rows="4"
          ></textarea>
        </div>
      </div>

      <div class="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
        <button 
          onclick={() => saveGrade(false)} 
          disabled={saving}
          class="btn btn-secondary flex-1"
        >
          Save Draft
        </button>
        <button 
          onclick={() => saveGrade(true)} 
          disabled={saving}
          class="btn bg-emerald-600 text-white hover:bg-emerald-700 flex-1 flex items-center justify-center gap-2"
        >
          {#if saving}
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          {:else}
            <Send class="w-4 h-4" />
          {/if}
          Return to Student
        </button>
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
          
          if (result.type === 'success' && result.data?.psJobStarted) {
            showPsJobStartedModal = true;
          }
          
          await update();
          await invalidateAll();
        };
      }}>
        <input type="hidden" name="classId" value={psSelectedClass} />
        
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
              placeholder={data.document.title}
            />
          </div>

          <!-- Total Points -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Total Points
            </label>
            <input 
              type="number" 
              name="totalPoints" 
              bind:value={psTotalPoints}
              class="input w-full"
              min="1"
              step="1"
            />
            <p class="text-xs text-gray-500 mt-1">Maximum score for this assignment</p>
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
                <strong>{stats.graded}</strong> graded submission{stats.graded !== 1 ? 's' : ''} will be released/updated.
              {:else}
                <strong>{psGradedCount}</strong> graded submission{psGradedCount !== 1 ? 's' : ''} will be released.
              {/if}
            </p>
          </div>

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
