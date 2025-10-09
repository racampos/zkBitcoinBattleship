/**
 * Main App Component for ZK Battleship
 */

import React from "react";
import { DojoProvider } from "./dojo/DojoContext";
import { WalletConnection } from "./components/game/WalletConnection";
import { GameManagement } from "./components/game/GameManagement";
import { StakingFlow } from "./components/game/StakingFlow";
import { BoardSetup } from "./components/game/BoardSetup";
import { Gameplay } from "./components/game/Gameplay";
import { GameState } from "./components/game/GameState";
import { ProofApplication } from "./components/game/ProofApplication";
import { useGameStore } from "./store/gameStore";
import { useGameState } from "./hooks/useGameState";
import { useShotTracking } from "./hooks/useShotTracking";

function GameApp() {
  // Use proper Zustand selectors for stable references
  const account = useGameStore((s) => s.account);
  const gameId = useGameStore((s) => s.gameId);

  // Subscribe to game state updates
  useGameState(gameId);
  
  // Track shots and update boards
  useShotTracking();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>⚔️ ZK Battleship on Starknet</h1>
        <p className="subtitle">Privacy-preserving on-chain battleship powered by ZK proofs</p>
      </header>

      <main className="app-main">
        {/* Wallet Connection */}
        <WalletConnection />

      {/* Game Management - Create/Join Game */}
      {account && <GameManagement />}

      {/* Staking Flow - Approve and Stake WBTC */}
      {account && gameId && <StakingFlow />}

      {/* Board Setup - Place Ships */}
      {account && gameId && <BoardSetup />}

        {/* Proof Application - Respond to opponent's shot */}
        {account && gameId && <ProofApplication />}

        {/* Gameplay - Fire Shots */}
        {account && gameId && <Gameplay />}

        {/* Game State Display */}
        {account && gameId && <GameState />}
      </main>

      <footer className="app-footer">
        <p>
          Built with{" "}
          <a href="https://docs.dojoengine.org/" target="_blank" rel="noopener noreferrer">
            Dojo
          </a>
          ,{" "}
          <a href="https://www.starknet.io/" target="_blank" rel="noopener noreferrer">
            Starknet
          </a>
          , and{" "}
          <a href="https://noir-lang.org/" target="_blank" rel="noopener noreferrer">
            Noir
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <DojoProvider>
      <GameApp />
    </DojoProvider>
  );
}
