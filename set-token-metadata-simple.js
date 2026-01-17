const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { createMetadataAccountV3 } = require("@metaplex-foundation/mpl-token-metadata");
const { createSignerFromKeypair, signerIdentity } = require("@metaplex-foundation/umi");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const fs = require("fs");

const TOKEN_MINT = "BLFhHsiqsupiUy5u5ujYZ9De9XiXbHphigQN4krZagBR";
const RPC_URL = "https://api.devnet.solana.com";

async function setTokenMetadata() {
  console.log("💰 Setting BOMBcoin Token Metadata\n");

  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/Users/iceweasel/.config/solana/id.json", "utf-8")))
  );

  console.log("🔑 Authority:", walletKeypair.publicKey.toString());
  console.log("💎 Token Mint:", TOKEN_MINT);
  console.log();

  // Create UMI instance
  const umi = createUmi(RPC_URL);

  // Convert Keypair to UMI signer
  const umiKeypair = {
    ...walletKeypair,
    publicKey: Array.from(walletKeypair.publicKey.toBytes()),
    secretKey: walletKeypair.secretKey,
  };

  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));

  const metadata = {
    name: "BOMBcoin",
    symbol: "BOMB",
    uri: "https://arweave.net/placeholder",
  };

  console.log("📝 Creating metadata:");
  console.log("   Name:", metadata.name);
  console.log("   Symbol:", metadata.symbol);
  console.log("   URI:", metadata.uri);
  console.log();

  try {
    const result = await createMetadataAccountV3(umi, {
      mint: TOKEN_MINT,
      mintAuthority: signer,
      data: metadata,
      isMutable: true,
      collectionDetails: null,
    });

    console.log("✅ Metadata created successfully!");
    console.log("📝 Result:", result);
    console.log();
    console.log("🔗 View on Solscan:");
    console.log(`   https://solscan.io/token/${TOKEN_MINT}?cluster=devnet`);
    console.log();
    console.log("💡 Your wallet should now show 'BOMB' instead of the token address!");
    console.log();

  } catch (error) {
    console.error("❌ Error creating metadata:");
    console.error(error.message);
    console.error(error.stack);
  }
}

setTokenMetadata().catch(console.error);
