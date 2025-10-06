/**
 * Gameplay Component
 * Handles firing shots and tracking opponent's board
 */

import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";

export function Gameplay() {
  const { opponentBoard, isMyTurn } = useGameStore();
  const [shotRow, setShotRow] = useState("A");
  const [shotCol, setShotCol] = useState(1);

  const handleFireShot = async () => {
    // TODO: Implement fire shot logic
    console.log(`🎯 Firing at ${shotRow}${shotCol}`);
  };

  const handleRandomCoords = () => {
    const randomRow = String.fromCharCode(65 + Math.floor(Math.random() * 10)); // A-J
    const randomCol = Math.floor(Math.random() * 10) + 1; // 1-10
    setShotRow(randomRow);
    setShotCol(randomCol);
  };

  return (
    <div className="section">
      <h2>🎯 Attack Board</h2>

      <div className="board-container">
        {opponentBoard ? (
          <div>
            {/* TODO: Render attack board */}
            <pre>Attack board rendering coming soon...</pre>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>

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

        <button onClick={handleRandomCoords} className="secondary">
          🎲 Random
        </button>

        <button onClick={handleFireShot} disabled={!isMyTurn()} className="danger">
          🔥 Fire Shot
        </button>
      </div>

      <div className="status-box">
        {isMyTurn() ? "Your turn!" : "Waiting for opponent..."}
      </div>
    </div>
  );
}
