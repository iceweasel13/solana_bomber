"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { PublicKey } from "@solana/web3.js";
import {
  Play,
  Pause,
  Settings,
  ToggleLeft,
  Home,
  Wallet,
  Rocket,
} from "lucide-react";

export default function AdminPanel() {
  const { programService, connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mintingEnabled, setMintingEnabled] = useState(true);
  const [upgradesEnabled, setUpgradesEnabled] = useState(true);

  // Fetch game state when wallet connects
  useEffect(() => {
    if (programService && connected) {
      fetchGameState();
    }
  }, [programService, connected]);

  const fetchGameState = async () => {
    if (!programService) return;

    try {
      const gameInfo = await programService.getGameInfo();
      setGameInitialized(true);
      setGameStarted(gameInfo.gameHasStarted);
      setPaused(gameInfo.paused);
      setMintingEnabled(gameInfo.mintingEnabled);
      setUpgradesEnabled(gameInfo.houseUpgradesEnabled);
      console.log("📊 Game state loaded:", {
        initialized: true,
        started: gameInfo.gameHasStarted,
        paused: gameInfo.paused
      });
    } catch (error: any) {
      if (error.message?.includes("Account does not exist")) {
        console.log("⚠️ Game not initialized yet");
        setGameInitialized(false);
        setGameStarted(false);
      } else {
        console.error("Error fetching game state:", error);
      }
    }
  };

  const handleInitialize = async () => {
    if (!programService || !publicKey) {
      console.error("❌ Cannot initialize: Wallet not connected");
      return;
    }

    const confirmed = window.confirm(
      "🎮 Initialize Solana Bomber Game?\n\n" +
      "This will create the global state with:\n" +
      "- House Price: 0.25 SOL\n" +
      "- Reward Rate: 1000 coins/hour\n" +
      "- Burn Rate: 50%\n" +
      "- Referral Fee: 2.5%\n" +
      "- Treasury: Your wallet\n\n" +
      "This is a ONE-TIME operation and requires admin authority.\n\n" +
      "Continue?"
    );

    if (!confirmed) {
      console.log("⏭️ User cancelled initialization");
      return;
    }

    setLoading(true);
    console.log("🚀 Initializing game with parameters:", {
      treasury: publicKey.toString(),
      housePrice: "0.25 SOL",
      rewardRate: "1000 coins/hour",
      halvingInterval: "1B coins",
      burnPct: "50%",
      referralFee: "2.5%"
    });

    try {
      const sig = await programService.initializeGlobalState(
        publicKey,
        250_000_000,
        1000,
        1_000_000_000,
        5000,
        250,
        1
      );

      console.log("✅ Game initialized successfully!");
      console.log("📝 Transaction signature:", sig);
      console.log("➡️ Next step: Click 'Start Game' to begin accepting players");
    } catch (error: any) {
      console.error("❌ Error initializing game:", {
        message: error.message,
        logs: error.logs,
        code: error.code
      });
      console.error("💡 Tip: Make sure you are using the authority wallet");

      if (error.message?.includes("already in use")) {
        console.warn("⚠️ Game is already initialized! Use 'Start Game' instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!programService) {
      console.error("❌ Cannot start game: Wallet not connected");
      return;
    }

    setLoading(true);
    console.log("▶️ Starting game...");
    console.log("🔑 Using wallet:", publicKey?.toString());
    console.log("💡 This wallet MUST match the authority that initialized the game");

    try {
      const sig = await programService.startGame();

      console.log("✅ Game started successfully!");
      console.log("📝 Transaction signature:", sig);
      console.log("🎮 Users can now purchase houses and play!");
      console.log("💡 Go to Stats tab to view game statistics");
    } catch (error: any) {
      console.error("❌ Error starting game:", {
        message: error.message,
        logs: error.logs,
        code: error.code
      });

      if (error.message?.includes("already started")) {
        console.warn("⚠️ Game is already started!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!programService) {
      console.error("❌ Cannot toggle pause: Wallet not connected");
      return;
    }

    const newState = !paused;
    setLoading(true);
    console.log(`⏸️ ${newState ? 'Pausing' : 'Resuming'} game...`);

    try {
      const sig = await programService.togglePause(newState);
      setPaused(newState);

      console.log(`✅ Game ${newState ? 'paused' : 'resumed'} successfully!`);
      console.log("📝 Transaction signature:", sig);
    } catch (error: any) {
      console.error(`❌ Error ${newState ? 'pausing' : 'resuming'} game:`, {
        message: error.message,
        logs: error.logs
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMinting = async () => {
    if (!programService) {
      console.error("❌ Cannot toggle minting: Wallet not connected");
      return;
    }

    const newState = !mintingEnabled;
    setLoading(true);
    console.log(`🔄 ${newState ? 'Enabling' : 'Disabling'} hero minting...`);

    try {
      const sig = await programService.toggleMinting(newState);
      setMintingEnabled(newState);

      console.log(`✅ Minting ${newState ? 'enabled' : 'disabled'} successfully!`);
      console.log("📝 Transaction signature:", sig);
    } catch (error: any) {
      console.error(`❌ Error toggling minting:`, {
        message: error.message,
        logs: error.logs
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpgrades = async () => {
    if (!programService) {
      console.error("❌ Cannot toggle upgrades: Wallet not connected");
      return;
    }

    const newState = !upgradesEnabled;
    setLoading(true);
    console.log(`🏠 ${newState ? 'Enabling' : 'Disabling'} house upgrades...`);

    try {
      const sig = await programService.toggleHouseUpgrades(newState);
      setUpgradesEnabled(newState);

      console.log(`✅ House upgrades ${newState ? 'enabled' : 'disabled'} successfully!`);
      console.log("📝 Transaction signature:", sig);
    } catch (error: any) {
      console.error(`❌ Error toggling upgrades:`, {
        message: error.message,
        logs: error.logs
      });
    } finally {
      setLoading(false);
    }
  };

  const adminActions = [
    {
      title: "Initialize Game",
      description: "ONE-TIME: Create global state and setup game (Admin only)",
      icon: Rocket,
      color: "bg-purple-500",
      action: handleInitialize,
    },
    {
      title: "Start Game",
      description: "Start accepting players (run after initialization)",
      icon: Play,
      color: "bg-green-500",
      action: handleStartGame,
    },
    {
      title: paused ? "Resume Game" : "Pause Game",
      description: "Emergency pause/unpause the entire game",
      icon: Pause,
      color: "bg-yellow-500",
      action: handleTogglePause,
    },
    {
      title: mintingEnabled ? "Disable Minting" : "Enable Minting",
      description: "Enable/disable hero minting only",
      icon: ToggleLeft,
      color: mintingEnabled ? "bg-blue-500" : "bg-gray-500",
      action: handleToggleMinting,
    },
    {
      title: upgradesEnabled ? "Disable Upgrades" : "Enable Upgrades",
      description: "Enable/disable house upgrade functionality",
      icon: Home,
      color: upgradesEnabled ? "bg-purple-500" : "bg-gray-500",
      action: handleToggleUpgrades,
    },
  ];

  if (!connected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-12 text-center">
          <Wallet className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Wallet Not Connected
          </h3>
          <p className="text-slate-400">
            Please connect your Phantom wallet to access admin functions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Controls</h2>
        <p className="text-slate-300">
          Manage game state and configuration (Admin authority required)
        </p>
      </div>

      {/* Important Notice */}
      <Card className="bg-blue-500/10 border-blue-500/50">
        <CardContent className="p-4">
          <p className="text-blue-200 text-sm">
            ℹ️ <strong>Status Check:</strong> The game has been initialized but may not be started yet.
            If you get "simulation failed" errors when clicking "Initialize Game", it means the game is already initialized.
            Click <strong>"Start Game"</strong> (green card) instead to begin accepting players.
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminActions.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-white text-lg mt-4">{item.title}</CardTitle>
                <CardDescription className="text-slate-400">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={item.action}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  Execute
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Configuration Form */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Update Game Configuration</CardTitle>
          <CardDescription className="text-slate-400">
            Modify economic parameters (values in lamports/basis points)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                House Price (lamports)
              </label>
              <input
                id="housePrice"
                type="number"
                placeholder="250000000"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Reward Rate (coins/hour)
              </label>
              <input
                id="rewardRate"
                type="number"
                placeholder="1500"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Burn Percentage (basis points, 5000 = 50%)
              </label>
              <input
                id="burnPct"
                type="number"
                placeholder="5000"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Referral Fee (basis points, 250 = 2.5%)
              </label>
              <input
                id="referralFee"
                type="number"
                placeholder="250"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <Button
            className="w-full md:w-auto"
            disabled={loading || !connected}
            onClick={async () => {
              if (!programService) return;

              const housePrice = (document.getElementById("housePrice") as HTMLInputElement)?.value;
              const rewardRate = (document.getElementById("rewardRate") as HTMLInputElement)?.value;
              const burnPct = (document.getElementById("burnPct") as HTMLInputElement)?.value;
              const referralFee = (document.getElementById("referralFee") as HTMLInputElement)?.value;

              const params: any = {};
              if (housePrice) params.initialHousePrice = parseInt(housePrice);
              if (rewardRate) params.initialBombcoinPerBlock = parseInt(rewardRate);
              if (burnPct) params.burnPct = parseInt(burnPct);
              if (referralFee) params.referralFee = parseInt(referralFee);

              if (Object.keys(params).length === 0) {
                console.warn("⚠️ No values entered to update");
                return;
              }

              setLoading(true);
              console.log("⚙️ Updating game configuration:", params);

              try {
                const sig = await programService.updateGameConfig(params);
                console.log("✅ Configuration updated successfully!");
                console.log("📝 Transaction signature:", sig);
              } catch (error: any) {
                console.error("❌ Error updating config:", {
                  message: error.message,
                  logs: error.logs
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Update Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
