/**
 * StakingFlow Component
 * Handles WBTC approval and staking for games
 * Only shows if game requires staking and player hasn't staked yet
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { useWBTCContracts } from "../../hooks/useWBTCContracts";
import { useStakingStatus } from "../../hooks/useStakingStatus";

export function StakingFlow() {
  const { account, gameId, gameData, amIPlayer1 } = useGameStore();
  const { stakeForGame, isLoading } = useGameContracts(account);
  const { approveWBTC, checkAllowance, checkBalance, isApproving, STAKE_AMOUNT_SATS, MOCK_WBTC_ADDRESS } = useWBTCContracts(account);
  const stakingStatus = useStakingStatus();
  
  const [wbtcBalance, setWbtcBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [playingForFree, setPlayingForFree] = useState(false);

  const handleStake = async () => {
    try {
      await stakeForGame(MOCK_WBTC_ADDRESS, STAKE_AMOUNT_SATS);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handlePlayForFree = () => {
    setPlayingForFree(true);
  };

  const handleApprove = async () => {
    try {
      await approveWBTC();
      // Refresh allowance after approval
      console.log("🔄 Refreshing allowance after approval...");
      const newAllowance = await checkAllowance();
      setAllowance(newAllowance);
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Temporary: Mint WBTC for testing (only on Katana!)
  const handleMintWBTC = async () => {
    if (!account) return;
    
    try {
      console.log("🪙 Minting 100,000 sats of Mock WBTC...");
      const tx = await account.execute({
        contractAddress: MOCK_WBTC_ADDRESS,
        entrypoint: "mint",
        calldata: [
          account.address, // recipient
          "10000000000000", // 100k sats (u256 low)
          "0", // u256 high
        ],
      });
      
      console.log("📤 Mint transaction:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, { retryInterval: 1000 });
      console.log("✅ Minted successfully! Refreshing balance...");
      
      // Refresh balance
      const balance = await checkBalance();
      setWbtcBalance(balance);
    } catch (error: any) {
      console.error("❌ Failed to mint WBTC:", error);
    }
  };

  // Check balance and allowance on mount and after approval
  useEffect(() => {
    if (!account) return;

    const checkBalances = async () => {
      setIsCheckingBalance(true);
      const [balance, currentAllowance] = await Promise.all([
        checkBalance(),
        checkAllowance(),
      ]);
      setWbtcBalance(balance);
      setAllowance(currentAllowance);
      setIsCheckingBalance(false);
    };

    checkBalances();
  }, [account, stakingStatus.iHaveStaked]);

  // Hide if user chose to play for free and no escrow exists
  if (playingForFree && !stakingStatus.escrowExists) {
    return null;
  }

  // If opponent has staked, we must stake too (can't play for free)
  const opponentStaked = amIPlayer1() ? stakingStatus.p2Staked : stakingStatus.p1Staked;
  const mustStake = stakingStatus.escrowExists && opponentStaked;

  // Show confirmation if I've already staked
  if (stakingStatus.iHaveStaked) {
    return (
      <div className="section" style={{ background: "#1a3a1a", borderColor: "#2d5a2d" }}>
        <h2>✅ You've Staked!</h2>
        <div className="status-box success">
          <div style={{ marginBottom: "10px" }}>
            <strong>💰 Pot Size:</strong> 20,000 sats (0.0002 BTC)
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Your Stake:</strong> 10,000 sats ✅
          </div>
          {!stakingStatus.bothStaked && (
            <div style={{ color: "#FFA726", marginTop: "15px" }}>
              ⏳ Waiting for opponent to stake...
            </div>
          )}
          {stakingStatus.bothStaked && (
            <div style={{ color: "#4CAF50", marginTop: "15px" }}>
              🎮 Both players staked! Proceed to board setup.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check if user has enough balance
  const hasEnoughBalance = wbtcBalance >= STAKE_AMOUNT_SATS;
  const isApproved = allowance >= STAKE_AMOUNT_SATS;

  return (
    <div className="section" style={{ background: "#3a1a1a", borderColor: "#8B0000" }}>
      <h2>💰 {mustStake ? "Opponent Staked - You Must Stake Too!" : "Choose Game Mode"}</h2>

      {mustStake ? (
        <div className="status-box" style={{ marginBottom: "15px", background: "#3a1a1a", borderColor: "#FFA726" }}>
          <div style={{ fontSize: "16px", color: "#FFA726", marginBottom: "10px" }}>
            ⚠️ Your opponent has staked 10,000 sats!
          </div>
          <div style={{ color: "#ccc" }}>
            This is now a <strong>staked game</strong>. You must stake 10,000 sats to continue.
            <br />
            Winner takes all: <strong>20,000 sats total!</strong>
          </div>
        </div>
      ) : (
        <>
          <div className="status-box" style={{ marginBottom: "15px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
              🎮 Option 1: Play for Free
            </div>
            <div style={{ color: "#ccc", marginBottom: "15px" }}>
              Just for fun, no stakes involved.
            </div>
            <button onClick={handlePlayForFree} className="secondary" style={{ width: "100%" }}>
              Play for Free (No Stakes)
            </button>
          </div>

          <div style={{ margin: "20px 0", textAlign: "center", color: "#666" }}>
            — OR —
          </div>

          <div className="status-box" style={{ marginBottom: "15px", background: "#1a3a1a", borderColor: "#2d5a2d" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
              💰 Option 2: Winner Takes All
            </div>
            <div style={{ color: "#ccc", marginBottom: "15px" }}>
              Each player stakes <strong>10,000 satoshis</strong> (0.0001 BTC)
              <br />
              Winner gets the full pot: <strong>20,000 sats!</strong>
            </div>
          </div>
        </>
      )}

      {/* Balance Display - Only show if staking (not playing for free) */}
      {!playingForFree && (
        <>
          <div style={{ 
            background: "#2a0a0a", 
            padding: "10px", 
            borderRadius: "6px",
            marginTop: "15px" 
          }}>
            <div style={{ marginBottom: "8px" }}>
              <strong>Your WBTC Balance:</strong>{" "}
              {isCheckingBalance ? (
                <span>Checking...</span>
              ) : (
                <span style={{ color: hasEnoughBalance ? "#4CAF50" : "#F44336" }}>
                  {wbtcBalance.toString()} sats {hasEnoughBalance ? "✅" : "❌"}
                </span>
            )}
          </div>
          {!hasEnoughBalance && (
            <div>
              <div style={{ color: "#F44336", fontSize: "13px", marginBottom: "10px" }}>
                ⚠️ Insufficient balance. Need at least 10,000 sats.
              </div>
              <button
                onClick={handleMintWBTC}
                className="secondary"
                style={{ width: "100%", fontSize: "13px" }}
              >
                🪙 Mint 100,000 sats (Testnet Only)
              </button>
            </div>
          )}
        </div>

          {/* Staking Steps */}
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ marginBottom: "15px", color: "#4CAF50" }}>Staking Steps:</h3>

            {/* Step 1: Approve */}
            <div style={{ 
              marginBottom: "15px", 
              padding: "15px", 
              background: isApproved ? "#1a3a1a" : "#2a2a2a",
              borderRadius: "8px",
              border: `2px solid ${isApproved ? "#2d5a2d" : "#444"}`
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong>Step 1: Approve WBTC</strong>
                  <div style={{ fontSize: "13px", color: "#ccc", marginTop: "5px" }}>
                    Allow escrow contract to hold your stake
                  </div>
                </div>
                {isApproved ? (
                  <span style={{ color: "#4CAF50", fontSize: "20px" }}>✅</span>
                ) : (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || !hasEnoughBalance || isLoading}
                    className="primary"
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Stake */}
            <div style={{ 
              marginBottom: "15px", 
              padding: "15px", 
              background: "#2a2a2a",
              borderRadius: "8px",
              border: "2px solid #444",
              opacity: isApproved ? 1 : 0.5
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong>Step 2: Stake for Game</strong>
                  <div style={{ fontSize: "13px", color: "#ccc", marginTop: "5px" }}>
                    Lock 10,000 sats in escrow
                  </div>
                </div>
                <button
                  onClick={handleStake}
                  disabled={!isApproved || isLoading}
                  className="primary"
                  style={{ opacity: isApproved ? 1 : 0.5 }}
                >
                  {isLoading ? "Staking..." : "Stake 10,000 sats"}
                </button>
              </div>
            </div>
          </div>

          {/* Staking Status */}
          <div className="status-box" style={{ marginTop: "20px" }}>
            <strong>Staking Status:</strong>
            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                Player 1: {stakingStatus.p1Staked ? "✅ Staked" : "⏳ Pending"}
              </div>
              <div>
                Player 2: {stakingStatus.p2Staked ? "✅ Staked" : "⏳ Pending"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

