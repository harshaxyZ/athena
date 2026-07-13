// Athena state management (Zustand)
import { create } from "zustand";
import { Message, Conversation, CostData } from "./types";

interface AthenaStore {
  // Conversations
  conversations: Conversation[];
  currentConversationId: string;
  messages: Message[];
  setConversations: (convs: Conversation[]) => void;
  setCurrentConversation: (id: string) => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (isStreaming: boolean) => void;

  // Settings
  language: string;
  secondaryLanguage: string;
  setLanguage: (lang: string) => void;
  setSecondaryLanguage: (lang: string) => void;

  // Cost
  currentCost: CostData | null;
  setCurrentCost: (cost: CostData | null) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isStreaming: boolean;

  // Actions
  newChat: () => void;
  clearMessages: () => void;
}

export const useStore = create<AthenaStore>((set) => ({
  // Conversations
  conversations: [],
  currentConversationId: "",
  messages: [],
  setConversations: (convs) => set({ conversations: convs }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),

  // Settings
  language: "en-IN",
  secondaryLanguage: "hi-IN",
  setLanguage: (lang) => set({ language: lang }),
  setSecondaryLanguage: (lang) => set({ secondaryLanguage: lang }),

  // Cost
  currentCost: null,
  setCurrentCost: (cost) => set({ currentCost: cost }),

  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  isStreaming: false,

  // Actions
  newChat: () =>
    set({
      currentConversationId: "",
      messages: [],
      currentCost: null,
    }),
  clearMessages: () => set({ messages: [] }),
}));
