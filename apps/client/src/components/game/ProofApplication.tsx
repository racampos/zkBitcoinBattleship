/**
 * Proof Application Component
 * Shows pending shot and allows defender to apply proof
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";

export function ProofApplication() {
  const { account, gameData, originalBoard } = useGameStore();
  const { applyProof, isLoading } = useGameContracts(account);

  // Check if there's a pending shot against me
  const pendingShot = gameData?.pending_shot;
  
  // Only show if there's a pending shot and it's NOT my turn (I'm the defender)
  const showApplyProof = pendingShot && gameData?.current_turn !== account?.address;

  if (!showApplyProof || !originalBoard) {
    return null;
  }

  const handleApplyProof = async () => {
    if (!pendingShot || !originalBoard) return;

    const { row, col } = pendingShot;
    
    // Check if the shot hit a ship on ORIGINAL board (with ships, not modified by shots)
    const wasHit = originalBoard[row][col] === 1;
    const result = wasHit ? 1 : 0; // 1 = hit, 0 = miss
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛡️ PROOF APPLICATION - START');
    console.log(`   My Address: ${account?.address}`);
    console.log(`   Current Turn (contract): ${gameData?.current_turn}`);
    console.log(`   Am I the defender? ${gameData?.current_turn !== account?.address}`);
    console.log(`   Pending Shot: (${row}, ${col})`);
    console.log(`   Result: ${wasHit ? 'HIT' : 'MISS'} (cell value: ${originalBoard[row][col]})`);
    console.log(`   Game Status: ${gameData?.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      await applyProof(row, col, result);
      console.log('✅ Proof application successful!');
    } catch (error) {
      console.log('❌ Proof application failed!');
      // Error handled in hook
    }
  };

  const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const displayCoords = `${rowLabels[pendingShot.row]}${pendingShot.col + 1}`;
  
  // Determine if it's a hit or miss
  const wasHit = originalBoard[pendingShot.row][pendingShot.col] === 1;
  const resultIcon = wasHit ? "💥" : "💧";
  const resultText = wasHit ? "HIT" : "MISS";
  const resultColor = wasHit ? "#FF5722" : "#2196F3";

  return (
    <div className="proof-notification-container">
      <div className="proof-notification">
        <div className="proof-header">
          <span className="proof-icon">⚠️</span>
          <span className="proof-title">Shot Incoming!</span>
          <span className="proof-coords">{displayCoords}</span>
        </div>
        <div className="proof-result" style={{ 
          background: wasHit ? "rgba(255, 87, 34, 0.2)" : "rgba(33, 150, 243, 0.2)",
          borderColor: resultColor,
          color: resultColor
        }}>
          <span className="proof-result-icon">{resultIcon}</span>
          <span className="proof-result-text">{resultText}</span>
        </div>
        <button
          onClick={handleApplyProof}
          disabled={isLoading}
          className="danger"
          style={{ width: "100%", fontSize: "14px", padding: "10px" }}
        >
          {isLoading ? "⏳ Applying..." : "Apply Proof"}
        </button>
      </div>
    </div>
  );
}

