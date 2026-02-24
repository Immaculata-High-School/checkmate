<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    ArrowLeft,
    FileText,
    Check,
    Eye,
    Send,
    Clock,
    Calendar,
    AlertCircle,
    GraduationCap,
    RotateCcw,
    Columns,
    Activity
  } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import { DocumentActivityTracker } from '$lib/utils/activityTracker';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let title = $state('');
  let content = $state('');
  let saving = $state(false);
  let lastSaved = $state<Date | null>(null);
  let showSubmitConfirm = $state(false);
  let submitting = $state(false);
  let showOriginal = $state(false);

  // Activity tracking
  let tracker: DocumentActivityTracker | null = $state(null);
  let trackingEnabled = $state(true);

  $effect(() => {
    title = data.document.title;
    content = data.document.content || '';
    trackingEnabled = data.document.monitoringEnabled ?? true;
  });

  const canEdit = $derived(data.document.canEdit);
  const isSubmitted = $derived(data.document.status === 'SUBMITTED' || data.document.status === 'RESUBMITTED');

  // Initialize activity tracker
  onMount(() => {
    if (canEdit && trackingEnabled) {
      tracker = new DocumentActivityTracker({
        documentId: data.document.id,
        enabled: true,
        batchSize: 30,
        flushInterval: 5000
      });

      // Track focus/blur on window
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);
      
      // Track beforeunload to flush events
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
  });

  onDestroy(() => {
    if (tracker) {
      tracker.endSession();
      tracker = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  });

  function handleWindowFocus() {
    tracker?.trackFocus();
  }

  function handleWindowBlur() {
    tracker?.trackBlur();
  }

  function handleBeforeUnload() {
    tracker?.flush();
  }

  // Track editor events
  function handleEditorInput(event: { type: string; position: number; content?: string; length?: number }) {
    if (!tracker) return;

    switch (event.type) {
      case 'insert':
        if (event.content) {
          for (const char of event.content) {
            tracker.trackKeystroke(char, event.position);
          }
        }
        break;
      case 'delete':
        tracker.trackDelete(event.position, event.length || 1);
        break;
      case 'paste':
        if (event.content) {
          tracker.trackPaste(event.content, event.position);
        }
        break;
      case 'cut':
        if (event.content) {
          tracker.trackCut(event.content, event.position, event.position + (event.length || 0));
        }
        break;
      case 'undo':
        tracker.trackUndo(event.position);
        break;
      case 'redo':
        tracker.trackRedo(event.position);
        break;
    }
  }

  function getStatusInfo(status: string) {
    switch (status) {
      case 'NOT_STARTED': return { label: 'Not Started', color: 'bg-gray-100 text-gray-600' };
      case 'IN_PROGRESS': return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
      case 'SUBMITTED': return { label: 'Submitted', color: 'bg-blue-100 text-blue-700' };
      case 'RESUBMITTED': return { label: 'Resubmitted', color: 'bg-purple-100 text-purple-700' };
      case 'RETURNED': return { label: 'Returned for Revision', color: 'bg-orange-100 text-orange-700' };
      default: return { label: status, color: 'bg-gray-100 text-gray-600' };
    }
  }

  function formatDate(date: string | Date | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  async function saveDocument() {
    if (!canEdit) return;
    
    saving = true;
    try {
      const res = await fetch(`/api/student-docs/${data.document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (res.ok) {
        lastSaved = new Date();
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      saving = false;
    }
  }

  async function submitWork() {
    submitting = true;
    try {
      const res = await fetch(`/api/student-docs/${data.document.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        showSubmitConfirm = false;
        await invalidateAll();
      }
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      submitting = false;
    }
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDocument();
    }
  }

  function handleAutoSave() {
    saveDocument();
  }

  function handleContentChange(newContent: string) {
    content = newContent;
  }
</script>

<svelte:head>
  <title>{title} | Documents | Checkmate</title>
</svelte:head>

<div class="document-page">
  <!-- Header -->
  <header class="document-header">
    <div class="header-left">
      <a href="/student/docs" class="back-button" title="Back to Documents">
        <ArrowLeft class="w-5 h-5" />
      </a>
      
      <div class="document-icon">
        <FileText class="w-6 h-6" />
      </div>

      <div class="document-title-section">
        {#if canEdit}
          <input
            type="text"
            bind:value={title}
            onblur={saveDocument}
            onkeydown={handleTitleKeydown}
            class="document-title-input"
            placeholder="Untitled Document"
          />
        {:else}
          <h1 class="document-title">{title}</h1>
        {/if}
        <div class="document-meta">
          <span>{data.document.assignment.class.emoji} {data.document.assignment.class.name}</span>
          <span class="meta-separator">·</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getStatusInfo(data.document.status).color}">
            {getStatusInfo(data.document.status).label}
          </span>
          {#if data.document.assignment.dueDate}
            <span class="meta-separator">·</span>
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              Due {formatDate(data.document.assignment.dueDate)}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="header-right">
      <!-- Save Status -->
      <div class="save-indicator">
        {#if saving}
          <span class="save-status saving">
            <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        {:else if lastSaved}
          <span class="save-status saved">
            <Check class="w-4 h-4" />
            Saved
          </span>
        {/if}
      </div>

      <!-- View Original Toggle -->
      <button
        onclick={() => showOriginal = !showOriginal}
        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        class:bg-gray-100={showOriginal}
      >
        <Columns class="w-4 h-4" />
        <span class="hidden sm:inline">Original</span>
      </button>

      {#if !canEdit}
        <span class="view-only-badge">
          <Eye class="w-4 h-4" />
          {isSubmitted ? 'Submitted' : 'View only'}
        </span>
      {/if}

      {#if canEdit}
        <button
          onclick={() => showSubmitConfirm = true}
          class="submit-button"
        >
          <Send class="w-4 h-4" />
          {data.document.status === 'RETURNED' ? 'Resubmit' : 'Submit'}
        </button>
      {/if}
    </div>
  </header>

  <!-- Instructions & Feedback Banner -->
  {#if data.document.assignment.instructions || data.document.feedback}
    <div class="info-banner">
      {#if data.document.assignment.instructions}
        <div class="info-item">
          <div class="info-label">Instructions</div>
          <p class="info-text">{data.document.assignment.instructions}</p>
        </div>
      {/if}
      {#if data.document.feedback}
        <div class="info-item feedback">
          <div class="info-label">
            <AlertCircle class="w-4 h-4" />
            Teacher Feedback
          </div>
          <p class="info-text">{data.document.feedback}</p>
        </div>
      {/if}
      {#if data.document.grade !== null}
        <div class="info-item grade">
          <div class="info-label">
            <GraduationCap class="w-4 h-4" />
            Grade
          </div>
          <p class="info-text font-semibold">
            {data.document.grade}
            {#if data.document.assignment.points}
              / {data.document.assignment.points}
            {/if}
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Editor Container -->
  <div class="editor-container" class:with-sidebar={showOriginal}>
    <div class="editor-main">
      <RichTextEditor
        bind:content={content}
        disabled={!canEdit}
        onchange={handleContentChange}
        onsave={handleAutoSave}
        onactivity={handleEditorInput}
        autosave={canEdit}
        placeholder="Start writing your work..."
        showWordCount={true}
      />
    </div>

    {#if showOriginal}
      <aside class="original-sidebar">
        <div class="sidebar-header">
          <h3 class="font-medium text-gray-700">Original Document</h3>
        </div>
        <div class="sidebar-content prose prose-sm">
          {@html data.originalContent || '<p class="text-gray-400 italic">No content in original</p>'}
        </div>
      </aside>
    {/if}
  </div>
</div>

<!-- Submit Confirmation Modal -->
{#if showSubmitConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Send class="w-5 h-5 text-blue-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900">
          {data.document.status === 'RETURNED' ? 'Resubmit Work?' : 'Submit Work?'}
        </h3>
      </div>
      <p class="text-gray-600 mb-6">
        {#if data.document.status === 'RETURNED'}
          Your work will be sent back to your teacher for review.
        {:else}
          Once submitted, you won't be able to make changes unless your teacher returns it for revision.
        {/if}
      </p>
      <div class="flex justify-end gap-3">
        <button onclick={() => showSubmitConfirm = false} class="btn btn-secondary">
          Cancel
        </button>
        <button 
          onclick={submitWork} 
          disabled={submitting}
          class="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          {#if submitting}
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          {:else}
            <Send class="w-4 h-4" />
          {/if}
          {data.document.status === 'RETURNED' ? 'Resubmit' : 'Submit'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .document-page {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: #f8f9fa;
    overflow: hidden;
    z-index: 50;
  }

  .document-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #5f6368;
    transition: background-color 0.2s;
  }

  .back-button:hover {
    background: #f1f3f4;
  }

  .document-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: #10b981;
  }

  .document-title-section {
    min-width: 0;
    flex: 1;
  }

  .document-title-input {
    font-size: 18px;
    font-weight: 500;
    color: #202124;
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
    padding: 4px 8px;
    margin: -4px -8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .document-title-input:hover {
    background: #f1f3f4;
  }

  .document-title-input:focus {
    background: #e8f0fe;
  }

  .document-title {
    font-size: 18px;
    font-weight: 500;
    color: #202124;
    margin: 0;
    padding: 4px 0;
  }

  .document-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 12px;
    color: #5f6368;
    margin-top: 2px;
    padding-left: 8px;
  }

  .meta-separator {
    margin: 0 4px;
  }

  .save-indicator {
    font-size: 13px;
  }

  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .save-status.saving {
    color: #5f6368;
  }

  .save-status.saved {
    color: #188038;
  }

  .view-only-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f1f3f4;
    border-radius: 16px;
    font-size: 13px;
    color: #5f6368;
  }

  .submit-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    background: #3b82f6;
    color: white;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .submit-button:hover {
    background: #2563eb;
  }

  .info-banner {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .info-item {
    flex: 1;
    min-width: 200px;
  }

  .info-item.feedback {
    background: #fff7ed;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #fed7aa;
  }

  .info-item.grade {
    background: #ecfdf5;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #a7f3d0;
    flex: 0 0 auto;
  }

  .info-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .info-item.feedback .info-label {
    color: #c2410c;
  }

  .info-item.grade .info-label {
    color: #059669;
  }

  .info-text {
    font-size: 14px;
    color: #374151;
    margin: 0;
  }

  .editor-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-container.with-sidebar {
    gap: 0;
  }

  .editor-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  .original-sidebar {
    width: 350px;
    background: #fff;
    border-left: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #f9fafb;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  @media (max-width: 768px) {
    .original-sidebar {
      display: none;
    }
  }
</style>
