"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  Bath,
  Coins,
  TrendingUp,
  CheckSquare,
  Square,
} from "lucide-react";

interface PlayerStats {
  hasHouse: boolean;
  houseLevel: number;
  coinBalance: number;
  playerPower: number;
  pendingRewards: number;
  totalHeroes: number;
  heroesOnMap: number;
  heroesInRestroom: number;
  heroesInHouse: number;
  heroes: Array<{
    id: number;
    skinId: number;
    rarity: number;
    hp: number;
    maxHp: number;
    power: number;
    speed: number;
    stamina: number;
    location: 'map' | 'restroom' | 'house' | 'idle';
    gridX?: number;
    gridY?: number;
  }>;
}

export default function UserPanel() {
  const { programService, connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [selectedHeroes, setSelectedHeroes] = useState<number[]>([]);
  const [filterLocation, setFilterLocation] = useState<'all' | 'idle' | 'map' | 'restroom' | 'house' | 'active' | 'dead'>('all');
  const [upgradeTimeRemaining, setUpgradeTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (connected && programService && publicKey) {
      fetchPlayerStats();
    }
  }, [connected, programService, publicKey]);

  // Countdown timer for house upgrade
  useEffect(() => {
    if (!playerStats) return;

    const updateTimer = () => {
      if (!playerStats.hasHouse) return;

      // Get upgrade cooldown based on house level
      const cooldowns = [3600, 7200, 14400, 28800, 57600, 0]; // seconds for levels 1-6
      const cooldown = cooldowns[playerStats.houseLevel - 1] || 0;

      // Calculate time remaining (would need lastUpgradeTime from backend)
      // For now, set to 0 (always available)
      setUpgradeTimeRemaining(0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [playerStats]);

  const fetchPlayerStats = async () => {
    if (!programService || !publicKey) return;

    try {
      const stats = await programService.getPlayerStats();

      // Fetch pending rewards separately
      let pendingRewards = 0;
      try {
        const rewards = await programService.getPendingRewards();
        pendingRewards = typeof rewards === 'number' ? rewards : (rewards?.toNumber ? rewards.toNumber() : 0);
      } catch (e) {
        console.log("Could not fetch pending rewards:", e);
      }

      // Convert BN values to numbers
      const houseLevel = typeof stats.houseLevel === 'number' ? stats.houseLevel : (stats.houseLevel?.toNumber ? stats.houseLevel.toNumber() : 0);
      const coinBalance = typeof stats.coinBalance === 'number' ? stats.coinBalance : (stats.coinBalance?.toNumber ? stats.coinBalance.toNumber() : 0);
      const playerPower = typeof stats.playerPower === 'number' ? stats.playerPower : (stats.playerPower?.toNumber ? stats.playerPower.toNumber() : 0);
      const heroesTotal = typeof stats.heroesTotal === 'number' ? stats.heroesTotal : (stats.heroesTotal?.toNumber ? stats.heroesTotal.toNumber() : 0);
      const heroesOnMap = typeof stats.heroesOnMap === 'number' ? stats.heroesOnMap : (stats.heroesOnMap?.toNumber ? stats.heroesOnMap.toNumber() : 0);
      const heroesInRestroom = typeof stats.heroesInRestroom === 'number' ? stats.heroesInRestroom : (stats.heroesInRestroom?.toNumber ? stats.heroesInRestroom.toNumber() : 0);
      const heroesOnGrid = typeof stats.heroesOnGrid === 'number' ? stats.heroesOnGrid : (stats.heroesOnGrid?.toNumber ? stats.heroesOnGrid.toNumber() : 0);

      // Process heroes and categorize by location
      const processedStats: PlayerStats = {
        hasHouse: houseLevel > 0,
        houseLevel,
        coinBalance,
        playerPower,
        pendingRewards,
        totalHeroes: heroesTotal,
        heroesOnMap,
        heroesInRestroom,
        heroesInHouse: heroesOnGrid,
        heroes: []
      };

      // Fetch individual hero details
      const heroesArray = [];
      for (let i = 0; i < heroesTotal; i++) {
        try {
          const heroDetails = await programService.getHeroDetails(i);

          // Determine location
          let location: 'map' | 'restroom' | 'house' | 'idle' = 'idle';
          const isOnMap = stats.activeMap?.some((idx: any) => {
            const heroIdx = typeof idx === 'number' ? idx : (idx?.toNumber ? idx.toNumber() : 0);
            return heroIdx === i;
          });

          if (isOnMap) {
            location = 'map';
          } else if (heroDetails.isInRestroom) {
            location = 'restroom';
          } else if (heroDetails.gridX !== null && heroDetails.gridY !== null) {
            location = 'house';
          }

          heroesArray.push({
            id: i,
            skinId: heroDetails.skinId,
            rarity: heroDetails.rarity,
            // CRITICAL FIX: Use estimated_current_hp for real-time HP display
            hp: heroDetails.estimatedCurrentHp || heroDetails.estimated_current_hp || heroDetails.hp,
            maxHp: heroDetails.maxHp,
            power: heroDetails.power,
            speed: heroDetails.speed,
            stamina: heroDetails.stamina,
            location,
            gridX: heroDetails.gridX,
            gridY: heroDetails.gridY,
          });
        } catch (e) {
          console.log(`Could not fetch hero ${i}:`, e);
        }
      }

      processedStats.heroes = heroesArray;

      setPlayerStats(processedStats);
      console.log("👤 Player stats loaded:", processedStats);
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) {
        console.error("Error fetching player stats:", error);
      }
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

  const handleMoveHeroToMap = async (heroId: number) => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const sig = await programService.bulkMoveToMap([heroId]);
      console.log(`Hero ${heroId} moved to map:`, sig);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveHeroToRestroom = async (heroId: number, gridX: number, gridY: number) => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      // Use placeHeroOnGrid with isRestroom=true
      const sig = await programService.placeHeroOnGrid(heroId, gridX, gridY, true);
      console.log(`Hero ${heroId} moved to restroom:`, sig);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHeroFromMap = async (heroId: number) => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const sig = await programService.removeFromMap(heroId);
      console.log(`Hero ${heroId} removed from map:`, sig);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHeroFromHouse = async (gridX: number, gridY: number) => {
    if (!programService) return alert("Please connect wallet first");

    setLoading(true);
    try {
      const sig = await programService.removeHeroFromGrid(gridX, gridY);
      console.log(`Hero removed from house grid (${gridX}, ${gridY}):`, sig);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bulk action handlers using selected heroes
  const handleBulkMoveSelectedToMap = async () => {
    if (!programService) return alert("Please connect wallet first");
    if (selectedHeroes.length === 0) return alert("Please select heroes first");

    setLoading(true);
    try {
      const sig = await programService.bulkMoveToMap(selectedHeroes);
      console.log(`${selectedHeroes.length} heroes moved to map:`, sig);
      alert(`${selectedHeroes.length} heroes moved to map successfully!`);
      setSelectedHeroes([]);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemoveFromMap = async () => {
    if (!programService) return alert("Please connect wallet first");
    if (selectedHeroes.length === 0) return alert("Please select heroes first");

    setLoading(true);
    try {
      // Remove heroes one by one (until we add bulkRemoveFromMap to smart contract)
      for (const heroId of selectedHeroes) {
        await programService.removeFromMap(heroId);
      }
      console.log(`${selectedHeroes.length} heroes removed from map`);
      alert(`${selectedHeroes.length} heroes removed from map successfully!`);
      setSelectedHeroes([]);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMoveToRestroom = async () => {
    if (!programService) return alert("Please connect wallet first");
    if (selectedHeroes.length === 0) return alert("Please select heroes first");

    setLoading(true);
    try {
      // Move heroes to restroom one by one with auto-slot assignment
      let slot = 0;
      for (const heroId of selectedHeroes) {
        const x = slot % 3;
        const y = Math.floor(slot / 3);
        // Use placeHeroOnGrid with isRestroom=true
        await programService.placeHeroOnGrid(heroId, x, y, true);
        slot++;
      }
      console.log(`${selectedHeroes.length} heroes moved to restroom`);
      alert(`${selectedHeroes.length} heroes moved to restroom successfully!`);
      setSelectedHeroes([]);
      await fetchPlayerStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const toggleHeroSelection = (heroId: number) => {
    setSelectedHeroes(prev =>
      prev.includes(heroId)
        ? prev.filter(id => id !== heroId)
        : [...prev, heroId]
    );
  };

  const selectAll = () => {
    if (!playerStats) return;
    const filteredHeroes = getFilteredHeroes();
    setSelectedHeroes(filteredHeroes.map(h => h.id));
  };

  const deselectAll = () => {
    setSelectedHeroes([]);
  };

  const getFilteredHeroes = () => {
    if (!playerStats) return [];
    if (filterLocation === 'all') return playerStats.heroes;
    if (filterLocation === 'active') {
      // Active = On Map (currently mining)
      return playerStats.heroes.filter(h => h.location === 'map');
    }
    if (filterLocation === 'dead') {
      // Dead/Sleeping = HP is 0
      return playerStats.heroes.filter(h => h.hp === 0);
    }
    return playerStats.heroes.filter(h => h.location === filterLocation);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Game Dashboard</h2>
          <p className="text-slate-300">
            Manage your heroes and resources
          </p>
        </div>
        {playerStats?.hasHouse && (
          <Button onClick={fetchPlayerStats} variant="outline" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh Stats
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {playerStats && playerStats.hasHouse && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Coin Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {playerStats.coinBalance.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">Available for hero minting</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 border-2 border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-400 flex items-center gap-2 font-semibold">
                <TrendingUp className="w-5 h-5" />
                Pending Rewards (Unclaimed)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                {playerStats.pendingRewards.toLocaleString()}
              </div>
              <p className="text-xs text-yellow-300 mt-1 font-medium">💰 Click "Claim Rewards" in Actions tab to mint!</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Player Power (HMP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {playerStats.playerPower.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">Total mining power</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Home className="w-4 h-4" />
                House Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                Level {playerStats.houseLevel}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Grid: {playerStats.houseLevel === 1 ? '4x4' : playerStats.houseLevel === 2 ? '4x6' : playerStats.houseLevel === 3 ? '5x6' : playerStats.houseLevel === 4 ? '6x6' : playerStats.houseLevel === 5 ? '6x7' : '7x7'}
              </p>
              {upgradeTimeRemaining > 0 && (
                <p className="text-xs text-orange-400 mt-1 font-medium">
                  ⏰ Upgrade available in {Math.floor(upgradeTimeRemaining / 60)}m {upgradeTimeRemaining % 60}s
                </p>
              )}
              {upgradeTimeRemaining === 0 && playerStats.houseLevel < 6 && (
                <p className="text-xs text-green-400 mt-1 font-medium">
                  ✅ Upgrade available!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Distribution */}
      {playerStats?.hasHouse && playerStats.totalHeroes > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Hero Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Total Heroes: {playerStats.totalHeroes}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <MapPin className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{playerStats.heroesOnMap}</div>
                  <div className="text-sm text-slate-400">On Map (Mining)</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Bath className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {playerStats.heroesInRestroom}/{[4, 6, 8, 10, 12, 15][playerStats.houseLevel - 1] || 4}
                  </div>
                  <div className="text-sm text-slate-400">In Restroom (Capacity)</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <Home className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{playerStats.heroesInHouse}</div>
                  <div className="text-sm text-slate-400">Placed in House</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-500/10 rounded-lg border border-gray-500/30">
                <Users className="w-8 h-8 text-gray-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {playerStats.totalHeroes - playerStats.heroesOnMap - playerStats.heroesInRestroom - playerStats.heroesInHouse}
                  </div>
                  <div className="text-sm text-slate-400">Idle in Inventory</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Details List */}
      {playerStats?.hasHouse && playerStats.totalHeroes > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Your Heroes</CardTitle>
                <CardDescription className="text-slate-400">
                  All heroes with stats and locations
                  {selectedHeroes.length > 0 && ` • ${selectedHeroes.length} selected`}
                </CardDescription>
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  disabled={loading}
                  className="text-xs"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deselectAll}
                  disabled={loading || selectedHeroes.length === 0}
                  className="text-xs"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            {selectedHeroes.length > 0 && (
              <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-300 font-medium">
                    Bulk Actions ({selectedHeroes.length} heroes):
                  </span>
                  <Button
                    size="sm"
                    onClick={handleBulkMoveSelectedToMap}
                    disabled={loading}
                    className="text-xs h-8"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Move to Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkRemoveFromMap}
                    disabled={loading}
                    className="text-xs h-8"
                  >
                    Remove from Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMoveToRestroom}
                    disabled={loading}
                    className="text-xs h-8"
                  >
                    <Bath className="w-3 h-3 mr-1" />
                    To Restroom
                  </Button>
                </div>
              </div>
            )}

            {/* Filter by Location */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={filterLocation === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterLocation('all')}
                className="text-xs"
              >
                All Heroes ({playerStats.heroes.length})
              </Button>
              <Button
                size="sm"
                variant={filterLocation === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterLocation('active')}
                className="text-xs"
              >
                ⚡ Active Heroes ({playerStats.heroes.filter(h => h.location === 'map').length})
              </Button>
              <Button
                size="sm"
                variant={filterLocation === 'restroom' ? 'default' : 'outline'}
                onClick={() => setFilterLocation('restroom')}
                className="text-xs"
              >
                🛁 Restroom ({playerStats.heroes.filter(h => h.location === 'restroom').length})
              </Button>
              <Button
                size="sm"
                variant={filterLocation === 'map' ? 'default' : 'outline'}
                onClick={() => setFilterLocation('map')}
                className="text-xs"
              >
                📍 On Map ({playerStats.heroes.filter(h => h.location === 'map').length})
              </Button>
              <Button
                size="sm"
                variant={filterLocation === 'dead' ? 'default' : 'outline'}
                onClick={() => setFilterLocation('dead')}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
              >
                💀 Sleeping/Dead ({playerStats.heroes.filter(h => h.hp === 0).length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredHeroes().map((hero, index) => {
                const rarityNames = ['Common', 'Uncommon', 'Rare', 'SuperRare', 'Epic', 'Legendary'];
                const rarityColors = {
                  0: 'text-gray-400',
                  1: 'text-green-400',
                  2: 'text-blue-400',
                  3: 'text-purple-400',
                  4: 'text-orange-400',
                  5: 'text-yellow-400',
                };
                const rarityBgColors = {
                  0: 'bg-gray-500/10',
                  1: 'bg-green-500/10',
                  2: 'bg-blue-500/10',
                  3: 'bg-purple-500/10',
                  4: 'bg-orange-500/10',
                  5: 'bg-yellow-500/10',
                };
                const hpPercent = (hero.hp / hero.maxHp) * 100;
                const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : hpPercent > 0 ? 'bg-red-500' : 'bg-gray-500';
                const locationBadge = {
                  map: <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">⚡ Mining</span>,
                  restroom: <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">🛁 Recovering</span>,
                  house: <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">🏠 Placed</span>,
                  idle: <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">💤 Idle</span>,
                };

                const isSelected = selectedHeroes.includes(hero.id);

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Selection Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleHeroSelection(hero.id)}
                        className="w-5 h-5"
                      />

                      <div className="text-center">
                        <div className="text-2xl">🎮</div>
                        <div className="text-xs text-slate-400">Skin {hero.skinId}</div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white">Hero #{hero.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${rarityColors[hero.rarity as keyof typeof rarityColors]} ${rarityBgColors[hero.rarity as keyof typeof rarityBgColors]} border border-current`}>
                            ★ {rarityNames[hero.rarity]}
                          </span>
                          {locationBadge[hero.location]}
                        </div>

                        {/* HP Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>HP: {hero.hp}/{hero.maxHp}</span>
                            <span>{hpPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className={`${hpColor} h-2 rounded-full transition-all`}
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-xs mb-2">
                          <span className="text-slate-400">⚡ Power: <span className="text-white font-medium">{hero.power}</span></span>
                          <span className="text-slate-400">🏃 Speed: <span className="text-white font-medium">{hero.speed}</span></span>
                          <span className="text-slate-400">💪 Stamina: <span className="text-white font-medium">{hero.stamina}</span></span>
                          {hero.gridX !== undefined && hero.gridY !== undefined && (
                            <span className="text-slate-400">📍 Grid: <span className="text-white font-medium">({hero.gridX}, {hero.gridY})</span></span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {hero.location === 'idle' && hero.hp > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleMoveHeroToMap(hero.id)}
                              disabled={loading}
                              className="text-xs h-7"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              To Map
                            </Button>
                          )}
                          {hero.location === 'map' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveHeroFromMap(hero.id)}
                              disabled={loading}
                              className="text-xs h-7"
                            >
                              Remove from Map
                            </Button>
                          )}
                          {hero.location === 'house' && hero.gridX !== undefined && hero.gridY !== undefined && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveHeroFromHouse(hero.gridX!, hero.gridY!)}
                              disabled={loading}
                              className="text-xs h-7"
                            >
                              Remove from House
                            </Button>
                          )}
                          {(hero.location === 'idle' || hero.location === 'house' || hero.location === 'restroom') && hero.hp < hero.maxHp && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveHeroToRestroom(hero.id, 0, 0)}
                              disabled={loading}
                              className="text-xs h-7 bg-blue-500/10 hover:bg-blue-500/20"
                            >
                              <Bath className="w-3 h-3 mr-1" />
                              To Restroom
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
