const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function mintTestCoins() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: node mint-test-coins.js <target_wallet_address> <amount>");
    console.log("Example: node mint-test-coins.js GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w 1000000");
    console.log("");
    console.log("Amount examples:");
    console.log("  1,000 coins    = 1000");
    console.log("  10,000 coins   = 10000");
    console.log("  100,000 coins  = 100000");
    console.log("  1,000,000 coins = 1000000");
    process.exit(1);
  }

  const targetWalletStr = args[0];
  const amount = parseInt(args[1]);

  if (isNaN(amount) || amount <= 0) {
    console.error("❌ Invalid amount. Must be a positive number.");
    process.exit(1);
  }

  console.log("💰 Minting Test Coins\n");

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load program - fetch IDL from on-chain
  console.log("📡 Fetching program IDL from chain...");
  const program = await anchor.Program.at(PROGRAM_ID, provider);

  // Parse target wallet
  let targetWallet;
  try {
    targetWallet = new PublicKey(targetWalletStr);
  } catch (e) {
    console.error("❌ Invalid wallet address:", targetWalletStr);
    process.exit(1);
  }

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  const [userAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_account"), targetWallet.toBuffer()],
    program.programId
  );

  console.log("📍 Target User:", targetWallet.toString());
  console.log("📍 User Account PDA:", userAccount.toString());
  console.log("💵 Amount:", amount.toLocaleString(), "coins");
  console.log("🔑 Admin Authority:", wallet.publicKey.toString());
  console.log();

  // Check if user account exists
  try {
    const accountInfo = await connection.getAccountInfo(userAccount);
    if (!accountInfo) {
      console.error("❌ User account does not exist!");
      console.error("💡 The user must purchase a house first before receiving coins.");
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Error checking user account:", e.message);
    process.exit(1);
  }

  try {
    console.log("📤 Sending mint transaction...");

    const tx = await program.methods
      .adminMintTestCoins(new anchor.BN(amount))
      .accounts({
        globalState,
        userAccount,
        targetUser: targetWallet,
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Test coins minted successfully!");
    console.log("📝 Transaction signature:", tx);
    console.log("💰 User now has", amount.toLocaleString(), "additional coins!");
    console.log();
    console.log("🔗 View on Solscan:");
    console.log(`   https://solscan.io/tx/${tx}?cluster=devnet`);

  } catch (error) {
    console.error("❌ Error minting coins:");
    console.error(error.message);
    if (error.logs) {
      console.error("\n📋 Transaction logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
  }
}

mintTestCoins().catch(console.error);
