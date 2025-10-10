/**
 * Dojo configuration
 */

import manifestMainnet from "../../../../chain/dojo/manifest_mainnet.json" assert { type: "json" };

export const DOJO_CONFIG = {
  worldAddress: manifestMainnet.world.address,
  toriiUrl: "/torii-graphql", // Proxied through Vite to avoid CORS
  rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet", // Official Cartridge RPC
  relayUrl: "", // Not needed for mainnet
  domainSeparator: {
    name: "zk-battleship",
    version: "1.0",
    chainId: "SN_MAIN",
    revision: "1",
  },
};

export const NAMESPACE = "battleship";

// Contract addresses from mainnet manifest
export const CONTRACTS = {
  gameManagement: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-game_management`)!,
  coinFlip: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-coin_flip`)!,
  boardCommit: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-board_commit`)!,
  gameplay: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-gameplay`)!,
  proofVerify: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-proof_verify`)!,
  timeout: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-timeout`)!,
  escrow: manifestMainnet.contracts.find((c) => c.tag === `${NAMESPACE}-escrow`)!,
};

export { manifestMainnet as manifest };
