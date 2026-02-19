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
    Calendar,
    GraduationCap
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

  // Combine all study materials into one list
  const studyMaterials = $derived([
    ...data.studyGuides.map(g => ({ ...g, materialType: 'study_guide' as const, href: `/student/study-guides/${g.id}` })),
    ...(data.worksheets || []).map(w => ({ ...w, materialType: 'worksheet' as const, href: `/student/worksheets/${w.id}` })),
    ...(data.studySets || []).map(s => ({ ...s, materialType: 'study_set' as const, href: `/student/study-sets/${s.id}` }))
  ]);

  const hasAnything = $derived(
    data.totalTests > 0 || 
    (data.documentAssignments?.length || 0) > 0 || 
    studyMaterials.length > 0
  );
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
  <div class="grid grid-cols-3 gap-4 mb-8">
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
  </div>

  <!-- Continue Where You Left Off (unified: tests + docs in progress) -->
  {#if data.inProgress.length > 0 || docInProgress.length > 0}
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
              <div class="text-sm text-gray-500 flex items-center gap-2">
                <span>{test.class.emoji} {test.class.name}</span>
                <span class="text-gray-300">|</span>
                <span>Test · {test.questionCount} questions</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge badge-yellow">Continue</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
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
                <span class="text-gray-300">|</span>
                <span>Document</span>
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

  <!-- Available (unified: tests + docs pending) -->
  {#if data.available.filter(t => !t.submission).length > 0 || docPending.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText class="w-5 h-5 text-blue-500" />
        Available
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
                <span>Test · {test.questionCount} questions</span>
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
        {#each docPending as doc}
          {@const status = getDocStatusBadge(doc.status, doc.type)}
          {@const due = formatDueDate(doc.dueDate)}
          <a href={doc.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
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
                <span class="text-gray-300">|</span>
                <span>Document{doc.type === 'VIEW_ONLY' ? ' · View Only' : ''}</span>
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

  <!-- Study Materials (unified: guides + worksheets + flashcards) -->
  {#if studyMaterials.length > 0}
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen class="w-5 h-5 text-amber-500" />
        Study Materials
      </h2>
      <div class="space-y-3">
        {#each studyMaterials as material}
          {@const isGuide = material.materialType === 'study_guide'}
          {@const isWorksheet = material.materialType === 'worksheet'}
          {@const isStudySet = material.materialType === 'study_set'}
          {@const label = isGuide ? 'Study Guide' : isWorksheet ? 'Worksheet' : 'Flashcard Set'}
          {@const badge = isGuide ? 'View' : isWorksheet ? 'Start' : 'Practice'}
          <a href={material.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 {isGuide ? 'border-amber-400' : isWorksheet ? 'border-green-400' : 'border-purple-400'}">
            <div class="w-12 h-12 rounded-lg flex items-center justify-center {isGuide ? 'bg-amber-100' : isWorksheet ? 'bg-green-100' : 'bg-purple-100'}">
              {#if isGuide}
                <BookOpen class="w-6 h-6 text-amber-600" />
              {:else if isWorksheet}
                <ClipboardList class="w-6 h-6 text-green-600" />
              {:else}
                <Library class="w-6 h-6 text-purple-600" />
              {/if}
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{material.title}</div>
              <div class="text-sm text-gray-500 flex items-center gap-2">
                <span>{material.class.emoji || '📚'} {material.class.name}</span>
                <span class="text-gray-300">|</span>
                <span>{label}</span>
                {#if isWorksheet && 'itemCount' in material}
                  <span class="text-gray-300">|</span>
                  <span>{material.itemCount} items</span>
                {:else if isStudySet && 'cardCount' in material}
                  <span class="text-gray-300">|</span>
                  <span>{material.cardCount} cards</span>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge {isGuide ? 'badge-amber' : isWorksheet ? 'badge-green' : 'badge-purple'}">{badge}</span>
              <ArrowRight class="w-5 h-5 text-gray-400" />
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Completed (unified: tests + docs) -->
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
              <div class="text-sm text-gray-500">
                {test.class.name}
                <span class="text-gray-300 mx-1">|</span>
                Test
              </div>
            </div>
            <div class="flex items-center gap-3">
              {#if score}
                <span class="font-medium text-gray-900">{score}</span>
              {/if}
              <span class="badge {status.class}">{status.text}</span>
            </div>
          </a>
        {/each}
        
        {#each docCompleted as doc}
          {@const status = getDocStatusBadge(doc.status, doc.type)}
          {@const hasPct = doc.grade !== null && doc.points}
          <a href={doc.href} class="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText class="w-6 h-6 text-gray-500" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{doc.title}</div>
              <div class="text-sm text-gray-500">
                {doc.class.emoji || '📚'} {doc.class.name}
                <span class="text-gray-300 mx-1">|</span>
                Document
              </div>
            </div>
            <div class="flex items-center gap-3">
              {#if hasPct}
                {@const pct = Math.round(Math.min(100, (doc.grade || 0) / (doc.points || 1) * 100))}
                <span class="font-medium text-gray-900">{doc.grade}/{doc.points} ({pct}%)</span>
              {/if}
              <span class="badge {status.class}">{status.text}</span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Empty State -->
  {#if !hasAnything}
    <div class="card p-12 text-center">
      <BookOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Assignments Yet</h3>
      <p class="text-gray-500">Assignments from your classes will appear here.</p>
    </div>
  {/if}
</div>
