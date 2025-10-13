/**
 * Board generation and display utilities
 * Ported from vanilla JS game.js
 */

export type Board = number[][];

export interface Ship {
  name: string;
  size: number;
}

export const SHIPS: Ship[] = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

/**
 * Generate random board with ships placed
 */
export function generateRandomBoard(): Board {
  const board: Board = Array(10)
    .fill(null)
    .map(() => Array(10).fill(0));

  // Helper: Check if ship can be placed at position
  function canPlaceShip(x: number, y: number, size: number, isHorizontal: boolean): boolean {
    if (isHorizontal) {
      if (x + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[y][x + i] !== 0) return false;
      }
    } else {
      if (y + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[y + i][x] !== 0) return false;
      }
    }
    return true;
  }

  // Helper: Place ship on board
  function placeShip(x: number, y: number, size: number, isHorizontal: boolean): void {
    if (isHorizontal) {
      for (let i = 0; i < size; i++) {
        board[y][x + i] = 1;
      }
    } else {
      for (let i = 0; i < size; i++) {
        board[y + i][x] = 1;
      }
    }
  }

  // Place each ship
  for (const ship of SHIPS) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      const isHorizontal = Math.random() < 0.5;

      if (canPlaceShip(x, y, ship.size, isHorizontal)) {
        placeShip(x, y, ship.size, isHorizontal);
        console.log(
          `✅ Placed ${ship.name} (size ${ship.size}) at (${x}, ${y}) ${isHorizontal ? "horizontally" : "vertically"}`
        );
        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      console.error(`❌ Failed to place ${ship.name} after ${maxAttempts} attempts. Retrying...`);
      return generateRandomBoard(); // Recursive retry
    }
  }

  // Verify total cells
  let totalCells = 0;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (board[y][x] === 1) totalCells++;
    }
  }

  console.log(`🎯 Board generated! ${SHIPS.length} ships, ${totalCells} cells (expected 17)`);
  return board;
}

/**
 * Create empty opponent tracking board
 */
export function createEmptyBoard(): Board {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0));
}

/**
 * Calculate board hash (placeholder - actual hashing TBD)
 */
export function calculateBoardHash(board: Board): string {
  // TODO: Implement proper Poseidon hash
  return "0x" + "0".repeat(63) + "1";
}

/**
 * Board Persistence - Save to localStorage
 */
const BOARD_STORAGE_PREFIX = "battleship_board_";

export function saveBoardToStorage(gameId: string, board: Board): void {
  try {
    const key = `${BOARD_STORAGE_PREFIX}${gameId}`;
    const boardData = JSON.stringify(board);
    localStorage.setItem(key, boardData);
    console.log(`💾 Board saved to localStorage for game ${gameId.substring(0, 20)}...`);
  } catch (error) {
    console.error("❌ Failed to save board to localStorage:", error);
  }
}

export function loadBoardFromStorage(gameId: string): Board | null {
  try {
    const key = `${BOARD_STORAGE_PREFIX}${gameId}`;
    const boardData = localStorage.getItem(key);
    
    if (!boardData) {
      console.log(`ℹ️ No saved board found for game ${gameId.substring(0, 20)}...`);
      return null;
    }
    
    const board = JSON.parse(boardData) as Board;
    console.log(`♻️ Board restored from localStorage for game ${gameId.substring(0, 20)}...`);
    return board;
  } catch (error) {
    console.error("❌ Failed to load board from localStorage:", error);
    return null;
  }
}

export function clearBoardFromStorage(gameId: string): void {
  try {
    const key = `${BOARD_STORAGE_PREFIX}${gameId}`;
    localStorage.removeItem(key);
    console.log(`🗑️ Board cleared from localStorage for game ${gameId.substring(0, 20)}...`);
  } catch (error) {
    console.error("❌ Failed to clear board from localStorage:", error);
  }
}
