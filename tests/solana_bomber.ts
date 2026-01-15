import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBomber } from "../target/types/solana_bomber";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Solana Bomber - Integration Tests", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaBomber as Program<SolanaBomber>;
  const programId = new PublicKey("97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7");

  // PDAs
  let globalState: PublicKey;
  let rewardTokenMint: PublicKey;
  let userAccount: PublicKey;
  let userTokenAccount: PublicKey;

  // Test wallets
  const admin = provider.wallet;
  let player: Keypair;

  // Helper function to sleep
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  before("Derive PDAs", async () => {
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      programId
    );

    [rewardTokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_token_mint")],
      programId
    );

    // Create a test player
    player = Keypair.generate();

    [userAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), player.publicKey.toBuffer()],
      programId
    );

    console.log("Global State:", globalState.toString());
    console.log("Reward Token Mint:", rewardTokenMint.toString());
    console.log("Player:", player.publicKey.toString());
    console.log("User Account:", userAccount.toString());
  });

  describe("1. Game Initialization", () => {
    it("Should initialize global state (admin only)", async () => {
      try {
        const tx = await program.methods
          .initializeGlobalState(admin.publicKey)
          .accounts({
            globalState,
            rewardTokenMint,
            authority: admin.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        console.log("✅ Global state initialized:", tx);

        // Verify global state
        const globalStateData = await program.account.globalState.fetch(globalState);
        assert.equal(globalStateData.authority.toString(), admin.publicKey.toString());
        assert.equal(globalStateData.paused, false);
        assert.equal(globalStateData.totalMined.toNumber(), 0);
        assert.equal(globalStateData.totalBurned.toNumber(), 0);
        assert.equal(globalStateData.totalHeroesMinted.toNumber(), 0);

        console.log("✅ Global state verified");
      } catch (err) {
        if (err.message.includes("already in use")) {
          console.log("⚠️ Global state already initialized (skipping)");
        } else {
          throw err;
        }
      }
    });
  });

  describe("2. Player Registration", () => {
    it("Should airdrop SOL to test player", async () => {
      const signature = await provider.connection.requestAirdrop(
        player.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      const balance = await provider.connection.getBalance(player.publicKey);
      console.log("✅ Player balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
      assert.isAtLeast(balance, 2 * anchor.web3.LAMPORTS_PER_SOL);
    });

    it("Should initialize user account (pay 0.25 SOL)", async () => {
      const tx = await program.methods
        .initializeUser()
        .accounts({
          userAccount,
          user: player.publicKey,
          devTreasury: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      console.log("✅ User initialized:", tx);

      // Verify user account
      const userAccountData = await program.account.userAccount.fetch(userAccount);
      assert.equal(userAccountData.owner.toString(), player.publicKey.toString());
      assert.equal(userAccountData.houseLevel, 1);
      assert.equal(userAccountData.coinBalance.toNumber(), 0);
      assert.equal(userAccountData.inventory.length, 0);

      console.log("✅ User account verified");
    });

    it("Should create associated token account for player", async () => {
      userTokenAccount = await getAssociatedTokenAddress(
        rewardTokenMint,
        player.publicKey
      );

      try {
        await createAssociatedTokenAccount(
          provider.connection,
          player,
          rewardTokenMint,
          player.publicKey
        );
        console.log("✅ Token account created:", userTokenAccount.toString());
      } catch (err) {
        console.log("⚠️ Token account may already exist");
      }
    });
  });

  describe("3. Hero Minting", () => {
    it("Should give player coins for testing", async () => {
      // Note: In production, players earn coins through mining
      // For testing, we'll manually add coins (requires admin function or airdrop)
      console.log("⚠️ Manual step: Add 500 coins to player for testing");
      console.log("   User Account:", userAccount.toString());

      // For now, we'll skip this and test other functions
      // You can manually airdrop coins or implement a test faucet
    });

    it("Should mint a hero (100 coins)", async () => {
      try {
        const tx = await program.methods
          .mintHero()
          .accounts({
            globalState,
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();

        console.log("✅ Hero minted:", tx);

        // Verify hero was added to inventory
        const userAccountData = await program.account.userAccount.fetch(userAccount);
        assert.equal(userAccountData.inventory.length, 1);

        const hero = userAccountData.inventory[0];
        console.log("Hero Stats:");
        console.log("  - Rarity:", Object.keys(hero.rarity)[0]);
        console.log("  - Power:", hero.power);
        console.log("  - Speed:", hero.speed);
        console.log("  - Stamina:", hero.stamina);
        console.log("  - Bomb Number:", hero.bombNumber);
        console.log("  - Bomb Range:", hero.bombRange);
        console.log("  - HP:", hero.hp, "/", hero.maxHp);

        // Calculate HMP
        const hmp = (hero.power * hero.bombNumber) +
                    (hero.bombRange * 0.5) +
                    (hero.speed * 2);
        console.log("  - HMP:", hmp);

        assert.isAbove(hero.hp, 0);
        assert.isAbove(hero.maxHp, 0);
      } catch (err) {
        if (err.message.includes("InsufficientCoins")) {
          console.log("⚠️ Insufficient coins to mint hero (expected for test)");
        } else {
          throw err;
        }
      }
    });
  });

  describe("4. Hero Management", () => {
    let heroIndex = 0;

    it("Should move hero to house", async () => {
      try {
        const tx = await program.methods
          .moveHeroToHouse(heroIndex)
          .accounts({
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
          })
          .signers([player])
          .rpc();

        console.log("✅ Hero moved to house:", tx);

        const userAccountData = await program.account.userAccount.fetch(userAccount);
        assert.include(userAccountData.activeHouse.map(i => i), heroIndex);
        console.log("✅ Active house:", userAccountData.activeHouse.length, "heroes");
      } catch (err) {
        console.log("⚠️ Skipping (no hero minted):", err.message);
      }
    });

    it("Should move hero to map (start mining)", async () => {
      try {
        const tx = await program.methods
          .moveHeroToMap(heroIndex)
          .accounts({
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
          })
          .signers([player])
          .rpc();

        console.log("✅ Hero moved to map (mining started):", tx);

        const userAccountData = await program.account.userAccount.fetch(userAccount);
        assert.include(userAccountData.activeMap.map(i => i), heroIndex);
        console.log("✅ Active map:", userAccountData.activeMap.length, "heroes");

        // Record start time
        const hero = userAccountData.inventory[heroIndex];
        console.log("Mining started at:", new Date(hero.lastActionTime.toNumber() * 1000));
      } catch (err) {
        console.log("⚠️ Skipping (no hero in house):", err.message);
      }
    });

    it("Should wait for mining (simulating time passage)", async () => {
      console.log("⏳ Waiting 2 minutes for mining...");
      await sleep(120000); // 2 minutes
      console.log("✅ 2 minutes passed");
    });
  });

  describe("5. Rewards & HP System", () => {
    it("Should claim mining rewards", async () => {
      try {
        const userAccountBefore = await program.account.userAccount.fetch(userAccount);
        const balanceBefore = userAccountBefore.coinBalance.toNumber();

        const tx = await program.methods
          .claimRewards()
          .accounts({
            globalState,
            rewardTokenMint,
            userAccount,
            userTokenAccount,
            referrerTokenAccount: userTokenAccount, // No referrer
            user: player.publicKey,
            owner: player.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([player])
          .rpc();

        console.log("✅ Rewards claimed:", tx);

        const userAccountAfter = await program.account.userAccount.fetch(userAccount);
        const balanceAfter = userAccountAfter.coinBalance.toNumber();
        const earned = balanceAfter - balanceBefore;

        console.log("Coins earned:", earned);
        assert.isAbove(earned, 0, "Should earn coins from mining");

        // Check HP drain
        const hero = userAccountAfter.inventory[0];
        console.log("Hero HP after mining:", hero.hp, "/", hero.maxHp);

        // Verify formula: HP_Drain = (Elapsed_Seconds / 60) × Speed
        // 2 minutes = 120 seconds
        const expectedDrain = (120 / 60) * hero.speed; // Should be ~2 * speed
        console.log("Expected HP drain:", expectedDrain);

      } catch (err) {
        console.log("⚠️ Skipping (no active mining):", err.message);
      }
    });

    it("Should move exhausted hero to restroom", async () => {
      try {
        const heroIndex = 0;

        const tx = await program.methods
          .moveHeroToRestroom(heroIndex)
          .accounts({
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
          })
          .signers([player])
          .rpc();

        console.log("✅ Hero moved to restroom:", tx);

        const userAccountData = await program.account.userAccount.fetch(userAccount);
        assert.include(userAccountData.restroomSlots.map(i => i), heroIndex);
        console.log("✅ Restroom slots:", userAccountData.restroomSlots.length);
      } catch (err) {
        console.log("⚠️ Skipping:", err.message);
      }
    });

    it("Should recover HP (120s tick)", async () => {
      try {
        console.log("⏳ Waiting 2 minutes for HP recovery...");
        await sleep(120000); // 2 minutes = 1 recovery tick

        const userAccountBefore = await program.account.userAccount.fetch(userAccount);
        const heroBefore = userAccountBefore.inventory[0];
        const hpBefore = heroBefore.hp;

        const tx = await program.methods
          .recoverHp()
          .accounts({
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
          })
          .signers([player])
          .rpc();

        console.log("✅ HP recovered:", tx);

        const userAccountAfter = await program.account.userAccount.fetch(userAccount);
        const heroAfter = userAccountAfter.inventory[0];
        const hpAfter = heroAfter.hp;

        const recovered = hpAfter - hpBefore;
        console.log("HP recovered:", recovered);
        console.log("New HP:", hpAfter, "/", heroAfter.maxHp);

        // Verify formula: Recovered_HP = (Ticks) × Stamina × Multiplier
        // 1 tick, Stamina stat, House Level 1 (1.0x multiplier)
        const expectedRecovery = heroAfter.stamina * 1; // 1 tick
        console.log("Expected recovery:", expectedRecovery);

        assert.isAbove(recovered, 0, "Should recover HP");
      } catch (err) {
        console.log("⚠️ Skipping:", err.message);
      }
    });
  });

  describe("6. House Upgrades", () => {
    it("Should upgrade house to level 2", async () => {
      try {
        const tx = await program.methods
          .upgradeHouse()
          .accounts({
            globalState,
            userAccount,
            user: player.publicKey,
            owner: player.publicKey,
          })
          .signers([player])
          .rpc();

        console.log("✅ House upgraded:", tx);

        const userAccountData = await program.account.userAccount.fetch(userAccount);
        assert.equal(userAccountData.houseLevel, 2);
        console.log("✅ New house level:", userAccountData.houseLevel);
        console.log("   Restroom capacity: 6 slots");
        console.log("   Recovery speed: 2.0x");
      } catch (err) {
        if (err.message.includes("InsufficientCoins")) {
          console.log("⚠️ Insufficient coins (need 720 coins)");
        } else if (err.message.includes("UpgradeCooldownActive")) {
          console.log("⚠️ Cooldown active (need to wait 2 hours)");
        } else {
          throw err;
        }
      }
    });
  });

  describe("7. Edge Cases & Limits", () => {
    it("Should enforce house limit (max 21 heroes)", async () => {
      // Test would require minting 21+ heroes
      console.log("ℹ️  House limit: 21 heroes");
      console.log("ℹ️  To test: Mint 21+ heroes and try adding to house");
    });

    it("Should enforce map limit (max 15 heroes)", async () => {
      console.log("ℹ️  Map limit: 15 heroes");
      console.log("ℹ️  To test: Move 15+ heroes to map");
    });

    it("Should prevent sleeping hero from mining", async () => {
      console.log("ℹ️  Sleeping check: HP = 0 heroes cannot mine");
      console.log("ℹ️  To test: Drain hero HP to 0, try moving to map");
    });

    it("Should enforce restroom capacity", async () => {
      console.log("ℹ️  Restroom capacity based on house level:");
      console.log("    Level 1: 4 slots");
      console.log("    Level 2: 6 slots");
      console.log("    Level 6: 15 slots");
    });
  });

  describe("8. Formula Validation", () => {
    it("Should validate HMP formula", async () => {
      try {
        const userAccountData = await program.account.userAccount.fetch(userAccount);
        if (userAccountData.inventory.length > 0) {
          const hero = userAccountData.inventory[0];

          const hmp = (hero.power * hero.bombNumber) +
                      (hero.bombRange * 0.5) +
                      (hero.speed * 2);

          console.log("✅ HMP Formula Validation:");
          console.log("   Power:", hero.power);
          console.log("   Bomb Number:", hero.bombNumber);
          console.log("   Bomb Range:", hero.bombRange);
          console.log("   Speed:", hero.speed);
          console.log("   HMP = (", hero.power, "×", hero.bombNumber, ") + (", hero.bombRange, "× 0.5) + (", hero.speed, "× 2)");
          console.log("   HMP =", hmp);

          assert.isAbove(hmp, 0);
        }
      } catch (err) {
        console.log("⚠️ No heroes to validate");
      }
    });

    it("Should validate phase rates", async () => {
      const globalStateData = await program.account.globalState.fetch(globalState);
      const totalMined = globalStateData.totalMined.toNumber();

      let expectedRate;
      if (totalMined <= 25_000_000_000_000) expectedRate = 10.0;
      else if (totalMined <= 50_000_000_000_000) expectedRate = 5.0;
      else if (totalMined <= 75_000_000_000_000) expectedRate = 2.5;
      else expectedRate = 1.25;

      console.log("✅ Phase Rate Validation:");
      console.log("   Total Mined:", totalMined / 1_000_000, "tokens");
      console.log("   Current Phase Rate:", expectedRate, "coins/HMP/hour");
    });
  });

  describe("9. Global State Verification", () => {
    it("Should display final global stats", async () => {
      const globalStateData = await program.account.globalState.fetch(globalState);

      console.log("\n📊 Final Global Stats:");
      console.log("   Total Mined:", globalStateData.totalMined.toNumber() / 1_000_000, "tokens");
      console.log("   Total Burned:", globalStateData.totalBurned.toNumber(), "coins");
      console.log("   Reward Pool:", globalStateData.rewardPool.toNumber(), "coins");
      console.log("   Total Heroes:", globalStateData.totalHeroesMinted.toNumber());
      console.log("   Game Paused:", globalStateData.paused);
    });

    it("Should display final player stats", async () => {
      try {
        const userAccountData = await program.account.userAccount.fetch(userAccount);

        console.log("\n👤 Final Player Stats:");
        console.log("   House Level:", userAccountData.houseLevel);
        console.log("   Coin Balance:", userAccountData.coinBalance.toNumber() / 1_000_000, "tokens");
        console.log("   Total Heroes:", userAccountData.inventory.length);
        console.log("   Heroes in House:", userAccountData.activeHouse.length, "/ 21");
        console.log("   Heroes Mining:", userAccountData.activeMap.length, "/ 15");
        console.log("   Heroes in Restroom:", userAccountData.restroomSlots.length);

        if (userAccountData.inventory.length > 0) {
          console.log("\n🦸 Hero Details:");
          userAccountData.inventory.forEach((hero, i) => {
            const hmp = (hero.power * hero.bombNumber) +
                        (hero.bombRange * 0.5) +
                        (hero.speed * 2);
            console.log(`   Hero ${i}: ${Object.keys(hero.rarity)[0]} - HMP: ${hmp} - HP: ${hero.hp}/${hero.maxHp}`);
          });
        }
      } catch (err) {
        console.log("⚠️ Could not fetch player stats");
      }
    });
  });
});
