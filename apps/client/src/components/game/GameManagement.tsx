/**
 * Game Management Component
 * Handles creating and joining games
 */

import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";

export function GameManagement() {
  const { account, gameId, setGameId, isLoading, error } = useGameStore();
  const { createGame, joinGame } = useGameContracts(account);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");

  const handleCreateGame = async () => {
    try {
      await createGame();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleJoinGame = async () => {
    if (!joinGameId) return;

    try {
      await joinGame(joinGameId);
      setShowJoinInput(false);
      setJoinGameId("");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  if (gameId) {
    return (
      <div className="section">
        <h2>🎲 Game Management</h2>
        <div className="status-box info">
          <strong>Game ID:</strong> {gameId}
        </div>
        <button
          onClick={() => {
            setGameId(null);
            setJoinGameId("");
          }}
          className="secondary"
        >
          Leave Game
        </button>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>🎲 Game Management</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button onClick={handleCreateGame} disabled={isLoading} className="primary">
          {isLoading ? "Creating..." : "Create Open Game"}
        </button>
        <button onClick={() => setShowJoinInput(!showJoinInput)} className="secondary">
          {showJoinInput ? "Cancel" : "Join Game"}
        </button>
      </div>

      {showJoinInput && (
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Enter Game ID"
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "14px",
              borderRadius: "8px",
              border: "1px solid #444",
              background: "#2a2a2a",
              color: "#e0e0e0",
            }}
          />
          <button onClick={handleJoinGame} disabled={!joinGameId || isLoading} className="primary">
            Join
          </button>
        </div>
      )}

      {error ? (
        <div className="status-box error">{error}</div>
      ) : (
        <div className="status-box">No game created</div>
      )}
    </div>
  );
}
