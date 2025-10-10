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
import { generateRandomBoard, calculateBoardHash } from "../../utils/boardUtils";

export function BoardSetup() {
  const { account, myBoard, setMyBoard, setOriginalBoard, isLoading } = useGameStore();
  const { commitBoard } = useGameContracts(account);
  const { isCommitted, isChecking } = useBoardCommitStatus();
  const stakingStatus = useStakingStatus();

  // Generate board on mount if not already generated or if it's empty (no ships)
  useEffect(() => {
    if (!myBoard || myBoard.every(row => row.every(cell => cell === 0))) {
      console.log("🎲 Generating random board...");
      const board = generateRandomBoard();
      setMyBoard(board);
      setOriginalBoard(board.map(row => [...row])); // Deep copy for original
    }
  }, [myBoard, setMyBoard, setOriginalBoard]);

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
              {/* Show staking warning if escrow exists but not both staked */}
              {stakingStatus.escrowExists && !stakingStatus.bothStaked && (
                <div className="status-box" style={{ background: "#3a1a1a", borderColor: "#FFA726", marginTop: "15px" }}>
                  ⚠️ <strong>Staking Required</strong>
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
                    (stakingStatus.escrowExists && !stakingStatus.bothStaked) // Disable if staking incomplete
                  } 
                  className="primary"
                  title={
                    stakingStatus.escrowExists && !stakingStatus.bothStaked 
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

              {!stakingStatus.escrowExists || stakingStatus.bothStaked ? (
                <div className="status-box">
                  Place your ships and commit your board to start the game.
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <div className="status-box">Generating board...</div>
      )}
    </div>
  );
}
