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
    0: "Created",
    1: "Coin Flip",
    2: "Board Setup",
    3: "Active",
    4: "Finished",
  };

  return (
    <div className="section">
      <h2>📊 Game State</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        <div className="status-box">
          <strong>Status:</strong> {statusMap[gameData.status] || "Unknown"}
        </div>
        <div className="status-box">
          <strong>Turn:</strong> {gameData.current_turn === gameData.player_1 ? "Player 1" : "Player 2"}
        </div>
        <div className="status-box">
          <strong>You are:</strong> {amIPlayer1() ? "Player 1" : "Player 2"}
        </div>
        <div className="status-box">
          <strong>Your Hits:</strong> {amIPlayer1() ? gameData.p1_hits : gameData.p2_hits}
        </div>
        <div className="status-box">
          <strong>Opponent Hits:</strong> {amIPlayer1() ? gameData.p2_hits : gameData.p1_hits}
        </div>
      </div>

      <div className="status-box info" style={{ marginTop: "15px", fontSize: "11px" }}>
        💡 Game ID: {gameData.game_id}
      </div>
    </div>
  );
}
