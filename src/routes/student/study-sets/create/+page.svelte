<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, Library, Plus, Trash2, AlertCircle } from 'lucide-svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let title = $state('');
  let description = $state('');
  let cards = $state<{ front: string; back: string }[]>([
    { front: '', back: '' },
    { front: '', back: '' },
    { front: '', back: '' }
  ]);

  function addCard() {
    cards = [...cards, { front: '', back: '' }];
  }

  function removeCard(index: number) {
    if (cards.length > 1) {
      cards = cards.filter((_, i) => i !== index);
    }
  }

  const validCards = $derived(cards.filter(c => c.front.trim() && c.back.trim()));
</script>

<svelte:head>
  <title>Create Study Set | Checkmate</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/student/study-sets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Sets
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <Library class="w-5 h-5 text-purple-600" />
      </div>
      Create Study Set
    </h1>
    <p class="text-gray-600 mt-2 ml-13">Create your own flashcards to study</p>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  <form method="POST" use:enhance class="space-y-6">
    <!-- Title & Description -->
    <div class="card p-6">
      <div class="form-group">
        <label for="title" class="label">Title</label>
        <input 
          id="title" 
          name="title" 
          type="text" 
          required 
          bind:value={title}
          class="input" 
          placeholder="e.g., Spanish Vocabulary, Biology Terms..."
        />
      </div>
      <div class="form-group mt-4">
        <label for="description" class="label">Description (Optional)</label>
        <textarea 
          id="description" 
          name="description" 
          rows="2" 
          bind:value={description}
          class="input"
          placeholder="What is this study set about?"
        ></textarea>
      </div>
    </div>

    <!-- Cards -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-semibold text-gray-900">Flashcards</h3>
          <p class="text-sm text-gray-500">{validCards.length} card{validCards.length !== 1 ? 's' : ''} ready</p>
        </div>
        <button type="button" onclick={addCard} class="btn btn-secondary btn-sm">
          <Plus class="w-4 h-4" />
          Add Card
        </button>
      </div>

      <div class="space-y-4">
        {#each cards as card, index}
          <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-gray-500">Card {index + 1}</span>
              <button
                type="button"
                onclick={() => removeCard(index)}
                disabled={cards.length === 1}
                class="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <span class="block text-xs text-gray-500 mb-1">Front (Term)</span>
                <input
                  type="text"
                  bind:value={card.front}
                  class="input"
                  placeholder="Enter term or question"
                />
              </div>
              <div>
                <span class="block text-xs text-gray-500 mb-1">Back (Definition)</span>
                <input
                  type="text"
                  bind:value={card.back}
                  class="input"
                  placeholder="Enter definition or answer"
                />
              </div>
            </div>
          </div>
        {/each}
      </div>

      <button 
        type="button" 
        onclick={addCard}
        class="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus class="w-4 h-4" />
        Add Another Card
      </button>

      <input type="hidden" name="cards" value={JSON.stringify(cards)} />
    </div>

    <!-- Submit -->
    <div class="flex gap-3">
      <a href="/student/study-sets" class="btn btn-secondary">Cancel</a>
      <button 
        type="submit" 
        disabled={!title || validCards.length === 0}
        class="btn btn-primary flex-1"
      >
        <Library class="w-4 h-4" />
        Create Study Set ({validCards.length} cards)
      </button>
    </div>
  </form>
</div>
