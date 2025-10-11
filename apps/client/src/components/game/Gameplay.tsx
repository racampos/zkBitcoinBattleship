/**
 * Gameplay Component
 * Handles firing shots and tracking opponent's board
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { BoardDisplay } from "./BoardDisplay";
import { createEmptyBoard } from "../../utils/boardUtils";

export function Gameplay() {
  const { account, gameData, opponentBoard, setOpponentBoard, isMyTurn } = useGameStore();
  const { fireShot } = useGameContracts(account);
  const [shotRow, setShotRow] = useState("A");
  const [shotCol, setShotCol] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [waitingForProof, setWaitingForProof] = useState(false);
  
  const isGameOver = gameData?.status === 2;
  
  // Check if there's a pending shot waiting for opponent to apply proof
  const hasPendingShot = gameData?.pending_shot !== undefined;
  
  // Clear waitingForProof state when pending_shot appears (polling caught up)
  useEffect(() => {
    if (hasPendingShot) {
      setWaitingForProof(false);
    }
  }, [hasPendingShot]);

  // Initialize opponent board if not set
  useEffect(() => {
    if (!opponentBoard) {
      setOpponentBoard(createEmptyBoard());
    }
  }, [opponentBoard, setOpponentBoard]);

  // Check if current coordinates have already been fired at
  const isAlreadyFired = () => {
    if (!opponentBoard) return false;
    const row = shotRow.charCodeAt(0) - 65;
    const col = shotCol - 1;
    if (row < 0 || row > 9 || col < 0 || col > 9) return false;
    // Cell values: 0 = water (not fired), 1 = ship (shouldn't exist on opponent board), 
    // 2 = hit, 3 = miss, 4 = pending
    return opponentBoard[row][col] > 0;
  };

  const handleFireShot = async () => {
    const row = shotRow.charCodeAt(0) - 65; // A=0, B=1, etc.
    const col = shotCol - 1; // 1-indexed to 0-indexed

    // Check if already fired at this position
    if (opponentBoard && opponentBoard[row][col] > 0) {
      setError(`❌ You've already fired at ${shotRow}${shotCol}!`);
      return;
    }

    setError(null);
    setIsFiring(true);
    console.log(`🎯 Firing at ${shotRow}${shotCol} (${row}, ${col})`);

    try {
      await fireShot(row, col);
      // Shot succeeded! Now waiting for polling to detect it
      setWaitingForProof(true);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsFiring(false);
    }
  };

  const handleRandomCoords = () => {
    if (!opponentBoard) return;

    // Find all unfired positions
    const unfiredPositions: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (opponentBoard[r][c] === 0) {
          unfiredPositions.push({ row: r, col: c });
        }
      }
    }

    if (unfiredPositions.length === 0) {
      setError("❌ All positions have been fired at!");
      return;
    }

    // Pick random unfired position
    const randomPos = unfiredPositions[Math.floor(Math.random() * unfiredPositions.length)];
    setShotRow(String.fromCharCode(65 + randomPos.row));
    setShotCol(randomPos.col + 1);
    setError(null);
  };

  return (
    <div className="section">
      <h2>🎯 Attack Board</h2>

      {opponentBoard ? (
        <>
          <BoardDisplay board={opponentBoard} title="Track Your Shots" />
        </>
      ) : (
        <div className="status-box">Initializing...</div>
      )}

      <div style={{ display: "flex", gap: "15px", alignItems: "center", marginTop: "15px" }}>
        <label>
          Row:{" "}
          <input
            type="text"
            maxLength={1}
            value={shotRow}
            onChange={(e) => setShotRow(e.target.value.toUpperCase())}
            style={{
              width: "60px",
              padding: "8px",
              fontSize: "16px",
              textAlign: "center",
              borderRadius: "6px",
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#e0e0e0",
            }}
          />
        </label>

        <label>
          Column:{" "}
          <input
            type="number"
            min={1}
            max={10}
            value={shotCol}
            onChange={(e) => setShotCol(parseInt(e.target.value) || 1)}
            style={{
              width: "70px",
              padding: "8px",
              fontSize: "16px",
              textAlign: "center",
              borderRadius: "6px",
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#e0e0e0",
            }}
          />
        </label>

        <button onClick={handleRandomCoords} disabled={isGameOver} className="secondary">
          🎲 Random
        </button>

        <button 
          onClick={handleFireShot} 
          disabled={isGameOver || !isMyTurn() || isAlreadyFired() || isFiring || waitingForProof || hasPendingShot} 
          className="danger"
          title={(waitingForProof || hasPendingShot) ? "Waiting for opponent to apply proof..." : "Fire a shot at the opponent"}
        >
          {isFiring ? "🎯 Firing Shot..." : (waitingForProof || hasPendingShot) ? "⏳ Waiting for Proof..." : "🔥 Fire Shot"}
        </button>
      </div>

      {error && (
        <div className="status-box" style={{ background: "#3a1a1a", borderColor: "#8B0000", color: "#FF5722" }}>
          {error}
        </div>
      )}

      <div className="status-box">
        {isGameOver 
          ? "🏁 Game Over - No more shots can be fired" 
          : !isMyTurn() 
            ? "Waiting for opponent..." 
            : (waitingForProof || hasPendingShot)
              ? "⏳ Waiting for opponent to apply proof..."
              : isAlreadyFired() 
                ? `⚠️ Already fired at ${shotRow}${shotCol} - choose a different position`
                : "Your turn! Select coordinates and fire"}
      </div>
    </div>
  );
}
