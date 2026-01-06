<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    BookOpen,
    Sparkles,
    Plus,
    Trash2,
    Loader2,
    AlertCircle
  } from 'lucide-svelte';
  import type { ActionData, PageData } from './$types';

  let { form, data }: { form: ActionData; data: PageData } = $props();

  // Check if we're continuing from a saved job
  const savedJob = data.savedJob;
  const savedOutput = savedJob?.output;

  let selectedClassId = $state('');

  let mode = $state<'choose' | 'ai' | 'manual'>(savedOutput ? 'ai' : 'choose');
  let step = $state<'configure' | 'review'>(savedOutput ? 'review' : 'configure');
  let loading = $state(false);
  let cards = $state<any[]>(form?.cards || savedOutput?.cards || []);
  let currentJobId = $state<string | undefined>(form?.jobId || savedJob?.id);

  // AI form values
  let topic = $state(savedOutput?.topic || '');
  let numberOfCards = $state(savedOutput?.numberOfCards || 20);

  // Manual form values
  let manualTitle = $state('');
  let manualDescription = $state('');
  let manualCards = $state<{ front: string; back: string }[]>([
    { front: '', back: '' }
  ]);

  function addManualCard() {
    manualCards = [...manualCards, { front: '', back: '' }];
  }

  function removeManualCard(index: number) {
    manualCards = manualCards.filter((_, i) => i !== index);
  }

  function removeCard(index: number) {
    cards = cards.filter((_, i) => i !== index);
  }

  $effect(() => {
    if (form?.cards) {
      cards = form.cards;
      step = 'review';
      currentJobId = form.jobId;
    }
  });
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <a href="/teacher/study-sets" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Study Sets
    </a>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
        <BookOpen class="w-5 h-5 text-amber-600" />
      </div>
      Create Study Set
    </h1>
  </div>

  {#if form?.error}
    <div class="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p class="text-red-700">{form.error}</p>
    </div>
  {/if}

  {#if data.classes.length === 0}
    <!-- No Classes Prompt -->
    <div class="card p-8 text-center">
      <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen class="w-8 h-8 text-yellow-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Create a Class First</h2>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">
        Before you can create a study set, you need to have at least one class to assign it to.
      </p>
      <a href="/teacher/classes/create" class="btn btn-primary">
        <Plus class="w-5 h-5" />
        Create Your First Class
      </a>
    </div>
  {:else if mode === 'choose'}
    <!-- Choose Mode -->
    <div class="grid md:grid-cols-2 gap-6">
      <button onclick={() => mode = 'ai'} class="card p-8 text-left hover:border-purple-300 transition-colors">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
          <Sparkles class="w-7 h-7 text-purple-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Generate with AI</h3>
        <p class="text-gray-600">
          Enter a topic and let AI create flashcards for you.
        </p>
      </button>

      <button onclick={() => mode = 'manual'} class="card p-8 text-left hover:border-amber-300 transition-colors">
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
          <Plus class="w-7 h-7 text-amber-600" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Create Manually</h3>
        <p class="text-gray-600">
          Add flashcards one by one.
        </p>
      </button>
    </div>
  {:else if mode === 'ai'}
    {#if step === 'configure'}
      <form
        method="POST"
        action="?/generate"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
        class="space-y-6"
      >
        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Topic</label>
          <input
            name="topic"
            type="text"
            required
            bind:value={topic}
            class="input"
            placeholder="e.g., US Presidents, Spanish Vocabulary..."
          />
        </div>

        <div class="card p-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Number of Cards</label>
          <input
            name="numberOfCards"
            type="range"
            min="10"
            max="50"
            bind:value={numberOfCards}
            class="w-full"
          />
          <div class="text-center mt-2 font-bold text-lg">{numberOfCards}</div>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
          <button type="submit" disabled={loading || !topic} class="btn btn-primary flex-1">
            {#if loading}
              <Loader2 class="w-4 h-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="w-4 h-4" />
              Generate Flashcards
            {/if}
          </button>
        </div>
      </form>
    {:else}
      <form method="POST" action="?/save" use:enhance class="space-y-6">
        <div class="card p-6">
          <div class="form-group">
            <label for="title" class="label">Study Set Title</label>
            <input id="title" name="title" type="text" required class="input" value="{topic} Flashcards" />
          </div>
          <div class="form-group">
            <label for="description" class="label">Description (Optional)</label>
            <textarea id="description" name="description" rows="2" class="input"></textarea>
          </div>
          <div class="form-group">
            <label for="classId" class="label">Assign to Class</label>
            <select id="classId" name="classId" required bind:value={selectedClassId} class="input">
              <option value="">Select a class...</option>
              {#each data.classes as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="font-semibold text-gray-900 mb-4">Generated Cards ({cards.length})</h3>
          <div class="space-y-3">
            {#each cards as card, index}
              <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 grid md:grid-cols-2 gap-4">
                    <div>
                      <div class="text-xs text-gray-500 mb-1">Front</div>
                      <p class="font-medium text-gray-900">{card.front}</p>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500 mb-1">Back</div>
                      <p class="text-gray-600">{card.back}</p>
                    </div>
                  </div>
                  <button type="button" onclick={() => removeCard(index)} class="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
          <input type="hidden" name="cards" value={JSON.stringify(cards)} />
          {#if currentJobId}
            <input type="hidden" name="jobId" value={currentJobId} />
          {/if}
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => step = 'configure'} class="btn btn-secondary">Back</button>
          <button type="submit" class="btn btn-primary flex-1">Save Study Set</button>
        </div>
      </form>
    {/if}
  {:else}
    <!-- Manual Creation -->
    <form method="POST" action="?/saveManual" use:enhance class="space-y-6">
      <div class="card p-6">
        <div class="form-group">
          <label for="manual-title" class="label">Study Set Title</label>
          <input id="manual-title" name="title" type="text" required bind:value={manualTitle} class="input" />
        </div>
        <div class="form-group">
          <label for="manual-description" class="label">Description (Optional)</label>
          <textarea id="manual-description" name="description" rows="2" bind:value={manualDescription} class="input"></textarea>
        </div>
        <div class="form-group">
          <label for="manual-classId" class="label">Assign to Class</label>
          <select id="manual-classId" name="classId" required bind:value={selectedClassId} class="input">
            <option value="">Select a class...</option>
            {#each data.classes as cls}
              <option value={cls.id}>{cls.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Cards ({manualCards.length})</h3>
          <button type="button" onclick={addManualCard} class="btn btn-secondary btn-sm">
            <Plus class="w-4 h-4" />
            Add Card
          </button>
        </div>

        <div class="space-y-3">
          {#each manualCards as card, index}
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-start gap-4">
                <div class="flex-1 grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    bind:value={card.front}
                    placeholder="Front (term)"
                    class="input"
                  />
                  <input
                    type="text"
                    bind:value={card.back}
                    placeholder="Back (definition)"
                    class="input"
                  />
                </div>
                <button
                  type="button"
                  onclick={() => removeManualCard(index)}
                  disabled={manualCards.length === 1}
                  class="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
        <input type="hidden" name="cards" value={JSON.stringify(manualCards.filter(c => c.front.trim() && c.back.trim()))} />
      </div>

      <div class="flex gap-3">
        <button type="button" onclick={() => mode = 'choose'} class="btn btn-secondary">Back</button>
        <button type="submit" disabled={!manualTitle} class="btn btn-primary flex-1">Save Study Set</button>
      </div>
    </form>
  {/if}
</div>
