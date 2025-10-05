// Bitcoin Integration Demo - Standalone testing page
// Tests Xverse wallet connection and Atomiq swap infrastructure

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { XverseService } from "./src/services/xverse";
import { AtomiqService } from "./src/services/atomiq";
import { SwapDirection, SwapStatus } from "./src/services/types/swap.types";
import type { BitcoinAddress } from "./src/services/types/bitcoin.types";

// Log environment on load
console.log("🔧 Bitcoin Demo Environment:");
console.log(
  "  Bitcoin Network:",
  import.meta.env.VITE_BITCOIN_NETWORK || "testnet (default)"
);
console.log(
  "  Atomiq Mode:",
  import.meta.env.VITE_ATOMIQ_ENV || "testnet (default)"
);
console.log(
  "  Starknet RPC:",
  import.meta.env.VITE_STARKNET_RPC_URL || "Not configured"
);

// Validate RPC URL
const rpcUrl = import.meta.env.VITE_STARKNET_RPC_URL;
if (rpcUrl && rpcUrl.includes("undefined")) {
  console.error("");
  console.error("❌ ERROR: Your VITE_STARKNET_RPC_URL contains 'undefined'!");
  console.error("   Current value:", rpcUrl);
  console.error("");
  console.error("   Fix your .env file. It should be ONE line:");
  console.error("   VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY");
  console.error("   (Note: /v2/ not just / for Alchemy URLs)");
  console.error("");
}

console.log("");
console.log("💡 If you see errors, make sure to create .env file with:");
console.log("  VITE_BITCOIN_NETWORK=testnet");
console.log("  VITE_ATOMIQ_ENV=testnet");
console.log(
  "  VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY"
);
console.log("  (For Alchemy: use /v2/ not just /)");
console.log("");

