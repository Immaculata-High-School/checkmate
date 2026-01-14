<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { assistantStore, type AssistantMessage } from '$lib/stores/assistant';
  import {
    Sparkles,
    Send,
    Loader2,
    MessageSquare,
    X,
    AlertCircle,
    ArrowRight,
    FileText,
    ClipboardList,
    BookMarked,
    Library
  } from 'lucide-svelte';

  let inputValue = $state('');
  let messagesContainer = $state<HTMLDivElement | null>(null);

  // Subscribe to store
  let storeState = $state({
    open: false,
    loading: false,
    error: '',
    messages: [] as AssistantMessage[],
    currentPage: '',
    prefill: null as any
  });

  assistantStore.subscribe(value => {
    storeState = value;
  });

  // Update current page when route changes
  $effect(() => {
    assistantStore.setCurrentPage($page.url.pathname);
  });

  // Scroll to bottom when messages change
  $effect(() => {
    if (storeState.messages.length > 0 && messagesContainer) {
      setTimeout(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 50);
    }
  });

  // Check if we're on a page with specific assistant behavior
  const isTestEditPage = $derived($page.url.pathname.includes('/teacher/tests/') && $page.url.pathname.includes('/edit'));
  const isWorksheetEditPage = $derived($page.url.pathname.includes('/teacher/worksheets/') && $page.url.pathname.includes('/edit'));
  const isDocsPage = $derived($page.url.pathname.includes('/teacher/docs/') || $page.url.pathname.includes('/student/docs/'));

  async function sendMessage() {
    if (!inputValue.trim() || storeState.loading) return;

    const userMessage = inputValue.trim();
    inputValue = '';
    assistantStore.setError('');
    assistantStore.setLoading(true);

    // Add user message
    assistantStore.addMessage({ role: 'user', content: userMessage });

    try {
      const response = await fetch('/api/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          currentPage: storeState.currentPage
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process request');
      }

      const result = await response.json();

      // Add assistant response
      assistantStore.addMessage({
        role: 'assistant',
        content: result.response,
        action: result.action
      });

      // Handle actions
      if (result.action) {
        if (result.action.type === 'prefill' && result.action.prefill) {
          assistantStore.setPrefill(result.action.prefill);
        }
      }
    } catch (err) {
      assistantStore.setError(err instanceof Error ? err.message : 'Something went wrong');
      assistantStore.removeLastMessage();
    } finally {
      assistantStore.setLoading(false);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleAction(action: AssistantMessage['action']) {
    if (!action) return;

    if (action.type === 'navigate' && action.destination) {
      goto(action.destination);
      assistantStore.close();
    } else if (action.type === 'prefill' && action.destination && action.prefill) {
      assistantStore.setPrefill(action.prefill);
      goto(action.destination);
      assistantStore.close();
    }
  }

  function getContentLabel(type: string) {
    switch (type) {
      case 'test': return 'Test';
      case 'worksheet': return 'Worksheet';
      case 'study-guide': return 'Study Guide';
      case 'flashcards': return 'Flashcards';
      default: return 'Content';
    }
  }

  const quickActions = [
    { label: 'Create a test', prompt: 'I want to create a test' },
    { label: 'Create a worksheet', prompt: 'I want to create a worksheet' },
    { label: 'Create flashcards', prompt: 'I want to create flashcards' },
    { label: 'Create a study guide', prompt: 'I want to create a study guide' }
  ];
</script>

<!-- Skip rendering on test edit page since it has its own assistant -->
{#if !isTestEditPage && !isWorksheetEditPage && !isDocsPage}
<div class="fixed bottom-4 right-4 z-50">
  {#if !storeState.open}
    <button
      onclick={() => assistantStore.open()}
      class="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      title="AI Assistant"
    >
      <Sparkles class="w-6 h-6" />
    </button>
  {:else}
    <div class="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style="max-height: 550px;">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2 text-white">
          <Sparkles class="w-5 h-5" />
          <span class="font-semibold">AI Assistant</span>
        </div>
        <button
          onclick={() => assistantStore.close()}
          class="text-white/80 hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Messages -->
      <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[350px]">
        {#if storeState.messages.length === 0}
          <div class="text-center text-gray-500 text-sm py-4">
            <MessageSquare class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p class="font-medium">How can I help you today?</p>
            <p class="text-xs mt-1 text-gray-400">I can help you create tests, worksheets, flashcards, and more!</p>
            
            <!-- Quick Actions -->
            <div class="mt-4 space-y-2">
              {#each quickActions as action}
                <button
                  onclick={() => { inputValue = action.prompt; sendMessage(); }}
                  class="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {action.label}
                </button>
              {/each}
            </div>
          </div>
        {:else}
          {#each storeState.messages as message}
            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[85%] {message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg px-3 py-2 text-sm">
                <p class="whitespace-pre-wrap">{message.content}</p>
                
                <!-- Action button if present -->
                {#if message.action && (message.action.type === 'navigate' || message.action.type === 'prefill') && message.action.destination}
                  <button
                    onclick={() => handleAction(message.action)}
                    class="mt-2 w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    <span class="flex items-center gap-2">
                      {#if message.action.prefill}
                        {#if message.action.prefill.type === 'test'}
                          <FileText class="w-4 h-4" />
                        {:else if message.action.prefill.type === 'worksheet'}
                          <ClipboardList class="w-4 h-4" />
                        {:else if message.action.prefill.type === 'study-guide'}
                          <BookMarked class="w-4 h-4" />
                        {:else if message.action.prefill.type === 'flashcards'}
                          <Library class="w-4 h-4" />
                        {:else}
                          <FileText class="w-4 h-4" />
                        {/if}
                        Create {getContentLabel(message.action.prefill.type)}
                      {:else}
                        Go to page
                      {/if}
                    </span>
                    <ArrowRight class="w-4 h-4" />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
          {#if storeState.loading}
            <div class="flex justify-start">
              <div class="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Error -->
      {#if storeState.error}
        <div class="px-4 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
          <p class="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            {storeState.error}
          </p>
        </div>
      {/if}

      <!-- Input -->
      <div class="border-t border-gray-200 p-3 flex-shrink-0">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={inputValue}
            onkeydown={handleKeydown}
            placeholder="Ask me anything..."
            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={storeState.loading}
          />
          <button
            onclick={sendMessage}
            disabled={!inputValue.trim() || storeState.loading}
            class="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">Each message uses 1 AI request</p>
      </div>
    </div>
  {/if}
</div>
{/if}
