/**
 * Wallet Connection Component
 * Handles Cartridge Controller connection
 */

import React, { useEffect, useState } from "react";
import Controller from "@cartridge/controller";
import { useGameStore } from "../../store/gameStore";
import controllerOpts from "../../../controller.js";

console.log("🎮 Initializing Cartridge Controller...");
console.log("   Controller options:", controllerOpts);

const controller = new Controller(controllerOpts);
console.log("✅ Controller initialized:", controller);

export function WalletConnection() {
  const { account, setAccount, setError } = useGameStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // Try to reconnect on mount
  useEffect(() => {
    (async () => {
      try {
        console.log("🔄 Checking for existing session...");
        const existingAccount = await controller.probe();

        if (existingAccount) {
          console.log("✅ Found existing session! Auto-reconnecting...");
          setAccount(existingAccount);
        } else {
          console.log("ℹ️ No existing session found.");
        }
      } catch (error: any) {
        console.log("ℹ️ No existing session:", error.message);
      }
    })();
  }, [setAccount]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      console.log("🔌 Attempting to connect to Cartridge Controller...");
      
      const connectedAccount = await controller.connect();
      
      if (!connectedAccount) {
        throw new Error("Controller returned undefined - connection failed");
      }
      
      if (!connectedAccount.address) {
        throw new Error("Connected account has no address");
      }
      
      setAccount(connectedAccount);
      console.log("✅ Connected successfully!");
      console.log("   Address:", connectedAccount.address);
    } catch (error: any) {
      console.error("❌ Failed to connect:", error);
      setError(`Failed to connect: ${error.message || "Unknown error"}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    console.log("👋 Disconnected");
  };

  return (
    <div className="section">
      <h2>🎮 Controller</h2>

      {!account ? (
        <>
          <button onClick={handleConnect} disabled={isConnecting} className="primary">
            {isConnecting ? (
              <>
                <span className="spinner"></span> Connecting...
              </>
            ) : (
              "Connect Wallet"
            )}
          </button>
          <div className="status-box">Not connected</div>
        </>
      ) : (
        <>
          <button onClick={handleDisconnect} className="secondary">
            Disconnect
          </button>
          <div className="status-box info">
            <strong>Address:</strong> {account.address}
          </div>
        </>
      )}
    </div>
  );
}
