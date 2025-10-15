/**
 * StakingFlow Component - Plan B (Simplified Balance-Based System)
 * 
 * In Plan B:
 * - Users deposit 10k sats ONCE to their game wallet (see DepositWallet)
 * - For each match, they just stake 1k from their balance
 * - Approval is done once globally, not per-match
 * - Much simpler flow: Check balance → Approve (if needed) → Stake
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useGameContracts } from "../../hooks/useGameContracts";
import { useWBTCContracts } from "../../hooks/useWBTCContracts";
import { useStakingStatus } from "../../hooks/useStakingStatus";

const STAKE_AMOUNT_SATS = 1000n; // Per-match stake

export function StakingFlow() {
  const { account, gameId, gameData, amIPlayer1 } = useGameStore();
  const { stakeForGame } = useGameContracts(account);
  const { approveWBTC, checkAllowance, checkBalance, isApproving, WBTC_ADDRESS } = useWBTCContracts(account);
  const stakingStatus = useStakingStatus();
  
  const [wbtcBalance, setWbtcBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isStaking, setIsStaking] = useState(false); // Local staking state

  // Check balance and allowance periodically
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
    const interval = setInterval(checkBalances, 5000);
    
    return () => clearInterval(interval);
  }, [account, stakingStatus.iHaveStaked]);

  const handleApprove = async () => {
    try {
      // Approve a large amount (100k sats) so we don't need to approve per-match
      await approveWBTC(100000n);
      console.log("🔄 Refreshing allowance after approval...");
      const newAllowance = await checkAllowance();
      setAllowance(newAllowance);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleStake = async () => {
    try {
      setIsStaking(true);
      console.log(`💰 Staking ${STAKE_AMOUNT_SATS} sats from balance ${wbtcBalance}`);
      await stakeForGame(WBTC_ADDRESS, STAKE_AMOUNT_SATS);
    } catch (error) {
      // Error already handled in hook
    } finally {
      setIsStaking(false);
    }
  };

  // Hide if already staked
  if (stakingStatus.iHaveStaked) {
    return (
      <div className="section" style={{ background: "#1a3a1a", borderColor: "#2d5a2d" }}>
        <h2>✅ You've Staked!</h2>
        <div className="status-box success">
          <div style={{ marginBottom: "10px" }}>
            <strong>💰 Pot Size:</strong> 2,000 sats (0.00002 BTC)
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Your Stake:</strong> 1,000 sats ✅
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

  // Check requirements
  const hasEnoughBalance = wbtcBalance >= STAKE_AMOUNT_SATS;
  const isApproved = allowance >= STAKE_AMOUNT_SATS;
  const opponentStaked = amIPlayer1() ? stakingStatus.p2Staked : stakingStatus.p1Staked;

  return (
    <div className="section" style={{ background: "#3a1a1a", borderColor: "#8B0000" }}>
      <h2>🔒 {opponentStaked ? "Opponent Staked - You Must Stake Too!" : "Staking Required to Play"}</h2>

      <div className="status-box" style={{ marginBottom: "15px", background: "#3a1a1a", borderColor: "#FFA726" }}>
        <div style={{ fontSize: "16px", color: "#FFA726", marginBottom: "10px" }}>
          {opponentStaked ? "⚠️ Your opponent has staked 1,000 sats!" : "🔒 Staking is mandatory for all games"}
        </div>
        <div style={{ color: "#ccc" }}>
          {opponentStaked ? (
            <>
              Both players must stake to play.
              <br />
              Winner takes all: <strong>2,000 sats total!</strong>
            </>
          ) : (
            <>
              Each player stakes <strong>1,000 sats</strong> from their game wallet.
              <br />
              Winner takes the full pot: <strong>2,000 sats!</strong>
              <br />
              <em style={{ fontSize: "12px", color: "#888", marginTop: "5px", display: "block" }}>
                This ensures fair competition and rewards skilled play.
              </em>
            </>
          )}
        </div>
      </div>

      {/* Balance Display */}
      <div style={{ 
        background: "#2a0a0a", 
        padding: "10px", 
        borderRadius: "6px",
        marginBottom: "15px" 
      }}>
        <div style={{ marginBottom: "8px" }}>
          <strong>Your Balance:</strong>{" "}
          {isCheckingBalance ? (
            <span>Checking...</span>
          ) : (
            <span style={{ color: hasEnoughBalance ? "#4CAF50" : "#F44336" }}>
              {wbtcBalance.toString()} sats {hasEnoughBalance ? "✅" : "❌"}
            </span>
          )}
        </div>
        
        {!hasEnoughBalance && (
          <div style={{ color: "#F44336", fontSize: "13px", marginTop: "10px" }}>
            ⚠️ Insufficient balance. Need at least 1,000 sats.
            <br />
            <em>Go to "Game Wallet" section above to deposit more BTC.</em>
          </div>
        )}
      </div>

      {/* Staking Steps */}
      <div style={{ marginTop: "20px" }}>
        <h3 style={{ marginBottom: "15px", color: "#4CAF50" }}>Staking Steps:</h3>

        {/* Step 1: Approve (only if not approved) */}
        {!isApproved && (
          <div style={{ 
            marginBottom: "15px", 
            padding: "15px", 
            background: "#2a2a2a",
            borderRadius: "8px",
            border: "2px solid #444"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <strong>Step 1: Approve WBTC</strong>
                <div style={{ fontSize: "13px", color: "#ccc", marginTop: "5px" }}>
                  One-time approval for all future matches
                </div>
              </div>
              <button
                onClick={handleApprove}
                disabled={isApproving || !hasEnoughBalance}
                className="primary"
              >
                {isApproving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Stake */}
        <div style={{ 
          marginBottom: "15px", 
          padding: "15px", 
          background: isApproved ? "#2a2a2a" : "#1a1a1a",
          borderRadius: "8px",
          border: isApproved ? "2px solid #4CAF50" : "2px solid #444",
          opacity: isApproved ? 1 : 0.5
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong>{isApproved ? "Step 2" : "Step 2 (after approval)"}: Stake for Game</strong>
              <div style={{ fontSize: "13px", color: "#ccc", marginTop: "5px" }}>
                Lock 1,000 sats in escrow for this match
              </div>
            </div>
            <button
              onClick={handleStake}
              disabled={!isApproved || !hasEnoughBalance || isStaking}
              className="primary"
              style={{ opacity: isApproved ? 1 : 0.5 }}
            >
              {isStaking ? "Staking..." : "Stake 1,000 sats"}
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
