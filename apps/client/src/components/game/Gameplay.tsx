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
  const { account, gameData, gameId, opponentBoard, setOpponentBoard, isMyTurn } = useGameStore();
  const { fireShot } = useGameContracts(account);
  const [error, setError] = useState<string | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [waitingForProof, setWaitingForProof] = useState(false);
  const [lastShotCoords, setLastShotCoords] = useState<{ row: number; col: number } | null>(null);
  const [shotResultMessage, setShotResultMessage] = useState<string | null>(null);
  
  const isGameOver = gameData?.status === 2;
  
  // Check if there's a pending shot waiting for opponent to apply proof
  const hasPendingShot = gameData?.pending_shot !== undefined;
  const myTurn = isMyTurn();
  
  // Clear board state when game ID changes (new game started)
  useEffect(() => {
    if (gameId) {
      console.log(`🎮 New game detected: ${gameId} - resetting opponent board and shot state`);
      setOpponentBoard(createEmptyBoard());
      setWaitingForProof(false);
      setLastShotCoords(null);
      setShotResultMessage(null);
      setError(null);
    }
  }, [gameId, setOpponentBoard]);
  
  // Detect when shot result appears on opponent board (proof was applied)
  useEffect(() => {
    if (!waitingForProof || !lastShotCoords || !opponentBoard) return;
    
    const cellValue = opponentBoard[lastShotCoords.row][lastShotCoords.col];
    
    // CRITICAL: Only detect NEW results (not stale data from previous games)
    // Cell should be 0 (empty) when we first fire, THEN become 2 or 3 after proof
    // If it's already 2 or 3, it's stale data - ignore it
    if (cellValue === 0) {
      // Cell is still empty - proof not applied yet (expected)
      return;
    }
    
    // If cell has a result (2=hit, 3=miss), proof was applied!
    if (cellValue === 2 || cellValue === 3) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 SHOT RESULT DETECTED');
      console.log(`   My Address: ${account?.address}`);
      console.log(`   Shot Coords: (${lastShotCoords.row}, ${lastShotCoords.col}) = ${String.fromCharCode(65 + lastShotCoords.row)}${lastShotCoords.col + 1}`);
      console.log(`   Cell Value: ${cellValue} (${cellValue === 2 ? 'HIT' : 'MISS'})`);
      console.log(`   Current Turn: ${gameData?.current_turn}`);
      console.log(`   Is My Turn: ${myTurn}`);
      console.log(`   Has Pending Shot: ${hasPendingShot}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // IMPORTANT: Only wait for pending_shot to clear (proof was applied)
      // The turn will flip to the OPPONENT after proof, not back to us!
      const checkAndEnable = () => {
        const currentHasPendingShot = useGameStore.getState().gameData?.pending_shot !== undefined;
        
        // If pending shot still exists, proof wasn't applied yet
        if (currentHasPendingShot) {
          console.log(`⚠️ Proof not applied yet - pending: ${currentHasPendingShot}`);
          return; // Don't retry - will be triggered by next useEffect run
        }
        
        console.log('✅ Proof confirmed - showing result');
        console.log(`   Displaying message for MY shot at ${String.fromCharCode(65 + lastShotCoords.row)}${lastShotCoords.col + 1}`);
        setWaitingForProof(false);
        
        // Show result notification
        if (cellValue === 2) {
          setShotResultMessage(`🎯 HIT at ${String.fromCharCode(65 + lastShotCoords.row)}${lastShotCoords.col + 1}!`);
        } else {
          setShotResultMessage(`💧 MISS at ${String.fromCharCode(65 + lastShotCoords.row)}${lastShotCoords.col + 1}`);
        }
        
        // Clear message after 5 seconds
        setTimeout(() => setShotResultMessage(null), 5000);
      };
      
      // Check immediately (no need for delay - useEffect will re-run when conditions change)
      checkAndEnable();
    }
  }, [waitingForProof, lastShotCoords, opponentBoard, hasPendingShot, myTurn]);

  // Initialize opponent board if not set
  useEffect(() => {
    if (!opponentBoard) {
      setOpponentBoard(createEmptyBoard());
    }
  }, [opponentBoard, setOpponentBoard]);

  const handleFireShot = async (row: number, col: number) => {
    // Check if already fired at this position
    if (opponentBoard && opponentBoard[row][col] > 0) {
      const coordinate = `${String.fromCharCode(65 + row)}${col + 1}`;
      setError(`❌ You've already fired at ${coordinate}!`);
      return;
    }

    setError(null);
    setShotResultMessage(null); // Clear any previous result message
    setIsFiring(true);
    
    // Optimistic UI update: Immediately show bullseye on clicked cell
    const newBoard = opponentBoard.map((r, y) =>
      r.map((cell, x) => (y === row && x === col ? 4 : cell)) // 4 = pending shot
    );
    setOpponentBoard(newBoard);
    
    const coordinate = `${String.fromCharCode(65 + row)}${col + 1}`;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 FIRING SHOT');
    console.log(`   My Address: ${account?.address}`);
    console.log(`   Target: ${coordinate} (${row}, ${col})`);
    console.log(`   Current Turn: ${gameData?.current_turn}`);
    console.log(`   Is My Turn: ${myTurn}`);
    console.log(`   Has Pending Shot: ${hasPendingShot}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      await fireShot(row, col);
      // Shot succeeded! Save coordinates and wait for proof
      console.log(`✅ Shot fired successfully - waiting for defender to apply proof`);
      setLastShotCoords({ row, col });
      setWaitingForProof(true);
    } catch (error) {
      console.log(`❌ Shot firing failed`);
      // Revert optimistic update if shot failed
      const revertedBoard = opponentBoard.map((r, y) =>
        r.map((cell, x) => (y === row && x === col ? 0 : cell))
      );
      setOpponentBoard(revertedBoard);
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <div className="section">
      <h2>🎯 Attack Board</h2>

      {opponentBoard ? (
        <>
          <BoardDisplay 
            board={opponentBoard}
            ships={[]}
            title="Click a cell to fire 🎯" 
            isActive={myTurn && !waitingForProof}
            showShipColors={false}
            onCellClick={handleFireShot}
            isClickable={myTurn && !waitingForProof && !isFiring && !hasPendingShot && !isGameOver}
          />
        </>
      ) : (
        <div className="status-box">Initializing...</div>
      )}

      {error && (
        <div className="status-box" style={{ background: "#3a1a1a", borderColor: "#8B0000", color: "#FF5722" }}>
          {error}
        </div>
      )}

      {shotResultMessage && (
        <div 
          className="status-box" 
          style={{ 
            background: shotResultMessage.includes("HIT") ? "#1a3a1a" : "#1a2a3a", 
            borderColor: shotResultMessage.includes("HIT") ? "#4CAF50" : "#2196F3",
            color: shotResultMessage.includes("HIT") ? "#4CAF50" : "#2196F3",
            fontWeight: "bold",
            fontSize: "16px",
            animation: "pulse 0.5s ease-in-out"
          }}
        >
          {shotResultMessage}
        </div>
      )}

      <div className="status-box">
        {isGameOver 
          ? "🏁 Game Over - No more shots can be fired" 
          : !myTurn 
            ? "⏳ Waiting for opponent..." 
            : (waitingForProof || hasPendingShot)
              ? "⏳ Waiting for opponent to apply proof..."
              : isFiring
                ? "🎯 Firing shot..."
                : "✨ Your turn! Click a cell to fire"}
      </div>
    </div>
  );
}
