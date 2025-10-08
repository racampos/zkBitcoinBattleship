/**
 * Global game state store using Zustand
 */

import { create } from "zustand";
import type { Account } from "@cartridge/controller";

export interface GameData {
  game_id: string;
  player_1: string;
  player_2: string;
  status: number;
  current_turn: string;
  p1_board_hash: string;
  p2_board_hash: string;
  p1_hits: number;
  p2_hits: number;
  pending_shot?: {
    row: number;
    col: number;
  };
}

interface GameStore {
  // Account & Connection
  account: Account | null;
  setAccount: (account: Account | null) => void;

  // Game State
  gameId: string | null;
  gameData: GameData | null;
  setGameId: (id: string | null) => void;
  setGameData: (data: GameData | null) => void;

  // Board State
  myBoard: number[][] | null; // Defense board showing shots received
  originalBoard: number[][] | null; // Original ship layout (never modified)
  opponentBoard: number[][] | null; // Attack board tracking hits/misses
  setMyBoard: (board: number[][] | null) => void;
  setOriginalBoard: (board: number[][] | null) => void;
  setOpponentBoard: (board: number[][] | null) => void;

  // UI State
  isLoading: boolean;
  error: string | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helper Methods
  reset: () => void;
  isMyTurn: () => boolean;
  amIPlayer1: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial State
  account: null,
  gameId: null,
  gameData: null,
  myBoard: null,
  originalBoard: null,
  opponentBoard: null,
  isLoading: false,
  error: null,

  // Setters
  setAccount: (account) => set({ account }),
  setGameId: (gameId) => set({ gameId }),
  setGameData: (gameData) => set({ gameData }),
  setMyBoard: (myBoard) => set({ myBoard }),
  setOriginalBoard: (originalBoard) => set({ originalBoard }),
  setOpponentBoard: (opponentBoard) => set({ opponentBoard }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Helper Methods
  reset: () =>
    set({
      gameId: null,
      gameData: null,
      myBoard: null,
      originalBoard: null,
      opponentBoard: null,
      error: null,
    }),

  isMyTurn: () => {
    const { gameData, account } = get();
    if (!gameData || !account) return false;
    
    // Check if both players have committed their boards
    const bothBoardsCommitted = 
      gameData.p1_board_hash !== "0x0" && 
      gameData.p2_board_hash !== "0x0";
    
    // Game must be active (status 1) and both boards committed
    if (gameData.status !== 1 || !bothBoardsCommitted) return false;
    
    return gameData.current_turn === account.address;
  },

  amIPlayer1: () => {
    const { gameData, account } = get();
    if (!gameData || !account) return false;
    return gameData.player_1 === account.address;
  },
}));
