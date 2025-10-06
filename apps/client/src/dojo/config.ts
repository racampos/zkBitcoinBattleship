/**
 * Dojo configuration
 */

import manifest from "../../../../chain/dojo/manifest_dev.json" assert { type: "json" };

export const DOJO_CONFIG = {
  worldAddress: manifest.world.address,
  toriiUrl: "http://localhost:8081",
  rpcUrl: "http://localhost:5050",
  relayUrl: "http://localhost:50051",
  domainSeparator: {
    name: "zk-battleship",
    version: "1.0",
    chainId: "KATANA",
    revision: "1",
  },
};

export const NAMESPACE = "battleship";

// Contract addresses from manifest
export const CONTRACTS = {
  gameManagement: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-game_management`)!,
  coinFlip: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-coin_flip`)!,
  boardCommit: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-board_commit`)!,
  gameplay: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-gameplay`)!,
  proofVerify: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-proof_verify`)!,
  timeout: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-timeout`)!,
  escrow: manifest.contracts.find((c) => c.tag === `${NAMESPACE}-escrow`)!,
};

export { manifest };
