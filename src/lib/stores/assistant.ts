import { writable } from 'svelte/store';

export interface AssistantPrefill {
  type: 'test' | 'worksheet' | 'study-guide' | 'flashcards';
  data: {
    topic?: string;
    numberOfQuestions?: number;
    numberOfItems?: number;
    numberOfCards?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionTypes?: string[];
    itemTypes?: string[];
    additionalInstructions?: string;
    title?: string;
    description?: string;
  };
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: 'navigate' | 'prefill';
    destination?: string;
    prefill?: AssistantPrefill;
  };
}

interface AssistantStore {
  open: boolean;
  loading: boolean;
  error: string;
  messages: AssistantMessage[];
  currentPage: string;
  prefill: AssistantPrefill | null;
}

function createAssistantStore() {
  const { subscribe, set, update } = writable<AssistantStore>({
    open: false,
    loading: false,
    error: '',
    messages: [],
    currentPage: '',
    prefill: null
  });

  return {
    subscribe,
    open: () => update(s => ({ ...s, open: true })),
    close: () => update(s => ({ ...s, open: false })),
    toggle: () => update(s => ({ ...s, open: !s.open })),
    setLoading: (loading: boolean) => update(s => ({ ...s, loading })),
    setError: (error: string) => update(s => ({ ...s, error })),
    setCurrentPage: (page: string) => update(s => ({ ...s, currentPage: page })),
    addMessage: (message: AssistantMessage) => update(s => ({ 
      ...s, 
      messages: [...s.messages, message] 
    })),
    removeLastMessage: () => update(s => ({ 
      ...s, 
      messages: s.messages.slice(0, -1) 
    })),
    setPrefill: (prefill: AssistantPrefill | null) => update(s => ({ ...s, prefill })),
    clearPrefill: () => update(s => ({ ...s, prefill: null })),
    clearMessages: () => update(s => ({ ...s, messages: [] })),
    reset: () => set({
      open: false,
      loading: false,
      error: '',
      messages: [],
      currentPage: '',
      prefill: null
    })
  };
}

export const assistantStore = createAssistantStore();
