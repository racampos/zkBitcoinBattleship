/**
 * Dojo Context Provider
 * Manages Dojo SDK initialization and provides it to the app
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { init, SDK } from "@dojoengine/sdk";
import { DOJO_CONFIG } from "./config";

interface DojoContextValue {
  sdk: SDK | null;
  isInitialized: boolean;
  error: string | null;
}

const DojoContext = createContext<DojoContextValue>({
  sdk: null,
  isInitialized: false,
  error: null,
});

export function DojoProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<SDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("🔧 Initializing Dojo SDK...");
        console.log("  World:", DOJO_CONFIG.worldAddress);
        console.log("  Torii:", DOJO_CONFIG.toriiUrl);

        const dojoSdk = await init({
          client: {
            worldAddress: DOJO_CONFIG.worldAddress,
            toriiUrl: DOJO_CONFIG.toriiUrl,
            rpcUrl: DOJO_CONFIG.rpcUrl,
            relayUrl: DOJO_CONFIG.relayUrl,
          },
          domain: DOJO_CONFIG.domainSeparator,
        });

        setSdk(dojoSdk);
        setIsInitialized(true);
        console.log("✅ Dojo SDK initialized successfully");
      } catch (err: any) {
        console.error("❌ Failed to initialize Dojo SDK:", err);
        setError(err.message || "Failed to initialize Dojo SDK");
      }
    })();
  }, []);

  return (
    <DojoContext.Provider value={{ sdk, isInitialized, error }}>
      {children}
    </DojoContext.Provider>
  );
}

export function useDojo() {
  const context = useContext(DojoContext);
  if (!context) {
    throw new Error("useDojo must be used within DojoProvider");
  }
  return context;
}
