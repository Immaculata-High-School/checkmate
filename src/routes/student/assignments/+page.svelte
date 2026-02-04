<script lang="ts">
  import {
    FileText,
    Clock,
    Play,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    BookOpen,
    ClipboardList,
    Library,
    Edit3,
    Eye,
    Send,
    Calendar
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusBadge(submission: any) {
    if (!submission) return { class: 'badge-blue', text: 'Not Started' };
    switch (submission.status) {
      case 'IN_PROGRESS': return { class: 'badge-yellow', text: 'In Progress' };
      case 'SUBMITTED': return { class: 'badge-purple', text: 'Submitted' };
      case 'PENDING': return { class: 'badge-orange', text: 'Pending Review' };
      case 'GRADED': return { class: 'badge-green', text: 'Graded' };
      default: return { class: 'badge-gray', text: submission.status };
    }
  }

  function getDocStatusBadge(status: string | null, type: string) {
    if (type === 'VIEW_ONLY') return { class: 'badge-blue', text: 'View', icon: Eye };
    if (!status || status === 'NOT_STARTED') return { class: 'badge-blue', text: 'Start', icon: Edit3 };
    switch (status) {
      case 'IN_PROGRESS': return { class: 'badge-yellow', text: 'In Progress', icon: Edit3 };
      case 'SUBMITTED': return { class: 'badge-purple', text: 'Submitted', icon: Send };
      case 'RETURNED': return { class: 'badge-orange', text: 'Returned', icon: AlertCircle };
      case 'RESUBMITTED': return { class: 'badge-indigo', text: 'Resubmitted', icon: Send };
      default: return { class: 'badge-gray', text: status, icon: FileText };
    }
  }

  function formatScore(submission: any) {
    if (!submission || submission.status !== 'GRADED') return null;
    const totalScore = (submission.score || 0) + (submission.bonusPoints || 0);
    const percentage = Math.round(Math.min(100, (totalScore / submission.totalPoints) * 100));
    return `${totalScore}/${submission.totalPoints} (${percentage}%)${submission.bonusPoints ? ` +${submission.bonusPoints}` : ''}`;
  }

  function formatDueDate(date: Date | string | null) {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', class: 'text-red-600' };
    if (diffDays === 0) return { text: 'Due today', class: 'text-orange-600' };
    if (diffDays === 1) return { text: 'Due tomorrow', class: 'text-yellow-600' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, class: 'text-gray-600' };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: 'text-gray-500' };
  }

  // Calculate document assignment counts
  const docInProgress = $derived(data.documentAssignments?.filter(d => d.status === 'IN_PROGRESS') || []);
  const docPending = $derived(data.documentAssignments?.filter(d => !d.status || d.status === 'NOT_STARTED' || d.type === 'VIEW_ONLY') || []);
  const docCompleted = $derived(data.documentAssignments?.filter(d => ['SUBMITTED', 'RETURNED', 'RESUBMITTED'].includes(d.status || '')) || []);
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-8">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p class="text-gray-500 mt-1">View and complete assignments from your classes</p>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-4 gap-4 mb-8">
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-blue-600">{data.available.length + docPending.length}</div>
      <div class="text-sm text-gray-500">Available</div>
    </div>
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-yellow-600">{data.inProgress.length + docInProgress.length}</div>
      <div class="text-sm text-gray-500">In Progress</div>
    </div>
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-green-600">{data.completed.length + docCompleted.length}</div>
      <div class="text-sm text-gray-500">Completed</div>
    </div>
    <div class="card p-4 text-center">
      <div class="text-2xl font-bold text-indigo-600">{(data.documentAssignments?.length || 0) + data.studyGuides.length + (data.worksheets?.length || 0) + (data.studySets?.length || 0)}</div>
      <div class="text-sm text-gray-500">Materials</div>
    </div>
  </div>

  <!-- In Progress Tests -->
  {#if data.inProgress.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertCircle class="w-5 h-5 text-yellow-500" />
        Continue Where You Left Off
      </h2>
      <div class="space-y-3">
        {#each data.inProgress as test}
          <a href="/student/assignments/{test.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-yellow-500">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Play class="w-6 h-6 text-yellow-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500">{test.class.emoji} {test.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-yellow">Continue</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- In Progress Documents -->
  {#if docInProgress.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Edit3 class="w-5 h-5 text-yellow-500" />
        Documents In Progress
      </h2>
      <div class="space-y-3">
        {#each docInProgress as doc}
          {@const due = formatDueDate(doc.dueDate)}
          <a href={doc.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-yellow-500">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Edit3 class="w-6 h-6 text-yellow-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{doc.title}</div>
              <div class="text-sm text-gray-500 flex items-center gap-2">
                <span>{doc.class.emoji || '📚'} {doc.class.name}</span>
                {#if due}
                  <span class="text-gray-300">|</span>
                  <span class="flex items-center gap-1 {due.class}">
                    <Calendar class="w-3 h-3" />
                    {due.text}
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-yellow">Continue</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Available Assignments -->
  {#if data.available.filter(t => !t.submission).length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText class="w-5 h-5 text-blue-500" />
        Available Assignments
      </h2>
      <div class="space-y-3">
        {#each data.available.filter(t => !t.submission) as test}
          <a href="/student/assignments/{test.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl">
              {test.class.emoji || '📝'}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500 flex items-center gap-3">
                <span>{test.class.name}</span>
                <span class="text-gray-300">|</span>
                <span>{test.questionCount} questions</span>
                {#if test.timeLimit}
                  <span class="text-gray-300">|</span>
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {test.timeLimit} min
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-blue">Start</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Document Assignments -->
  {#if docPending.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText class="w-5 h-5 text-teal-500" />
        Document Assignments
      </h2>
      <div class="space-y-3">
        {#each docPending as doc}
          {@const status = getDocStatusBadge(doc.status, doc.type)}
          {@const due = formatDueDate(doc.dueDate)}
          <a href={doc.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-teal-400">
            <div class="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
              {#if doc.type === 'VIEW_ONLY'}
                <Eye class="w-6 h-6 text-teal-600" />
              {:else}
                <Edit3 class="w-6 h-6 text-teal-600" />
              {/if}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{doc.title}</div>
              <div class="text-sm text-gray-500 flex items-center gap-2">
                <span>{doc.class.emoji || '📚'} {doc.class.name}</span>
                {#if doc.teacherName}
                  <span class="text-gray-300">|</span>
                  <span>by {doc.teacherName}</span>
                {/if}
                {#if due}
                  <span class="text-gray-300">|</span>
                  <span class="flex items-center gap-1 {due.class}">
                    <Calendar class="w-3 h-3" />
                    {due.text}
                  </span>
                {/if}
                {#if doc.points}
                  <span class="text-gray-300">|</span>
                  <span>{doc.points} pts</span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge {status.class}">{status.text}</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Study Materials -->
  {#if data.studyGuides.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen class="w-5 h-5 text-amber-500" />
        Study Guides
      </h2>
      <div class="space-y-3">
        {#each data.studyGuides as guide}
          <a href="/student/study-guides/{guide.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-amber-400">
            <div class="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <BookOpen class="w-6 h-6 text-amber-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{guide.title}</div>
              <div class="text-sm text-gray-500">{guide.class.emoji || '📚'} {guide.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-amber">View</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Worksheets -->
  {#if data.worksheets && data.worksheets.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ClipboardList class="w-5 h-5 text-green-500" />
        Worksheets
      </h2>
      <div class="space-y-3">
        {#each data.worksheets as worksheet}
          <a href="/student/worksheets/{worksheet.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-green-400">
            <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <ClipboardList class="w-6 h-6 text-green-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{worksheet.title}</div>
              <div class="text-sm text-gray-500">
                {worksheet.class.emoji || '📚'} {worksheet.class.name}
                <span class="text-gray-300 mx-2">|</span>
                {worksheet.itemCount} items
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-green">Start</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Study Sets -->
  {#if data.studySets && data.studySets.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Library class="w-5 h-5 text-purple-500" />
        Flashcard Sets
      </h2>
      <div class="space-y-3">
        {#each data.studySets as studySet}
          <a href="/student/study-sets/{studySet.id}" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-purple-400">
            <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Library class="w-6 h-6 text-purple-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{studySet.title}</div>
              <div class="text-sm text-gray-500">
                {studySet.class.emoji || '📚'} {studySet.class.name}
                <span class="text-gray-300 mx-2">|</span>
                {studySet.cardCount} cards
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-purple">Practice</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Completed Assignments -->
  {#if data.completed.length > 0 || docCompleted.length > 0}
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle class="w-5 h-5 text-green-500" />
        Completed
      </h2>
      <div class="space-y-3">
        {#each data.completed as test}
          {@const status = getStatusBadge(test.submission)}
          {@const score = formatScore(test.submission)}
          <a href="/student/assignments/{test.id}/results" class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
              {test.class.emoji || '📝'}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{test.title}</div>
              <div class="text-sm text-gray-500">{test.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              {#if score}
                <span class="font-medium text-gray-900">{score}</span>
              {/if}
              <span class="badge {status.class}">{status.text}</span>
            </div>
          </a>
        {/each}
        
        <!-- Completed Document Assignments -->
        {#each docCompleted as doc}
          {@const status = getDocStatusBadge(doc.status, doc.type)}
          <a href={doc.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText class="w-6 h-6 text-gray-500" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{doc.title}</div>
              <div class="text-sm text-gray-500">{doc.class.emoji || '📚'} {doc.class.name}</div>
            </div>
            <div class="flex items-center gap-3">
              {#if doc.grade !== null && doc.points}
                <span class="font-medium text-gray-900">{doc.grade}/{doc.points}</span>
              {/if}
              <span class="badge {status.class}">{status.text}</span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if data.totalTests === 0 && (!data.worksheets || data.worksheets.length === 0) && (!data.studySets || data.studySets.length === 0) && data.studyGuides.length === 0 && (!data.documentAssignments || data.documentAssignments.length === 0)}
    <div class="card p-12 text-center">
      <BookOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Assignments Yet</h3>
      <p class="text-gray-500">Assignments from your classes will appear here.</p>
    </div>
  {/if}
</div>
