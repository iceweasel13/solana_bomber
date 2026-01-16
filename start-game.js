const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

// Load IDL
const idl = JSON.parse(fs.readFileSync("./bomber/src/lib/idl.json", "utf8"));

// Configuration
const PROGRAM_ID = new PublicKey("5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc");
const RPC_URL = "https://api.devnet.solana.com";

// Derive PDAs
function getGlobalStatePDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
}

async function startGame() {
  console.log("🎮 Starting Solana Bomber Game...\n");

  // Connect to devnet
  const connection = new Connection(RPC_URL, "confirmed");
  console.log("✓ Connected to:", RPC_URL);

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log("✓ Loaded wallet:", wallet.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("✓ Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.01e9) {
    console.error("❌ Insufficient balance! Need at least 0.01 SOL");
    console.log("💡 Run: solana airdrop 2 --url devnet");
    process.exit(1);
  }

  // Create provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  // Create program
  const program = new anchor.Program(idl, provider);
  console.log("✓ Program loaded:", program.programId.toString());

  // Get PDAs
  const [globalState, bump] = getGlobalStatePDA();
  console.log("✓ Global State PDA:", globalState.toString());
  console.log("✓ Bump:", bump, "\n");

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(globalState);
  if (!accountInfo) {
    console.error("❌ Global state account does NOT exist!");
    console.log("💡 Run the Initialize Game function first");
    process.exit(1);
  }
  console.log("✓ Global state account exists!");
  console.log("  Data length:", accountInfo.data.length, "bytes\n");

  // Start the game
  console.log("▶️ Sending start_game transaction...");
  try {
    const tx = await program.methods
      .startGame() // Anchor auto-converts to camelCase
      .accounts({
        globalState: globalState,
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("\n✅ SUCCESS! Game started!");
    console.log("📝 Transaction signature:", tx);
    console.log("🔗 View on Solscan: https://solscan.io/tx/" + tx + "?cluster=devnet");
    console.log("\n🎮 Users can now purchase houses and play!");
    console.log("💡 Check the Stats panel in the admin interface");
  } catch (error) {
    console.error("\n❌ ERROR starting game:");
    console.error("Message:", error.message);
    if (error.logs) {
      console.error("\n📋 Transaction Logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
    console.error("\n💡 Possible issues:");
    console.error("  - Wrong wallet (must be authority wallet)");
    console.error("  - Game already started");
    console.error("  - Network issues");
    process.exit(1);
  }
}

startGame().catch(console.error);
