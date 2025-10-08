/**
 * Board Setup Component
 * Handles ship placement and board commitment
 */

import React, { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { useBoardCommitStatus } from "../../hooks/useBoardCommitStatus";
import { BoardDisplay } from "./BoardDisplay";
import { generateRandomBoard, calculateBoardHash } from "../../utils/boardUtils";

export function BoardSetup() {
  const { account, myBoard, setMyBoard, isLoading } = useGameStore();
  const { commitBoard } = useGameContracts(account);
  const { isCommitted, isChecking } = useBoardCommitStatus();

  // Generate board on mount if not already generated or if it's empty (no ships)
  useEffect(() => {
    if (!myBoard || myBoard.every(row => row.every(cell => cell === 0))) {
      console.log("🎲 Generating random board...");
      const board = generateRandomBoard();
      setMyBoard(board);
    }
  }, [myBoard, setMyBoard]);

  const handleCommitBoard = async () => {
    if (!myBoard) return;

    const boardHash = calculateBoardHash(myBoard);
    console.log("📝 Committing board with hash:", boardHash);

    try {
      await commitBoard(boardHash);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRegenerateBoard = () => {
    console.log("🔄 Regenerating board...");
    const board = generateRandomBoard();
    setMyBoard(board);
  };

  return (
    <div className="section">
      <h2>🛡️ Your Defense Board</h2>

      {myBoard ? (
        <>
          <BoardDisplay board={myBoard} title="Your Ships" />

          {isCommitted ? (
            <div className="status-box" style={{ color: "#4CAF50" }}>
              ✅ Board committed! Waiting for game to start...
            </div>
          ) : (
            <>
              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button onClick={handleCommitBoard} disabled={isLoading || isChecking} className="primary">
                  {isLoading ? "Committing..." : isChecking ? "Checking..." : "Commit Board"}
                </button>
                <button onClick={handleRegenerateBoard} disabled={isLoading || isCommitted} className="secondary">
                  🎲 Regenerate
                </button>
              </div>

              <div className="status-box">
                Place your ships and commit your board to start the game.
              </div>
            </>
          )}
        </>
      ) : (
        <div className="status-box">Generating board...</div>
      )}
    </div>
  );
}
