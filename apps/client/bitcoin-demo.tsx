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
console.log("");
console.log("💡 If you see errors, make sure to create .env file with:");
console.log("  VITE_BITCOIN_NETWORK=testnet");
console.log("  VITE_ATOMIQ_ENV=testnet");
console.log(
  "  VITE_STARKNET_RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR_KEY"
);

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

      const amount = 10000n; // 10k sats for testing
      const quote = await atomiqService.getQuote(
        SwapDirection.BTC_TO_STRK,
        amount
      );

      setQuoteData(quote);
      setSwapStatus(SwapStatus.QUOTE_READY);
    } catch (error: any) {
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
                : "Get Quote (10k sats → STRK)"}
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

                {quoteData.invoice && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "12px",
                      background: "#0a0a0a",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginBottom: "6px",
                      }}
                    >
                      Lightning Invoice:
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "10px",
                        wordBreak: "break-all",
                      }}
                    >
                      {quoteData.invoice}
                    </div>
                  </div>
                )}
              </div>
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
