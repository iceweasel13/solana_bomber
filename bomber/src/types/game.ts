import { PublicKey } from "@solana/web3.js";

export interface GlobalState {
  authority: PublicKey;
  devTreasury: PublicKey;
  rewardTokenMint: PublicKey;
  gameHasStarted: boolean;
  paused: boolean;
  mintingEnabled: boolean;
  houseUpgradesEnabled: boolean;
  startBlock: number;
  houseCount: number;
  uniqueHeroesCount: number;
  totalHashPower: number;
  initialHousePrice: number;
  initialBombcoinPerBlock: number;
  halvingInterval: number;
  burnPct: number;
  referralFee: number;
  rewardsPrecision: number;
  totalMined: number;
  totalBurned: number;
  rewardPool: number;
}

export interface GameInfoData {
  authority: PublicKey;
  devTreasury: PublicKey;
  rewardTokenMint: PublicKey;
  gameHasStarted: boolean;
  paused: boolean;
  startBlock: number;
  houseCount: number;
  uniqueHeroesCount: number;
  totalHashPower: number;
  initialHousePrice: number;
  initialBombcoinPerBlock: number;
  currentBombcoinPerBlock: number;
  halvingInterval: number;
  burnPct: number;
  referralFee: number;
  rewardsPrecision: number;
  totalMined: number;
  totalBurned: number;
  rewardPool: number;
  blocksUntilNextHalving: number;
}

export interface PlayerStatsData {
  owner: PublicKey;
  houseLevel: number;
  gridWidth: number;
  gridHeight: number;
  coinBalance: number;
  playerPower: number;
  heroesTotal: number;
  heroesOnMap: number;
  heroesOnGrid: number;
  heroesInRestroom: number;
  heroesSleeping: number;
  maxRestroomSlots: number;
  restroomSlotsUsed: number;
  nextUpgradeCost: number;
  upgradeCooldownRemaining: number;
  canUpgrade: boolean;
  referrer: PublicKey | null;
  referralBonusPaid: number;
  referralCount: number;
}

export interface HeroPlacement {
  heroIndex: number;
  x: number;
  y: number;
  isRestroom: boolean;
}

export interface PendingRewardsData {
  grossReward: number;
  netReward: number;
  referralBonus: number;
  totalHmp: number;
  activeHeroCount: number;
  elapsedSeconds: number;
  currentBombcoinPerBlock: number;
}
