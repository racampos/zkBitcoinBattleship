/**
 * Game State Component
 * Displays current game state information
 */

import React, { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";

// Confetti component (CSS-based, no dependencies!)
const Confetti = () => {
  const pieces = Array.from({ length: 50 }, (_, i) => i);
  const colors = ['#FFD700', '#FFA500', '#FF6347', '#4CAF50', '#2196F3', '#9C27B0'];
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: '-10px',
            width: '10px',
            height: '10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            opacity: Math.random() * 0.7 + 0.3,
            animation: `confetti-fall ${Math.random() * 3 + 2}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(${Math.random() * 720}deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export function GameState() {
  // ALL HOOKS MUST BE CALLED FIRST (before any early returns)
  const { gameData, amIPlayer1, account, gameId } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti when winner (useEffect MUST be called before early return!)
  useEffect(() => {
    if (gameData && gameData.status === 2) {
      const isPlayer1 = amIPlayer1();
      const p1Won = gameData.p1_hits >= 17;
      const p2Won = gameData.p2_hits >= 17;
      const iWon = (isPlayer1 && p1Won) || (!isPlayer1 && p2Won);
      
      if (iWon && !showConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
  }, [gameData, amIPlayer1, showConfetti]);

  // Early return AFTER all hooks
  if (!gameData) {
    return null;
  }

  // Now safe to calculate derived values (after gameData check)
  const statusMap: Record<number, string> = {
    0: "⏳ Waiting for Player 2",
    1: "🎮 In Progress",
    2: "🏁 Game Over",
  };

  const isPlayer1 = amIPlayer1();
  const myTurn = gameData.current_turn === (isPlayer1 ? gameData.player_1 : gameData.player_2);
  
  // Calculate winner/loser state for confetti and banner
  const isGameOver = gameData.status === 2;
  const p1Won = gameData.p1_hits >= 17;
  const p2Won = gameData.p2_hits >= 17;
  const iWon = (isPlayer1 && p1Won) || (!isPlayer1 && p2Won);

  return (
    <div className="section">
      {/* Confetti for winner! */}
      {showConfetti && <Confetti />}
      
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
            <>
              🎉 <span style={{ color: "#4CAF50" }}>VICTORY!</span> 🎉
              <div style={{ fontSize: "14px", fontWeight: "normal", marginTop: "12px", lineHeight: "1.6" }}>
                You sank all enemy ships and won the pot!
              </div>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                marginTop: "16px", 
                padding: "12px",
                background: "rgba(76, 175, 80, 0.2)",
                borderRadius: "8px",
                border: "1px solid #4CAF50"
              }}>
                💰 Winnings: <span style={{ color: "#4CAF50" }}>+2,000 sats</span>
                <div style={{ fontSize: "12px", fontWeight: "normal", marginTop: "6px", color: "#aaa" }}>
                  (Your stake returned + opponent's stake)
                </div>
              </div>
            </>
          ) : (
            <>
              💥 <span style={{ color: "#F44336" }}>DEFEAT</span> 💥
              <div style={{ fontSize: "14px", fontWeight: "normal", marginTop: "12px", lineHeight: "1.6" }}>
                All your ships have been sunk!
              </div>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                marginTop: "16px", 
                padding: "12px",
                background: "rgba(244, 67, 54, 0.2)",
                borderRadius: "8px",
                border: "1px solid #F44336"
              }}>
                💸 Stake Lost: <span style={{ color: "#F44336" }}>-1,000 sats</span>
                <div style={{ fontSize: "12px", fontWeight: "normal", marginTop: "6px", color: "#aaa" }}>
                  (Transferred to winner)
                </div>
              </div>
            </>
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
          <div className={`status-box ${myTurn ? 'success your-turn' : ''}`}>
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
        <div className={`status-box ${myTurn ? 'success your-turn' : ''}`} style={{ marginTop: "12px", fontSize: "13px" }}>
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