// Simple demo app component
function BitcoinDemo() {
  // Bitcoin wallet state
  const [btcConnected, setBtcConnected] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcPublicKey, setBtcPublicKey] = useState<string | null>(null);

  // Swap state
  const [swapStatus, setSwapStatus] = useState<SwapStatus>(SwapStatus.IDLE);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [swapInstance, setSwapInstance] = useState<any>(null);
  const [lightningInvoice, setLightningInvoice] = useState<string | null>(null);

  // Services
  const xverseService = XverseService.getInstance();
  const atomiqService = AtomiqService.getInstance();

  // Connect Xverse wallet
  const handleConnectXverse = async () => {
    try {
      const response = await xverseService.connect();
      const paymentAddr = response.addresses.find(
        (a) => a.purpose === "payment"
      );

      if (paymentAddr) {
        setBtcConnected(true);
        setBtcAddress(paymentAddr.address);
        setBtcPublicKey(paymentAddr.publicKey);
      }
    } catch (error: any) {
      alert("Failed to connect Xverse: " + error.message);
    }
  };

  // Get a swap quote
  const handleGetQuote = async () => {
    try {
      setSwapStatus(SwapStatus.QUOTING);
      setSwapError(null);

      const amount = 1000n; // 1k sats for testing (~$0.60)

      const quote = await atomiqService.getQuote(
        SwapDirection.BTC_TO_STRK,
        amount
      );

      setQuoteData(quote);
      setSwapStatus(SwapStatus.QUOTE_READY);
    } catch (error: any) {
      console.error("Quote failed:", error);
      setSwapError(error.message);
      setSwapStatus(SwapStatus.FAILED);
    }
  };

  // Start Lightning swap (Lightning Network → STRK)
  const handleStartLightningSwap = async () => {
    try {
      setSwapStatus(SwapStatus.COMMITTING);
      setSwapError(null);

      // For demo: use dummy Starknet address (in production, use real Starknet wallet)
      const DUMMY_STARKNET_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";

      console.log("⚡ Creating Lightning swap...");
      
      // Create swap (line 287-294 from official example)
      const swap = await atomiqService.createDepositSwap(
        1000n, // amount (1k sats ~$0.60)
        DUMMY_STARKNET_ADDRESS // Starknet destination
      );

      // Get Lightning invoice (line 300 from official example)
      const invoice = (swap as any).getAddress();
      console.log("⚡ Lightning invoice:", invoice);

      setSwapInstance(swap);
      setLightningInvoice(invoice);
      setSwapStatus(SwapStatus.AWAITING_PAYMENT);

      // Monitor payment (line 302-308 from official example)
      console.log("👀 Waiting for Lightning payment...");
      const paid = await (swap as any).waitForPayment();
      
      if (!paid) {
        console.log("❌ Payment not received - quote expired");
        setSwapError("Lightning payment not received in time");
        setSwapStatus(SwapStatus.EXPIRED);
        return;
      }

      console.log("✅ Payment received!");
      setSwapStatus(SwapStatus.PAYMENT_RECEIVED);

      // TODO: Claim on Starknet (needs real Starknet account)
      // await swap.commit(starknetSigner);
      // await swap.claim(starknetSigner);
      
      console.log("⚠️ Claim step requires Starknet wallet integration");
      
    } catch (error: any) {
      console.error("Lightning swap failed:", error);
      setSwapError(error.message);
      setSwapStatus(SwapStatus.FAILED);
    }
  };

  // Start on-chain swap (On-chain BTC → STRK using Xverse)
  const handleStartOnChainSwap = async () => {
    try {
      if (!btcAddress || !btcPublicKey) {
        throw new Error("Xverse wallet not connected");
      }

      setSwapStatus(SwapStatus.COMMITTING);
      setSwapError(null);

      // For demo: use dummy Starknet address
      const DUMMY_STARKNET_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";

      console.log("₿ Creating on-chain BTC swap...");

      // Create swap for on-chain BTC (line 135-142 from official example)
      const swap = await atomiqService.createOnChainDepositSwap(
        3000n, // 3k sats for on-chain (higher due to BTC fees)
        btcAddress, // Source Bitcoin address from Xverse
        DUMMY_STARKNET_ADDRESS // Destination Starknet address
      );

      console.log("📝 Getting PSBT for signing...");

      // Get funded PSBT (line 149-153 from official example)
      const { psbt, signInputs } = await (swap as any).getFundedPsbt({
        address: btcAddress,
        publicKey: btcPublicKey,
      });

      console.log("✍️ Requesting Xverse signature...");

      // Sign with Xverse (line 155 from official example)
      const signedPsbt = await xverseService.signPsbt(psbt, signInputs);

      console.log("📤 Submitting signed transaction...");

      // Submit signed PSBT (line 156 from official example)
      const btcTxId = await (swap as any).submitPsbt(signedPsbt);
      console.log("✅ Bitcoin transaction broadcasted:", btcTxId);

      setSwapInstance(swap);
      setSwapStatus(SwapStatus.AWAITING_PAYMENT);

      // Monitor confirmations (line 159-177 from official example)
      console.log("⏳ Waiting for Bitcoin confirmations...");
      await (swap as any).waitTillExecuted(
        undefined,
        5,
        (txId: string, confirmations: number, targetConfirmations: number, txEtaMs: number) => {
          if (txId && txEtaMs !== -1) {
            console.log(
              `⏳ Transaction ${confirmations}/${targetConfirmations} confirmations - ETA: ${Math.round(txEtaMs / 1000)}s`
            );
          }
        }
      );

      console.log("✅ Swap completed!");
      console.log("📊 Starknet tx:", (swap as any).getOutputTxId());
      setSwapStatus(SwapStatus.COMPLETED);

    } catch (error: any) {
      console.error("On-chain swap failed:", error);
      setSwapError(error.message);
      setSwapStatus(SwapStatus.FAILED);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        padding: "40px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "2px solid #333",
          paddingBottom: "20px",
          marginBottom: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            margin: "0 0 10px 0",
            color: "#f97316",
          }}
        >
          ₿ Bitcoin Integration Demo
        </h1>
        <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
          Testing Xverse Wallet + Atomiq Swaps • Lightning Network • Testnet
        </p>
      </header>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "30px",
          maxWidth: "1200px",
        }}
      >
        {/* Left Column: Controls */}
        <div>
          {/* Connection Status */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>
              1. Connect Bitcoin Wallet
            </h2>

            {!btcConnected ? (
              <button
                onClick={handleConnectXverse}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "16px",
                  background: "#f97316",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Connect Xverse Wallet
              </button>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#888", textAlign: "center" }}>
                💡 Optional for Lightning swaps, required for on-chain BTC swaps
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "15px",
                  }}
                >
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      background: "#10b981",
                      borderRadius: "50%",
                    }}
                  ></span>
                  <span style={{ color: "#10b981", fontWeight: "600" }}>
                    Connected
                  </span>
                </div>
                <div
                  style={{
                    background: "#0a0a0a",
                    padding: "12px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    wordBreak: "break-all",
                  }}
                >
                  {btcAddress}
                </div>
              </div>
            )}
          </div>

          {/* Get Quote */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>
              2. Get Swap Quote
            </h2>
            <button
              onClick={handleGetQuote}
              disabled={!btcConnected || swapStatus === SwapStatus.QUOTING}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "16px",
                background: btcConnected ? "#3b82f6" : "#555",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: btcConnected ? "pointer" : "not-allowed",
                fontWeight: "600",
              }}
            >
              {swapStatus === SwapStatus.QUOTING
                ? "Getting Quote..."
                : "Get Quote (1k sats → STRK)"}
            </button>

            {swapError && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  background: "#7f1d1d",
                  border: "1px solid #991b1b",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                ❌ Error: {swapError}
              </div>
            )}
          </div>

          {/* Environment Info */}
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 15px 0", fontSize: "20px" }}>
              Environment
            </h2>
            <div style={{ fontSize: "14px", fontFamily: "monospace" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ color: "#888" }}>Bitcoin Network:</span>
                <span style={{ color: "#f97316" }}>
                  {import.meta.env.VITE_BITCOIN_NETWORK || "testnet"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ color: "#888" }}>Atomiq Mode:</span>
                <span style={{ color: "#f97316" }}>
                  {import.meta.env.VITE_ATOMIQ_ENV || "testnet"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#888" }}>Starknet RPC:</span>
                <span
                  style={{
                    color: "#f97316",
                    fontSize: "10px",
                    maxWidth: "250px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {import.meta.env.VITE_STARKNET_RPC_URL || "Not set"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Info */}
        <div>
          {/* Quote Display */}
          {quoteData && (
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #10b981",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>
                ✅ Quote Received
              </h2>
              <div style={{ fontSize: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #333",
                  }}
                >
                  <span style={{ color: "#888" }}>Input:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
                    {Number(quoteData.fromAmount).toLocaleString()} sats
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #333",
                  }}
                >
                  <span style={{ color: "#888" }}>Output:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "600" }}>
                    {(Number(quoteData.toAmount) / 1e18).toFixed(6)} STRK
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #333",
                  }}
                >
                  <span style={{ color: "#888" }}>Fee:</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {Number(quoteData.fee).toLocaleString()} sats
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#888" }}>Rate:</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {quoteData.rate.toFixed(8)} STRK/sat
                  </span>
                </div>

                {/* Start Swap Buttons */}
                <div style={{ marginTop: "20px" }}>
                  <div style={{ marginBottom: "12px", fontSize: "14px", color: "#888", textAlign: "center" }}>
                    Choose swap method:
                  </div>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    {/* Lightning Swap */}
                    <button
                      onClick={handleStartLightningSwap}
                      disabled={swapStatus !== SwapStatus.QUOTE_READY}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        backgroundColor: "#FF9800",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: swapStatus === SwapStatus.QUOTE_READY ? "pointer" : "not-allowed",
                        opacity: swapStatus === SwapStatus.QUOTE_READY ? 1 : 0.5,
                      }}
                      title="Instant, low fees (~4 sats). No Xverse needed."
                    >
                      ⚡ Lightning Swap
                    </button>

                    {/* On-Chain Swap */}
                    <button
                      onClick={handleStartOnChainSwap}
                      disabled={swapStatus !== SwapStatus.QUOTE_READY || !btcConnected}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: "600",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: swapStatus === SwapStatus.QUOTE_READY && btcConnected ? "pointer" : "not-allowed",
                        opacity: swapStatus === SwapStatus.QUOTE_READY && btcConnected ? 1 : 0.5,
                      }}
                      title="Uses Xverse wallet. Higher fees (~50 sats). Requires confirmations."
                    >
                      ₿ On-Chain Swap
                    </button>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", textAlign: "center" }}>
                    <div>⚡ Lightning: Instant, 1k sats | ₿ On-Chain: 3k sats, uses Xverse</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lightning Invoice Display */}
          {lightningInvoice && (
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #FF9800",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#FF9800" }}>
                ⚡ Pay Lightning Invoice
              </h2>
              
              {/* Status */}
              <div style={{ marginBottom: "20px", padding: "12px", background: "#0a0a0a", borderRadius: "6px" }}>
                <strong>Status:</strong> {swapStatus === SwapStatus.AWAITING_PAYMENT ? "⏳ Waiting for payment..." : 
                  swapStatus === SwapStatus.PAYMENT_RECEIVED ? "✅ Payment received!" : swapStatus}
              </div>

              {/* Invoice Text */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                  Lightning Invoice:
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    wordBreak: "break-all",
                    background: "#0a0a0a",
                    padding: "12px",
                    borderRadius: "6px",
                  }}
                >
                  {lightningInvoice}
                </div>
              </div>

              {/* Instructions */}
              <div style={{ fontSize: "14px", color: "#ccc", marginTop: "15px" }}>
                💡 Open your Lightning wallet (e.g., <a href="https://wallet.cashu.me/" target="_blank" style={{ color: "#FF9800" }}>Cashu</a>) and paste this invoice to pay
              </div>
            </div>
          )}

          {/* Payment Received */}
          {swapStatus === SwapStatus.PAYMENT_RECEIVED && (
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #10b981",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <h2 style={{ margin: "0 0 15px 0", fontSize: "24px", color: "#10b981" }}>
                ✅ Payment Received!
              </h2>
              <p style={{ color: "#ccc", marginBottom: "15px" }}>
                Your Lightning payment was received successfully.
              </p>
              <p style={{ color: "#FFC107", fontSize: "14px" }}>
                ⚠️ Next step: Claim on Starknet (requires Starknet wallet integration)
              </p>
            </div>
          )}

          {/* Instructions */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #581c87 100%)",
              border: "1px solid #3b82f6",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>
              📖 Testing Instructions
            </h2>
            <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
              <li style={{ marginBottom: "12px" }}>
                Install <strong>Xverse wallet</strong> browser extension
              </li>
              <li style={{ marginBottom: "12px" }}>
                Switch Xverse to <strong>Bitcoin Testnet</strong> mode
              </li>
              <li style={{ marginBottom: "12px" }}>
                Click <strong>"Connect Xverse Wallet"</strong> button
              </li>
              <li style={{ marginBottom: "12px" }}>
                Click <strong>"Get Quote"</strong> to test Atomiq SDK
              </li>
              <li style={{ marginBottom: "12px" }}>
                Review the quote details (amount, fee, rate)
              </li>
              <li>
                If a Lightning invoice appears, you can pay it with any testnet
                Lightning wallet
              </li>
            </ol>

            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                ⚠️ Testnet Only
              </div>
              <div style={{ color: "#d1d5db" }}>
                This demo uses Bitcoin testnet (no real money). Get testnet BTC
                from a faucet if needed.
              </div>
            </div>
          </div>

          {/* Status Log */}
          <div
            style={{
              marginTop: "20px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 15px 0", fontSize: "20px" }}>
              📊 Status
            </h2>
            <div style={{ fontSize: "14px" }}>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ color: "#888" }}>Xverse: </span>
                <span
                  style={{
                    color: btcConnected ? "#10b981" : "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  {btcConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ color: "#888" }}>Atomiq SDK: </span>
                <span style={{ color: "#10b981", fontWeight: "600" }}>
                  Initialized
                </span>
              </div>
              <div>
                <span style={{ color: "#888" }}>Swap Status: </span>
                <span
                  style={{
                    color:
                      swapStatus === SwapStatus.FAILED
                        ? "#ef4444"
                        : swapStatus === SwapStatus.QUOTE_READY
                        ? "#10b981"
                        : "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  {swapStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          marginTop: "60px",
          paddingTop: "30px",
          borderTop: "1px solid #333",
          textAlign: "center",
          fontSize: "14px",
          color: "#666",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          Bitcoin Integration Demo • Xverse + Atomiq • Lightning Network
        </div>
        <div>
          🚀 Standalone testing environment (not integrated with game yet)
        </div>
      </footer>
    </div>
  );
}

// Mount the app
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <BitcoinDemo />
    </React.StrictMode>
  );
}
