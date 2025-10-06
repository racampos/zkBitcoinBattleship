/**
 * Board Setup Component
 * Handles ship placement and board commitment
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";

export function BoardSetup() {
  const { myBoard } = useGameStore();

  return (
    <div className="section">
      <h2>🛡️ Your Defense Board</h2>

      <div className="board-container">
        {myBoard ? (
          <div>
            {/* TODO: Render actual board */}
            <pre>Board rendering coming soon...</pre>
          </div>
        ) : (
          <div>Loading board...</div>
        )}
      </div>

      <button className="primary" disabled>
        Commit Board
      </button>

      <div className="status-box">Set up your ships...</div>
    </div>
  );
}
