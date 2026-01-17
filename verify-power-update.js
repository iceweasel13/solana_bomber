const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function verifyPowerUpdate() {
  console.log("🔬 Verifying Global Power Update Logic\n");

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load program
  console.log("📡 Fetching program IDL from chain...\n");
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
    // Step 1: Read state BEFORE action
    console.log("📊 BEFORE: Reading state before action...\n");

    const globalBefore = await program.account.globalState.fetch(globalState);
    const userBefore = await program.account.userAccount.fetch(userAccount);

    console.log("Global Total Hash Power (BEFORE):", globalBefore.totalHashPower.toString());
    console.log("User Player Power (BEFORE):", userBefore.playerPower.toString());
    console.log("Heroes on Map (BEFORE):", userBefore.activeMap.length);
    console.log();

    // Step 2: Remove ALL heroes from map to reset state
    console.log("🔄 STEP 1: Removing all heroes from map to reset...\n");

    for (const heroIdx of [...userBefore.activeMap]) {
      console.log(`   Removing hero ${heroIdx}...`);
      try {
        const tx = await program.methods
          .removeFromMap(heroIdx)
          .accounts({
            globalState,
            userAccount,
            user: wallet.publicKey,
            owner: wallet.publicKey,
          })
          .rpc({ skipPreflight: false });

        console.log(`   ✅ Removed hero ${heroIdx}: ${tx}`);

        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.error(`   ❌ Failed to remove hero ${heroIdx}:`, e.message);
      }
    }

    console.log();

    // Step 3: Check state after removal
    console.log("📊 AFTER REMOVAL: Checking state...\n");

    const globalAfterRemoval = await program.account.globalState.fetch(globalState);
    const userAfterRemoval = await program.account.userAccount.fetch(userAccount);

    console.log("Global Total Hash Power (AFTER REMOVAL):", globalAfterRemoval.totalHashPower.toString());
    console.log("User Player Power (AFTER REMOVAL):", userAfterRemoval.playerPower.toString());
    console.log("Heroes on Map (AFTER REMOVAL):", userAfterRemoval.activeMap.length);
    console.log();

    if (globalAfterRemoval.totalHashPower.toString() !== "0") {
      console.log("⚠️  WARNING: Global power should be 0 after removing all heroes!");
      console.log(`   Expected: 0, Got: ${globalAfterRemoval.totalHashPower.toString()}`);
      console.log();
    } else {
      console.log("✅ Global power correctly reset to 0");
      console.log();
    }

    // Step 4: Add ONE hero to map
    console.log("🔄 STEP 2: Adding ONE hero to map...\n");

    // Find first hero with HP > 0
    const aliveHeroIndex = userAfterRemoval.inventory.findIndex(h => h.hp > 0);
    if (aliveHeroIndex === -1) {
      console.error("❌ No alive heroes found in inventory!");
      process.exit(1);
    }

    const heroToAdd = userAfterRemoval.inventory[aliveHeroIndex];
    const expectedHMP = (heroToAdd.power * heroToAdd.bombNumber) + (heroToAdd.bombRange * 0.5) + (heroToAdd.speed * 2);

    console.log(`   Adding hero ${aliveHeroIndex}...`);
    console.log(`   Hero stats: Power=${heroToAdd.power}, BombNum=${heroToAdd.bombNumber}, BombRange=${heroToAdd.bombRange}, Speed=${heroToAdd.speed}`);
    console.log(`   Expected HMP: ${expectedHMP.toFixed(1)}`);
    console.log();

    const txAdd = await program.methods
      .bulkMoveToMap([aliveHeroIndex])
      .accounts({
        globalState,
        userAccount,
        user: wallet.publicKey,
        owner: wallet.publicKey,
      })
      .rpc({ skipPreflight: false });

    console.log(`   ✅ Added hero ${aliveHeroIndex}: ${txAdd}`);
    console.log();

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Check state after adding
    console.log("📊 AFTER ADDING: Checking state...\n");

    const globalAfterAdd = await program.account.globalState.fetch(globalState);
    const userAfterAdd = await program.account.userAccount.fetch(userAccount);

    console.log("Global Total Hash Power (AFTER ADD):", globalAfterAdd.totalHashPower.toString());
    console.log("User Player Power (AFTER ADD):", userAfterAdd.playerPower.toString());
    console.log("Heroes on Map (AFTER ADD):", userAfterAdd.activeMap.length);
    console.log();

    // Step 6: Verify correctness
    console.log("=" .repeat(70));
    console.log("🎯 VERIFICATION");
    console.log("=" .repeat(70));
    console.log();

    const userPowerAfterAdd = userAfterAdd.playerPower.toNumber();
    const globalPowerAfterAdd = globalAfterAdd.totalHashPower.toNumber();

    console.log(`Expected User Power: ~${expectedHMP.toFixed(0)}`);
    console.log(`Actual User Power: ${userPowerAfterAdd}`);
    console.log(`Expected Global Power: ~${expectedHMP.toFixed(0)} (same as user power)`);
    console.log(`Actual Global Power: ${globalPowerAfterAdd}`);
    console.log();

    if (globalPowerAfterAdd === userPowerAfterAdd && globalPowerAfterAdd > 0) {
      console.log("✅ SUCCESS! Global power is correctly synced with user power!");
      console.log();
      console.log("🎉 The fix is working correctly!");
      console.log();
    } else if (globalPowerAfterAdd === 0) {
      console.log("❌ FAILURE! Global power is still 0 despite user power being", userPowerAfterAdd);
      console.log();
      console.log("This means the global_state account is NOT being written to.");
      console.log("Possible causes:");
      console.log("   1. The global_state account is not marked as mutable in the instruction");
      console.log("   2. The transaction is failing silently");
      console.log("   3. There's a runtime error before the write occurs");
      console.log();
      console.log("🔍 Next step: Check transaction logs on Solscan:");
      console.log(`   https://solscan.io/tx/${txAdd}?cluster=devnet`);
      console.log();
    } else {
      console.log("⚠️  PARTIAL SUCCESS: Global power is non-zero but doesn't match user power");
      console.log(`   Delta: ${Math.abs(globalPowerAfterAdd - userPowerAfterAdd)}`);
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.logs) {
      console.error("\n📋 Transaction logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
    if (error.stack) {
      console.error("\n📚 Stack trace:");
      console.error(error.stack);
    }
  }
}

verifyPowerUpdate().catch(console.error);
