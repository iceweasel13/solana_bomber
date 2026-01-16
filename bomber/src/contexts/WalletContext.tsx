"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getConnection, RPC_ENDPOINT } from "@/lib/solana-config";
import { SolanaBomberService } from "@/lib/program-service";

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  programService: SolanaBomberService | null;
}

const WalletContext = createContext<WalletContextType>({
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  programService: null,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [programService, setProgramService] = useState<SolanaBomberService | null>(null);

  const connect = useCallback(async (silent = false) => {
    console.log("🔌 Connect function called, silent:", silent);
    setConnecting(true);

    try {
      // Check if we're in browser environment
      if (typeof window === "undefined") {
        console.error("❌ Not in browser environment");
        setConnecting(false);
        return;
      }

      // Check if Phantom is installed
      if (!("solana" in window)) {
        console.error("❌ Phantom wallet not found in window");
        if (!silent) {
          console.error("🚨 Please install Phantom browser extension from https://phantom.app");
        }
        setConnecting(false);
        return;
      }

      const provider = (window as any).solana;
      console.log("✓ Phantom provider found:", {
        isPhantom: provider.isPhantom,
        publicKey: provider.publicKey?.toString()
      });

      if (!provider.isPhantom) {
        console.error("❌ Solana provider exists but is not Phantom");
        setConnecting(false);
        return;
      }

      console.log(`📡 Attempting to connect to Phantom (silent: ${silent})...`);

      // Connect to Phantom
      let response;
      try {
        response = silent
          ? await provider.connect({ onlyIfTrusted: true })
          : await provider.connect();
      } catch (connectError: any) {
        if (connectError.code === 4001) {
          console.warn("⚠️ User rejected the connection request");
        } else if (connectError.message?.includes("User rejected")) {
          console.warn("⚠️ User rejected the connection request");
        } else {
          console.error("❌ Failed to connect to Phantom:", connectError);
        }
        setConnecting(false);
        return;
      }

      if (!response || !response.publicKey) {
        console.error("❌ Invalid response from Phantom:", response);
        setConnecting(false);
        return;
      }

      console.log("✅ Connected to Phantom! Response:", {
        publicKey: response.publicKey.toString()
      });

      // Create PublicKey
      const pubkey = new PublicKey(response.publicKey.toString());
      setPublicKey(pubkey);
      setConnected(true);

      // Create connection
      const connection = getConnection();
      console.log("✓ Created Solana connection to:", connection.rpcEndpoint);

      // Create Anchor provider
      const anchorProvider = new AnchorProvider(
        connection,
        provider,
        { commitment: "confirmed" }
      );

      // Initialize program service
      console.log("🔧 Initializing program service...");
      const service = new SolanaBomberService(anchorProvider);
      setProgramService(service);

      // Store connection state
      localStorage.setItem("walletConnected", "true");

      console.log("✅ Wallet setup complete!");
      console.log("📍 Connected wallet:", pubkey.toString().slice(0, 8) + "..." + pubkey.toString().slice(-8));

    } catch (error: any) {
      console.error("❌ Connection error:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      // Clear connection state
      setPublicKey(null);
      setConnected(false);
      setProgramService(null);
      localStorage.removeItem("walletConnected");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = () => {
    console.log("🔌 Disconnecting wallet...");

    try {
      if (typeof window !== "undefined" && "solana" in window) {
        (window as any).solana.disconnect();
      }

      setPublicKey(null);
      setConnected(false);
      setProgramService(null);
      localStorage.removeItem("walletConnected");

      console.log("✅ Wallet disconnected successfully");
    } catch (error: any) {
      console.error("❌ Error disconnecting wallet:", error);
    }
  };

  // Auto-connect on load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window === "undefined") {
        console.log("⏭️ Skipping auto-connect: not in browser");
        return;
      }

      const wasConnected = localStorage.getItem("walletConnected") === "true";
      console.log("🔍 Auto-connect check, wasConnected:", wasConnected);

      if (!wasConnected) {
        console.log("⏭️ Skipping auto-connect: user was not previously connected");
        return;
      }

      if (!("solana" in window)) {
        console.log("⏭️ Skipping auto-connect: Phantom not detected");
        return;
      }

      const provider = (window as any).solana;
      if (provider.isPhantom) {
        console.log("🔄 Attempting silent auto-reconnect...");
        await connect(true);
      } else {
        console.log("⏭️ Skipping auto-connect: solana provider is not Phantom");
      }
    };

    // Delay to ensure Phantom extension is loaded
    const timer = setTimeout(() => {
      autoConnect();
    }, 500);

    return () => clearTimeout(timer);
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        connected,
        connecting,
        connect,
        disconnect,
        programService,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
