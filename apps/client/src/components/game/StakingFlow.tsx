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
  const { account, gameId, gameData } = useGameStore();
  const { stakeForGame, isLoading } = useGameContracts(account);
  const { approveWBTC, checkAllowance, checkBalance, isApproving, STAKE_AMOUNT_SATS, MOCK_WBTC_ADDRESS } = useWBTCContracts(account);
  const stakingStatus = useStakingStatus();
  
  const [wbtcBalance, setWbtcBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const handleStake = async () => {
    try {
      await stakeForGame(MOCK_WBTC_ADDRESS, STAKE_AMOUNT_SATS);
    } catch (error) {
      // Error already handled in hook
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

  // Don't show if staking not required
  if (!stakingStatus.required) return null;

  // Don't show if I've already staked
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
      <h2>💰 Stake WBTC to Play</h2>

      <div className="status-box" style={{ marginBottom: "15px" }}>
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
          Winner Takes All: 20,000 sats
        </div>
        <div style={{ color: "#ccc", marginBottom: "15px" }}>
          Each player stakes <strong>10,000 satoshis</strong> (0.0001 BTC)
          <br />
          Winner gets the full pot!
        </div>

        {/* Balance Display */}
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
            <div style={{ color: "#F44336", fontSize: "13px" }}>
              ⚠️ Insufficient balance. Need at least 10,000 sats.
            </div>
          )}
        </div>
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
                onClick={approveWBTC}
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
    </div>
  );
}

