// Xverse wallet integration service using Sats Connect v4+

import { request } from "sats-connect";
import type {
  BitcoinAddress,
  XverseConnectResponse,
} from "./types/bitcoin.types";

// Sats Connect v4 API types
enum AddressPurpose {
  Payment = "payment",
  Ordinals = "ordinals",
  Stacks = "stacks",
}

type GetAccountsOptions = {
  purposes: AddressPurpose[];
  message: string;
};

type SignMessageOptions = {
  address: string;
  message: string;
};

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
   * Uses sats-connect v4 API
   */
  async connect(): Promise<XverseConnectResponse> {
    try {
      const response = await request("getAccounts", {
        purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: "Connect your Bitcoin wallet to BitcoinShip",
      } as GetAccountsOptions);

      console.log("Xverse connected:", response);

      // Response format from v4:
      // { status: 'success', result: [...addresses...] }
      // result is the addresses array directly
      if (response.status === "success") {
        return { addresses: response.result } as XverseConnectResponse;
      } else {
        throw new Error("Failed to connect to Xverse");
      }
    } catch (error: any) {
      if (error.message?.includes("User rejected")) {
        throw new Error("User cancelled Xverse connection");
      }
      throw error;
    }
  }

  /**
   * Get Bitcoin payment address
   * Note: In v4, we use getAccounts instead of getAddress
   */
  async getBitcoinAddress(): Promise<BitcoinAddress | null> {
    try {
      const response = await request("getAccounts", {
        purposes: [AddressPurpose.Payment],
        message: "Get Bitcoin address",
      } as GetAccountsOptions);

      if (response.status === "success") {
        // response.result is the addresses array directly
        const addresses = response.result as any[];
        const paymentAddress = addresses.find(
          (addr: any) => addr.purpose === "payment"
        );
        return (paymentAddress as BitcoinAddress) || null;
      }
      return null;
    } catch (error) {
      console.error("Failed to get Bitcoin address:", error);
      return null;
    }
  }

  /**
   * Sign a message with Bitcoin wallet
   */
  async signMessage(message: string, btcAddress: string): Promise<string> {
    try {
      const response = await request("signMessage", {
        address: btcAddress,
        message,
      } as SignMessageOptions);

      if (response.status === "success") {
        return (response.result as any).signature;
      } else {
        throw new Error("Failed to sign message");
      }
    } catch (error: any) {
      if (error.message?.includes("User rejected")) {
        throw new Error("User cancelled message signing");
      }
      throw error;
    }
  }

  /**
   * Bind Bitcoin address to Starknet address
   */
  async bindAddresses(
    btcAddress: string,
    starknetAddress: string
  ): Promise<string> {
    const message = `Bind Bitcoin address ${btcAddress} to Starknet address ${starknetAddress} for BitcoinShip`;
    const signature = await this.signMessage(message, btcAddress);

    // For now, we just store the binding locally
    // In production, use a Bitcoin signature verification library
    // For demo, we trust the signature since it came from Xverse
    return signature;
  }
}
