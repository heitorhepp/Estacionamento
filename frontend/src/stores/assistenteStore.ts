import { create } from 'zustand';

export interface AssistenteMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

interface AssistenteState {
  messages: AssistenteMessage[];
  thinking: boolean;
  addMessage: (message: AssistenteMessage) => void;
  setThinking: (thinking: boolean) => void;
  clearMessages: () => void;
}

export const useAssistenteStore = create<AssistenteState>((set) => ({
  messages: [],
  thinking: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setThinking: (thinking) => set({ thinking }),
  clearMessages: () => set({ messages: [], thinking: false }),
}));
