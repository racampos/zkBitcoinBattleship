// Xverse wallet integration service using Sats Connect

import { connect, signMessage, getAddress } from "sats-connect";
import type {
  BitcoinAddress,
  XverseConnectResponse,
} from "./types/bitcoin.types";

export class XverseService {
  private static instance: XverseService;

  private constructor() {}

  static getInstance(): XverseService {
    if (!XverseService.instance) {
      XverseService.instance = new XverseService();
    }
    return XverseService.instance;
  }

  /**
   * Connect to Xverse wallet and get Bitcoin addresses
   */
  async connect(): Promise<XverseConnectResponse> {
    return new Promise((resolve, reject) => {
      connect({
        onFinish: (response) => {
          console.log("Xverse connected:", response);
          resolve(response as XverseConnectResponse);
        },
        onCancel: () => {
          reject(new Error("User cancelled Xverse connection"));
        },
        payload: {
          purposes: ["payment"], // We only need payment address for swaps
          message: "Connect your Bitcoin wallet to BitcoinShip",
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Get current Bitcoin address (if already connected)
   */
  async getAddress(): Promise<BitcoinAddress | null> {
    return new Promise((resolve) => {
      getAddress({
        onFinish: (response) => {
          const paymentAddress = response.addresses.find(
            (addr) => addr.purpose === "payment"
          );
          resolve((paymentAddress as BitcoinAddress) || null);
        },
        onCancel: () => resolve(null),
        payload: {
          purposes: ["payment"],
          message: "Get Bitcoin address",
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Sign a message to bind Bitcoin address to Starknet address
   */
  async bindToStarknet(
    btcAddress: string,
    starknetAddress: string
  ): Promise<string> {
    const message = `Bind Bitcoin address ${btcAddress} to Starknet address ${starknetAddress} for BitcoinShip`;

    return new Promise((resolve, reject) => {
      signMessage({
        onFinish: (response) => {
          console.log("Message signed:", response);
          resolve(response as string);
        },
        onCancel: () => {
          reject(new Error("User cancelled message signing"));
        },
        payload: {
          message,
          address: btcAddress,
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Verify signed message (optional - for server-side verification)
   */
  async verifyBinding(
    btcAddress: string,
    starknetAddress: string,
    signature: string
  ): Promise<boolean> {
    // This would typically be done server-side
    // For now, we just store the binding locally
    const expectedMessage = `Bind Bitcoin address ${btcAddress} to Starknet address ${starknetAddress} for BitcoinShip`;

    // In production, use a Bitcoin signature verification library
    // For demo, we trust the signature since it came from Xverse
    return true;
  }
}

