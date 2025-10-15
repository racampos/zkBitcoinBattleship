/**
 * Game Management Component
 * Handles creating and joining games
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { clearBoardFromStorage } from "../../utils/boardUtils";

export function GameManagement() {
  const { account, gameId, gameData, setGameId, isLoading, error, amIPlayer1 } = useGameStore();
  const { createGame, joinGame } = useGameContracts(account);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameId, setJoinGameId] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Persist game ID to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (gameId) {
      localStorage.setItem('battleship_game_id', gameId);
      // Also update URL
      const url = new URL(window.location.href);
      url.searchParams.set('game', gameId);
      window.history.replaceState({}, '', url);
      console.log('💾 Game ID persisted:', gameId);
    } else if (hasInitialized) {
      // Only remove from localStorage/URL if we've initialized
      // (prevents removing URL param on initial mount before we've read it)
      localStorage.removeItem('battleship_game_id');
      // Remove from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('game');
      window.history.replaceState({}, '', url);
    }
  }, [gameId, hasInitialized]);

  // Load game ID from URL or localStorage when account is ready
  useEffect(() => {
    if (!account) return; // Wait for account
    if (gameId) {
      setHasInitialized(true); // Already have a game, mark as initialized
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('game');
    const gameIdFromStorage = localStorage.getItem('battleship_game_id');
    
    const restoredGameId = gameIdFromUrl || gameIdFromStorage;
    
    if (restoredGameId) {
      const source = gameIdFromUrl ? 'URL' : 'localStorage';
      console.log('♻️ Restoring game ID:', restoredGameId, 'from', source);
      
      // Set the game ID first
      setGameId(restoredGameId);
      
      // If coming from URL (shared link), try to join the game
      // This will succeed if we're P2 joining for the first time
      // It will gracefully fail if we're P1 or already joined
      if (gameIdFromUrl) {
        console.log('🔗 URL game link detected - attempting to join...');
        joinGame(restoredGameId).catch((err) => {
          // Silently ignore errors - could be P1 restoring or already joined
          console.log('ℹ️ Join attempt from URL failed (likely already in game):', err.message);
        });
      }
    }
    
    // Mark as initialized whether we found a game or not
    setHasInitialized(true);
  }, [account, gameId, setGameId, joinGame]);

  // Manual restore button
  const storedGameId = localStorage.getItem('battleship_game_id');
  const canRestore = storedGameId && !gameId;

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
      // First, just set the game ID (works for both joining and restoring)
      setGameId(joinGameId);
      
      // Then try to join if we're actually Player 2 (will gracefully fail if we're P1)
      try {
        await joinGame(joinGameId);
      } catch (joinError: any) {
        // Ignore join errors - we might be P1 just restoring
        if (joinError?.message?.includes('already')) {
          console.log('ℹ️ Already in this game (probably P1 restoring)');
        }
      }
      
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
            if (confirm('⚠️ Are you sure you want to leave this game? This will clear the game from your session (you can rejoin later using the game ID).')) {
              // Clear board from localStorage
              if (gameId) {
                clearBoardFromStorage(gameId);
              }
              setGameId(null);
              setJoinGameId("");
            }
          }}
          className="secondary"
          style={{ marginTop: "10px" }}
        >
          Leave Game
        </button>
      </div>
    );
  }

  // Handle case where gameId exists but gameData is null (stale/invalid game)
  if (gameId && !gameData) {
    return (
      <div className="section">
        <h2>⚠️ Game Not Found</h2>
        
        <div className="status-box" style={{ background: "#3a1a1a", borderColor: "#FF5722" }}>
          <div style={{ marginBottom: "10px" }}>
            <strong>Game ID:</strong> <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{gameId.substring(0, 30)}...</span>
          </div>
          <div style={{ marginBottom: "15px", fontSize: "14px" }}>
            This game could not be found. Possible reasons:
            <ul style={{ marginTop: "8px", marginBottom: "0", paddingLeft: "20px" }}>
              <li>Game was created on a different network (Katana vs Sepolia)</li>
              <li>Torii indexer hasn't synced this game yet</li>
              <li>Game ID is invalid or corrupted</li>
            </ul>
          </div>
          <button 
            onClick={() => {
              console.log('🗑️ Clearing stale game ID');
              if (gameId) {
                clearBoardFromStorage(gameId);
              }
              setGameId(null);
            }}
            className="secondary"
            style={{ width: "100%" }}
          >
            Clear and Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>🎲 Game Management</h2>

      {/* Restore Last Game Button */}
      {canRestore && (
        <div className="status-box" style={{ marginBottom: "15px", background: "#1a3a1a", borderColor: "#2d5a2d" }}>
          <div style={{ marginBottom: "10px" }}>
            <strong>♻️ Found Previous Game</strong>
          </div>
          <div style={{ fontSize: "12px", marginBottom: "10px", fontFamily: "monospace", color: "#888" }}>
            {storedGameId.substring(0, 30)}...
          </div>
          <button 
            onClick={() => {
              console.log('♻️ Manually restoring game:', storedGameId);
              setGameId(storedGameId);
            }} 
            className="primary"
            style={{ width: "100%" }}
          >
            Restore Last Game
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button onClick={handleCreateGame} disabled={isLoading} className="primary">
          {isLoading ? "Creating..." : "Create Open Game"}
        </button>
        <button onClick={() => setShowJoinInput(!showJoinInput)} className="secondary">
          {showJoinInput ? "Cancel" : "Join / Restore Game"}
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
