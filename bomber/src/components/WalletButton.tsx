"use client";

import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

export default function WalletButton() {
  const { publicKey, connected, connecting, connect, disconnect } = useWallet();

  const handleConnect = async () => {
    console.log("🔘 Connect button clicked");
    console.log("💡 Check browser console for detailed connection logs");

    try {
      await connect(false);
    } catch (error: any) {
      console.error("❌ Error in handleConnect:", {
        message: error.message,
        stack: error.stack
      });
    }
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-mono">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </div>
        <Button onClick={disconnect} variant="outline" size="sm" className="gap-2">
          <LogOut className="w-4 h-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={connecting}
      className="gap-2"
    >
      <Wallet className="w-4 h-4" />
      {connecting ? "Connecting..." : "Connect Phantom"}
    </Button>
  );
}
