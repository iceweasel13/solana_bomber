# Solana Bomber - Deployment Guide

## ✅ Deployment Status

**Status**: Successfully deployed to Devnet
**Date**: January 14, 2026
**Network**: Solana Devnet

---

## 📍 Deployed Program Information

### **Program ID (Devnet)**
```
97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7
```

### **Explorer Links**
- **Solscan**: https://solscan.io/account/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet
- **Solana Explorer**: https://explorer.solana.com/address/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet

### **Deployment Transaction**
```
Signature: 2XbM4zEc4fh1k2TCDjKoxBMnoSLApAQLYXuWe4DKLogPRU8gSXeNbR4BEto4LoK4kossxUrhUuffoVZnQXaqgMsd
```

---

## 🏗️ Build Information

### **Build Command Used**
```bash
anchor build --no-idl
```

### **Program Size**
- Binary: `413 KB` (target/deploy/solana_bomber.so)

### **Dependencies**
- Anchor Framework: `0.32.1`
- Rust Toolchain: `1.85.0`
- Solana CLI: `3.1.6`

---

## 🚀 How to Interact with the Deployed Program

### **1. Initialize Global State (Admin Only)**

```typescript
const tx = await program.methods
  .initializeGlobalState(devTreasuryPublicKey)
  .accounts({
    globalState: globalStatePDA,
    rewardTokenMint: rewardTokenMintPDA,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

### **2. Initialize User Account**

```typescript
const tx = await program.methods
  .initializeUser()
  .accounts({
    userAccount: userAccountPDA,
    user: wallet.publicKey,
    devTreasury: devTreasuryPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### **3. Mint a Hero (100 Coins)**

```typescript
const tx = await program.methods
  .mintHero()
  .accounts({
    globalState: globalStatePDA,
    userAccount: userAccountPDA,
    user: wallet.publicKey,
    owner: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### **4. Move Hero to Map**

```typescript
const tx = await program.methods
  .moveHeroToMap(heroIndex)
  .accounts({
    userAccount: userAccountPDA,
    user: wallet.publicKey,
    owner: wallet.publicKey,
  })
  .rpc();
```

### **5. Claim Rewards**

```typescript
const tx = await program.methods
  .claimRewards()
  .accounts({
    globalState: globalStatePDA,
    rewardTokenMint: rewardTokenMintPDA,
    userAccount: userAccountPDA,
    userTokenAccount: userTokenAccountPDA,
    referrerTokenAccount: referrerTokenAccountPDA,
    user: wallet.publicKey,
    owner: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

---

## 📦 PDA Derivations

### **Global State PDA**
```typescript
const [globalStatePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_state")],
  programId
);
```

### **Reward Token Mint PDA**
```typescript
const [rewardTokenMintPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("reward_token_mint")],
  programId
);
```

### **User Account PDA**
```typescript
const [userAccountPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_account"), wallet.publicKey.toBuffer()],
  programId
);
```

---

## 🎮 Game Mechanics Implemented

### **Core Features**
- ✅ Hero minting system (random rarity: Common to Legendary)
- ✅ House upgrade system (6 levels with increasing benefits)
- ✅ Mining mechanics with HMP calculation
- ✅ HP drain based on Speed stat (1 HP per minute per Speed point)
- ✅ HP recovery system (120-second ticks, boosted in Restroom)
- ✅ Supply-based halving (10 → 5 → 2.5 → 1.25 coins/hour per HMP)
- ✅ Referral system (2.5% bonus on every claim)
- ✅ Claim tax (2.5%)
- ✅ Hero limits (21 in house, 15 on map)

### **Economic Model**
- **Total Supply**: 100,000,000 tokens (100M)
- **Entry Fee**: 0.25 SOL (goes to dev treasury)
- **Hero Mint**: 100 coins (50% burned, 50% to reward pool)
- **Token Decimals**: 6

### **Formulas**
```
HMP = (Power × Bomb_Number) + (Bomb_Range × 0.5) + (Speed × 2)
Rewards = Elapsed_Hours × Total_HMP × Phase_Rate
HP_Drain = (Elapsed_Seconds / 60) × Hero_Speed
HP_Recovery = (Elapsed_Seconds / 120) × Stamina × Location_Multiplier
```

---

## 🔧 Build & Deploy Commands

### **For Future Updates**

```bash
# Build the program
anchor build --no-idl

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upgrade existing program
anchor upgrade target/deploy/solana_bomber.so \
  --program-id 97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7 \
  --provider.cluster devnet
```

---

## 📝 Notes

### **Known Issues Fixed**
1. ✅ Rust toolchain compatibility (upgraded to 1.85.0)
2. ✅ Borrow checker errors in claim_rewards and recover_hp
3. ✅ blake3/constant_time_eq edition2024 conflicts (patched via git)
4. ✅ IDL generation issues (built with --no-idl flag)

### **Testing Recommendations**
1. Test on devnet thoroughly before mainnet deployment
2. Verify all game formulas with edge cases
3. Test hero minting randomness distribution
4. Validate house upgrade cooldowns
5. Test referral system end-to-end
6. Stress test with max limits (21 house, 15 map)

### **Security Considerations**
- ✅ Mint authority controlled by PDA
- ✅ No private key has mint access
- ✅ All state changes validated on-chain
- ✅ Emergency pause functionality implemented
- ⚠️ Pseudo-random generation uses deterministic hashing (consider VRF for mainnet)

---

## 🌐 Next Steps

1. **Create Frontend Interface**
   - Connect wallet
   - Display hero inventory
   - Show house/map status
   - Implement hero management UI
   - Display mining rewards in real-time

2. **Write Integration Tests**
   - Test full gameplay flow
   - Validate all formulas
   - Test edge cases

3. **Deploy to Mainnet**
   - Audit smart contract
   - Review tokenomics
   - Implement VRF for hero minting
   - Set up monitoring

---

## 📞 Support

**Program ID**: `97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7`
**Network**: Devnet
**Framework**: Anchor 0.32.1

For issues or questions, refer to the README.md or open an issue on GitHub.

---

**Deployed Successfully on Devnet! 🎉**
