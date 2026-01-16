const { PublicKey, Connection } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7');

async function main() {
  // Derive global state PDA
  const [globalState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    PROGRAM_ID
  );

  console.log('Global State PDA:', globalState.toString());
  console.log('Bump:', bump);

  // Check if account exists
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    const accountInfo = await connection.getAccountInfo(globalState);

    if (accountInfo) {
      console.log('\n✅ Global State Account EXISTS!');
      console.log('Owner:', accountInfo.owner.toString());
      console.log('Data length:', accountInfo.lamports, 'lamports');
      console.log('Executable:', accountInfo.executable);
      console.log('\n⚠️ Game is already initialized! You cannot initialize twice.');
    } else {
      console.log('\n❌ Global State Account DOES NOT EXIST');
      console.log('Game needs to be initialized.');
    }
  } catch (error) {
    console.error('Error checking account:', error.message);
  }

  // Also check reward token mint
  const [rewardTokenMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_token_mint')],
    PROGRAM_ID
  );

  console.log('\nReward Token Mint PDA:', rewardTokenMint.toString());

  try {
    const mintInfo = await connection.getAccountInfo(rewardTokenMint);
    if (mintInfo) {
      console.log('✅ Reward token mint EXISTS');
    } else {
      console.log('❌ Reward token mint DOES NOT EXIST');
    }
  } catch (error) {
    console.error('Error checking mint:', error.message);
  }
}

main().catch(console.error);
