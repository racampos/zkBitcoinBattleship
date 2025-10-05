// Bitcoin wallet hook for Xverse integration

import { useCallback } from "react";
import { XverseService } from "../services/xverse";
import { useBTCWalletStore } from "../store/btcWalletStore";

/**
 * Hook to connect and manage Bitcoin wallet (Xverse)
 * Integrates with Cartridge Controller account from global context
 */
export function useBitcoinWallet() {
  const xverseService = XverseService.getInstance();

  const {
    connected,
    address,
    publicKey,
    starknetBinding,
    setConnected,
    setAddress,
    setPublicKey,
    setStarknetBinding,
    disconnect: disconnectStore,
  } = useBTCWalletStore();

  const connect = useCallback(async () => {
    try {
      const response = await xverseService.connect();
      const paymentAddress = response.addresses.find(
        (addr) => addr.purpose === "payment"
      );

      if (!paymentAddress) {
        throw new Error("No payment address found");
      }

      setConnected(true);
      setAddress(paymentAddress.address);
      setPublicKey(paymentAddress.publicKey);

      // Get Starknet address from global account (Cartridge Controller)
      // @ts-ignore - account is from global game.js context
      const starknetAccount = window.account;

      // Bind to Starknet address if available
      if (starknetAccount?.address) {
        try {
          const signature = await xverseService.bindToStarknet(
            paymentAddress.address,
            starknetAccount.address
          );
          console.log("Binding signature:", signature);
          setStarknetBinding(starknetAccount.address);
        } catch (error) {
          console.error("Failed to bind addresses:", error);
          // Non-critical, continue anyway
        }
      }

      return paymentAddress.address;
    } catch (error) {
      console.error("Failed to connect Xverse:", error);
      throw error;
    }
  }, [setConnected, setAddress, setPublicKey, setStarknetBinding]);

  const disconnect = useCallback(() => {
    disconnectStore();
  }, [disconnectStore]);

  return {
    connected,
    address,
    publicKey,
    starknetBinding,
    connect,
    disconnect,
  };
}

