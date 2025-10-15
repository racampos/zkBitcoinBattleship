/**
 * Main App Component for ZK Battleship
 */

import React from "react";
import { DojoProvider } from "./dojo/DojoContext";
import { WalletConnection } from "./components/game/WalletConnection";
import { DepositWallet } from "./components/game/DepositWallet";
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
  const gameData = useGameStore((s) => s.gameData);

  // Subscribe to game state updates
  useGameState(gameId);
  
  // Track shots and update boards
  useShotTracking();

  // Hide staking component when game is finished
  const isGameOver = gameData?.status === 2;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ZK Bitcoin Battleship</h1>
        <p className="subtitle">Stake sats, prove shots, win on Starknet</p>
      </header>

      <main className="app-main">
        {/* Wallet Connection */}
        <WalletConnection />

        {/* Deposit Wallet - Deposit BTC once to play multiple matches */}
        {account && <DepositWallet />}

        {/* Game Management - Create/Join Game */}
        {account && <GameManagement />}

      {/* Staking Flow - Approve and Stake WBTC (hide when game ends) */}
      {account && gameId && !isGameOver && <StakingFlow />}

      {/* Proof Application - Respond to opponent's shot */}
      {account && gameId && <ProofApplication />}

      {/* Both Boards Side by Side */}
      {account && gameId && (
        <div className="boards-container">
          {/* Board Setup - Place Ships */}
          <BoardSetup />

          {/* Gameplay - Fire Shots */}
          <Gameplay />
        </div>
      )}

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
