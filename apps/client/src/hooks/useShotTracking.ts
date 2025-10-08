/**
 * Hook to track shots and update board states
 * Queries Torii for Shot/AttackerShot entities
 */

import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

// Helper to create empty board
function createEmptyBoard(): number[][] {
  return Array(10).fill(null).map(() => Array(10).fill(0));
}

export function useShotTracking() {
  const gameId = useGameStore((s) => s.gameId);
  const account = useGameStore((s) => s.account);
  const myBoard = useGameStore((s) => s.myBoard);
  const opponentBoard = useGameStore((s) => s.opponentBoard);
  const setMyBoard = useGameStore((s) => s.setMyBoard);
  const setOpponentBoard = useGameStore((s) => s.setOpponentBoard);

  // Initialize boards if they don't exist
  useEffect(() => {
    if (!myBoard) {
      setMyBoard(createEmptyBoard());
    }
    if (!opponentBoard) {
      setOpponentBoard(createEmptyBoard());
    }
  }, [myBoard, opponentBoard, setMyBoard, setOpponentBoard]);

  // Main polling effect for shot tracking
  useEffect(() => {
    if (!gameId || !account) {
      return;
    }

    console.log("✅ Shot tracking ENABLED for game:", gameId);

    let cancelled = false;

      const updateBoards = async () => {
        if (cancelled) return;
        
        try {
          // Query all shot-related entities
          const response = await fetch("http://localhost:8081/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{ entities(first: 100) { edges { node { models { __typename ... on battleship_AttackerShot { game_id attacker x y fired } ... on battleship_Shot { game_id turn_no x y result } ... on battleship_CellHit { game_id player x y hit } ... on battleship_PendingShot { game_id turn_no x y shooter } } } } } }`,
          }),
        });

          const result = await response.json();
          
          if (result.errors) {
            console.error("❌ GraphQL ERRORS:", JSON.stringify(result.errors, null, 2));
          }
          
          const entities = result.data?.entities?.edges || [];

        // Collect all entity types first
        const myAttackerShots = new Set<string>();
        const allShots = new Map<string, number>();
        const allCellHits = new Map<string, number>();
        const allPendingShots: Array<{ x: number; y: number; turn_no: number }> = [];

        // First pass: Collect all entities
        entities.forEach((edge: any) => {
          edge.node?.models?.forEach((model: any) => {
            if (!model.game_id || model.game_id !== gameId) return;

            if (model.__typename === "battleship_AttackerShot") {
              if (model.attacker?.toLowerCase() === account.address.toLowerCase() && model.fired) {
                myAttackerShots.add(`${model.x},${model.y}`);
              }
            }

            if (model.__typename === "battleship_Shot") {
              allShots.set(`${model.x},${model.y}`, model.result);
            }

            if (model.__typename === "battleship_CellHit") {
              if (model.player?.toLowerCase() === account.address.toLowerCase()) {
                allCellHits.set(`${model.x},${model.y}`, model.hit ? 1 : 0);
              }
            }

            if (model.__typename === "battleship_PendingShot") {
              if (model.shooter?.toLowerCase() !== account.address.toLowerCase()) {
                allPendingShots.push({ x: model.x, y: model.y, turn_no: model.turn_no });
              }
            }
          });
        });

        // Second pass: Build final maps
        const myShotsMap = new Map<string, number | null>();
        const defendingShotsMap = new Map<string, number | null>();
        let pendingShotCoords: { row: number; col: number } | null = null;

        // MY shots (attacker board)
        myAttackerShots.forEach((key) => {
          if (allShots.has(key)) {
            const result = allShots.get(key)!;
            myShotsMap.set(key, result);
          } else {
            myShotsMap.set(key, null);
          }
        });

        // Shots AT me (defense board)
        // Priority: CellHit > PendingShot
        allCellHits.forEach((hit, key) => {
          defendingShotsMap.set(key, hit);
        });

        allPendingShots.forEach((shot) => {
          const key = `${shot.x},${shot.y}`;
          if (!defendingShotsMap.has(key)) {
            defendingShotsMap.set(key, -1);
            pendingShotCoords = { row: shot.x, col: shot.y };
          }
        });

        // Update opponent board with MY shots
        if (myShotsMap.size > 0) {
          const currentOpponentBoard = useGameStore.getState().opponentBoard;
          if (currentOpponentBoard) {
            const newOpponentBoard = currentOpponentBoard.map((row) => [...row]);
            myShotsMap.forEach((result, coordKey) => {
              const [x, y] = coordKey.split(",").map(Number);
              if (x >= 0 && x < 10 && y >= 0 && y < 10 && result !== null) {
                // Contract sends (row, col), Torii returns as (x, y)
                // board[row][col], so we need board[x][y]
                // result: 1 = hit (2 on board), 0 = miss (3 on board)
                newOpponentBoard[x][y] = result === 1 ? 2 : 3;
              }
            });
            setOpponentBoard(newOpponentBoard);
          }
        }

        // Update my defense board with shots fired AT me
        if (defendingShotsMap.size > 0) {
          const currentMyBoard = useGameStore.getState().myBoard;
          if (currentMyBoard) {
            const newMyBoard = currentMyBoard.map((row) => [...row]);
            defendingShotsMap.forEach((hit, coordKey) => {
              const [x, y] = coordKey.split(",").map(Number);
              if (x >= 0 && x < 10 && y >= 0 && y < 10) {
                // Contract sends (row, col), Torii returns as (x, y)
                // board[row][col], so we need board[x][y]
                // hit values: -1 = pending (4 on board), 1 = hit (2 on board), 0 = miss (3 on board)
                if (hit === -1) {
                  newMyBoard[x][y] = 4; // Pending shot (visual indicator that proof needs to be applied)
                } else {
                  newMyBoard[x][y] = hit === 1 ? 2 : 3;
                }
              }
            });
            setMyBoard(newMyBoard);
          }
        }

        // Update gameData with pending shot info
        const currentGameData = useGameStore.getState().gameData;
        if (currentGameData) {
          useGameStore.getState().setGameData({
            ...currentGameData,
            pending_shot: pendingShotCoords || undefined,
          });
        }
        } catch (error) {
          if (!cancelled) {
            console.error("❌ Error in updateBoards():", error);
          }
        }
      };

      // Update immediately
      updateBoards();

      // Poll every 2 seconds to catch new shots
      const interval = setInterval(updateBoards, 2000);

      return () => {
        cancelled = true;
        clearInterval(interval);
        console.log("🛑 Shot tracking cleanup for game:", gameId);
      };
    }, [gameId, account]); // Only these two - boards are accessed via getState() to avoid re-renders
}