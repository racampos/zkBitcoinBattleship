/**
 * Wallet Connection Component
 * Handles Cartridge Controller connection
 */

import React, { useEffect, useState } from "react";
import Controller from "@cartridge/controller";
import { useGameStore } from "../../store/gameStore";
import controllerOpts from "../../../controller.js";

const controller = new Controller(controllerOpts);

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
      const connectedAccount = await controller.connect();
      setAccount(connectedAccount);
      console.log("✅ Connected:", connectedAccount.address);
    } catch (error: any) {
      console.error("Failed to connect:", error);
      setError(`Failed to connect: ${error.message}`);
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
