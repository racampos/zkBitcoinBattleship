/**
 * Dojo configuration
 * Environment-aware: switches between Sepolia (testnet) and Mainnet
 */

import manifestSepolia from "./manifest_sepolia.json" assert { type: "json" };
import manifestMainnet from "../../../../chain/dojo/manifest_mainnet.json" assert { type: "json" };

// Determine which manifest to use based on RPC URL
const isMainnet = import.meta.env.VITE_STARKNET_RPC_URL?.includes("mainnet");
const activeManifest = isMainnet ? manifestMainnet : manifestSepolia;

console.log(`🔧 Dojo Config: Using ${isMainnet ? 'MAINNET' : 'SEPOLIA'} manifest`);

export const DOJO_CONFIG = {
  worldAddress: activeManifest.world.address,
  toriiUrl: "/torii-graphql", // Proxied through Vite to avoid CORS
  rpcUrl: import.meta.env.VITE_STARKNET_RPC_URL || "https://starknet-sepolia.g.alchemy.com/v2/A7uy7yxUkDxDje-8thlzv7LNcwsFEAki",
  relayUrl: "", // Not needed for deployed networks
  domainSeparator: {
    name: "zk-battleship",
    version: "1.0",
    chainId: isMainnet ? "SN_MAIN" : "SN_SEPOLIA",
    revision: "1",
  },
};

export const NAMESPACE = "battleship";

// Contract addresses from active manifest
export const CONTRACTS = {
  gameManagement: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-game_management`)!,
  coinFlip: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-coin_flip`)!,
  boardCommit: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-board_commit`)!,
  gameplay: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-gameplay`)!,
  proofVerify: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-proof_verify`)!,
  timeout: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-timeout`)!,
  escrow: activeManifest.contracts.find((c) => c.tag === `${NAMESPACE}-escrow`)!,
};

export { activeManifest as manifest };
