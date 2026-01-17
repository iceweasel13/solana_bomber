const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function unpauseGame() {
  console.log("⏸️ Unpausing Solana Bomber Game\n");

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL
  const idl = JSON.parse(fs.readFileSync("./target/idl/solana_bomber.json", "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Derive global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  console.log("📍 Global State PDA:", globalState.toString());
  console.log("🔑 Authority:", wallet.publicKey.toString());
  console.log();

  try {
    console.log("📤 Sending unpause transaction...");

    const tx = await program.methods
      .togglePause(false) // false = unpause
      .accounts({
        globalState,
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Game unpaused successfully!");
    console.log("📝 Transaction signature:", tx);
    console.log("🎮 Players can now purchase houses and play!");
    console.log();
    console.log("🔗 View on Solscan:");
    console.log(`   https://solscan.io/tx/${tx}?cluster=devnet`);

  } catch (error) {
    console.error("❌ Error unpausing game:");
    console.error(error);
    if (error.logs) {
      console.error("\n📋 Transaction logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
  }
}

unpauseGame().catch(console.error);
