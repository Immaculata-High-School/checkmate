<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import {
    ArrowLeft,
    FileText,
    Share2,
    Trash2,
    Users,
    X,
    Check,
    AlertCircle,
    Lock,
    Globe,
    Eye,
    Edit3,
    UserPlus,
    Building2,
    Sparkles,
    Send,
    Loader2,
    Wand2
  } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Derive canEdit from data - this will reactively update
  let canEdit = $derived(data.document.canEdit);
  let isOwner = $derived(data.document.isOwner);

  // Local state for editing
  let title = $state(data.document.title);
  let content = $state(data.document.content || '');
  let showShareModal = $state(data.showShareModal || false);
  let showDeleteConfirm = $state(false);
  let shareEmail = $state('');
  let shareCanEdit = $state(false);
  let shareError = $state('');
  let sharing = $state(false);
  let selectedClassId = $state('');

  let hasUnsavedChanges = $state(false);
  let saving = $state(false);
  let lastSaved = $state<Date | null>(null);

  // AI Writing Assistant state
  let showAIPanel = $state(false);
  let aiPrompt = $state('');
  let aiLoading = $state(false);
  let aiError = $state('');
  let aiResponse = $state('');

  async function saveDocument() {
    if (!canEdit) return;
    
    saving = true;
    try {
      const res = await fetch(`/api/docs/${data.document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (res.ok) {
        hasUnsavedChanges = false;
        lastSaved = new Date();
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      saving = false;
    }
  }

  async function deleteDocument() {
    try {
      const res = await fetch(`/api/docs/${data.document.id}`, { method: 'DELETE' });
      if (res.ok) {
        goto('/teacher/docs');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function shareWithUser() {
    if (!shareEmail.trim()) {
      shareError = 'Please enter an email address';
      return;
    }

    sharing = true;
    shareError = '';

    try {
      const res = await fetch(`/api/docs/${data.document.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: shareEmail, canEdit: shareCanEdit })
      });

      if (res.ok) {
        shareEmail = '';
        shareCanEdit = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        shareError = err.message || 'Failed to share document';
      }
    } catch (err) {
      shareError = 'Failed to share document';
    } finally {
      sharing = false;
    }
  }

  async function removeUserShare(userId: string) {
    try {
      await fetch(`/api/docs/${data.document.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      await invalidateAll();
    } catch (err) {
      console.error('Failed to remove share:', err);
    }
  }

  async function shareWithClass() {
    if (!selectedClassId) return;

    try {
      const res = await fetch(`/api/docs/${data.document.id}/share-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId, canEdit: false })
      });

      if (res.ok) {
        selectedClassId = '';
        await invalidateAll();
      }
    } catch (err) {
      console.error('Failed to share with class:', err);
    }
  }

  async function removeClassShare(classId: string) {
    try {
      await fetch(`/api/docs/${data.document.id}/share-class`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      });
      await invalidateAll();
    } catch (err) {
      console.error('Failed to remove class share:', err);
    }
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDocument();
    }
  }

  // Auto-save handler from editor
  function handleAutoSave() {
    saveDocument();
  }

  function handleContentChange(newContent: string) {
    content = newContent;
  }

  // Available classes for sharing (not already shared)
  const availableClasses = $derived(
    data.classes.filter(c => !data.document.classShares.some(cs => cs.classId === c.id))
  );

  // AI Writing Assistant state - moved here with job system
  let aiJobId = $state<string | null>(null);
  let aiProgress = $state(0);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // AI Writing Assistant functions
  async function sendAIRequest() {
    if (!aiPrompt.trim() || aiLoading) return;
    
    aiLoading = true;
    aiError = '';
    aiResponse = '';
    aiProgress = 0;
    
    try {
      // Start the job
      const res = await fetch('/api/ai/writing-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentContent: content,
          title: title,
          documentId: data.document.id
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to start AI job');
      }
      
      const result = await res.json();
      aiJobId = result.jobId;
      
      // Start polling for job status
      pollInterval = setInterval(pollJobStatus, 1000);
    } catch (err) {
      aiError = err instanceof Error ? err.message : 'Something went wrong';
      aiLoading = false;
    }
  }

  async function pollJobStatus() {
    if (!aiJobId) return;
    
    try {
      const res = await fetch(`/api/ai/writing-assistant?jobId=${aiJobId}`);
      if (!res.ok) {
        throw new Error('Failed to check job status');
      }
      
      const result = await res.json();
      aiProgress = result.progress || 0;
      
      if (result.status === 'COMPLETED') {
        // Job finished successfully
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        aiResponse = result.output?.content || '';
        aiLoading = false;
        aiJobId = null;
      } else if (result.status === 'FAILED') {
        // Job failed
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        aiError = result.error || 'AI generation failed';
        aiLoading = false;
        aiJobId = null;
      }
      // If still PENDING or RUNNING, continue polling
    } catch (err) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      aiError = err instanceof Error ? err.message : 'Failed to check status';
      aiLoading = false;
      aiJobId = null;
    }
  }

  function insertAIContent() {
    if (aiResponse) {
      content = content + aiResponse;
      aiResponse = '';
      aiPrompt = '';
      saveDocument();
    }
  }

  function replaceWithAIContent() {
    if (aiResponse) {
      content = aiResponse;
      aiResponse = '';
      aiPrompt = '';
      saveDocument();
    }
  }

  const aiQuickActions = [
    { label: 'Continue writing', prompt: 'Continue writing from where I left off, maintaining the same tone and style.' },
    { label: 'Make it more formal', prompt: 'Rewrite the content in a more formal, professional tone.' },
    { label: 'Simplify language', prompt: 'Simplify the language to make it easier to understand.' },
    { label: 'Add more detail', prompt: 'Expand on the current content with more details and examples.' },
    { label: 'Summarize', prompt: 'Write a concise summary of the current content.' },
    { label: 'Fix grammar', prompt: 'Fix any grammar, spelling, or punctuation errors.' }
  ];

  // Clean up polling on component destroy
  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });
