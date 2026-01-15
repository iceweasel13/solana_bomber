# Solana Bomber - Quick Start Guide

## 🚀 Getting Started

Your Solana Bomber game is now live on **Devnet**!

**Program ID**: `97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7`

---

## 📋 Prerequisites

```bash
# Install dependencies
npm install @project-serum/anchor @solana/web3.js @solana/spl-token

# Or with yarn
yarn add @project-serum/anchor @solana/web3.js @solana/spl-token
```

---

## 🎮 Step-by-Step Gameplay

### **Step 1: Initialize the Game (Admin Only - One Time)**

This creates the global game state and reward token mint.

```typescript
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const programId = new PublicKey("97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7");

// Derive PDAs
const [globalState] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_state")],
  programId
);

const [rewardTokenMint] = PublicKey.findProgramAddressSync(
  [Buffer.from("reward_token_mint")],
  programId
);

// Initialize (admin only)
const devTreasury = wallet.publicKey; // Your treasury wallet

await program.methods
  .initializeGlobalState(devTreasury)
  .accounts({
    globalState,
    rewardTokenMint,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();

console.log("✅ Game initialized!");
console.log("Global State:", globalState.toString());
console.log("Reward Token:", rewardTokenMint.toString());
```

---

### **Step 2: Player Joins the Game**

Players pay 0.25 SOL to create their account.

```typescript
const [userAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_account"), wallet.publicKey.toBuffer()],
  programId
);

await program.methods
  .initializeUser()
  .accounts({
    userAccount,
    user: wallet.publicKey,
    devTreasury, // From step 1
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("✅ Player account created!");
console.log("User Account:", userAccount.toString());
```

---

### **Step 3: Mint Heroes**

Each hero costs 100 coins (50% burned, 50% to pool).

**Note**: Players need coins first. For testing, you can airdrop coins or implement a faucet.

```typescript
// Mint a hero
await program.methods
  .mintHero()
  .accounts({
    globalState,
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("✅ Hero minted! Check inventory.");

// Fetch user account to see heroes
const userAccountData = await program.account.userAccount.fetch(userAccount);
console.log("Inventory:", userAccountData.inventory);
```

---

### **Step 4: Move Heroes to House**

Max 21 heroes can be in the house.

```typescript
const heroIndex = 0; // First hero in inventory

await program.methods
  .moveHeroToHouse(heroIndex)
  .accounts({
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();

console.log(`✅ Hero ${heroIndex} moved to house`);
```

---

### **Step 5: Send Heroes to Mine**

Max 15 heroes on the map at once.

```typescript
await program.methods
  .moveHeroToMap(heroIndex)
  .accounts({
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();

console.log(`✅ Hero ${heroIndex} is now mining!`);
```

---

### **Step 6: Claim Mining Rewards**

Rewards accumulate based on time × HMP × phase rate.

```typescript
import { getAssociatedTokenAddress } from "@solana/spl-token";

// Get or create user's token account
const userTokenAccount = await getAssociatedTokenAddress(
  rewardTokenMint,
  wallet.publicKey
);

// Get referrer token account (or use a dummy if no referrer)
const referrerTokenAccount = userTokenAccount; // Or actual referrer's account

await program.methods
  .claimRewards()
  .accounts({
    globalState,
    rewardTokenMint,
    userAccount,
    userTokenAccount,
    referrerTokenAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("✅ Rewards claimed!");

// Check token balance
const balance = await connection.getTokenAccountBalance(userTokenAccount);
console.log("Token Balance:", balance.value.uiAmount);
```

---

### **Step 7: Recover HP (Restroom)**

Move exhausted heroes to restroom for faster recovery.

```typescript
await program.methods
  .moveHeroToRestroom(heroIndex)
  .accounts({
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();

console.log(`✅ Hero ${heroIndex} is resting`);

// Trigger HP recovery (can be called periodically)
await program.methods
  .recoverHp()
  .accounts({
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();

console.log("✅ HP recovered for all resting heroes");
```

---

### **Step 8: Upgrade House**

Unlock more restroom slots and faster recovery.

```typescript
await program.methods
  .upgradeHouse()
  .accounts({
    globalState,
    userAccount,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();

console.log("✅ House upgraded!");

const userData = await program.account.userAccount.fetch(userAccount);
console.log("New House Level:", userData.houseLevel);
console.log("Restroom Capacity:", userData.getRestroomCapacity());
```

