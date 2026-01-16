"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { PROGRAM_ID } from "@/lib/solana-config";
import { GameInfoData } from "@/types/game";
import { RefreshCw, TrendingUp, Users, Coins, Flame, Gift } from "lucide-react";

export default function StatsPanel() {
  const { programService, connected } = useWallet();
  const [gameInfo, setGameInfo] = useState<GameInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameNotInitialized, setGameNotInitialized] = useState(false);

  const fetchGameInfo = async () => {
    if (!programService) {
      console.log("Wallet not connected");
      return;
    }

    setLoading(true);
    setGameNotInitialized(false);
    try {
      const info = await programService.getGameInfo();
      setGameInfo(info as any);
      setGameNotInitialized(false);
      console.log("Game info loaded:", info);
    } catch (error: any) {
      console.error("Error fetching game info:", error);

      // Check if it's an account not found error
      if (error.message?.includes("Account does not exist") ||
          error.message?.includes("AccountNotFound") ||
          error.toString().includes("could not find account")) {
        console.warn("⚠️ Game not initialized - admin needs to initialize first");
        setGameNotInitialized(true);
        setGameInfo(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-fetch on mount - let user click Refresh button
  // This prevents errors when game state is uncertain
  useEffect(() => {
    // Removed auto-fetch to prevent errors on page load
    console.log("📊 Stats panel ready. Click 'Refresh' to load game data.");
  }, [connected, programService]);

  const stats = [
    {
      title: "Total Houses",
      value: gameInfo?.houseCount.toString() || "0",
      icon: Users,
      color: "bg-blue-500",
      change: "+12%",
    },
    {
      title: "Unique Heroes",
      value: gameInfo?.uniqueHeroesCount.toString() || "0",
      icon: TrendingUp,
      color: "bg-green-500",
      change: "+8%",
    },
    {
      title: "Total Mined",
      value: gameInfo?.totalMined ? `${(gameInfo.totalMined / 1_000_000).toFixed(2)}M` : "0",
      icon: Coins,
      color: "bg-yellow-500",
      change: "+15%",
    },
    {
      title: "Total Burned",
      value: gameInfo?.totalBurned ? `${(gameInfo.totalBurned / 1_000_000).toFixed(2)}M` : "0",
      icon: Flame,
      color: "bg-red-500",
      change: "+5%",
    },
    {
      title: "Reward Pool",
      value: gameInfo?.rewardPool ? `${(gameInfo.rewardPool / 1_000_000).toFixed(2)}M` : "0",
      icon: Gift,
      color: "bg-purple-500",
      change: "+20%",
    },
    {
      title: "Hash Power",
      value: gameInfo?.totalHashPower.toString() || "0",
      icon: TrendingUp,
      color: "bg-indigo-500",
      change: "+10%",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Game Statistics</h2>
        <Button
          onClick={fetchGameInfo}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Game Not Initialized Warning */}
      {gameNotInitialized && (
        <Card className="bg-yellow-500/10 border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              ⚠️ Game Not Initialized
            </CardTitle>
            <CardDescription className="text-yellow-200">
              The game has not been initialized yet. An admin with the authority wallet needs to initialize the game first.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-slate-300">
            <p className="mb-2">To initialize the game:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Connect with the authority wallet in Phantom</li>
              <li>Go to the <strong>Admin</strong> tab</li>
              <li>Click the <strong>"Initialize Game"</strong> button (purple card with 🚀 icon)</li>
              <li>Approve the transaction in Phantom</li>
              <li>Return here to view statistics</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change} from last week
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Economic Parameters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Economic Parameters</CardTitle>
          <CardDescription className="text-slate-400">
            Current game configuration and reward rates
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200">
          <div>
            <p className="text-sm text-slate-400">House Price</p>
            <p className="text-lg font-semibold">
              {gameInfo?.initialHousePrice ? `${(gameInfo.initialHousePrice / 1_000_000_000).toFixed(2)} SOL` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Current Reward Rate</p>
            <p className="text-lg font-semibold">
              {gameInfo?.currentBombcoinPerBlock || "N/A"} coins/hour
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Burn Percentage</p>
            <p className="text-lg font-semibold">
              {gameInfo?.burnPct ? `${(gameInfo.burnPct / 100).toFixed(1)}%` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Referral Fee</p>
            <p className="text-lg font-semibold">
              {gameInfo?.referralFee ? `${(gameInfo.referralFee / 100).toFixed(1)}%` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Halving Interval</p>
            <p className="text-lg font-semibold">
              {gameInfo?.halvingInterval ? `${(gameInfo.halvingInterval / 1_000_000).toFixed(0)}M` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Blocks Until Halving</p>
            <p className="text-lg font-semibold">
              {gameInfo?.blocksUntilNextHalving ? `${(gameInfo.blocksUntilNextHalving / 1_000_000).toFixed(2)}M` : "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Game Status</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className={`px-4 py-2 rounded-lg ${gameInfo?.gameHasStarted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {gameInfo?.gameHasStarted ? "✓ Game Started" : "✗ Game Not Started"}
          </div>
          <div className={`px-4 py-2 rounded-lg ${gameInfo?.paused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {gameInfo?.paused ? "⏸ Paused" : "▶ Active"}
          </div>
          <div className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400">
            Program: {PROGRAM_ID.toString().slice(0, 8)}...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
