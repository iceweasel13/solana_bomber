import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PROGRAM_ID, getGlobalStatePDA, getUserAccountPDA, getRewardTokenMintPDA } from "./solana-config";
import IDL_JSON from "./idl.json";

export class SolanaBomberService {
  program: Program;
  connection: Connection;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    this.connection = provider.connection;

    try {
      // Cast the IDL properly - Anchor expects specific structure
      const idl = IDL_JSON as unknown as Idl;

      // Create the program with just the IDL and provider
      // The program ID will be read from the IDL itself
      this.program = new Program(idl, provider);

      console.log("Program initialized successfully with ID:", this.program.programId.toString());
    } catch (error) {
      console.error("Error initializing program:", error);
      throw error;
    }
  }

  // ==================== ADMIN FUNCTIONS ====================

  async initializeGlobalState(
    devTreasury: PublicKey,
    initialHousePrice: number,
    initialBombcoinPerBlock: number,
    halvingInterval: number,
    burnPct: number,
    referralFee: number,
    rewardsPrecision: number
  ) {
    try {
      console.log("📋 Initialize parameters:", {
        devTreasury: devTreasury.toString(),
        initialHousePrice,
        initialBombcoinPerBlock,
        halvingInterval,
        burnPct,
        referralFee,
        rewardsPrecision
      });

      const [globalState] = getGlobalStatePDA();
      const [rewardTokenMint] = getRewardTokenMintPDA();

      console.log("📍 PDAs derived:", {
        globalState: globalState.toString(),
        rewardTokenMint: rewardTokenMint.toString(),
        authority: this.provider.publicKey?.toString()
      });

      console.log("📤 Building transaction...");
      console.log("🔍 Available methods:", Object.keys(this.program.methods));

      // Send transaction directly to get real error from blockchain
      console.log("📤 Sending transaction to blockchain (skip simulation)...");

      const tx = await this.program.methods
        .initializeGlobalState(
          devTreasury,
          new BN(initialHousePrice),
          new BN(initialBombcoinPerBlock),
          new BN(halvingInterval),
          burnPct,
          referralFee,
          new BN(rewardsPrecision)
        )
        .accounts({
          globalState,
          rewardTokenMint,
          authority: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc({ skipPreflight: false });

      console.log("✅ Transaction sent successfully!");
      return tx;
    } catch (error: any) {
      console.error("❌ Error in initializeGlobalState:", {
        message: error.message,
        toString: error.toString(),
        stack: error.stack,
        logs: error.logs,
        error: error
      });
      throw error;
    }
  }

  async startGame() {
    const [globalState] = getGlobalStatePDA();

    console.log("📋 Start Game - Account Details:");
    console.log("  Global State PDA:", globalState.toString());
    console.log("  Authority (signer):", this.provider.publicKey?.toString());

    return await this.program.methods
      .startGame() // Anchor converts snake_case to camelCase automatically
      .accounts({
        globalState,
        authority: this.provider.publicKey,
      })
      .rpc();
  }

  async togglePause(paused: boolean) {
    const [globalState] = getGlobalStatePDA();

    return await this.program.methods
      .togglePause(paused)
      .accounts({
        globalState,
        authority: this.provider.publicKey,
      })
      .rpc();
  }

  async toggleMinting(enabled: boolean) {
    const [globalState] = getGlobalStatePDA();

    return await this.program.methods
      .toggleMinting(enabled)
      .accounts({
        globalState,
        authority: this.provider.publicKey,
      })
      .rpc();
  }

  async toggleHouseUpgrades(enabled: boolean) {
    const [globalState] = getGlobalStatePDA();

    return await this.program.methods
      .toggleHouseUpgrades(enabled)
      .accounts({
        globalState,
        authority: this.provider.publicKey,
      })
      .rpc();
  }

  async updateGameConfig(params: {
    initialHousePrice?: number;
    initialBombcoinPerBlock?: number;
    halvingInterval?: number;
    burnPct?: number;
    referralFee?: number;
    rewardsPrecision?: number;
  }) {
    const [globalState] = getGlobalStatePDA();

    return await this.program.methods
      .updateGameConfig(
        params.initialHousePrice ? new BN(params.initialHousePrice) : null,
        params.initialBombcoinPerBlock ? new BN(params.initialBombcoinPerBlock) : null,
        params.halvingInterval ? new BN(params.halvingInterval) : null,
        params.burnPct ?? null,
        params.referralFee ?? null,
        params.rewardsPrecision ? new BN(params.rewardsPrecision) : null
      )
      .accounts({
        globalState,
        authority: this.provider.publicKey,
      })
      .rpc();
  }

  async withdrawTokenFunds(programTokenAccount: PublicKey, treasuryTokenAccount: PublicKey, amount: number) {
    const [globalState] = getGlobalStatePDA();

    return await this.program.methods
      .withdrawTokenFunds(new BN(amount))
      .accounts({
        globalState,
        programTokenAccount,
        treasuryTokenAccount,
        authority: this.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  // ==================== USER FUNCTIONS ====================

  async purchaseInitialHouse(devTreasury: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .purchaseInitialHouse()
      .accounts({
        globalState,
        userAccount,
        user: this.provider.publicKey,
        devTreasury,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async setReferrer(referrerPubkey: PublicKey) {
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .setReferrer(referrerPubkey)
      .accounts({
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async buyHero(quantity: number) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .buyHero(quantity)
      .accounts({
        globalState,
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async placeHeroOnGrid(heroIndex: number, x: number, y: number, isRestroom: boolean) {
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .placeHeroOnGrid(heroIndex, x, y, isRestroom)
      .accounts({
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async removeHeroFromGrid(x: number, y: number) {
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .removeHeroFromGrid(x, y)
      .accounts({
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async moveHeroToMap(heroIndex: number) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .moveHeroToMap(heroIndex)
      .accounts({
        globalState,
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  // ==================== NEW BULK FUNCTIONS ====================

  async bulkPlaceHeroes(placements: Array<{ heroIndex: number; x: number; y: number; isRestroom: boolean }>) {
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .bulkPlaceHeroes(placements)
      .accounts({
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async bulkMoveToMap(heroIndices: number[]) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .bulkMoveToMap(heroIndices)
      .accounts({
        globalState,
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async claimRewards(referrerTokenAccount?: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [rewardTokenMint] = getRewardTokenMintPDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    const userTokenAccount = await getAssociatedTokenAddress(
      rewardTokenMint,
      this.provider.publicKey!
    );

    return await this.program.methods
      .claimRewards()
      .accounts({
        globalState,
        rewardTokenMint,
        userAccount,
        userTokenAccount,
        referrerTokenAccount: referrerTokenAccount || userTokenAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async recoverHp() {
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .recoverHp()
      .accounts({
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  async upgradeHouse() {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(this.provider.publicKey!);

    return await this.program.methods
      .upgradeHouse()
      .accounts({
        globalState,
        userAccount,
        user: this.provider.publicKey,
        owner: this.provider.publicKey,
      })
      .rpc();
  }

  // ==================== VIEW FUNCTIONS ====================

  async getGameInfo() {
    const [globalState] = getGlobalStatePDA();

    try {
      console.log("🔍 Fetching game info from global state:", globalState.toString());

      // First check if account exists
      const accountInfo = await this.connection.getAccountInfo(globalState);
      if (!accountInfo) {
        console.error("❌ Global state account does not exist");
        throw new Error("Account does not exist - Game not initialized");
      }

      console.log("✓ Global state account found, data length:", accountInfo.data.length);

      // Fetch the account directly using Anchor's account fetching
      // This is more reliable than simulate() as it reads actual on-chain data
      const globalStateAccount = await this.program.account.globalState.fetch(globalState);

      console.log("✅ Game info fetched successfully");
      console.log("📊 Current state:", {
        gameHasStarted: globalStateAccount.gameHasStarted,
        paused: globalStateAccount.paused,
        startBlock: globalStateAccount.startBlock?.toString()
      });

      // Return in the same format as getGameInfo would return
      return {
        authority: globalStateAccount.authority,
        devTreasury: globalStateAccount.devTreasury,
        rewardTokenMint: globalStateAccount.rewardTokenMint,
        gameHasStarted: globalStateAccount.gameHasStarted,
        paused: globalStateAccount.paused,
        mintingEnabled: globalStateAccount.mintingEnabled,
        houseUpgradesEnabled: globalStateAccount.houseUpgradesEnabled,
        startBlock: globalStateAccount.startBlock,
        houseCount: globalStateAccount.houseCount,
        uniqueHeroesCount: globalStateAccount.uniqueHeroesCount,
        totalHashPower: globalStateAccount.totalHashPower,
        initialHousePrice: globalStateAccount.initialHousePrice,
        initialBombcoinPerBlock: globalStateAccount.initialBombcoinPerBlock,
        halvingInterval: globalStateAccount.halvingInterval,
        burnPct: globalStateAccount.burnPct,
        referralFee: globalStateAccount.referralFee,
        rewardsPrecision: globalStateAccount.rewardsPrecision,
        totalMined: globalStateAccount.totalMined,
        totalBurned: globalStateAccount.totalBurned,
        rewardPool: globalStateAccount.rewardPool,
      };
    } catch (error: any) {
      console.error("❌ Error in getGameInfo:", {
        message: error.message,
        logs: error.logs,
        code: error.code
      });

      // Check if account doesn't exist
      if (error.message?.includes("Account does not exist") ||
          error.message?.includes("AccountNotFound") ||
          error.toString().includes("could not find account")) {
        throw new Error("Account does not exist - Game not initialized");
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getPlayerStats(userPubkey?: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(userPubkey || this.provider.publicKey!);

    return await this.program.methods
      .getPlayerStats()
      .accounts({
        globalState,
        userAccount,
      })
      .view();
  }

  async getPendingRewards(userPubkey?: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(userPubkey || this.provider.publicKey!);

    return await this.program.methods
      .pendingRewards()
      .accounts({
        globalState,
        userAccount,
      })
      .view();
  }

  async getGridState(userPubkey?: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(userPubkey || this.provider.publicKey!);

    return await this.program.methods
      .getGridState()
      .accounts({
        globalState,
        userAccount,
      })
      .view();
  }

  async getHeroDetails(heroIndex: number, userPubkey?: PublicKey) {
    const [globalState] = getGlobalStatePDA();
    const [userAccount] = getUserAccountPDA(userPubkey || this.provider.publicKey!);

    return await this.program.methods
      .getHeroDetails(heroIndex)
      .accounts({
        globalState,
        userAccount,
      })
      .view();
  }

  // ==================== ACCOUNT FETCHING ====================

  async fetchGlobalState() {
    const [globalState] = getGlobalStatePDA();
    return await this.program.account.globalState.fetch(globalState);
  }

  async fetchUserAccount(userPubkey?: PublicKey) {
    const [userAccount] = getUserAccountPDA(userPubkey || this.provider.publicKey!);
    return await this.program.account.userAccount.fetch(userAccount);
  }
}
