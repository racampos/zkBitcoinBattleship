/**
 * Game Management Component
 * Handles creating and joining games
 */

import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";

export function GameManagement() {
  const { account, gameId, setGameId, setError, isLoading, setIsLoading } = useGameStore();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");

  const handleCreateGame = async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      setError(null);

      // TODO: Call create_game contract
      console.log("🎲 Creating game...");

      // Placeholder - Replace with actual contract call
      const mockGameId = `game_${Date.now()}`;
      setGameId(mockGameId);

      console.log("✅ Game created:", mockGameId);
    } catch (error: any) {
      console.error("Failed to create game:", error);
      setError(`Failed to create game: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!account || !joinGameId) return;

    try {
      setIsLoading(true);
      setError(null);

      // TODO: Call join_game contract
      console.log("🎮 Joining game:", joinGameId);

      setGameId(joinGameId);
      setShowJoinInput(false);

      console.log("✅ Joined game:", joinGameId);
    } catch (error: any) {
      console.error("Failed to join game:", error);
      setError(`Failed to join game: ${error.message}`);
    } finally {
      setIsLoading(false);
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

      <div className="status-box">No game created</div>
    </div>
  );
}
