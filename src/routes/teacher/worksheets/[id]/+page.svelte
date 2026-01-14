<script lang="ts">
  import { enhance } from '$app/forms';
  import { 
    ArrowLeft, 
    ClipboardList, 
    Printer, 
    Trash2, 
    AlertCircle,
    FileText,
    Calculator,
    PenLine,
    CheckSquare,
    ArrowLeftRight,
    BookOpen,
    Eye,
    EyeOff,
    Download
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let showDeleteConfirm = $state(false);
  let showAnswerKey = $state(true);
  let printWithAnswers = $state(false);

  const itemTypeIcons: Record<string, any> = {
    'PROBLEM': Calculator,
    'FILL_BLANK': PenLine,
    'SHORT_ANSWER': FileText,
    'MATCHING': ArrowLeftRight,
    'WORD_PROBLEM': BookOpen,
    'FILL_IN_BLANK': PenLine
  };

  const itemTypeLabels: Record<string, string> = {
    'PROBLEM': 'Problem',
    'FILL_BLANK': 'Fill in the Blank',
    'SHORT_ANSWER': 'Short Answer',
    'MATCHING': 'Matching',
    'WORD_PROBLEM': 'Word Problem',
    'FILL_IN_BLANK': 'Fill in the Blank'
  };

  function print() {
    window.print();
  }

  function getItemIcon(type: string) {
    return itemTypeIcons[type] || FileText;
  }
</script>

<svelte:head>
  <title>{data.worksheet.title} - Worksheet</title>
  <style>
    @media print {
      @page {
        size: letter;
        margin: 0.75in;
      }
      
      nav, header, .no-print, footer { 
        display: none !important; 
      }
      
      .print-only { 
        display: block !important; 
      }
      
      body { 
        background: white !important;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        color: #000 !important;
      }
      
      .worksheet-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .worksheet-card {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      
      .worksheet-item {
        page-break-inside: avoid;
        margin-bottom: 18pt;
      }
      
      .worksheet-header {
        margin-bottom: 24pt;
        padding-bottom: 12pt;
        border-bottom: 2pt solid #000;
      }
      
      .worksheet-title {
        font-size: 16pt !important;
        font-weight: bold !important;
        margin-bottom: 8pt;
      }
      
      .answer-line {
        border-bottom: 1pt solid #666;
        height: 24pt;
        margin-top: 6pt;
      }
      
      .answer-box {
        border: 1pt solid #666;
        min-height: 48pt;
        margin-top: 6pt;
      }
      
      .print-answer-section {
        page-break-before: always;
        padding-top: 24pt;
      }
    }
    
    @media screen {
      .print-only {
        display: none;
      }
    }
  </style>
</svelte:head>

<div class="max-w-4xl mx-auto worksheet-container">
  <!-- Screen Header -->
  <div class="mb-6 no-print">
    <a href="/teacher/worksheets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Worksheets
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <ClipboardList class="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.worksheet.title}</h1>
          {#if data.worksheet.description}
            <p class="text-gray-600">{data.worksheet.description}</p>
          {/if}
          <p class="text-sm text-gray-500 mt-1">{data.worksheet.items.length} items</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button 
          onclick={() => showAnswerKey = !showAnswerKey} 
          class="btn btn-secondary"
          title={showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}
        >
          {#if showAnswerKey}
            <EyeOff class="w-4 h-4" />
          {:else}
            <Eye class="w-4 h-4" />
          {/if}
          Answers
        </button>
        <button onclick={print} class="btn btn-primary">
          <Printer class="w-4 h-4" />
          Print
        </button>
        <button onclick={() => showDeleteConfirm = true} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Print Options (no-print) -->
  <div class="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between no-print">
    <span class="text-sm text-slate-600">Print settings:</span>
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" bind:checked={printWithAnswers} class="rounded" />
      <span>Include answer key when printing</span>
    </label>
  </div>

  <!-- Printable Worksheet -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 worksheet-card">
    <!-- Worksheet Header -->
    <div class="worksheet-header border-b-2 border-gray-900 pb-4 mb-6">
      <h2 class="worksheet-title text-xl font-bold text-gray-900 text-center mb-4">{data.worksheet.title}</h2>
      <div class="flex justify-between items-center text-sm text-gray-600">
        <div class="flex items-center gap-1">
          <span class="font-medium">Name:</span>
          <span class="inline-block border-b border-gray-400 w-48"></span>
        </div>
        <div class="flex items-center gap-1">
          <span class="font-medium">Date:</span>
          <span class="inline-block border-b border-gray-400 w-24"></span>
        </div>
        <div class="flex items-center gap-1">
          <span class="font-medium">Period:</span>
          <span class="inline-block border-b border-gray-400 w-12"></span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="mb-6 text-sm text-gray-600 italic">
      <p><strong>Directions:</strong> Complete each item below. Show all work where applicable.</p>
    </div>

    <!-- Worksheet Items -->
    <div class="space-y-6">
      {#each data.worksheet.items as item, index}
        {@const IconComponent = getItemIcon(item.type)}
        <div class="worksheet-item">
          <div class="flex gap-3">
            <!-- Item Number -->
            <div class="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-700 print:bg-transparent print:border print:border-slate-400">
              {index + 1}
            </div>
            
            <!-- Item Content -->
            <div class="flex-1">
              <!-- Type indicator (screen only) -->
              <div class="flex items-center gap-2 mb-2 text-xs text-slate-500 no-print">
                <IconComponent class="w-3.5 h-3.5" />
                <span>{itemTypeLabels[item.type] || item.type}</span>
              </div>
              
              <!-- Question/Problem -->
              <p class="text-gray-900 leading-relaxed">{item.content}</p>

              <!-- Answer Space -->
              {#if item.type === 'SHORT_ANSWER' || item.type === 'LONG_ANSWER'}
                <div class="mt-3 space-y-2">
                  <div class="answer-line border-b border-gray-300 h-6"></div>
                  <div class="answer-line border-b border-gray-300 h-6"></div>
                  <div class="answer-line border-b border-gray-300 h-6"></div>
                </div>
              {:else if item.type === 'PROBLEM'}
                <div class="mt-3 answer-box border border-gray-300 rounded h-16 bg-slate-50/50 print:bg-transparent"></div>
              {:else if item.type === 'FILL_IN_BLANK'}
                <!-- Blank is inline with content -->
              {:else if item.type === 'MULTIPLE_CHOICE'}
                <div class="mt-3">
                  <div class="answer-line border-b border-gray-300 h-6"></div>
                </div>
              {:else}
                <div class="mt-3">
                  <div class="answer-line border-b border-gray-300 h-6"></div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Print Answer Key -->
    {#if printWithAnswers}
      <div class="print-answer-section mt-12 pt-8 border-t-2 border-gray-900 print-only">
        <h3 class="text-lg font-bold text-center mb-6 pb-3 border-b border-gray-300">Answer Key</h3>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {#each data.worksheet.items as item, index}
            <div class="flex gap-2 py-1">
              <span class="font-bold text-gray-600 w-6">{index + 1}.</span>
              <span class="text-gray-900">{item.answer || '(Varies)'}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Answer Key (screen only) -->
  {#if showAnswerKey}
    <div class="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 no-print">
      <div class="flex items-center gap-2 mb-4">
        <CheckSquare class="w-5 h-5 text-slate-600" />
        <h3 class="font-semibold text-gray-900">Answer Key</h3>
      </div>
      <div class="grid md:grid-cols-2 gap-x-6 gap-y-2">
        {#each data.worksheet.items as item, index}
          <div class="flex gap-3 py-2 border-b border-gray-100 last:border-0">
            <span class="font-bold text-slate-500 w-6 text-right">{index + 1}.</span>
            {#if item.answer}
              <span class="text-gray-900 flex-1">{item.answer}</span>
            {:else}
              <span class="text-gray-400 italic flex-1">Answer varies</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print" role="dialog" aria-modal="true">
    <div class="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Worksheet</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <p class="text-gray-600 mb-4">Are you sure you want to delete "{data.worksheet.title}"?</p>
      <div class="flex gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary flex-1">Cancel</button>
        <form method="POST" action="?/delete" use:enhance class="flex-1">
          <button type="submit" class="btn w-full bg-red-600 hover:bg-red-700 text-white">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
