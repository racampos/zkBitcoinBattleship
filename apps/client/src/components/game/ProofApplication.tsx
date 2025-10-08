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
    
    console.log(`🛡️ Applying proof for shot at (${row}, ${col}): ${wasHit ? 'HIT' : 'MISS'} (original cell value: ${originalBoard[row][col]})`);

    try {
      await applyProof(row, col, result);
    } catch (error) {
      // Error handled in hook
    }
  };

  const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const displayCoords = `${rowLabels[pendingShot.row]}${pendingShot.col + 1}`;

  return (
    <div 
      className="section" 
      style={{ 
        background: "#3a1a1a", 
        borderColor: "#8B0000",
        animation: "pulse 2s infinite"
      }}
    >
      <h2 style={{ color: "#FF5722" }}>🎯 Opponent Fired!</h2>
      
      <div className="status-box" style={{ background: "#2a0a0a", borderColor: "#FF5722" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
          Shot at: <span style={{ color: "#FF5722", fontFamily: "monospace" }}>{displayCoords}</span>
        </div>
        <div style={{ marginBottom: "15px", color: "#ccc" }}>
          Apply proof to reveal hit/miss and flip turn
        </div>
        <button
          onClick={handleApplyProof}
          disabled={isLoading}
          className="danger"
          style={{ fontSize: "16px", padding: "12px 24px" }}
        >
          {isLoading ? "Applying Proof..." : "🛡️ Apply Proof"}
        </button>
      </div>
    </div>
  );
}

