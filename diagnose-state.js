const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function diagnoseState() {
  console.log("🔍 Diagnosing State Sync Issues\n");

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load program
  console.log("📡 Fetching program IDL from chain...");
  const program = await anchor.Program.at(PROGRAM_ID, provider);

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  const [userAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_account"), wallet.publicKey.toBuffer()],
    program.programId
  );

  try {
    // Fetch both accounts
    const globalData = await program.account.globalState.fetch(globalState);
    const userData = await program.account.userAccount.fetch(userAccount);

    console.log("🌍 GLOBAL STATE");
    console.log("=" .repeat(70));
    console.log("Total Hash Power (Global):", globalData.totalHashPower.toString());
    console.log("Cumulative BOMBcoin per Power:", globalData.cumulativeBombcoinPerPower.toString());
    console.log("Total Mined:", globalData.totalMined.toString());
    console.log("Reward Pool:", globalData.rewardPool.toString());
    console.log("Game Has Started:", globalData.gameHasStarted);
    console.log("Start Block (Unix Timestamp):", globalData.startBlock.toString());
    console.log("Emission Rate:", globalData.initialBombcoinPerBlock.toString(), "coins/sec");
    console.log("Rewards Precision:", globalData.rewardsPrecision.toString());
    console.log("House Count:", globalData.houseCount.toString());
    console.log();

    console.log("👤 USER ACCOUNT");
    console.log("=" .repeat(70));
    console.log("Player Power (User):", userData.playerPower.toString());
    console.log("Pending Rewards:", userData.playerPendingRewards.toString());
    console.log("Reward Debt:", userData.rewardDebt.toString());
    console.log("Coin Balance:", userData.coinBalance.toString());
    console.log("Heroes Total:", userData.inventory.length);
    console.log("Heroes on Map:", userData.activeMap.length);
    console.log();

    // Check for desync
    console.log("🔎 SYNC ANALYSIS");
    console.log("=" .repeat(70));

    const userPower = userData.playerPower.toNumber();
    const globalPower = globalData.totalHashPower.toNumber();

    if (userData.activeMap.length > 0 && userPower > 0 && globalPower === 0) {
      console.log("❌ CRITICAL DESYNC DETECTED!");
      console.log();
      console.log("Issue: User has heroes on map with power, but global total is 0");
      console.log("   User Power:", userPower);
      console.log("   Global Power:", globalPower);
      console.log("   Heroes on Map:", userData.activeMap.length);
      console.log();
      console.log("This can happen if:");
      console.log("   1. Program was redeployed and global state was reset");
      console.log("   2. Old implementation didn't sync global power correctly");
      console.log();
      console.log("📝 SOLUTION:");
      console.log("   User needs to remove all heroes from map, then add them back");
      console.log("   This will trigger the new MasterChef logic to sync global power");
      console.log();

      // Show active map heroes
      console.log("🎮 Active Map Heroes:");
      for (const heroIdx of userData.activeMap) {
        const hero = userData.inventory[heroIdx];
        const hmp = hero.power * hero.bombNumber + hero.bombRange * 0.5 + hero.speed * 2;
        console.log(`   Hero ${heroIdx}: HP=${hero.hp}/${hero.maxHp}, HMP=${hmp.toFixed(1)}`);
      }
      console.log();

      console.log("💡 RECOMMENDED ACTION:");
      console.log("   Run: node fix-power-sync.js");
      console.log("   This will remove and re-add heroes to sync the global power");
      console.log();

    } else if (globalPower === 0 && userPower === 0) {
      console.log("✅ No desync - both user and global power are 0");
      console.log("   This is normal if no heroes are mining yet");
      console.log();
    } else if (globalPower > 0) {
      console.log("✅ Global power is tracking correctly");
      console.log("   User Power:", userPower);
      console.log("   Global Power:", globalPower);
      console.log();

      // Calculate user's share
      if (globalPower > 0 && userPower > 0) {
        const userShare = (userPower / globalPower * 100).toFixed(2);
        console.log(`   User's share: ${userShare}% of global hash power`);
        console.log();
      }
    }

    // Time analysis
    console.log("⏰ TIME ANALYSIS");
    console.log("=" .repeat(70));
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - globalData.startBlock.toNumber();
    const emissionRate = globalData.initialBombcoinPerBlock.toNumber();
    const totalEmitted = elapsedTime * emissionRate;

    console.log("Current Time:", currentTime);
    console.log("Start Time:", globalData.startBlock.toString());
    console.log("Elapsed:", elapsedTime, "seconds (", (elapsedTime / 3600).toFixed(2), "hours)");
    console.log("Total Should Be Emitted:", totalEmitted.toLocaleString(), "coins");
    console.log();

    // Expected rewards calculation
    if (globalPower > 0 && userPower > 0) {
      console.log("📊 EXPECTED REWARDS (if user was mining entire time)");
      console.log("=" .repeat(70));
      const precision = globalData.rewardsPrecision.toNumber();
      const accPerPower = (totalEmitted * precision) / globalPower;
      const userTotalEarned = (userPower * accPerPower) / precision;
      const rewardDebtCoins = Number(userData.rewardDebt) / precision;
      const pending = userTotalEarned - rewardDebtCoins;

      console.log("Acc Per Power:", accPerPower.toFixed(2));
      console.log("User Total Earned (theoretical):", userTotalEarned.toFixed(2));
      console.log("User Reward Debt:", rewardDebtCoins.toFixed(2));
      console.log("User Pending (theoretical):", pending.toFixed(2));
      console.log();
      console.log("Note: Actual pending may differ based on when heroes were added");
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("\n📚 Stack trace:");
      console.error(error.stack);
    }
  }
}

diagnoseState().catch(console.error);