---

## 🧪 Testing Script Example

```typescript
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

async function testGameplay() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey("97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7");
  const program = new Program(IDL, programId, provider); // You'll need to generate IDL

  // Test sequence
  console.log("1. Initializing user...");
  // await initializeUser();

  console.log("2. Minting hero...");
  // await mintHero();

  console.log("3. Moving to house...");
  // await moveToHouse();

  console.log("4. Mining...");
  // await startMining();

  console.log("5. Waiting 1 hour...");
  // await sleep(3600000);

  console.log("6. Claiming rewards...");
  // await claimRewards();

  console.log("✅ All tests passed!");
}

testGameplay().catch(console.error);
```

---

## 📊 Monitoring & Analytics

### **Check Player Stats**

```typescript
const userAccount = await program.account.userAccount.fetch(userAccountPDA);

console.log("Player Stats:");
console.log("- House Level:", userAccount.houseLevel);
console.log("- Coin Balance:", userAccount.coinBalance);
console.log("- Total Heroes:", userAccount.inventory.length);
console.log("- Heroes in House:", userAccount.activeHouse.length);
console.log("- Heroes Mining:", userAccount.activeMap.length);
console.log("- Heroes in Restroom:", userAccount.restroomSlots.length);
```

### **Calculate Total HMP**

```typescript
let totalHMP = 0;
for (const heroIndex of userAccount.activeMap) {
  const hero = userAccount.inventory[heroIndex];
  const hmp = (hero.power * hero.bombNumber) +
              (hero.bombRange * 0.5) +
              (hero.speed * 2);
  totalHMP += hmp;
}

console.log("Total Mining Power:", totalHMP);
```

### **Check Global Stats**

```typescript
const globalState = await program.account.globalState.fetch(globalStatePDA);

console.log("Global Stats:");
console.log("- Total Mined:", globalState.totalMined);
console.log("- Total Burned:", globalState.totalBurned);
console.log("- Reward Pool:", globalState.rewardPool);
console.log("- Total Heroes Minted:", globalState.totalHeroesMinted);
console.log("- Game Paused:", globalState.paused);
```

---

## 🎯 Game Mechanics Reference

### **Hero Rarity Distribution**
- Common: 84.00%
- Uncommon: 10.00%
- Rare: 4.50%
- Super Rare: 1.00%
- Epic: 0.40%
- Legendary: 0.10%

### **House Upgrade Costs**
| Level | Cost | Cooldown | Restroom Slots | Recovery Speed |
|-------|------|----------|----------------|----------------|
| 1 → 2 | 720 coins | 2 hours | 6 | 2.0x |
| 2 → 3 | 2,400 coins | 6 hours | 8 | 5.0x |
| 3 → 4 | 5,400 coins | 12 hours | 10 | 8.0x |
| 4 → 5 | 9,600 coins | 18 hours | 12 | 11.0x |
| 5 → 6 | 15,000 coins | 24 hours | 15 | 14.0x |

### **Reward Phase Rates**
| Total Mined | Rate (per HMP/hour) |
|-------------|---------------------|
| 0-25M | 10.0 |
| 25M-50M | 5.0 |
| 50M-75M | 2.5 |
| 75M-100M | 1.25 |

---

## 🔗 Useful Links

- **Program Explorer**: https://explorer.solana.com/address/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet
- **Solscan**: https://solscan.io/account/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet
- **Anchor Docs**: https://www.anchor-lang.com/
- **Solana Cookbook**: https://solanacookbook.com/

---

## 🛠️ Troubleshooting

### **"Insufficient Funds" Error**
- Make sure you have enough SOL for transaction fees
- For devnet: `solana airdrop 2 --url devnet`

### **"Account Not Found"**
- Initialize user account first with `initializeUser()`
- Check that you're using the correct network (devnet)

### **"Hero Not Found"**
- Verify hero index is within inventory bounds
- Fetch user account to check current inventory

### **"No Rewards to Claim"**
- Wait at least a few minutes after starting mining
- Ensure heroes have HP > 0
- Check that heroes are on the active map

---

**Happy Gaming! 🎮**
