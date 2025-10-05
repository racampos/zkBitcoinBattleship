// Bitcoin wallet state management with Zustand

import { create } from "zustand";
import type { BitcoinWalletState } from "../services/types/bitcoin.types";

interface BTCWalletStore extends BitcoinWalletState {
  // Actions
  setConnected: (connected: boolean) => void;
  setAddress: (address: string | null) => void;
  setPublicKey: (publicKey: string | null) => void;
  setStarknetBinding: (starknetAddress: string | null) => void;
  disconnect: () => void;
}

export const useBTCWalletStore = create<BTCWalletStore>((set) => ({
  // Initial state
  connected: false,
  address: null,
  publicKey: null,
  starknetBinding: null,

  // Actions
  setConnected: (connected) => set({ connected }),
  setAddress: (address) => set({ address }),
  setPublicKey: (publicKey) => set({ publicKey }),
  setStarknetBinding: (starknetBinding) => set({ starknetBinding }),
  disconnect: () =>
    set({
      connected: false,
      address: null,
      publicKey: null,
      starknetBinding: null,
    }),
}));