</script>

<svelte:head>
  <title>{title} | Documents | Checkmate</title>
</svelte:head>

<div class="document-page">
  <!-- Top Navigation Bar - Google Docs Style -->
  <header class="document-header">
    <div class="header-left">
      <a href="/teacher/docs" class="back-button" title="Back to Documents">
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
          <span>Created by {data.document.owner.name || data.document.owner.email}</span>
          <span class="meta-separator">·</span>
          <span>Last edited {new Date(data.document.updatedAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
          })}</span>
          {#if data.document.classShares.length > 0}
            <span class="meta-separator">·</span>
            <span class="flex items-center gap-1">
              <Users class="w-3 h-3" />
              {data.document.classShares.length} class{data.document.classShares.length !== 1 ? 'es' : ''}
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

      {#if !canEdit}
        <span class="view-only-badge">
          <Eye class="w-4 h-4" />
          View only
        </span>
      {/if}

      {#if canEdit}
        <button
          onclick={() => showAIPanel = !showAIPanel}
          class="ai-button"
          class:active={showAIPanel}
          title="AI Writing Assistant"
        >
          <Sparkles class="w-4 h-4" />
          <span class="hidden sm:inline">AI</span>
        </button>
      {/if}

      {#if isOwner}
        <button
          onclick={() => showShareModal = true}
          class="share-button"
        >
          <Share2 class="w-4 h-4" />
          Share
        </button>

        <button
          onclick={() => showDeleteConfirm = true}
          class="delete-button"
          title="Delete document"
        >
          <Trash2 class="w-5 h-5" />
        </button>
      {/if}
    </div>
  </header>

  <!-- Editor Container - Full Height -->
  <div class="editor-container" class:with-ai-panel={showAIPanel}>
    <div class="editor-main">
      <RichTextEditor
        bind:content={content}
        disabled={!canEdit}
        onchange={handleContentChange}
        onsave={handleAutoSave}
        autosave={canEdit}
        placeholder="Start writing your document..."
        showWordCount={true}
      />
    </div>

    <!-- AI Writing Assistant Panel -->
    {#if showAIPanel && canEdit}
      <aside class="ai-panel">
        <div class="ai-panel-header">
          <div class="flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-purple-500" />
            <span class="font-semibold text-gray-900">AI Writing Assistant</span>
          </div>
          <button onclick={() => showAIPanel = false} class="p-1 hover:bg-gray-100 rounded">
            <X class="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div class="ai-panel-body">
          {#if !aiResponse}
            <!-- Quick actions -->
            <div class="ai-quick-actions">
              <p class="text-xs text-gray-500 mb-2">Quick actions:</p>
              <div class="flex flex-wrap gap-1">
                {#each aiQuickActions as action}
                  <button
                    onclick={() => { aiPrompt = action.prompt; sendAIRequest(); }}
                    class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                    disabled={aiLoading}
                  >
                    {action.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Custom prompt -->
            <div class="ai-input-section">
              <label class="text-xs font-medium text-gray-700 mb-1 block">Or describe what you want:</label>
              <textarea
                bind:value={aiPrompt}
                placeholder="e.g., Write an introduction about climate change..."
                class="ai-textarea"
                rows="3"
                disabled={aiLoading}
              ></textarea>
              <button
                onclick={sendAIRequest}
                disabled={!aiPrompt.trim() || aiLoading}
                class="ai-send-btn"
              >
                {#if aiLoading}
                  <Loader2 class="w-4 h-4 animate-spin" />
                  {aiProgress > 0 ? `${aiProgress}%` : 'Starting...'}
                {:else}
                  <Wand2 class="w-4 h-4" />
                  Generate
                {/if}
              </button>

              {#if aiLoading && aiProgress > 0}
                <div class="ai-progress-bar">
                  <div class="ai-progress-fill" style="width: {aiProgress}%"></div>
                </div>
              {/if}
            </div>

            {#if aiError}
              <div class="ai-error">
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                {aiError}
              </div>
            {/if}
          {:else}
            <!-- AI Response -->
            <div class="ai-response">
              <p class="text-xs font-medium text-gray-700 mb-2">Generated content:</p>
              <div class="ai-response-content">
                {@html aiResponse}
              </div>
              <div class="ai-response-actions">
                <button onclick={insertAIContent} class="ai-action-btn primary">
                  <Check class="w-4 h-4" />
                  Insert at end
                </button>
                <button onclick={replaceWithAIContent} class="ai-action-btn secondary">
                  Replace all
                </button>
                <button onclick={() => { aiResponse = ''; }} class="ai-action-btn danger">
                  <X class="w-4 h-4" />
                  Discard
                </button>
              </div>
            </div>
          {/if}
        </div>

        <div class="ai-panel-footer">
          <p class="text-xs text-gray-400">Jobs appear in Compute Jobs page</p>
        </div>
      </aside>
    {/if}
  </div>
</div>

<style>
  .document-page {
    /* Position fixed to take over the entire viewport, overlaying the layout */
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

  /* Header Styles - Google Docs Inspired */
  .document-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 100;
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
    color: #4285f4;
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
    font-size: 12px;
    color: #5f6368;
    margin-top: 2px;
    padding-left: 8px;
  }

  .meta-separator {
    margin: 0 6px;
  }

  /* Save Status */
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

  /* View Only Badge */
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

  /* Share Button - Google Docs Blue */
  .share-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    background: #1a73e8;
    color: white;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .share-button:hover {
    background: #1557b0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  /* Delete Button */
  .delete-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #5f6368;
    transition: all 0.2s;
  }

  .delete-button:hover {
    background: #fce8e6;
    color: #c5221f;
  }

  /* AI Button */
  .ai-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    color: white;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(139, 92, 246, 0.3);
  }

  .ai-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  .ai-button.active {
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  }

  /* Editor Container - Takes remaining height */
  .editor-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-container.with-ai-panel {
    gap: 0;
  }

  .editor-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  /* AI Panel */
  .ai-panel {
    width: 340px;
    background: #fff;
    border-left: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .ai-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .ai-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .ai-panel-footer {
    padding: 12px 16px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    text-align: center;
  }

  .ai-quick-actions {
    margin-bottom: 16px;
  }

  .ai-input-section {
    margin-top: 12px;
  }

  .ai-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 13px;
    resize: none;
    transition: border-color 0.2s;
  }

  .ai-textarea:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  .ai-send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin-top: 10px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    color: white;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .ai-send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  .ai-send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .ai-progress-bar {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }

  .ai-progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .ai-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 13px;
  }

  .ai-response {
    margin-top: 8px;
  }

  .ai-response-content {
    max-height: 300px;
    overflow-y: auto;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
  }

  .ai-response-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .ai-action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .ai-action-btn.primary {
    background: #8b5cf6;
    color: white;
  }

  .ai-action-btn.primary:hover {
    background: #7c3aed;
  }

  .ai-action-btn.secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .ai-action-btn.secondary:hover {
    background: #d1d5db;
  }

  .ai-action-btn.danger {
    background: #fee2e2;
    color: #dc2626;
  }

  .ai-action-btn.danger:hover {
    background: #fecaca;
  }

  /* Hide scrollbar for webkit browsers on editor container */
  .editor-container :global(.document-editor) {
    flex: 1;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .document-header {
      padding: 8px 12px;
    }

    .document-meta {
      display: none;
    }

    .document-title-input,
    .document-title {
      font-size: 16px;
    }

    .share-button span:not(:first-child) {
      display: none;
    }

    .share-button {
      padding: 8px 12px;
    }
  }
</style>

<!-- Share Modal -->
{#if showShareModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Share2 class="w-5 h-5 text-indigo-500" />
            Share Document
          </h2>
          <button onclick={() => showShareModal = false} class="p-2 hover:bg-gray-100 rounded-lg">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div class="p-6 space-y-6">
        <!-- Share with user -->
        <div>
          <h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <UserPlus class="w-4 h-4" />
            Share with a person
          </h3>
          
          {#if shareError}
            <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              {shareError}
            </div>
          {/if}

          <div class="flex gap-2">
            <input
              type="email"
              bind:value={shareEmail}
              placeholder="Enter email address..."
              class="input flex-1"
            />
            <button onclick={shareWithUser} disabled={sharing} class="btn btn-primary">
              {#if sharing}
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                Share
              {/if}
            </button>
          </div>

          <label class="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <input type="checkbox" bind:checked={shareCanEdit} class="rounded border-gray-300" />
            Allow editing
          </label>
        </div>

        <!-- Share with class -->
        {#if availableClasses.length > 0}
          <div>
            <h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Building2 class="w-4 h-4" />
              Share with a class
            </h3>
            <div class="flex gap-2">
              <select bind:value={selectedClassId} class="input flex-1">
                <option value="">Select a class...</option>
                {#each availableClasses as cls}
                  <option value={cls.id}>{cls.emoji} {cls.name}</option>
                {/each}
              </select>
              <button onclick={shareWithClass} disabled={!selectedClassId} class="btn btn-primary">
                Share
              </button>
            </div>
          </div>
        {/if}

        <!-- Current shares -->
        {#if data.document.shares.length > 0 || data.document.classShares.length > 0}
          <div>
            <h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users class="w-4 h-4" />
              Shared with
            </h3>

            <div class="space-y-2">
              {#each data.document.shares as share}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                      {(share.user.name || share.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 text-sm">{share.user.name || share.user.email}</div>
                      <div class="text-xs text-gray-500">{share.user.email}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded-full {share.canEdit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                      {share.canEdit ? 'Can edit' : 'View only'}
                    </span>
                    <button
                      onclick={() => removeUserShare(share.userId)}
                      class="p-1 hover:bg-gray-200 rounded"
                    >
                      <X class="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              {/each}

              {#each data.document.classShares as share}
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-lg">
                      {share.class.emoji || '📚'}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 text-sm">{share.class.name}</div>
                      <div class="text-xs text-gray-500">Entire class</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      View only
                    </span>
                    <button
                      onclick={() => removeClassShare(share.classId)}
                      class="p-1 hover:bg-gray-200 rounded"
                    >
                      <X class="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="p-6 border-t border-gray-200 bg-gray-50">
        <button onclick={() => showShareModal = false} class="btn btn-secondary w-full">
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
      <p class="text-gray-600 mb-6">
        This action cannot be undone. The document and all its shares will be permanently deleted.
      </p>
      <div class="flex justify-end gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary">
          Cancel
        </button>
        <button onclick={deleteDocument} class="btn bg-red-600 text-white hover:bg-red-700">
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}
