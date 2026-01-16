"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { PublicKey } from "@solana/web3.js";
import {
  Home,
  ShoppingCart,
  MapPin,
  Gift,
  Heart,
  ArrowUp,
  Grid3x3,
  Wallet as WalletIcon,
} from "lucide-react";

export default function UserPanel() {
  const { programService, connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState<any>(null);

  useEffect(() => {
    if (connected && programService && publicKey) {
      fetchPlayerStats();
    }
  }, [connected, programService, publicKey]);

  const fetchPlayerStats = async () => {
    if (!programService) return;

    try {
      const stats = await programService.getPlayerStats();
      setPlayerStats(stats);
      console.log("Player stats:", stats);
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }
  };

  const handlePurchaseHouse = async () => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const devTreasury = new PublicKey("GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w"); // Replace with actual treasury
      const sig = await programService.purchaseInitialHouse(devTreasury);
      console.log("House purchased:", sig);
      alert("House purchased successfully!");
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyHeroes = async () => {
    if (!programService) return alert("Please connect wallet first");

    const quantity = parseInt((document.getElementById("heroQuantity") as HTMLInputElement)?.value || "1");
    if (quantity < 1 || quantity > 10) return alert("Quantity must be between 1-10");

    setLoading(true);
    try {
      const sig = await programService.buyHero(quantity);
      console.log("Heroes purchased:", sig);
      alert(`${quantity} heroes minted successfully!`);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMoveToMap = async () => {
    if (!programService) return alert("Please connect wallet first");

    const indices = (document.getElementById("heroIndices") as HTMLInputElement)?.value;
    if (!indices) return alert("Please enter hero indices");

    const heroIndices = indices.split(",").map((i) => parseInt(i.trim()));

    setLoading(true);
    try {
      const sig = await programService.bulkMoveToMap(heroIndices);
      console.log("Heroes moved to map:", sig);
      alert(`${heroIndices.length} heroes moved to map successfully!`);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const sig = await programService.claimRewards();
      console.log("Rewards claimed:", sig);
      alert("Rewards claimed successfully!");
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeHouse = async () => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const sig = await programService.upgradeHouse();
      console.log("House upgraded:", sig);
      alert("House upgraded successfully!");
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-12 text-center">
          <WalletIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Wallet Not Connected
          </h3>
          <p className="text-slate-400">
            Please connect your Phantom wallet to access user functions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">User Functions</h2>
        <p className="text-slate-300">
          Interact with the game as a player
        </p>
      </div>

      {/* Player Stats Display */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Your Stats</CardTitle>
          <CardDescription>Current player information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-200">
          <div>
            <p className="text-sm text-slate-400">House Level</p>
            <p className="text-2xl font-bold">{playerStats?.houseLevel || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Grid Size</p>
            <p className="text-2xl font-bold">
              {playerStats ? `${playerStats.gridWidth}×${playerStats.gridHeight}` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Coins</p>
            <p className="text-2xl font-bold">{playerStats?.coinBalance?.toString() || "0"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Heroes</p>
            <p className="text-2xl font-bold">{playerStats?.heroesTotal?.toString() || "0"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Home className="w-5 h-5" />
              Purchase House
            </CardTitle>
            <CardDescription>Buy initial house to start playing (0.25 SOL)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePurchaseHouse} disabled={loading || playerStats?.houseLevel > 0} className="w-full">
              {playerStats?.houseLevel > 0 ? "Already Purchased" : "Purchase for 0.25 SOL"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Claim Rewards
            </CardTitle>
            <CardDescription>Collect mining rewards from active heroes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleClaimRewards} disabled={loading} className="w-full">
              Claim Rewards
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowUp className="w-5 h-5" />
              Upgrade House
            </CardTitle>
            <CardDescription>Expand grid capacity and restroom slots</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUpgradeHouse} disabled={loading} className="w-full">
              Upgrade to Level {(playerStats?.houseLevel || 0) + 1}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Buy Heroes
            </CardTitle>
            <CardDescription>Mint 1-10 heroes (100 coins each)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              id="heroQuantity"
              type="number"
              min="1"
              max="10"
              placeholder="5"
              defaultValue="1"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button onClick={handleBuyHeroes} disabled={loading} className="w-full">
              Mint Heroes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Move to Map */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Bulk Move to Map (NEW FEATURE)
          </CardTitle>
          <CardDescription>
            Move multiple heroes to map (start mining) in a single transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">
              Hero Indices (comma-separated, e.g., 0,1,2,3)
            </label>
            <input
              id="heroIndices"
              type="text"
              placeholder="0,1,2,3,4"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button onClick={handleBulkMoveToMap} className="w-full gap-2" disabled={loading}>
            <MapPin className="w-4 h-4" />
            Move Heroes to Map
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
