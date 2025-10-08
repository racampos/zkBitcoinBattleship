/**
 * Game State Component
 * Displays current game state information
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";

export function GameState() {
  const { gameData, amIPlayer1, account } = useGameStore();

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
  
  // Determine winner (player with 17 hits wins - all 5 ships sunk)
  const isGameOver = gameData.status === 2;
  const p1Won = gameData.p1_hits >= 17;
  const p2Won = gameData.p2_hits >= 17;
  const iWon = (isPlayer1 && p1Won) || (!isPlayer1 && p2Won);

  return (
    <div className="section">
      <h2>📊 Game State</h2>

      {/* Winner Announcement - Only show when game is over */}
      {isGameOver && (
        <div 
          className="status-box" 
          style={{ 
            marginBottom: "20px",
            padding: "20px",
            background: iWon ? "linear-gradient(135deg, #1a4d1a 0%, #2d5a2d 100%)" : "linear-gradient(135deg, #4d1a1a 0%, #5a2d2d 100%)",
            borderColor: iWon ? "#4CAF50" : "#F44336",
            borderWidth: "3px",
            fontSize: "20px",
            fontWeight: "bold",
            textAlign: "center" as const,
            animation: "pulse 2s infinite"
          }}
        >
          {iWon ? (
            <>🎉 <span style={{ color: "#4CAF50" }}>VICTORY!</span> 🎉<br />
            <span style={{ fontSize: "14px", fontWeight: "normal", marginTop: "8px", display: "block" }}>
              You sank all enemy ships!
            </span></>
          ) : (
            <>💥 <span style={{ color: "#F44336" }}>DEFEAT</span> 💥<br />
            <span style={{ fontSize: "14px", fontWeight: "normal", marginTop: "8px", display: "block" }}>
              All your ships have been sunk!
            </span></>
          )}
        </div>
      )}

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
        
        {/* Only show turn info if game is active */}
        {!isGameOver && (
          <div className={`status-box ${myTurn ? 'success' : ''}`}>
            <strong>Turn:</strong><br />
            {myTurn ? "🟢 Your Turn!" : "⏸️ Opponent's Turn"}
          </div>
        )}
        
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
