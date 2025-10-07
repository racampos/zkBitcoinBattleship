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

        // Collect shots fired BY me (for opponent board)
        const myShotsMap = new Map<string, number | null>();

        // Collect shots fired AT me (for my defense board)
        const defendingShotsMap = new Map<string, number | null>();

        entities.forEach((edge: any) => {
          edge.node?.models?.forEach((model: any) => {
            if (!model.game_id || model.game_id !== gameId) return;

            // AttackerShot: Track my shots
            if (model.__typename === "battleship_AttackerShot") {
              if (model.attacker?.toLowerCase() === account.address.toLowerCase() && model.fired) {
                const key = `${model.x},${model.y}`;
                console.log(`🎯 MY shot at (${model.x}, ${model.y})`);
                if (!myShotsMap.has(key)) {
                  myShotsMap.set(key, null); // Will be updated by Shot entity
                }
              }
            }

            // Shot: Contains the result of a shot
            if (model.__typename === "battleship_Shot") {
              const key = `${model.x},${model.y}`;
              if (myShotsMap.has(key)) {
                console.log(`✅ Shot result at (${model.x}, ${model.y}): ${model.result === 1 ? "HIT" : "MISS"}`);
                myShotsMap.set(key, model.result); // result: 1 = hit, 0 = miss
              }
            }

            // CellHit: Shots fired at ME (after proof applied)
            if (model.__typename === "battleship_CellHit") {
              if (model.player?.toLowerCase() === account.address.toLowerCase()) {
                const key = `${model.x},${model.y}`;
                console.log(`🛡️ Shot AT ME at (${model.x}, ${model.y}): ${model.hit ? "HIT" : "MISS"}`);
                defendingShotsMap.set(key, model.hit ? 1 : 0);
              }
            }

            // PendingShot: Shots fired at ME (before proof applied)
            // These are shots fired by the opponent that are awaiting proof
            if (model.__typename === "battleship_PendingShot") {
              // Skip if I am the shooter (this is MY shot, not a shot AT me)
              if (model.shooter?.toLowerCase() === account.address.toLowerCase()) {
                return;
              }
              
              const key = `${model.x},${model.y}`;
              // Only mark as pending if we haven't already processed the CellHit for this position
              if (!defendingShotsMap.has(key)) {
                console.log(`⏳ PENDING shot AT ME at (${model.x}, ${model.y}) - turn ${model.turn_no}`);
                // Mark as "pending" (we'll use -1 to indicate pending, which we can style differently)
                defendingShotsMap.set(key, -1);
              }
            }
          });
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