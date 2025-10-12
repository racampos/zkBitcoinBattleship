/**
 * Deposit Wallet Component - Plan B (On-Chain Deposit System)
 * 
 * Users deposit 10k sats ONCE via on-chain BTC swap (testnet).
 * This gives them a "game wallet" balance they can use for multiple matches.
 * 
 * Flow:
 * 1. Connect Xverse wallet
 * 2. Click "Deposit 10,000 sats"
 * 3. Atomiq creates on-chain swap (20 min wait)
 * 4. WBTC arrives in user's Starknet account
 * 5. User can now play multiple matches using this balance
 */

import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useWBTCContracts } from "../../hooks/useWBTCContracts";
import { XverseService } from "../../services/xverse";
import { AtomiqService } from "../../services/atomiq";
import { serializePSBT } from "../../utils/psbt-serializer";
import { Transaction } from "@scure/btc-signer";

// Fixed deposit amount: 10,000 sats (enough for 10 matches at 1k each)
const DEPOSIT_AMOUNT_SATS = 10000n;

export function DepositWallet() {
  const { account } = useGameStore();
  const { checkBalance, WBTC_ADDRESS } = useWBTCContracts(account);

  // State
  const [wbtcBalance, setWbtcBalance] = useState<bigint>(0n);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStatus, setDepositStatus] = useState<string>("");
  const [depositError, setDepositError] = useState<string | null>(null);

  // Xverse wallet state
  const [xverseConnected, setXverseConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcPublicKey, setBtcPublicKey] = useState<string | null>(null);

  // Services
  const xverseService = XverseService.getInstance();
  const atomiqService = AtomiqService.getInstance();

  // Check WBTC balance periodically
  useEffect(() => {
    if (!account) return;

    let isFirstLoad = true;

    const updateBalance = async () => {
      // Only show "Checking..." on first load, not during polling
      if (isFirstLoad) {
        setIsCheckingBalance(true);
        isFirstLoad = false;
      }
      
      const balance = await checkBalance();
      setWbtcBalance(balance);
      setIsCheckingBalance(false);
    };

    // Check immediately
    updateBalance();

    // Poll every 5 seconds (silent updates, no "Checking..." flicker)
    const interval = setInterval(updateBalance, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]); // Only depend on account, not checkBalance (avoids infinite re-renders)

  // Connect Xverse wallet
  const handleConnectXverse = async () => {
    try {
      const response = await xverseService.connect();
      const paymentAddr = response.addresses.find((a) => a.purpose === "payment");

      if (paymentAddr) {
        setXverseConnected(true);
        setBtcAddress(paymentAddr.address);
        setBtcPublicKey(paymentAddr.publicKey);
        console.log("✅ Xverse connected:", paymentAddr.address);
      }
    } catch (error: any) {
      console.error("❌ Xverse connection failed:", error);
      setDepositError(error.message);
    }
  };

  // Deposit 10k sats via on-chain BTC swap
  const handleDeposit = async () => {
    if (!account || !btcAddress || !btcPublicKey) {
      setDepositError("Connect both wallets first");
      return;
    }

    try {
      setIsDepositing(true);
      setDepositError(null);
      setDepositStatus("🔧 Initializing Atomiq SDK...");

      // Initialize Atomiq if needed
      await atomiqService.initialize();

      setDepositStatus("📝 Creating on-chain swap...");
      
      // Pad Starknet address to 66 characters (0x + 64 hex chars) for Atomiq SDK
      const paddedStarknetAddress = account.address.startsWith('0x')
        ? '0x' + account.address.slice(2).padStart(64, '0')
        : '0x' + account.address.padStart(64, '0');
      
      console.log("₿ Starting 10k sat on-chain deposit");
      console.log("  BTC source:", btcAddress);
      console.log("  STRK destination (original):", account.address);
      console.log("  STRK destination (padded):", paddedStarknetAddress);

      // Create on-chain swap (Atomiq handles WBTC minting)
      const swap = await atomiqService.createOnChainDepositSwap(
        DEPOSIT_AMOUNT_SATS,
        btcAddress,
        paddedStarknetAddress // Use padded address
      );

      setDepositStatus("💰 Getting funded PSBT...");
      const { psbt, signInputs } = await (swap as any).getFundedPsbt({
        address: btcAddress,
        publicKey: btcPublicKey,
      });

      setDepositStatus("✍️ Waiting for Xverse signature...");
      console.log("🔐 Requesting PSBT signature from Xverse...");

      // Serialize PSBT for Xverse
      const psbtString = serializePSBT(psbt);
      const xverseSignInputs = {
        [btcAddress]: Array.isArray(signInputs) ? signInputs : [signInputs],
      };

      // Sign with Xverse
      const signedPsbtBase64 = await xverseService.signPsbt(psbtString, xverseSignInputs);

      setDepositStatus("📤 Broadcasting Bitcoin transaction...");
      console.log("📡 Submitting signed PSBT...");

      // Deserialize and submit
      const signedPsbtBytes = Uint8Array.from(atob(signedPsbtBase64), (c) => c.charCodeAt(0));
      const signedPsbtTx = Transaction.fromPSBT(signedPsbtBytes);
      const btcTxId = await (swap as any).submitPsbt(signedPsbtTx);

      console.log("✅ Bitcoin tx broadcasted:", btcTxId);
      setDepositStatus(`⏳ Waiting for confirmations... (BTC tx: ${btcTxId.substring(0, 10)}...)`);

      // Wait for 3 confirmations (faster on testnet)
      await (swap as any).waitTillExecuted(
        undefined,
        3,
        (txId: string, confirmations: number, targetConfirmations: number, txEtaMs: number) => {
          if (txId && txEtaMs !== -1) {
            const etaMin = Math.round(txEtaMs / 60000);
            setDepositStatus(
              `⏳ Confirming... ${confirmations}/${targetConfirmations} (ETA: ${etaMin}m)`
            );
            console.log(`⏳ ${confirmations}/${targetConfirmations} confirmations - ETA: ${etaMin}m`);
          }
        }
      );

      console.log("✅ Swap completed!");
      const starknetTx = (swap as any).getOutputTxId();
      console.log("📊 Starknet tx:", starknetTx);

      setDepositStatus("✅ Deposit complete! WBTC will appear shortly.");

      // Force balance refresh
      setTimeout(async () => {
        const newBalance = await checkBalance();
        setWbtcBalance(newBalance);
        setIsDepositing(false);
        setDepositStatus("");
      }, 5000);

    } catch (error: any) {
      console.error("❌ Deposit failed:", error);
      setDepositError(error.message || "Deposit failed");
      setIsDepositing(false);
      setDepositStatus("");
    }
  };

  // Don't show if wallet not connected
  if (!account) {
    return null;
  }

  // Calculate available matches based on balance
  const availableMatches = Math.floor(Number(wbtcBalance) / 1000);
  const hasEnoughForMatch = wbtcBalance >= 1000n;

  return (
    <div className="section" style={{ background: "#1a2a1a", borderColor: "#2d5a2d" }}>
      <h2>💰 Game Wallet</h2>

      {/* Balance Display */}
      <div className="status-box success" style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "5px" }}>
              Available Balance:
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4CAF50" }}>
              {isCheckingBalance ? (
                <span style={{ fontSize: "18px" }}>Checking...</span>
              ) : (
                `${wbtcBalance.toString()} sats`
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#888" }}>Can play:</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: hasEnoughForMatch ? "#4CAF50" : "#F44336" }}>
              {availableMatches} {availableMatches === 1 ? "match" : "matches"}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Section - Only show if user can't play even 1 match */}
      {wbtcBalance < 1000n && (
        <>
          <div className="status-box" style={{ marginBottom: "15px", background: "#2a1a1a", borderColor: "#FFA726" }}>
            <div style={{ fontSize: "14px", color: "#FFA726", marginBottom: "10px" }}>
              💡 <strong>Deposit Once, Play Many Matches!</strong>
            </div>
            <div style={{ fontSize: "12px", color: "#ccc" }}>
              Deposit 10,000 sats to your game wallet. This covers 10 matches at 1,000 sats each.
              <br />
              <em>One-time 20-minute wait, then instant match creation!</em>
            </div>
          </div>

          {/* Xverse Connection */}
          {!xverseConnected ? (
            <button onClick={handleConnectXverse} className="primary" style={{ width: "100%" }}>
              1️⃣ Connect Xverse Wallet (Bitcoin)
            </button>
          ) : (
            <div className="status-box success" style={{ marginBottom: "15px" }}>
              <div style={{ fontSize: "14px", marginBottom: "5px" }}>✅ Xverse Connected</div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#888" }}>
                {btcAddress?.substring(0, 20)}...
              </div>
            </div>
          )}

          {/* Deposit Button */}
          {xverseConnected && (
            <button
              onClick={handleDeposit}
              disabled={isDepositing}
              className="primary"
              style={{ width: "100%", marginTop: "10px", fontSize: "16px" }}
            >
              {isDepositing ? "⏳ Depositing..." : "2️⃣ Deposit 10,000 sats (On-Chain BTC)"}
            </button>
          )}

          {/* Status/Error Display */}
          {depositStatus && (
            <div className="status-box" style={{ marginTop: "15px", background: "#1a3a1a", borderColor: "#4CAF50" }}>
              {depositStatus}
            </div>
          )}

          {depositError && (
            <div className="status-box" style={{ marginTop: "15px", background: "#3a1a1a", borderColor: "#F44336", color: "#F44336" }}>
              ❌ {depositError}
            </div>
          )}
        </>
      )}

      {/* Explanation */}
      <div style={{ marginTop: "15px", fontSize: "11px", color: "#666", lineHeight: "1.6" }}>
        <strong>How it works:</strong>
        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
          <li>Connect Xverse wallet (holds your Bitcoin)</li>
          <li>Deposit 10k sats via on-chain swap (~20 min)</li>
          <li>WBTC arrives in your Starknet account</li>
          <li>Stake from balance for each match (instant!)</li>
          <li>Win = balance increases, Lose = balance decreases</li>
        </ul>
      </div>
    </div>
  );
}

