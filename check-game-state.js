const { PublicKey, Connection } = require('@solana/web3.js');
const { AnchorProvider, Program } = require('@coral-xyz/anchor');
const idl = require('./bomber/src/lib/idl.json');

const PROGRAM_ID = new PublicKey('5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc');

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Derive global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    PROGRAM_ID
  );

  console.log('Fetching game state from:', globalState.toString());

  try {
    const accountInfo = await connection.getAccountInfo(globalState);

    if (!accountInfo) {
      console.log('❌ Account does not exist');
      return;
    }

    console.log('\n✅ Account exists!');
    console.log('Data length:', accountInfo.data.length, 'bytes');

    // Try to parse the data
    const data = accountInfo.data;

    // Read first few fields (this is a rough approximation)
    // Format: authority (32) + dev_treasury (32) + game_has_started (1) + paused (1) + ...

    const gameHasStarted = data[64] === 1;
    const paused = data[65] === 1;

    console.log('\n📊 Game State:');
    console.log('Game Has Started:', gameHasStarted ? '✅ YES' : '❌ NO');
    console.log('Paused:', paused ? '⏸ YES' : '▶ NO');

    if (!gameHasStarted) {
      console.log('\n⚠️ Game is initialized but NOT STARTED!');
      console.log('You need to call startGame() to begin accepting players.');
    } else {
      console.log('\n✅ Game is fully operational!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
