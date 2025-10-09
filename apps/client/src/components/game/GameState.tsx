/**
 * Game State Component
 * Displays current game state information
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";

const DEBUG_CONTRACT = "0x7530ebca2a2e338c3bd380ee12522d8014462965bdddf1a2ee99678a87badf9";

export function GameState() {
  const { gameData, amIPlayer1, account, gameId } = useGameStore();

  // DEBUG: Set opponent to 1 remaining hit
  const handleDebugSetOpponentLowHP = async () => {
    if (!account || !gameData) return;
    
    const opponentAddr = amIPlayer1() ? gameData.player_2 : gameData.player_1;
    
    try {
      console.log("🐛 DEBUG: Setting opponent to 1 remaining hit...");
      const tx = await account.execute({
        contractAddress: DEBUG_CONTRACT,
        entrypoint: "set_ship_alive_count",
        calldata: [
          gameId || "0x0", // game_id
          opponentAddr, // player
          "1", // remaining_hits
        ],
      });
      
      console.log("📤 Debug tx:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, { retryInterval: 1000 });
      console.log("✅ Opponent now has 1 hit remaining - fire ONE shot to win!");
      alert("✅ Opponent set to 1 HP! Fire any shot to win and test payout!");
    } catch (error: any) {
      console.error("❌ Debug failed:", error);
      alert("Failed: " + error.message);
    }
  };

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

      {/* DEBUG BUTTON - Remove before production! */}
      {gameData.status === 1 && !isGameOver && (
        <div style={{ marginBottom: "15px", padding: "10px", background: "#3a1a1a", borderRadius: "8px", border: "2px solid #8B0000" }}>
          <div style={{ fontSize: "12px", color: "#FFA726", marginBottom: "8px" }}>
            🐛 DEBUG MODE (Remove before production!)
          </div>
          <button
            onClick={handleDebugSetOpponentLowHP}
            className="secondary"
            style={{ fontSize: "12px", width: "100%" }}
          >
            ⚡ Set Opponent to 1 HP (Test Winner Payout)
          </button>
        </div>
      )}

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
