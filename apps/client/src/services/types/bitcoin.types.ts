// Bitcoin wallet types for Xverse integration

export interface BitcoinAddress {
  address: string;
  publicKey: string;
  purpose: "payment" | "ordinals";
}

export interface XverseConnectResponse {
  addresses: BitcoinAddress[];
}

export enum BitcoinNetworkType {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  TESTNET4 = "testnet4",
  SIGNET = "signet",
}

export interface BitcoinWalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  starknetBinding: string | null; // Starknet address bound to this BTC address
}

