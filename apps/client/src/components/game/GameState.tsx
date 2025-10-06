/**
 * Game State Component
 * Displays current game state information
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";

export function GameState() {
  const { gameData, amIPlayer1 } = useGameStore();

  if (!gameData) {
    return null;
  }

  const statusMap: Record<number, string> = {
    0: "⏳ Waiting for Player 2",
    1: "🎮 In Progress",
    2: "🏁 Game Over",
  };

  const isPlayer1 = amIPlayer1();
  const myTurn = gameData.current_turn === (isPlayer1 ? gameData.player_1 : gameData.player_2);

  return (
    <div className="section">
      <h2>📊 Game State</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <div className="status-box">
          <strong>Status:</strong><br />
          {statusMap[gameData.status] || "❓ Unknown"}
        </div>
        
        <div className={`status-box ${myTurn ? 'success' : ''}`}>
          <strong>Turn:</strong><br />
          {myTurn ? "🟢 Your Turn!" : "⏸️ Opponent's Turn"}
        </div>
        
        <div className="status-box">
          <strong>Your Role:</strong><br />
          {isPlayer1 ? "Player 1" : "Player 2"}
        </div>
        
        <div className="status-box">
          <strong>Your Hits:</strong><br />
          {isPlayer1 ? gameData.p1_hits : gameData.p2_hits}
        </div>
        
        <div className="status-box">
          <strong>Opponent Hits:</strong><br />
          {isPlayer1 ? gameData.p2_hits : gameData.p1_hits}
        </div>
      </div>

      {gameData.status === 1 && (
        <div className="status-box" style={{ marginTop: "12px", fontSize: "13px" }}>
          {myTurn ? (
            <>🎯 <strong>Your turn!</strong> Fire a shot at your opponent's board below.</>
          ) : (
            <>⏳ <strong>Waiting for opponent...</strong> They're taking their shot.</>
          )}
        </div>
      )}
    </div>
  );
}
