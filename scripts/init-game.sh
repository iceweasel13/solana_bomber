#!/bin/bash

echo "🎮 Initializing Solana Bomber Game on Devnet..."
echo ""

# Check if on devnet
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "Current cluster: $CLUSTER"

if [[ $CLUSTER != *"devnet"* ]]; then
    echo "⚠️  Switching to devnet..."
    solana config set --url devnet
fi

# Check wallet balance
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "Wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "⚠️  Low balance! Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Get wallet address
WALLET=$(solana address)
echo "Wallet address: $WALLET"
echo ""

# Program details
PROGRAM_ID="97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7"
echo "Program ID: $PROGRAM_ID"

# Derive global state PDA
GLOBAL_STATE=$(solana-keygen grind --starts-with "global_state" 1 | grep "Wrote" | awk '{print $4}')

echo ""
echo "📝 Game Parameters:"
echo "  - House Price: 0.25 SOL"
echo "  - Reward Rate: 1000 coins/hour"
echo "  - Burn Rate: 50%"
echo "  - Referral Fee: 2.5%"
echo "  - Treasury: $WALLET"
echo ""

# Build program first
echo "🔨 Building program..."
cd /Users/iceweasel/solana_bomber
anchor build

echo ""
echo "✅ Ready to initialize!"
echo ""
echo "Please run the initialization from the admin panel:"
echo "1. Open http://localhost:3000"
echo "2. Connect with your wallet (the authority wallet)"
echo "3. Go to Admin tab"
echo "4. Look for 'Initialize Game State' button"
echo ""
echo "Or use this command to check program status:"
echo "solana program show $PROGRAM_ID --url devnet"
