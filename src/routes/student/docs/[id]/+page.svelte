<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    ArrowLeft,
    FileText,
    Trash2,
    Check,
    Eye,
    BookOpen
  } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Local state for editing - initialize empty, will be set by effect
  let title = $state('');
  let content = $state('');
  let showDeleteConfirm = $state(false);

  let hasUnsavedChanges = $state(false);
  let saving = $state(false);
  let lastSaved = $state<Date | null>(null);

  // Track document ID for sync
  let lastDocId = $state('');

  // Initialize and sync when document changes
  $effect(() => {
    const docId = data.document.id;
    if (docId !== lastDocId) {
      title = data.document.title;
      content = data.document.content || '';
      lastDocId = docId;
    }
  });

  async function saveDocument() {
    if (!data.document.canEdit) return;
    
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
        goto('/student/docs');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
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
</script>

<svelte:head>
  <title>{title} | Documents | Checkmate</title>
</svelte:head>

<div class="document-page">
  <!-- Top Navigation Bar - Google Docs Style -->
  <header class="document-header">
    <div class="header-left">
      <a href="/student/docs" class="back-button" title="Back to Documents">
        <ArrowLeft class="w-5 h-5" />
      </a>
      
      <div class="document-icon" class:owned={data.document.isOwner} class:shared={!data.document.isOwner}>
        {#if data.document.isOwner}
          <FileText class="w-6 h-6" />
        {:else}
          <BookOpen class="w-6 h-6" />
        {/if}
      </div>

      <div class="document-title-section">
        {#if data.document.canEdit}
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
          {#if !data.document.isOwner}
            <span>Shared by {data.document.owner.name || data.document.owner.email}</span>
            <span class="meta-separator">·</span>
          {/if}
          <span>Last edited {new Date(data.document.updatedAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
          })}</span>
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

      {#if !data.document.canEdit}
        <span class="view-only-badge">
          <Eye class="w-4 h-4" />
          View only
        </span>
      {/if}

      {#if data.document.sharedVia}
        <span class="class-badge">
          <span class="text-base">{data.document.sharedVia.emoji || '📚'}</span>
          {data.document.sharedVia.name}
        </span>
      {/if}

      {#if data.document.isOwner}
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
  <div class="editor-container">
    <RichTextEditor
      bind:content={content}
      disabled={!data.document.canEdit}
      onchange={handleContentChange}
      onsave={handleAutoSave}
      autosave={data.document.canEdit}
      placeholder="Start writing your document..."
      showWordCount={true}
    />
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
  }

  .document-icon.owned {
    color: #10b981;
  }

  .document-icon.shared {
    color: #8b5cf6;
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

  /* Class Badge */
  .class-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f3e8ff;
    border-radius: 16px;
    font-size: 13px;
    color: #7c3aed;
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

  /* Editor Container - Takes remaining height */
  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

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

    .class-badge span:not(:first-child) {
      display: none;
    }
  }
</style>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
      <p class="text-gray-600 mb-6">
        This action cannot be undone. The document will be permanently deleted.
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
