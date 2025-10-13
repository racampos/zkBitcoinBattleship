/**
 * Board Setup Component
 * Handles ship placement and board commitment
 */

import React, { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { useBoardCommitStatus } from "../../hooks/useBoardCommitStatus";
import { useStakingStatus } from "../../hooks/useStakingStatus";
import { BoardDisplay } from "./BoardDisplay";
import { generateRandomBoard, calculateBoardHash, loadBoardFromStorage, saveBoardToStorage } from "../../utils/boardUtils";

export function BoardSetup() {
  const { account, gameId, myBoard, setMyBoard, setOriginalBoard, isLoading } = useGameStore();
  const { commitBoard } = useGameContracts(account);
  const { isCommitted, isChecking } = useBoardCommitStatus();
  const stakingStatus = useStakingStatus();

  // Reset board when game ID changes (new game started)
  useEffect(() => {
    if (gameId) {
      console.log(`🎲 New game detected: ${gameId} - checking if board needs reset`);
      
      // Try to restore from localStorage first
      const savedBoard = loadBoardFromStorage(gameId);
      
      if (savedBoard) {
        // Restore saved board (page reload or rejoin)
        console.log("♻️ Restoring saved board for game");
        setMyBoard(savedBoard);
        setOriginalBoard(savedBoard.map(row => [...row])); // Deep copy for original
      } else {
        // No saved board - generate new random board
        console.log("🎲 Generating new random board...");
        const board = generateRandomBoard();
        setMyBoard(board);
        setOriginalBoard(board.map(row => [...row])); // Deep copy for original
      }
    }
  }, [gameId, setMyBoard, setOriginalBoard]); // Only depend on gameId - reset whenever it changes

  const handleCommitBoard = async () => {
    if (!myBoard || !gameId) return;

    const boardHash = calculateBoardHash(myBoard);
    console.log("📝 Committing board with hash:", boardHash);

    try {
      await commitBoard(boardHash);
      // Save board to localStorage after successful commit
      saveBoardToStorage(gameId, myBoard);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRegenerateBoard = () => {
    console.log("🔄 Regenerating board...");
    const board = generateRandomBoard();
    setMyBoard(board);
    setOriginalBoard(board.map(row => [...row])); // Deep copy for original
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
              {/* Show staking warning if not both staked */}
              {!stakingStatus.bothStaked && (
                <div className="status-box" style={{ background: "#3a1a1a", borderColor: "#FFA726", marginTop: "15px" }}>
                  🔒 <strong>Staking Required</strong>
                  <div style={{ fontSize: "13px", marginTop: "8px" }}>
                    {!stakingStatus.iHaveStaked ? (
                      <>You must stake before committing your board. See staking section above.</>
                    ) : (
                      <>Waiting for opponent to stake... ({stakingStatus.p1Staked ? "P1 ✅" : "P1 ⏳"} | {stakingStatus.p2Staked ? "P2 ✅" : "P2 ⏳"})</>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button 
                  onClick={handleCommitBoard} 
                  disabled={
                    isLoading || 
                    isChecking || 
                    !stakingStatus.bothStaked // ALWAYS require both players to stake
                  } 
                  className="primary"
                  title={
                    !stakingStatus.bothStaked
                      ? "Both players must stake before committing boards" 
                      : "Commit your board to the blockchain"
                  }
                >
                  {isLoading ? "Committing..." : isChecking ? "Checking..." : "Commit Board"}
                </button>
                <button onClick={handleRegenerateBoard} disabled={isLoading || isCommitted} className="secondary">
                  🎲 Regenerate
                </button>
              </div>

              {stakingStatus.bothStaked ? (
                <div className="status-box success">
                  ✅ Both players staked! Place your ships and commit your board to start the game.
                </div>
              ) : (
                <div className="status-box">
                  ⏳ Complete staking above before committing your board.
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="status-box">Generating board...</div>
      )}
    </div>
  );
}
