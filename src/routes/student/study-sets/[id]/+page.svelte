<script lang="ts">
  import { ArrowLeft, Library, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let currentCardIndex = $state(0);
  let showBack = $state(false);
  let studyMode = $state(true);
  let shuffledCards = $state([...data.studySet.cards]);

  function nextCard() {
    if (currentCardIndex < shuffledCards.length - 1) {
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

  function shuffleCards() {
    shuffledCards = [...data.studySet.cards].sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    showBack = false;
  }

  const progressPercent = $derived(
    Math.round(((currentCardIndex + 1) / shuffledCards.length) * 100)
  );
</script>

<svelte:head>
  <title>{data.studySet.title} | Checkmate</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a href="/student/assignments" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Assignments
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
          <Library class="w-7 h-7 text-purple-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studySet.title}</h1>
          <p class="text-gray-500 mt-1">
            {data.class.emoji || '📚'} {data.class.name}
            {#if data.studySet.creator?.name}
              <span class="text-gray-300 mx-2">|</span>
              By {data.studySet.creator.name}
            {/if}
          </p>
          <p class="text-sm text-gray-500 mt-1">{data.studySet.cards.length} cards</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick={shuffleCards} class="btn btn-secondary">
          <Shuffle class="w-4 h-4" />
          Shuffle
        </button>
        <button onclick={() => studyMode = !studyMode} class="btn btn-primary">
          {studyMode ? 'View All' : 'Study Mode'}
        </button>
      </div>
    </div>
  </div>

  {#if studyMode}
    <!-- Progress bar -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-500">Progress</span>
        <span class="text-sm font-medium text-purple-600">{progressPercent}%</span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-purple-500 transition-all duration-300"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>

    <!-- Study Mode -->
    <div class="card p-8">
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-500">Card {currentCardIndex + 1} of {shuffledCards.length}</span>
        <button onclick={resetStudy} class="btn btn-ghost btn-sm">
          <RotateCcw class="w-4 h-4" />
          Reset
        </button>
      </div>

      <!-- Flashcard -->
      <button
        onclick={() => showBack = !showBack}
        class="w-full min-h-[280px] p-8 rounded-xl border-2 transition-all duration-300 flex items-center justify-center text-center
          {showBack ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 bg-white'}"
      >
        <div>
          <div class="text-xs font-semibold mb-4 {showBack ? 'text-purple-500' : 'text-gray-400'}">
            {showBack ? '💡 ANSWER' : '❓ QUESTION'}
          </div>
          <p class="text-xl font-medium text-gray-900">
            {showBack ? shuffledCards[currentCardIndex]?.back : shuffledCards[currentCardIndex]?.front}
          </p>
          {#if !showBack}
            <p class="text-sm text-gray-400 mt-6">Click to reveal answer</p>
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

        <div class="flex gap-1">
          {#each shuffledCards as _, idx}
            <button
              onclick={() => { currentCardIndex = idx; showBack = false; }}
              class="w-2 h-2 rounded-full transition-colors {idx === currentCardIndex ? 'bg-purple-500' : 'bg-gray-300 hover:bg-gray-400'}"
            ></button>
          {/each}
        </div>

        <button
          onclick={nextCard}
          disabled={currentCardIndex === shuffledCards.length - 1}
          class="btn btn-secondary"
        >
          Next
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Keyboard hints -->
    <p class="text-center text-sm text-gray-400 mt-4">
      Click card to flip • Use arrows to navigate
    </p>
  {:else}
    <!-- All Cards View -->
    <div class="space-y-3">
      {#each data.studySet.cards as card, index}
        <div class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <div class="grid md:grid-cols-2 gap-4 flex-1">
              <div>
                <div class="text-xs text-gray-500 mb-1 font-medium">Front</div>
                <p class="font-medium text-gray-900">{card.front}</p>
              </div>
              <div>
                <div class="text-xs text-gray-500 mb-1 font-medium">Back</div>
                <p class="text-gray-600">{card.back}</p>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
