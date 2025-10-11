/**
 * Cartridge Controller configuration for ZK Battleship
 * Environment-aware: switches between Sepolia and Mainnet
 * https://docs.cartridge.gg/controller/getting-started
 */

import manifestSepolia from './src/dojo/manifest_sepolia.json' assert { type: 'json' };
import manifestMainnet from '../../chain/dojo/manifest_mainnet.json' assert { type: 'json' };

// Determine which manifest and network to use
const isMainnet = import.meta.env.VITE_STARKNET_RPC_URL?.includes('mainnet');
const manifest = isMainnet ? manifestMainnet : manifestSepolia;
const networkName = isMainnet ? 'MAINNET' : 'SEPOLIA';

console.log(`🔧 Controller Config: Using ${networkName}`);

// Find contract addresses from active manifest
const gameManagement = manifest.contracts.find((c) => c.tag === 'battleship-game_management');
const coinFlip = manifest.contracts.find((c) => c.tag === 'battleship-coin_flip');
const boardCommit = manifest.contracts.find((c) => c.tag === 'battleship-board_commit');
const gameplay = manifest.contracts.find((c) => c.tag === 'battleship-gameplay');
const proofVerify = manifest.contracts.find((c) => c.tag === 'battleship-proof_verify');
const timeout = manifest.contracts.find((c) => c.tag === 'battleship-timeout');
const escrow = manifest.contracts.find((c) => c.tag === 'battleship-escrow');

// WBTC address (same for both networks - will be updated from Atomiq)
const WBTC_ADDRESS = import.meta.env.VITE_WBTC_ADDRESS || '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac';

// Chain configuration
const chainId = isMainnet ? '0x534e5f4d41494e' : '0x534e5f5345504f4c4941'; // "SN_MAIN" or "SN_SEPOLIA" in hex
const rpcUrl = isMainnet 
  ? 'https://api.cartridge.gg/x/starknet/mainnet'
  : 'https://api.cartridge.gg/x/starknet/sepolia';

const controllerOpts = {
  chains: [
    {
      id: chainId,
      rpcUrl: rpcUrl,
    },
  ],
  defaultChainId: chainId,
  policies: {
    contracts: {
      // Game Management
      [gameManagement.address]: {
        name: 'Game Management',
        description: 'Create and join games',
        methods: [
          {
            name: 'Create Game',
            entrypoint: 'create_game',
            description: 'Create a new Battleship game',
          },
          {
            name: 'Join Game',
            entrypoint: 'join_game',
            description: 'Join an open game',
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
      // Real WBTC on Starknet Mainnet
      [WBTC_ADDRESS]: {
        name: 'WBTC',
        description: 'Wrapped Bitcoin on Starknet',
        methods: [
          { name: 'Approve', entrypoint: 'approve' },
          { name: 'Transfer', entrypoint: 'transfer' },
        ],
      },
    },
  },
};

export default controllerOpts;

