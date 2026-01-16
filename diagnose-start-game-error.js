const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function diagnose() {
  console.log("🔍 Diagnosing Start Game Error\n");
  console.log("=" .repeat(60));

  const connection = new Connection(RPC_URL, "confirmed");
  const programId = new PublicKey(PROGRAM_ID);

  // Derive global state PDA
  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );

  console.log("\n📍 PDAs:");
  console.log("  Global State:", globalState.toString());
  console.log("  Bump:", bump);

  // Get account data
  const accountInfo = await connection.getAccountInfo(globalState);

  if (!accountInfo) {
    console.log("\n❌ Global state account not found!");
    return;
  }

  console.log("\n✅ Account exists");
  console.log("  Owner:", accountInfo.owner.toString());
  console.log("  Data length:", accountInfo.data.length, "bytes");

  const data = accountInfo.data;

  // Parse GlobalState structure
  // Discriminator: 8 bytes (offset 0-7)
  // authority: Pubkey (32 bytes, offset 8-39)
  // dev_treasury: Pubkey (32 bytes, offset 40-71)
  // reward_token_mint: Pubkey (32 bytes, offset 72-103)
  // game_has_started: bool (1 byte, offset 104)
  // paused: bool (1 byte, offset 105)
  // minting_enabled: bool (1 byte, offset 106)
  // house_upgrades_enabled: bool (1 byte, offset 107)
  // start_block: i64 (8 bytes, offset 108-115)
  // ... and more fields

  const authority = new PublicKey(data.slice(8, 40));
  const devTreasury = new PublicKey(data.slice(40, 72));
  const rewardTokenMint = new PublicKey(data.slice(72, 104));
  const gameHasStarted = data[104] === 1;
  const paused = data[105] === 1;
  const mintingEnabled = data[106] === 1;
  const houseUpgradesEnabled = data[107] === 1;

  // Read start_block as i64 (little endian)
  const startBlockBuffer = data.slice(108, 116);
  const startBlock = startBlockBuffer.readBigInt64LE(0);

  // Read bump (last byte)
  const storedBump = data[data.length - 1];

  console.log("\n🔐 Global State Data:");
  console.log("  Authority:", authority.toString());
  console.log("  Dev Treasury:", devTreasury.toString());
  console.log("  Reward Token Mint:", rewardTokenMint.toString());
  console.log("  Game Has Started:", gameHasStarted);
  console.log("  Paused:", paused);
  console.log("  Minting Enabled:", mintingEnabled);
  console.log("  House Upgrades Enabled:", houseUpgradesEnabled);
  console.log("  Start Block:", startBlock.toString());
  console.log("  Stored Bump:", storedBump);

  console.log("\n" + "=".repeat(60));

  // Now let's check what the error might be
  console.log("\n🔍 Error Analysis:");

  if (gameHasStarted) {
    console.log("❌ PROBLEM FOUND:");
    console.log("   game_has_started = TRUE");
    console.log("   The game has already been started!");
    console.log("   This is why you're getting 'AlreadyInitialized' error.");
  } else {
    console.log("✅ game_has_started = FALSE (Good)");
    console.log("   The game should be startable...");

    console.log("\n🤔 Possible causes of error:");
    console.log("   1. Wrong wallet - Phantom wallet doesn't match authority");
    console.log("      Authority required:", authority.toString());
    console.log("      Check with: Check Phantom wallet address");
    console.log();
    console.log("   2. Constraint validation failing");
    console.log("      The 'has_one = authority' constraint checks if signer matches");
    console.log();
    console.log("   3. Cached program data");
    console.log("      Try hard refresh in browser (Ctrl+Shift+R)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Next Steps:");
  console.log("  1. Open Phantom wallet");
  console.log("  2. Make sure you're on DEVNET (not mainnet)");
  console.log("  3. Check wallet address matches:", authority.toString());
  console.log("  4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)");
  console.log("  5. Try starting game again from admin panel");
  console.log();
}

diagnose().catch(console.error);
