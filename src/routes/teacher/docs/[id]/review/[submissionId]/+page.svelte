<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    ArrowLeft,
    FileText,
    User,
    Clock,
    CheckCircle,
    Send,
    MessageSquare,
    GraduationCap,
    Eye,
    Columns,
    X,
    RotateCcw,
    Activity,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    AlertTriangle,
    Clipboard,
    Keyboard,
    Timer,
    TrendingUp,
    Zap
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  
  let showSideBySide = $state(false);
  let gradeValue = $state(data.submission.grade?.toString() || '');
  let feedbackValue = $state(data.submission.feedback || '');
  let saving = $state(false);
  let showGradePanel = $state(true);
  let showActivityPanel = $state(false);
  
  // Replay state
  let isReplaying = $state(false);
  let replaySpeed = $state(1);
  let replayProgress = $state(0);
  let replayEvents = $state<any[]>([]);
  let replayContent = $state('');
  let replayTimer = $state<ReturnType<typeof setTimeout> | null>(null);
  let currentEventIndex = $state(0);
  let loadingReplay = $state(false);
  let selectedSession = $state<string | null>(null);

  // Highlighted content with paste markers
  const highlightedContent = $derived(() => {
    if (!data.pasteEvents || data.pasteEvents.length === 0) {
      return data.submission.content || '';
    }
    
    // Create highlighted version
    let content = data.submission.content || '';
    let html = content;
    
    // Sort paste events by position descending (to replace from end to start)
    const sorted = [...data.pasteEvents].sort((a, b) => (b.position || 0) - (a.position || 0));
    
    // For each paste, wrap in highlight span
    // Note: This is a simplified approach - in production you'd need proper HTML parsing
    // For now we'll just show paste count in the activity panel
    
    return html;
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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
    return `${mins}m ${secs}s`;
  }

  // Calculate integrity score based on activity
  const integrityScore = $derived(() => {
    const summary = data.activitySummary;
    if (!summary) return null;
    
    let score = 100;
    const totalChars = summary.totalKeystrokes + summary.totalPastedChars;
    
    if (totalChars === 0) return null;
    
    // Penalize for high paste ratio
    const pasteRatio = summary.totalPastedChars / totalChars;
    if (pasteRatio > 0.5) score -= 30;
    else if (pasteRatio > 0.3) score -= 15;
    else if (pasteRatio > 0.1) score -= 5;
    
    // Penalize for focus lost
    if (summary.focusLostCount > 10) score -= 15;
    else if (summary.focusLostCount > 5) score -= 5;
    
    // Bonus for consistent typing
    if (summary.avgTypingSpeed > 20 && summary.avgTypingSpeed < 100) score += 5;
    
    return Math.max(0, Math.min(100, score));
  });

  async function saveGrade(returnToStudent = false) {
    saving = true;
    try {
      const res = await fetch(`/api/student-docs/${data.submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: gradeValue ? parseFloat(gradeValue) : null,
          feedback: feedbackValue || null,
          returnToStudent
        })
      });

      if (res.ok) {
        await invalidateAll();
        if (returnToStudent) {
          goto(`/teacher/docs/${data.originalDocument.id}/submissions`);
        }
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      saving = false;
    }
  }

  // Load events for replay
  async function loadReplayEvents(sessionId?: string) {
    loadingReplay = true;
    try {
      const url = sessionId 
        ? `/api/docs/work/${data.submission.id}/events?sessionId=${sessionId}`
        : `/api/docs/work/${data.submission.id}/events`;
      
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        replayEvents = result.events || [];
        replayContent = '';
        currentEventIndex = 0;
        replayProgress = 0;
      }
    } catch (err) {
      console.error('Failed to load replay events:', err);
    } finally {
      loadingReplay = false;
    }
  }

  // Start replay
  function startReplay() {
    if (replayEvents.length === 0) return;
    isReplaying = true;
    playNextEvent();
  }

  // Play next event in sequence
  function playNextEvent() {
    if (!isReplaying || currentEventIndex >= replayEvents.length) {
      isReplaying = false;
      return;
    }

    const event = replayEvents[currentEventIndex];
    
    // Apply event to replay content
    switch (event.eventType) {
      case 'KEYSTROKE':
        if (event.content) {
          replayContent = insertAt(replayContent, event.position, event.content);
        }
        break;
      case 'PASTE':
        if (event.content) {
          replayContent = insertAt(replayContent, event.position, event.content);
        }
        break;
      case 'DELETE':
        replayContent = deleteAt(replayContent, event.position, event.contentLength || 1);
        break;
    }

    currentEventIndex++;
    replayProgress = (currentEventIndex / replayEvents.length) * 100;

    // Calculate delay for next event
    const nextEvent = replayEvents[currentEventIndex];
    if (nextEvent) {
      const timeDiff = new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime();
      const adjustedDelay = Math.min(timeDiff / replaySpeed, 500); // Cap at 500ms
      replayTimer = setTimeout(playNextEvent, Math.max(10, adjustedDelay));
    } else {
      isReplaying = false;
    }
  }

  function insertAt(str: string, index: number, text: string): string {
    return str.slice(0, index) + text + str.slice(index);
  }

  function deleteAt(str: string, index: number, length: number): string {
    return str.slice(0, index) + str.slice(index + length);
  }

  function pauseReplay() {
    isReplaying = false;
    if (replayTimer) {
      clearTimeout(replayTimer);
      replayTimer = null;
    }
  }

  function resetReplay() {
    pauseReplay();
    currentEventIndex = 0;
    replayContent = '';
    replayProgress = 0;
  }

  function skipToEnd() {
    pauseReplay();
    replayContent = data.submission.content || '';
    currentEventIndex = replayEvents.length;
    replayProgress = 100;
  }

  onDestroy(() => {
    if (replayTimer) clearTimeout(replayTimer);
  });
</script>

<svelte:head>
  <title>Review - {data.submission.student.name || data.submission.student.email} | Checkmate</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <!-- Header -->
  <header class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
    <div class="flex items-center gap-4">
      <a 
        href="/teacher/docs/{data.originalDocument.id}/submissions"
        class="p-2 hover:bg-gray-100 rounded-lg"
      >
        <ArrowLeft class="w-5 h-5 text-gray-500" />
      </a>
      
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
          {(data.submission.student.name || data.submission.student.email)[0].toUpperCase()}
        </div>
        <div>
          <h1 class="font-semibold text-gray-900">
            {data.submission.student.name || data.submission.student.email}
          </h1>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>{data.submission.assignment.class.emoji} {data.submission.assignment.class.name}</span>
            <span>·</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusColor(data.submission.status)}">
              {getStatusLabel(data.submission.status)}
            </span>
            {#if integrityScore() !== null}
              <span>·</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium 
                {integrityScore()! >= 80 ? 'bg-green-100 text-green-700' : 
                 integrityScore()! >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                 'bg-red-100 text-red-700'}">
                <Activity class="w-3 h-3" />
                {integrityScore()}% integrity
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        onclick={() => { showActivityPanel = !showActivityPanel; if (showActivityPanel) showGradePanel = false; }}
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        class:bg-purple-100={showActivityPanel}
        class:text-purple-700={showActivityPanel}
      >
        <Activity class="w-4 h-4" />
        Activity Monitor
        {#if data.totalEvents > 0}
          <span class="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full">{data.totalEvents}</span>
        {/if}
      </button>
      
      <button
        onclick={() => showSideBySide = !showSideBySide}
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        class:bg-gray-100={showSideBySide}
      >
        <Columns class="w-4 h-4" />
        Compare
      </button>
      
      <button
        onclick={() => { showGradePanel = !showGradePanel; if (showGradePanel) showActivityPanel = false; }}
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        class:bg-emerald-100={showGradePanel}
        class:text-emerald-700={showGradePanel}
      >
        <MessageSquare class="w-4 h-4" />
        Grade
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Document Content -->
    <div class="flex-1 flex overflow-hidden">
      {#if showSideBySide}
        <!-- Side by side view -->
        <div class="flex-1 flex">
          <div class="flex-1 border-r overflow-auto p-6">
            <div class="max-w-3xl mx-auto">
              <div class="mb-4 pb-4 border-b">
                <h2 class="text-sm font-medium text-gray-500 mb-1">Original Document</h2>
                <h3 class="text-lg font-semibold text-gray-900">{data.originalDocument.title}</h3>
              </div>
              <div class="prose prose-sm max-w-none">
                {@html data.originalDocument.content || '<p class="text-gray-400 italic">No content</p>'}
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-6 bg-white">
            <div class="max-w-3xl mx-auto">
              <div class="mb-4 pb-4 border-b">
                <h2 class="text-sm font-medium text-emerald-600 mb-1">Student's Work</h2>
                <h3 class="text-lg font-semibold text-gray-900">{data.submission.title}</h3>
              </div>
              <div class="prose prose-sm max-w-none">
                {@html data.submission.content || '<p class="text-gray-400 italic">No content</p>'}
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- Single view - student work only -->
        <div class="flex-1 overflow-auto p-6">
          <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border p-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-6">{data.submission.title}</h1>
            
            <!-- Paste Warning Banner -->
            {#if data.pasteEvents && data.pasteEvents.length > 0}
              <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-3">
                  <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div class="font-medium text-amber-800">
                      {data.pasteEvents.length} paste event{data.pasteEvents.length !== 1 ? 's' : ''} detected
                    </div>
                    <p class="text-sm text-amber-700 mt-1">
                      This student pasted approximately {data.pasteEvents.reduce((sum, e) => sum + (e.contentLength || 0), 0).toLocaleString()} characters. 
                      Use the Activity Monitor to review the writing process.
                    </p>
                  </div>
                </div>
              </div>
            {/if}
            
            <div class="prose max-w-none">
              {@html data.submission.content || '<p class="text-gray-400 italic">The student hasn\'t written anything yet.</p>'}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Activity Panel -->
    {#if showActivityPanel}
      <aside class="w-96 bg-white border-l flex flex-col flex-shrink-0">
        <div class="p-4 border-b">
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <Activity class="w-5 h-5 text-purple-500" />
            Activity Monitor
          </h2>
        </div>

        <div class="flex-1 overflow-auto p-4 space-y-4">
          <!-- Activity Summary Stats -->
          {#if data.activitySummary}
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-blue-50 rounded-lg">
                <div class="flex items-center gap-2 text-blue-600 mb-1">
                  <Keyboard class="w-4 h-4" />
                  <span class="text-xs font-medium">Keystrokes</span>
                </div>
                <div class="text-xl font-bold text-blue-700">{data.activitySummary.totalKeystrokes.toLocaleString()}</div>
              </div>
              <div class="p-3 bg-amber-50 rounded-lg">
                <div class="flex items-center gap-2 text-amber-600 mb-1">
                  <Clipboard class="w-4 h-4" />
                  <span class="text-xs font-medium">Pastes</span>
                </div>
                <div class="text-xl font-bold text-amber-700">{data.activitySummary.totalPastes}</div>
                <div class="text-xs text-amber-600">{data.activitySummary.totalPastedChars.toLocaleString()} chars</div>
              </div>
              <div class="p-3 bg-green-50 rounded-lg">
                <div class="flex items-center gap-2 text-green-600 mb-1">
                  <Timer class="w-4 h-4" />
                  <span class="text-xs font-medium">Writing Time</span>
                </div>
                <div class="text-xl font-bold text-green-700">{formatDuration(data.activitySummary.totalWritingTime)}</div>
              </div>
              <div class="p-3 bg-purple-50 rounded-lg">
                <div class="flex items-center gap-2 text-purple-600 mb-1">
                  <TrendingUp class="w-4 h-4" />
                  <span class="text-xs font-medium">Typing Speed</span>
                </div>
                <div class="text-xl font-bold text-purple-700">{Math.round(data.activitySummary.avgTypingSpeed)}</div>
                <div class="text-xs text-purple-600">chars/min</div>
              </div>
            </div>

            <!-- Integrity Assessment -->
            <div class="p-4 rounded-lg {integrityScore()! >= 80 ? 'bg-green-50 border border-green-200' : 
              integrityScore()! >= 50 ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'}">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium {integrityScore()! >= 80 ? 'text-green-800' : 
                  integrityScore()! >= 50 ? 'text-yellow-800' : 'text-red-800'}">
                  Integrity Score
                </span>
                <span class="text-2xl font-bold {integrityScore()! >= 80 ? 'text-green-600' : 
                  integrityScore()! >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                  {integrityScore()}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all {integrityScore()! >= 80 ? 'bg-green-500' : 
                    integrityScore()! >= 50 ? 'bg-yellow-500' : 'bg-red-500'}"
                  style="width: {integrityScore()}%"
                ></div>
              </div>
              <div class="mt-2 text-xs {integrityScore()! >= 80 ? 'text-green-700' : 
                integrityScore()! >= 50 ? 'text-yellow-700' : 'text-red-700'}">
                {#if integrityScore()! >= 80}
                  This work appears to be authentically written
                {:else if integrityScore()! >= 50}
                  Some content may have been copied from external sources
                {:else}
                  High amount of pasted content detected - review recommended
                {/if}
              </div>
            </div>

            <!-- Additional Stats -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between p-2 bg-gray-50 rounded">
                <span class="text-gray-600">Focus Lost</span>
                <span class="font-medium">{data.activitySummary.focusLostCount} times</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-50 rounded">
                <span class="text-gray-600">Deletions</span>
                <span class="font-medium">{data.activitySummary.totalDeletes}</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-50 rounded">
                <span class="text-gray-600">Undos</span>
                <span class="font-medium">{data.activitySummary.totalUndos}</span>
              </div>
            </div>
          {:else}
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              <Activity class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">No activity data recorded</p>
              <p class="text-xs mt-1">Activity monitoring may not have been enabled</p>
            </div>
          {/if}

          <!-- Paste Events -->
          {#if data.pasteEvents && data.pasteEvents.length > 0}
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-2">Paste Events</h3>
              <div class="space-y-2 max-h-60 overflow-auto">
                {#each data.pasteEvents as paste, i}
                  <div class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-medium text-amber-800">Paste #{i + 1}</span>
                      <span class="text-xs text-amber-600">{paste.contentLength} chars</span>
                    </div>
                    <div class="text-xs text-gray-500">
                      {new Date(paste.timestamp).toLocaleString()}
                    </div>
                    {#if paste.content}
                      <div class="mt-2 p-2 bg-white rounded text-xs text-gray-600 max-h-20 overflow-hidden">
                        {paste.content.substring(0, 200)}{paste.content.length > 200 ? '...' : ''}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Replay Section -->
          {#if data.totalEvents > 0}
            <div class="border-t pt-4">
              <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Play class="w-4 h-4" />
                Writing Replay
              </h3>

              <!-- Session Selector -->
              {#if data.sessions && data.sessions.length > 1}
                <div class="mb-3">
                  <select 
                    bind:value={selectedSession}
                    onchange={() => loadReplayEvents(selectedSession || undefined)}
                    class="input w-full text-sm"
                  >
                    <option value="">All Sessions</option>
                    {#each data.sessions as session, i}
                      <option value={session.id}>Session {i + 1} - {new Date(session.startTime).toLocaleString()}</option>
                    {/each}
                  </select>
                </div>
              {/if}

              <!-- Replay Controls -->
              <div class="space-y-3">
                {#if replayEvents.length === 0}
                  <button 
                    onclick={() => loadReplayEvents(selectedSession || undefined)}
                    disabled={loadingReplay}
                    class="btn btn-secondary w-full"
                  >
                    {#if loadingReplay}
                      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Loading...
                    {:else}
                      <Zap class="w-4 h-4" />
                      Load Replay Data
                    {/if}
                  </button>
                {:else}
                  <div class="flex items-center gap-2">
                    <button 
                      onclick={resetReplay}
                      class="p-2 hover:bg-gray-100 rounded"
                      title="Reset"
                    >
                      <SkipBack class="w-4 h-4" />
                    </button>
                    
                    {#if isReplaying}
                      <button 
                        onclick={pauseReplay}
                        class="flex-1 btn bg-amber-500 text-white hover:bg-amber-600"
                      >
                        <Pause class="w-4 h-4" />
                        Pause
                      </button>
                    {:else}
                      <button 
                        onclick={startReplay}
                        class="flex-1 btn bg-purple-600 text-white hover:bg-purple-700"
                      >
                        <Play class="w-4 h-4" />
                        {currentEventIndex > 0 ? 'Resume' : 'Start'} Replay
                      </button>
                    {/if}
                    
                    <button 
                      onclick={skipToEnd}
                      class="p-2 hover:bg-gray-100 rounded"
                      title="Skip to end"
                    >
                      <SkipForward class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Speed Control -->
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">Speed:</span>
                    {#each [0.5, 1, 2, 4, 8] as speed}
                      <button
                        onclick={() => replaySpeed = speed}
                        class="px-2 py-1 text-xs rounded {replaySpeed === speed ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                      >
                        {speed}x
                      </button>
                    {/each}
                  </div>

                  <!-- Progress Bar -->
                  <div class="space-y-1">
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        class="h-1.5 rounded-full bg-purple-500 transition-all"
                        style="width: {replayProgress}%"
                      ></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                      <span>{currentEventIndex} / {replayEvents.length} events</span>
                      <span>{Math.round(replayProgress)}%</span>
                    </div>
                  </div>

                  <!-- Replay Preview -->
                  {#if replayContent || currentEventIndex > 0}
                    <div class="p-3 bg-gray-50 rounded-lg border max-h-40 overflow-auto">
                      <div class="text-xs text-gray-500 mb-1">Live Preview:</div>
                      <div class="text-sm whitespace-pre-wrap font-mono">
                        {replayContent || '<empty>'}
                      </div>
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </aside>
    {/if}

    <!-- Grade Panel -->
    {#if showGradePanel}
      <aside class="w-80 bg-white border-l flex flex-col flex-shrink-0">
        <div class="p-4 border-b">
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap class="w-5 h-5 text-emerald-500" />
            Grade & Feedback
          </h2>
        </div>

        <div class="flex-1 overflow-auto p-4 space-y-4">
          <!-- Submission Info -->
          <div class="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Submitted</span>
              <span class="text-gray-900">{formatDate(data.submission.submittedAt)}</span>
            </div>
            {#if data.submission.returnedAt}
              <div class="flex justify-between">
                <span class="text-gray-500">Returned</span>
                <span class="text-gray-900">{formatDate(data.submission.returnedAt)}</span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-gray-500">Last updated</span>
              <span class="text-gray-900">{formatDate(data.submission.updatedAt)}</span>
            </div>
          </div>

          <!-- Grade Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Grade
              {#if data.submission.assignment.points}
                <span class="text-gray-400 font-normal">/ {data.submission.assignment.points}</span>
              {/if}
            </label>
            <input
              type="number"
              bind:value={gradeValue}
              placeholder="Enter grade..."
              class="input w-full"
              step="0.5"
            />
          </div>

          <!-- Feedback -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
            <textarea
              bind:value={feedbackValue}
              placeholder="Add feedback for the student..."
              class="input w-full"
              rows="6"
            ></textarea>
          </div>

          <!-- Previous Feedback (if returned before) -->
          {#if data.submission.status === 'RESUBMITTED' && data.submission.feedback}
            <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div class="text-xs font-medium text-orange-700 mb-1">Previous Feedback</div>
              <p class="text-sm text-orange-800">{data.submission.feedback}</p>
            </div>
          {/if}
        </div>

        <div class="p-4 border-t space-y-2">
          <button
            onclick={() => saveGrade(false)}
            disabled={saving}
            class="btn btn-secondary w-full"
          >
            Save Draft
          </button>
          <button
            onclick={() => saveGrade(true)}
            disabled={saving}
            class="btn bg-emerald-600 text-white hover:bg-emerald-700 w-full flex items-center justify-center gap-2"
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
      </aside>
    {/if}
  </div>
</div>
