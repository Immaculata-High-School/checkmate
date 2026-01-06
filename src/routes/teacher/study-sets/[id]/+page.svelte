<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, BookOpen, Trash2, AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let showDeleteConfirm = $state(false);
  let currentCardIndex = $state(0);
  let showBack = $state(false);
  let studyMode = $state(false);

  function nextCard() {
    if (currentCardIndex < data.studySet.cards.length - 1) {
      currentCardIndex++;
      showBack = false;
    }
  }

  function prevCard() {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      showBack = false;
    }
  }

  function resetStudy() {
    currentCardIndex = 0;
    showBack = false;
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a href="/teacher/study-sets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Sets
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studySet.title}</h1>
          {#if data.studySet.description}
            <p class="text-gray-600">{data.studySet.description}</p>
          {/if}
          <p class="text-sm text-gray-500 mt-1">{data.studySet.cards.length} cards</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick={() => studyMode = !studyMode} class="btn btn-primary">
          {studyMode ? 'View All' : 'Study Mode'}
        </button>
        <button onclick={() => showDeleteConfirm = true} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  {#if studyMode}
    <!-- Study Mode -->
    <div class="card p-8">
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-500">Card {currentCardIndex + 1} of {data.studySet.cards.length}</span>
        <button onclick={resetStudy} class="btn btn-ghost btn-sm">
          <RotateCcw class="w-4 h-4" />
          Reset
        </button>
      </div>

      <!-- Flashcard -->
      <button
        onclick={() => showBack = !showBack}
        class="w-full min-h-[250px] p-8 rounded-xl border-2 border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center text-center"
      >
        <div>
          <div class="text-xs text-gray-400 mb-4">{showBack ? 'BACK' : 'FRONT'}</div>
          <p class="text-xl font-medium text-gray-900">
            {showBack ? data.studySet.cards[currentCardIndex]?.back : data.studySet.cards[currentCardIndex]?.front}
          </p>
          {#if !showBack}
            <p class="text-sm text-gray-400 mt-4">Click to reveal answer</p>
          {/if}
        </div>
      </button>

      <!-- Navigation -->
      <div class="flex items-center justify-between mt-6">
        <button
          onclick={prevCard}
          disabled={currentCardIndex === 0}
          class="btn btn-secondary"
        >
          <ChevronLeft class="w-4 h-4" />
          Previous
        </button>
        <button
          onclick={nextCard}
          disabled={currentCardIndex === data.studySet.cards.length - 1}
          class="btn btn-secondary"
        >
          Next
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  {:else}
    <!-- All Cards View -->
    <div class="space-y-3">
      {#each data.studySet.cards as card, index}
        <div class="card p-4">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-gray-500 mb-1">Front</div>
              <p class="font-medium text-gray-900">{card.front}</p>
            </div>
            <div>
              <div class="text-xs text-gray-500 mb-1">Back</div>
              <p class="text-gray-600">{card.back}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showDeleteConfirm = false}>
    <div class="card p-6 max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Study Set</h3>
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
