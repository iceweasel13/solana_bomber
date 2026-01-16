const { Connection, PublicKey } = require("@solana/web3.js");

const NEW_PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function verifySetup() {
  console.log("🔍 Verifying Solana Bomber Setup\n");

  const connection = new Connection(RPC_URL, "confirmed");
  console.log("✓ Connected to:", RPC_URL, "\n");

  // Check program
  console.log("📦 Program Check:");
  console.log("  ID:", NEW_PROGRAM_ID);

  const programId = new PublicKey(NEW_PROGRAM_ID);
  const programInfo = await connection.getAccountInfo(programId);

  if (!programInfo) {
    console.log("  ❌ Program NOT found on devnet!");
    process.exit(1);
  }

  console.log("  ✅ Program exists on devnet");
  console.log("  Size:", programInfo.data.length, "bytes");
  console.log("  Executable:", programInfo.executable);
  console.log();

  // Check global state PDA
  console.log("🏠 Global State Check:");
  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );
  console.log("  PDA:", globalState.toString());
  console.log("  Bump:", bump);

  const globalStateInfo = await connection.getAccountInfo(globalState);

  if (!globalStateInfo) {
    console.log("  ⚠️  Global state NOT initialized yet (this is expected)");
    console.log("  💡 Next step: Initialize game from admin panel");
  } else {
    console.log("  ✅ Global state exists!");
    console.log("  Data length:", globalStateInfo.data.length, "bytes");
  }
  console.log();

  // Check reward token mint PDA
  console.log("🪙 Reward Token Mint Check:");
  const [rewardMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_token_mint")],
    programId
  );
  console.log("  PDA:", rewardMint.toString());

  const mintInfo = await connection.getAccountInfo(rewardMint);

  if (!mintInfo) {
    console.log("  ⚠️  Reward mint NOT created yet (this is expected)");
    console.log("  💡 Will be created during initialization");
  } else {
    console.log("  ✅ Reward mint exists!");
  }
  console.log();

  console.log("═".repeat(60));
  console.log();
  console.log("✅ Setup Verification Complete!");
  console.log();
  console.log("📋 Next Steps:");
  console.log("  1. Restart admin panel: npm run dev");
  console.log("  2. Open: http://localhost:3000");
  console.log("  3. Connect Phantom wallet (Devnet)");
  console.log("  4. Go to Admin tab");
  console.log("  5. Click 'Initialize Game'");
  console.log("  6. Click 'Start Game'");
  console.log("  7. Done! 🎮");
  console.log();
}

verifySetup().catch(console.error);
