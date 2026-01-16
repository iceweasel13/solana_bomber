const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = "5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc";
const RPC_URL = "https://api.devnet.solana.com";

async function checkAuthority() {
  console.log("🔍 Checking Global State Authority\n");

  const connection = new Connection(RPC_URL, "confirmed");
  const programId = new PublicKey(PROGRAM_ID);

  // Derive global state PDA
  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );

  console.log("Global State PDA:", globalState.toString());
  console.log("Bump:", bump);
  console.log();

  // Get account data
  const accountInfo = await connection.getAccountInfo(globalState);

  if (!accountInfo) {
    console.log("❌ Global state account not found!");
    return;
  }

  console.log("✅ Account exists");
  console.log("Data length:", accountInfo.data.length, "bytes");
  console.log();

  // Parse the account data
  // GlobalState structure (based on Rust code):
  // - authority: Pubkey (32 bytes) at offset 8
  // - dev_treasury: Pubkey (32 bytes) at offset 40
  // - reward_token_mint: Pubkey (32 bytes) at offset 72
  // etc...

  const data = accountInfo.data;

  // Skip discriminator (8 bytes) and read authority (32 bytes)
  const authorityBytes = data.slice(8, 40);
  const authority = new PublicKey(authorityBytes);

  console.log("🔑 Authority stored in global_state:");
  console.log("   ", authority.toString());
  console.log();

  // Also show your wallet from Anchor.toml
  console.log("💡 Your wallet should match the authority above.");
  console.log("   Check with: solana address");
  console.log();
}

checkAuthority().catch(console.error);
