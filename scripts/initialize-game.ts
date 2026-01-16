import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function main() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaBomber as Program;

  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  const [rewardTokenMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_token_mint")],
    program.programId
  );

  console.log("Global State PDA:", globalState.toString());
  console.log("Reward Token Mint PDA:", rewardTokenMint.toString());

  // Check if already initialized
  try {
    const account = await program.account.globalState.fetch(globalState);
    console.log("✓ Game already initialized!");
    console.log("Game started:", account.gameHasStarted);
    console.log("Paused:", account.paused);
    return;
  } catch (e) {
    console.log("Game not initialized yet, proceeding...");
  }

  // Initialize with default parameters
  const devTreasury = provider.wallet.publicKey; // Use your wallet as treasury
  const initialHousePrice = new anchor.BN(250_000_000); // 0.25 SOL
  const initialBombcoinPerBlock = new anchor.BN(1000); // 1000 coins per hour
  const halvingInterval = new anchor.BN(1_000_000_000); // 1B coins
  const burnPct = 5000; // 50%
  const referralFee = 250; // 2.5%
  const rewardsPrecision = new anchor.BN(1);

  console.log("\nInitializing game with parameters:");
  console.log("- Dev Treasury:", devTreasury.toString());
  console.log("- House Price:", initialHousePrice.toString(), "lamports (0.25 SOL)");
  console.log("- Reward Rate:", initialBombcoinPerBlock.toString(), "coins/hour");
  console.log("- Halving Interval:", halvingInterval.toString());
  console.log("- Burn %:", burnPct / 100, "%");
  console.log("- Referral Fee:", referralFee / 100, "%");

  try {
    const tx = await program.methods
      .initializeGlobalState(
        devTreasury,
        initialHousePrice,
        initialBombcoinPerBlock,
        halvingInterval,
        burnPct,
        referralFee,
        rewardsPrecision
      )
      .accounts({
        globalState,
        rewardTokenMint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("\n✅ Game initialized successfully!");
    console.log("Transaction signature:", tx);

    // Now start the game
    const startTx = await program.methods
      .startGame()
      .accounts({
        globalState,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Game started!");
    console.log("Start transaction signature:", startTx);

    console.log("\n🎮 Game is now ready! Users can:");
    console.log("  - Purchase houses");
    console.log("  - Buy heroes");
    console.log("  - Start playing!");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
