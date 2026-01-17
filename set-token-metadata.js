const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
const mpl = require("@metaplex-foundation/mpl-token-metadata");
const fs = require("fs");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const TOKEN_MINT = "BLFhHsiqsupiUy5u5ujYZ9De9XiXbHphigQN4krZagBR";
const RPC_URL = "https://api.devnet.solana.com";
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function setTokenMetadata() {
  console.log("💰 Setting BOMBcoin Token Metadata\n");

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  console.log("🔑 Authority:", walletKeypair.publicKey.toString());
  console.log("💎 Token Mint:", TOKEN_MINT);
  console.log();

  // Derive metadata PDA
  const tokenMintPubkey = new PublicKey(TOKEN_MINT);
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      tokenMintPubkey.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log("📋 Metadata PDA:", metadataPDA.toString());
  console.log();

  // Check if metadata already exists
  try {
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (accountInfo) {
      console.log("⚠️  Metadata account already exists!");
      console.log("   To update metadata, you'd need to use updateMetadataAccountV2");
      console.log();
      console.log("   View on Solscan:");
      console.log(`   https://solscan.io/token/${TOKEN_MINT}?cluster=devnet`);
      return;
    }
  } catch (e) {
    // Metadata doesn't exist, proceed with creation
  }

  // Create metadata instruction
  const metadataData = {
    name: "BOMBcoin",
    symbol: "BOMB",
    uri: "https://arweave.net/placeholder", // TODO: Upload actual metadata JSON to Arweave
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  console.log("📝 Creating metadata with:");
  console.log("   Name:", metadataData.name);
  console.log("   Symbol:", metadataData.symbol);
  console.log("   URI:", metadataData.uri);
  console.log();

  const instruction = mpl.createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: tokenMintPubkey,
      mintAuthority: walletKeypair.publicKey,
      payer: walletKeypair.publicKey,
      updateAuthority: walletKeypair.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const transaction = new Transaction().add(instruction);

  try {
    console.log("📤 Sending transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      { commitment: "confirmed" }
    );

    console.log("✅ Metadata created successfully!");
    console.log("📝 Transaction signature:", signature);
    console.log();
    console.log("🔗 View on Solscan:");
    console.log(`   https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log(`   https://solscan.io/token/${TOKEN_MINT}?cluster=devnet`);
    console.log();
    console.log("💡 Your wallet should now show 'BOMB' instead of the token address!");
    console.log();

  } catch (error) {
    console.error("❌ Error creating metadata:");
    console.error(error.message);
    if (error.logs) {
      console.error("\n📋 Transaction logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
  }
}

setTokenMetadata().catch(console.error);
