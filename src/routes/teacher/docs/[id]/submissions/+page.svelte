<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import {
    ArrowLeft,
    FileText,
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
    MessageSquare,
    Send,
    RotateCcw,
    Filter,
    Search,
    GraduationCap,
    X
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  
  let searchQuery = $state('');
  let statusFilter = $state<string>('all');
  let selectedSubmission = $state<any>(null);
  let showGradeModal = $state(false);
  let gradeValue = $state('');
  let feedbackValue = $state('');
  let saving = $state(false);

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
    graded: allSubmissions.filter(s => s.grade !== null).length
  });

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
    
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
        <FileText class="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{data.document.title}</h1>
        <p class="text-gray-500">Student Submissions</p>
      </div>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Grade</th>
            <th class="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each filteredSubmissions as submission}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {(submission.student.name || submission.student.email)[0].toUpperCase()}
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
              <td class="px-4 py-3 text-sm text-gray-500">
                {formatDate(submission.submittedAt)}
              </td>
              <td class="px-4 py-3">
                {#if submission.grade !== null}
                  <span class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <GraduationCap class="w-4 h-4" />
                    {submission.grade}
                    {#if submission.assignment.points}
                      / {submission.assignment.points}
                    {/if}
                  </span>
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
