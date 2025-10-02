/**
 * Cartridge Controller configuration for ZK Battleship
 * https://docs.cartridge.gg/controller/getting-started
 */

import manifest from '../../chain/dojo/manifest_dev.json' assert { type: 'json' };

// Find contract addresses from manifest
const gameManagement = manifest.contracts.find((c) => c.tag === 'battleship-game_management');
const coinFlip = manifest.contracts.find((c) => c.tag === 'battleship-coin_flip');
const boardCommit = manifest.contracts.find((c) => c.tag === 'battleship-board_commit');
const gameplay = manifest.contracts.find((c) => c.tag === 'battleship-gameplay');
const proofVerify = manifest.contracts.find((c) => c.tag === 'battleship-proof_verify');
const timeout = manifest.contracts.find((c) => c.tag === 'battleship-timeout');
const escrow = manifest.contracts.find((c) => c.tag === 'battleship-escrow');

const controllerOpts = {
  chains: [{ rpcUrl: 'http://localhost:5050' }],
  defaultChainId: '0x4b4154414e41', // "KATANA"
  policies: {
    contracts: {
      // Game Management
      [gameManagement.address]: {
        name: 'Game Management',
        description: 'Create games',
        methods: [
          {
            name: 'Create Game',
            entrypoint: 'create_game',
            description: 'Create a new Battleship game',
          },
        ],
      },
      // Coin Flip
      [coinFlip.address]: {
        name: 'Coin Flip',
        description: 'Determine first player',
        methods: [
          { name: 'Commit', entrypoint: 'start_game_commit' },
          { name: 'Reveal', entrypoint: 'start_game_reveal' },
          { name: 'Timeout Flip', entrypoint: 'timeout_flip' },
        ],
      },
      // Board Commit
      [boardCommit.address]: {
        name: 'Board Commit',
        description: 'Commit board placement',
        methods: [{ name: 'Commit Board', entrypoint: 'commit_board' }],
      },
      // Gameplay
      [gameplay.address]: {
        name: 'Gameplay',
        description: 'Fire shots',
        methods: [{ name: 'Fire Shot', entrypoint: 'fire_shot' }],
      },
      // Proof Verify
      [proofVerify.address]: {
        name: 'Proof Verify',
        description: 'Verify shot results',
        methods: [{ name: 'Apply Shot Proof', entrypoint: 'apply_shot_proof' }],
      },
      // Timeout
      [timeout.address]: {
        name: 'Timeout',
        description: 'Timeout, resign, cancel',
        methods: [
          { name: 'Timeout', entrypoint: 'timeout' },
          { name: 'Resign', entrypoint: 'resign' },
          { name: 'Cancel', entrypoint: 'cancel_unstarted' },
        ],
      },
      // Escrow
      [escrow.address]: {
        name: 'Escrow',
        description: 'Stake and settlement',
        methods: [
          { name: 'Stake', entrypoint: 'stake_and_bond' },
          { name: 'Settle', entrypoint: 'settle_escrow' },
          { name: 'Refund', entrypoint: 'refund_bond' },
        ],
      },
    },
  },
};

export default controllerOpts;

