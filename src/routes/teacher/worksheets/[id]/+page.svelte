<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, ClipboardList, Printer, Trash2, AlertCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let showDeleteConfirm = $state(false);

  function print() {
    window.print();
  }
</script>

<svelte:head>
  <style>
    @media print {
      nav, header, .no-print { display: none !important; }
      .print-only { display: block !important; }
      body { background: white !important; }
    }
  </style>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-6 no-print">
    <a href="/teacher/worksheets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Worksheets
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <ClipboardList class="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.worksheet.title}</h1>
          {#if data.worksheet.description}
            <p class="text-gray-600">{data.worksheet.description}</p>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2">
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

  <!-- Printable Worksheet -->
  <div class="card p-8">
    <div class="text-center mb-8 border-b pb-6">
      <h2 class="text-xl font-bold text-gray-900 mb-2">{data.worksheet.title}</h2>
      <div class="flex justify-between text-sm text-gray-500">
        <span>Name: ________________________</span>
        <span>Date: ____________</span>
      </div>
    </div>

    <div class="space-y-6">
      {#each data.worksheet.items as item, index}
        <div class="flex gap-4">
          <span class="font-bold text-gray-500 w-8">{index + 1}.</span>
          <div class="flex-1">
            <p class="text-gray-900 mb-4">{item.content}</p>

            {#if item.type === 'SHORT_ANSWER' || item.type === 'PROBLEM'}
              <div class="border-b border-gray-300 h-8"></div>
              <div class="border-b border-gray-300 h-8 mt-2"></div>
            {:else if item.type === 'FILL_IN_BLANK'}
              <!-- Blank space included in content -->
            {:else}
              <div class="border-b border-gray-300 h-6"></div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Answer Key (no-print) -->
  <div class="card p-6 mt-6 no-print">
    <h3 class="font-semibold text-gray-900 mb-4">Answer Key</h3>
    <div class="grid md:grid-cols-2 gap-3">
      {#each data.worksheet.items as item, index}
        <div class="flex gap-2 text-sm">
          <span class="font-bold text-gray-500">{index + 1}.</span>
          <span class="text-green-600">{item.answer || 'Varies'}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print" onclick={() => showDeleteConfirm = false}>
    <div class="card p-6 max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Worksheet</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <div class="flex gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary flex-1">Cancel</button>
        <form method="POST" action="?/delete" use:enhance class="flex-1">
          <button type="submit" class="btn btn-primary w-full bg-red-600 hover:bg-red-700">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
