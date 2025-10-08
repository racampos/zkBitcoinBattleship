/**
 * Game Management Component
 * Handles creating and joining games
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";

export function GameManagement() {
  const { account, gameId, gameData, setGameId, isLoading, error, amIPlayer1 } = useGameStore();
  const { createGame, joinGame } = useGameContracts(account);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");

  // Check for game ID in URL and auto-join
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('game');
    
    if (gameIdFromUrl && !gameId) {
      console.log('🔗 Game ID from URL:', gameIdFromUrl);
      setJoinGameId(gameIdFromUrl);
      setShowJoinInput(true);
      // Auto-join after a short delay to ensure UI is ready
      setTimeout(() => {
        if (account) {
          joinGame(gameIdFromUrl);
        }
      }, 500);
    }
  }, [account, gameId, joinGame]);

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

  if (gameId && gameData) {
    const isPlayer1 = amIPlayer1();
    const playerRole = isPlayer1 ? "Player 1 (Creator)" : "Player 2";
    const statusText = 
      gameData.status === 0 ? "⏳ Waiting for Player 2" :
      gameData.status === 1 ? "🎮 Active - In Progress" :
      gameData.status === 2 ? "🏁 Game Over" : "❓ Unknown";
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;

    return (
      <div className="section">
        <h2>📋 Current Game</h2>
        
        <div className="status-box">
          <div style={{ marginBottom: "8px" }}>
            <strong>Game ID:</strong> <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{gameId.substring(0, 20)}...</span>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong>Your Role:</strong> {playerRole}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong>Status:</strong> {statusText}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong>Player 1:</strong> <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{gameData.player_1.substring(0, 10)}...</span>
          </div>
          <div>
            <strong>Player 2:</strong> <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {gameData.player_2 === "0x0" ? "Waiting..." : gameData.player_2.substring(0, 10) + "..."}
            </span>
          </div>
        </div>

        {/* Share link if waiting for P2 and you're P1 */}
        {gameData.player_2 === "0x0" && isPlayer1 && (
          <div className="status-box" style={{ marginTop: "10px", background: "#1a3a1a", borderColor: "#2d5a2d" }}>
            <strong>📤 Share this link with Player 2:</strong>
            <div style={{ 
              fontSize: "11px", 
              wordBreak: "break-all", 
              marginTop: "5px",
              fontFamily: "monospace",
              background: "#0d1f0d",
              padding: "8px",
              borderRadius: "4px"
            }}>
              {shareUrl}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setGameId(null);
            setJoinGameId("");
          }}
          className="secondary"
          style={{ marginTop: "10px" }}
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
