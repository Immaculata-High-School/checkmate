<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    ArrowLeft,
    FileText,
    Send,
    GraduationCap,
    Columns,
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
    Zap,
    ShieldAlert,
    ShieldCheck,
    EyeOff,
    Trash2,
    Undo2,
    Circle
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  
  let gradeValue = $state(data.submission.grade?.toString() || '');
  let feedbackValue = $state(data.submission.feedback || '');
  let saving = $state(false);
  let showGradePanel = $state(false);
  let activeTab = $state<'replay' | 'document' | 'compare'>('replay');
  
  // Replay state — show finished content initially
  let isReplaying = $state(false);
  let replaySpeed = $state(4);
  let replayProgress = $state(100);
  let replayEvents = $state<any[]>([]);
  let replayContent = $state(data.submission.content || '');
  let replayTimer = $state<ReturnType<typeof setTimeout> | null>(null);
  let currentEventIndex = $state(0);
  let loadingReplay = $state(false);
  let selectedSession = $state<string | null>(null);
  let currentEventType = $state<string | null>(null);
  let autoLoaded = $state(false);
  let showingFinalState = $state(true);

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
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
    return `${mins}m ${secs}s`;
  }

  // Integrity score: paste ratio is the primary signal
  const integrityScore = $derived(() => {
    const summary = data.activitySummary;
    if (!summary) return null;
    const totalChars = summary.totalKeystrokes + summary.totalPastedChars;
    if (totalChars === 0) return null;

    const pasteRatio = summary.totalPastedChars / totalChars;
    // Score is essentially (1 - pasteRatio) scaled, with modifiers
    let score = Math.round((1 - pasteRatio) * 100);

    // Additional penalty for many focus-lost events
    if (summary.focusLostCount > 20) score -= 10;
    else if (summary.focusLostCount > 10) score -= 5;

    // Small bonus for healthy typing speed (indicates real typing)
    if (summary.avgTypingSpeed > 20 && summary.avgTypingSpeed < 120) score += 3;

    return Math.max(0, Math.min(100, score));
  });

  // Derived paste analysis
  const pasteAnalysis = $derived(() => {
    const summary = data.activitySummary;
    if (!summary) return null;
    const totalChars = summary.totalKeystrokes + summary.totalPastedChars;
    if (totalChars === 0) return null;
    const pasteRatio = Math.round((summary.totalPastedChars / totalChars) * 100);
    const typedRatio = 100 - pasteRatio;
    return { pasteRatio, typedRatio, totalChars };
  });

  // Integrity level label
  const integrityLevel = $derived(() => {
    const score = integrityScore();
    if (score === null) return null;
    if (score >= 85) return { label: 'Authentic', desc: 'Writing patterns are consistent with original work' };
    if (score >= 65) return { label: 'Mostly Original', desc: 'Most content appears to be typed by the student' };
    if (score >= 40) return { label: 'Review Suggested', desc: 'Significant amount of pasted content detected' };
    if (score >= 20) return { label: 'Suspicious', desc: 'High paste ratio — likely copied from external sources' };
    return { label: 'Flagged', desc: 'Content appears to be almost entirely pasted, not typed' };
  });

  function getScoreColor(score: number) {
    if (score >= 85) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', ring: 'rgb(16,185,129)' };
    if (score >= 65) return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500', ring: 'rgb(34,197,94)' };
    if (score >= 40) return { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-500', ring: 'rgb(234,179,8)' };
    if (score >= 20) return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500', ring: 'rgb(249,115,22)' };
    return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', ring: 'rgb(239,68,68)' };
  }

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

  // Auto-load events for replay on mount
  onMount(() => {
    if (data.totalEvents > 0 && !autoLoaded) {
      autoLoaded = true;
      loadReplayEvents();
    }
  });

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
        // Show final state by default
        replayContent = data.submission.content || '';
        currentEventIndex = replayEvents.length;
        replayProgress = 100;
        showingFinalState = true;
      }
    } catch (err) {
      console.error('Failed to load replay events:', err);
    } finally {
      loadingReplay = false;
    }
  }

  function startReplay() {
    if (replayEvents.length === 0) return;
    // If at end (showing final state), reset to beginning first
    if (currentEventIndex >= replayEvents.length || showingFinalState) {
      currentEventIndex = 0;
      replayContent = '';
      replayProgress = 0;
      showingFinalState = false;
    }
    isReplaying = true;
    playNextEvent();
  }

  function playNextEvent() {
    if (!isReplaying || currentEventIndex >= replayEvents.length) {
      isReplaying = false;
      currentEventType = null;
      return;
    }

    const event = replayEvents[currentEventIndex];
    currentEventType = event.eventType;
    
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

    const nextEvent = replayEvents[currentEventIndex];
    if (nextEvent) {
      const timeDiff = new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime();
      const adjustedDelay = Math.min(timeDiff / replaySpeed, 500);
      replayTimer = setTimeout(playNextEvent, Math.max(10, adjustedDelay));
    } else {
      isReplaying = false;
      currentEventType = null;
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
    currentEventType = null;
    showingFinalState = false;
  }

  function skipToEnd() {
    pauseReplay();
    replayContent = data.submission.content || '';
    currentEventIndex = replayEvents.length;
    replayProgress = 100;
    currentEventType = null;
    showingFinalState = true;
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
  <header class="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
    <div class="flex items-center gap-3">
      <a 
        href="/teacher/docs/{data.originalDocument.id}/submissions"
        class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
      </a>
      
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
          {(data.submission.student.name || data.submission.student.email)[0].toUpperCase()}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-medium text-sm text-gray-900">
              {data.submission.student.name || data.submission.student.email}
            </h1>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusColor(data.submission.status)}">
              {getStatusLabel(data.submission.status)}
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {data.submission.assignment.class.emoji} {data.submission.assignment.class.name} · {data.submission.title}
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <!-- Tab Switches -->
      <div class="flex bg-gray-100 rounded-lg p-0.5 mr-3">
        <button
          onclick={() => activeTab = 'replay'}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            {activeTab === 'replay' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        >
          <Play class="w-3 h-3" />
          Replay
        </button>
        <button
          onclick={() => activeTab = 'document'}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            {activeTab === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        >
          <FileText class="w-3 h-3" />
          Document
        </button>
        <button
          onclick={() => activeTab = 'compare'}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            {activeTab === 'compare' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        >
          <Columns class="w-3 h-3" />
          Compare
        </button>
      </div>
      
      <button
        onclick={() => showGradePanel = !showGradePanel}
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
          {showGradePanel ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}"
      >
        <GraduationCap class="w-3.5 h-3.5" />
        Grade
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden">
    <div class="flex-1 flex flex-col overflow-hidden">
      
      {#if activeTab === 'replay'}
        <!-- REPLAY VIEW -->
        <div class="flex-1 flex flex-col overflow-hidden">
          
          <!-- Replay Controls Bar -->
          <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <div class="flex items-center gap-1.5">
              <button 
                onclick={resetReplay}
                class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Reset to beginning"
              >
                <SkipBack class="w-3.5 h-3.5" />
              </button>
              
              {#if replayEvents.length > 0}
                {#if isReplaying}
                  <button 
                    onclick={pauseReplay}
                    class="p-1.5 px-3 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Pause class="w-3.5 h-3.5" />
                    Pause
                  </button>
                {:else}
                  <button 
                    onclick={startReplay}
                    class="p-1.5 px-3 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Play class="w-3.5 h-3.5" />
                    {#if showingFinalState}
                      Play from Start
                    {:else if currentEventIndex > 0}
                      Resume
                    {:else}
                      Play
                    {/if}
                  </button>
                {/if}
              {:else if loadingReplay}
                <span class="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Loading events...
                </span>
              {:else}
                <button 
                  onclick={() => loadReplayEvents(selectedSession || undefined)}
                  class="p-1.5 px-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Zap class="w-3.5 h-3.5" />
                  Load Replay
                </button>
              {/if}
              
              <button 
                onclick={skipToEnd}
                class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Skip to end"
              >
                <SkipForward class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Speed Control -->
            <div class="flex items-center gap-1 ml-2">
              {#each [1, 2, 4, 8, 16] as speed}
                <button
                  onclick={() => replaySpeed = speed}
                  class="px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors
                    {replaySpeed === speed ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}"
                >
                  {speed}x
                </button>
              {/each}
            </div>

            <!-- Progress Bar -->
            <div class="flex-1 mx-3 flex items-center gap-2">
              <div class="flex-1 bg-gray-200 rounded-full h-1 relative cursor-pointer group">
                <div 
                  class="h-1 rounded-full bg-blue-500 transition-all relative"
                  style="width: {replayProgress}%"
                >
                  <div class="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"></div>
                </div>
              </div>
              <span class="text-[10px] font-mono text-gray-400 w-24 text-right">
                {currentEventIndex}/{replayEvents.length}
              </span>
            </div>

            <!-- Current Event Indicator -->
            {#if currentEventType}
              <div class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium
                {currentEventType === 'PASTE' ? 'bg-red-100 text-red-700' : 
                 currentEventType === 'DELETE' ? 'bg-orange-100 text-orange-700' :
                 'bg-emerald-100 text-emerald-700'}">
                {#if currentEventType === 'PASTE'}
                  <Clipboard class="w-3 h-3" />
                {:else if currentEventType === 'DELETE'}
                  <Trash2 class="w-3 h-3" />
                {:else}
                  <Keyboard class="w-3 h-3" />
                {/if}
                {currentEventType}
              </div>
            {/if}

            <!-- Session Selector -->
            {#if data.sessions && data.sessions.length > 1}
              <select 
                bind:value={selectedSession}
                onchange={() => loadReplayEvents(selectedSession || undefined)}
                class="bg-white border border-gray-200 text-gray-600 text-[10px] rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Sessions</option>
                {#each data.sessions as session, i}
                  <option value={session.id}>Session {i + 1}</option>
                {/each}
              </select>
            {/if}
          </div>

          <div class="flex-1 flex overflow-hidden">
            <!-- Replay Editor Area -->
            <div class="flex-1 overflow-auto bg-gray-50 p-6">
              <div class="max-w-4xl mx-auto">
                <div class="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
                  <!-- Editor Title Bar -->
                  <div class="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                    <div class="flex items-center gap-2">
                      <FileText class="w-3.5 h-3.5 text-gray-400" />
                      <span class="text-xs text-gray-500 font-medium">{data.submission.title}</span>
                      {#if showingFinalState && !isReplaying}
                        <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Final</span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-2">
                      {#if isReplaying}
                        <span class="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                          <Circle class="w-2 h-2 fill-red-500 animate-pulse" />
                          REPLAYING
                        </span>
                      {/if}
                      <span class="text-[10px] text-gray-400 font-mono">
                        {replayContent.length} chars
                      </span>
                    </div>
                  </div>
                  
                  <!-- Editor Content -->
                  <div class="min-h-[400px] max-h-[calc(100vh-320px)] overflow-auto p-6 text-sm leading-relaxed text-gray-800">
                    {#if replayContent}
                      <div class="whitespace-pre-wrap break-words">{replayContent}{#if isReplaying}<span class="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-text-bottom animate-pulse"></span>{/if}</div>
                    {:else if currentEventIndex > 0}
                      <div class="whitespace-pre-wrap break-words text-gray-400 italic">(empty)</div>
                    {:else if loadingReplay}
                      <div class="text-gray-400 italic flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Loading writing history...
                      </div>
                    {:else}
                      <div class="text-gray-400 italic">No writing replay data available</div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>

            <!-- Analysis Sidebar -->
            <aside class="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-auto">
              <div class="p-4 space-y-4">
                
                <!-- Legitimacy Score -->
                {#if integrityScore() !== null}
                  {@const level = integrityLevel()}
                  {@const score = integrityScore()!}
                  {@const colors = getScoreColor(score)}
                  <div class="rounded-lg overflow-hidden border {colors.border} {colors.bg}">
                    <div class="px-4 py-3 flex items-center gap-2 border-b {colors.border}">
                      {#if score >= 65}
                        <ShieldCheck class="w-4 h-4 {colors.text}" />
                      {:else}
                        <ShieldAlert class="w-4 h-4 {colors.text}" />
                      {/if}
                      <span class="text-xs font-semibold {colors.text} uppercase tracking-wider">Legitimacy</span>
                    </div>
                    <div class="p-4">
                      <div class="flex items-end justify-between mb-3">
                        <div>
                          <div class="text-3xl font-bold {colors.text}">{score}<span class="text-lg opacity-50">%</span></div>
                          <div class="text-xs font-medium mt-0.5 {colors.text}">
                            {level?.label}
                          </div>
                        </div>
                        <div class="w-16 h-16 relative">
                          <svg class="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none" stroke="rgb(229,231,235)" stroke-width="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none" 
                              stroke="{colors.ring}"
                              stroke-width="3"
                              stroke-dasharray="{score}, 100"
                              stroke-linecap="round" />
                          </svg>
                        </div>
                      </div>
                      <p class="text-[11px] text-gray-500 leading-relaxed">{level?.desc}</p>
                    </div>
                  </div>
                {/if}

                <!-- Composition Breakdown -->
                {#if pasteAnalysis()}
                  {@const analysis = pasteAnalysis()!}
                  <div class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Composition</span>
                    </div>
                    <div class="p-4 space-y-3">
                      <div class="flex h-3 rounded-full overflow-hidden bg-gray-100">
                        <div class="bg-emerald-500 transition-all" style="width: {analysis.typedRatio}%"></div>
                        <div class="bg-red-500 transition-all" style="width: {analysis.pasteRatio}%"></div>
                      </div>
                      <div class="flex justify-between text-[11px]">
                        <span class="flex items-center gap-1.5 text-emerald-600">
                          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Typed {analysis.typedRatio}%
                        </span>
                        <span class="flex items-center gap-1.5 text-red-600">
                          <span class="w-2 h-2 rounded-full bg-red-500"></span>
                          Pasted {analysis.pasteRatio}%
                        </span>
                      </div>
                    </div>
                  </div>
                {/if}

                <!-- Activity Stats -->
                {#if data.activitySummary}
                  <div class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Activity</span>
                    </div>
                    <div class="divide-y divide-gray-100">
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <Keyboard class="w-3.5 h-3.5 text-blue-500" />
                          Keystrokes
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">{data.activitySummary.totalKeystrokes.toLocaleString()}</span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <Clipboard class="w-3.5 h-3.5 text-red-500" />
                          Pastes
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">
                          {data.activitySummary.totalPastes}
                          <span class="text-[10px] text-gray-400 ml-1">({data.activitySummary.totalPastedChars.toLocaleString()} chars)</span>
                        </span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <Timer class="w-3.5 h-3.5 text-green-500" />
                          Writing Time
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">{formatDuration(data.activitySummary.totalWritingTime)}</span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <TrendingUp class="w-3.5 h-3.5 text-purple-500" />
                          Avg Speed
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">
                          {#if data.activitySummary.avgTypingSpeed > 0}
                            {Math.round(data.activitySummary.avgTypingSpeed)} <span class="text-[10px] text-gray-400">cpm</span>
                          {:else}
                            —
                          {/if}
                        </span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <EyeOff class="w-3.5 h-3.5 text-amber-500" />
                          Focus Lost
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">{data.activitySummary.focusLostCount}</span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <Trash2 class="w-3.5 h-3.5 text-gray-400" />
                          Deletions
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">{data.activitySummary.totalDeletes}</span>
                      </div>
                      <div class="px-4 py-2.5 flex items-center justify-between">
                        <span class="flex items-center gap-2 text-xs text-gray-500">
                          <Undo2 class="w-3.5 h-3.5 text-gray-400" />
                          Undos
                        </span>
                        <span class="text-sm font-semibold text-gray-900 font-mono">{data.activitySummary.totalUndos}</span>
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="rounded-lg border border-gray-200 p-6 text-center">
                    <Activity class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p class="text-xs text-gray-400">No activity data recorded</p>
                  </div>
                {/if}

                <!-- Paste Log -->
                {#if data.pasteEvents && data.pasteEvents.length > 0}
                  <div class="rounded-lg border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <span class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Paste Log</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-600">{data.pasteEvents.length} events</span>
                    </div>
                    <div class="max-h-64 overflow-auto divide-y divide-gray-100">
                      {#each data.pasteEvents as paste, i}
                        <div class="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-medium text-red-600">#{i + 1}</span>
                            <span class="text-[10px] font-mono text-gray-400">{paste.contentLength} chars</span>
                          </div>
                          <div class="text-[10px] text-gray-400 mb-1.5">
                            {new Date(paste.timestamp).toLocaleString()}
                          </div>
                          {#if paste.content}
                            <div class="p-2 bg-gray-50 rounded text-[11px] text-gray-500 font-mono max-h-16 overflow-hidden leading-relaxed border border-gray-100">
                              {paste.content.substring(0, 150)}{paste.content.length > 150 ? '...' : ''}
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

              </div>
            </aside>
          </div>
        </div>

      {:else if activeTab === 'document'}
        <!-- DOCUMENT VIEW -->
        <div class="flex-1 overflow-auto p-6 bg-gray-50">
          <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border p-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-6">{data.submission.title}</h1>
            
            {#if data.pasteEvents && data.pasteEvents.length > 0}
              <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-3">
                  <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div class="font-medium text-amber-800">
                      {data.pasteEvents.length} paste event{data.pasteEvents.length !== 1 ? 's' : ''} detected
                    </div>
                    <p class="text-sm text-amber-700 mt-1">
                      Approximately {data.pasteEvents.reduce((sum: number, e: any) => sum + (e.contentLength || 0), 0).toLocaleString()} characters were pasted.
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

      {:else if activeTab === 'compare'}
        <!-- COMPARE VIEW -->
        <div class="flex-1 flex overflow-hidden">
          <div class="flex-1 border-r overflow-auto p-6 bg-gray-50">
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
      {/if}
    </div>

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

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
            <textarea
              bind:value={feedbackValue}
              placeholder="Add feedback for the student..."
              class="input w-full"
              rows="6"
            ></textarea>
          </div>

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
