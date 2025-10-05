// Swap transaction state management with Zustand

import { create } from "zustand";
import type { SwapTransaction } from "../services/types/swap.types";

interface SwapStore {
  // State
  activeSwap: SwapTransaction | null;
  swapHistory: SwapTransaction[];

  // Actions
  setActiveSwap: (swap: SwapTransaction | null) => void;
  updateActiveSwap: (updates: Partial<SwapTransaction>) => void;
  addToHistory: (swap: SwapTransaction) => void;
  clearActiveSwap: () => void;
}

export const useSwapStore = create<SwapStore>((set) => ({
  // Initial state
  activeSwap: null,
  swapHistory: [],

  // Actions
  setActiveSwap: (swap) => set({ activeSwap: swap }),

  updateActiveSwap: (updates) =>
    set((state) => ({
      activeSwap: state.activeSwap
        ? { ...state.activeSwap, ...updates, updatedAt: Date.now() }
        : null,
    })),

  addToHistory: (swap) =>
    set((state) => ({
      swapHistory: [swap, ...state.swapHistory],
    })),

  clearActiveSwap: () =>
    set((state) => {
      if (state.activeSwap) {
        return {
          activeSwap: null,
          swapHistory: [state.activeSwap, ...state.swapHistory],
        };
      }
      return {};
    }),
}));

