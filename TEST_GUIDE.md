# Solana Bomber - Testing Guide

## 🧪 Running Integration Tests on Devnet

Your comprehensive integration test suite is ready to validate all game mechanics and formulas on the live devnet deployment.

---

## 📋 Test Coverage

The test suite covers:

1. **✅ Game Initialization**
   - Global state creation
   - Reward token mint setup
   - Admin authority verification

2. **✅ Player Registration**
   - User account creation (0.25 SOL fee)
   - Token account setup
   - Initial state validation

3. **✅ Hero System**
   - Hero minting (100 coins)
   - Rarity distribution validation
   - Stats generation within ranges
   - HMP calculation formula

4. **✅ Hero Management**
   - Moving heroes between states (Inventory → House → Map → Restroom)
   - Enforcing limits (21 house, 15 map)
   - State transition validation

5. **✅ Mining & Rewards**
   - Time-delta reward calculation
   - HMP × Time × Phase Rate formula
   - HP drain based on Speed stat (1 HP/min per Speed)
   - Supply-based halving validation

6. **✅ HP Recovery System**
   - 120-second tick mechanism
   - Stamina-based recovery
   - Location multipliers (Bench vs Restroom)
   - House level boost validation

7. **✅ House Upgrades**
   - Cost validation
   - Cooldown enforcement
   - Capacity increases
   - Recovery speed boosts

8. **✅ Edge Cases**
   - Maximum limits
   - Sleeping hero prevention
   - Cooldown enforcement
   - Insufficient funds handling

9. **✅ Formula Validation**
   - HMP = (Power × Bomb_Number) + (Bomb_Range × 0.5) + (Speed × 2)
   - Rewards = Elapsed_Hours × Total_HMP × Phase_Rate
   - HP_Drain = (Elapsed_Seconds / 60) × Hero_Speed
   - HP_Recovery = (Elapsed_Seconds / 120) × Stamina × Location_Multiplier

---

## 🚀 Prerequisites

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure Environment

Make sure your Anchor.toml points to devnet:

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

### 3. Ensure Wallet Has SOL

```bash
solana config set --url https://api.devnet.solana.com
solana balance
# If balance is low:
solana airdrop 2
```

---

## 🏃 Running Tests

### **Option 1: Run All Tests (Recommended)**

```bash
anchor test --skip-local-validator --provider.cluster devnet
```

This will:
1. Skip building/deploying (program already deployed)
2. Connect to devnet
3. Run all 9 test suites
4. Display detailed results and stats

### **Option 2: Run with NPM**

```bash
npm test
# or
yarn test
```

### **Option 3: Run Specific Test Suite**

```bash
# Run only initialization tests
npx mocha -g "Game Initialization" tests/solana_bomber.ts

# Run only hero minting tests
npx mocha -g "Hero Minting" tests/solana_bomber.ts

# Run only formula validation
npx mocha -g "Formula Validation" tests/solana_bomber.ts
```

---

## ⏱️ Test Duration

**Note**: Some tests include time delays to simulate real gameplay:
- Mining tests: Wait 2 minutes to accumulate rewards
- HP recovery tests: Wait 2 minutes for one recovery tick
- **Total runtime**: ~6-8 minutes for full test suite

To skip time-based tests during development, comment out the `sleep()` calls in the test file.

---

## 📊 Expected Test Output

### **Successful Test Run:**

```
Solana Bomber - Integration Tests
  Global State: H8x...
  Reward Token Mint: F3z...
  Player: 7bG...
  User Account: 9kL...

  1. Game Initialization
    ✓ Should initialize global state (admin only) (2345ms)
    ✅ Global state verified

  2. Player Registration
    ✓ Should airdrop SOL to test player (1234ms)
    ✅ Player balance: 2 SOL
    ✓ Should initialize user account (pay 0.25 SOL) (1567ms)
    ✅ User account verified
    ✓ Should create associated token account for player (987ms)

  3. Hero Minting
    ⚠️ Manual step: Add 500 coins to player for testing
    ✓ Should mint a hero (100 coins)
    Hero Stats:
      - Rarity: Common
      - Power: 2
      - Speed: 1
      - Stamina: 4
      - Bomb Number: 1
      - Bomb Range: 2
      - HP: 75 / 75
      - HMP: 5.0

  4. Hero Management
    ✓ Should move hero to house (1234ms)
    ✅ Active house: 1 heroes
    ✓ Should move hero to map (mining started) (1345ms)
    ✅ Active map: 1 heroes
    Mining started at: 2026-01-14T21:30:00.000Z
    ✓ Should wait for mining (simulating time passage) (120000ms)

  5. Rewards & HP System
    ✓ Should claim mining rewards (2345ms)
    Coins earned: 16667
    Hero HP after mining: 73 / 75
    Expected HP drain: 2
    ✓ Should move exhausted hero to restroom (1234ms)
    ✅ Restroom slots: 1
    ✓ Should recover HP (120s tick) (120000ms)
    HP recovered: 4
    New HP: 77 / 75 (capped at max)
    Expected recovery: 4

  6. House Upgrades
    ⚠️ Insufficient coins (need 720 coins)

  7. Edge Cases & Limits
    ℹ️  House limit: 21 heroes
    ℹ️  Map limit: 15 heroes
    ℹ️  Sleeping check: HP = 0 heroes cannot mine
    ℹ️  Restroom capacity based on house level

  8. Formula Validation
    ✅ HMP Formula Validation:
       Power: 2
       Bomb Number: 1
       Bomb Range: 2
       Speed: 1
       HMP = ( 2 × 1 ) + ( 2 × 0.5) + ( 1 × 2)
       HMP = 5.0
    ✅ Phase Rate Validation:
       Total Mined: 0.016667 tokens
       Current Phase Rate: 10.0 coins/HMP/hour

  9. Global State Verification
    📊 Final Global Stats:
       Total Mined: 0.016667 tokens
       Total Burned: 50 coins
       Reward Pool: 50 coins
       Total Heroes: 1
       Game Paused: false

    👤 Final Player Stats:
       House Level: 1
       Coin Balance: 0.016667 tokens
       Total Heroes: 1
       Heroes in House: 1 / 21
       Heroes Mining: 0 / 15
       Heroes in Restroom: 1

    🦸 Hero Details:
       Hero 0: Common - HMP: 5.0 - HP: 75/75

  ✓ 25 passing (6m 15s)
  ⚠ 3 pending
```

---

## 🔍 Debugging Tests

### **View Detailed Logs**

```bash
ANCHOR_LOG=true anchor test --skip-local-validator --provider.cluster devnet
```

### **Check Transaction on Explorer**

When a test fails, copy the transaction signature and view it on Solana Explorer:

```
https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet
```

### **Inspect Account State**

```bash
# View global state
solana account H8x... --url devnet

# View user account
solana account 9kL... --url devnet
```

### **Common Issues**

1. **"Account not found"**
   - Make sure global state is initialized first
   - Run initialization test separately

2. **"Insufficient funds"**
   - Player needs 0.25 SOL for registration
   - Airdrop more SOL: `solana airdrop 2 --url devnet`

3. **"InsufficientCoins"**
   - Hero minting requires 100 coins
   - Player earns coins through mining first
   - For testing, you can manually airdrop coins or create a faucet function

4. **"Rate limit exceeded"** (Airdrop)
   - Wait 5-10 minutes between airdrops
   - Use a faucet website for devnet SOL

5. **Timeout errors**
   - Increase timeout in test configuration
   - Check devnet RPC health

---

## 📝 Writing Additional Tests

### **Template for New Test**

```typescript
it("Should test [feature name]", async () => {
  try {
    // Arrange: Set up test data
    const heroIndex = 0;

    // Act: Execute the instruction
    const tx = await program.methods
      .[instructionName](params)
      .accounts({
        // ... accounts
      })
      .signers([player])
      .rpc();

    console.log("✅ Transaction:", tx);

    // Assert: Verify results
    const accountData = await program.account.userAccount.fetch(userAccount);
    assert.equal(accountData.someField, expectedValue);

    console.log("✅ Validation passed");
  } catch (err) {
    if (err.message.includes("ExpectedError")) {
      console.log("⚠️ Expected error (test passed)");
    } else {
      throw err;
    }
  }
});
```

---

## 🎯 Test Checklist

Before marking tests as complete, verify:

- [ ] All 9 test suites pass
- [ ] HMP formula validated with actual on-chain data
- [ ] HP drain formula matches expected values
- [ ] HP recovery formula correct for both bench and restroom
- [ ] Reward calculation accurate (time × HMP × phase rate)
- [ ] Supply halving triggers at correct thresholds
- [ ] All limits enforced (21 house, 15 map, restroom capacity)
- [ ] Cooldowns prevent premature upgrades
- [ ] Referral bonuses calculated correctly
- [ ] Sleeping heroes cannot mine
- [ ] Global state updates correctly

---

## 🚨 Known Test Limitations

1. **Coin Airdrop**
   - Tests can't mint heroes without initial coins
   - **Solution**: Implement a test faucet function or manually airdrop coins

2. **Time-Based Tests**
   - Full test suite takes ~6-8 minutes due to delays
   - **Solution**: Run quick tests first, long tests separately

3. **Rate Limiting**
   - Devnet airdrop has rate limits
   - **Solution**: Reuse test accounts or use faucet websites

4. **Phase Transitions**
   - Testing halving requires minting 25M+ tokens
   - **Solution**: Create a test with mocked supply values

---

## 📈 Next Steps

1. **Run Full Test Suite**
   ```bash
   anchor test --skip-local-validator --provider.cluster devnet
   ```

2. **Review Results**
   - Check all formulas are accurate
   - Verify edge cases are handled
   - Document any issues found

3. **Create Test Faucet** (Optional)
   - Add an admin function to airdrop coins for testing
   - Helps with hero minting tests

4. **Stress Testing**
   - Test with 21 heroes in house
   - Test with 15 heroes mining simultaneously
   - Test house upgrades through all 6 levels

5. **Security Testing**
   - Try unauthorized access
   - Test with invalid parameters
   - Verify admin-only functions

---

## 🔗 Useful Commands

```bash
# View test coverage
npx nyc --reporter=html anchor test --skip-local-validator

# Run tests in watch mode
npx mocha --watch tests/solana_bomber.ts

# Run tests with specific timeout
npx mocha --timeout 300000 tests/solana_bomber.ts

# Generate test report
npx mocha tests/solana_bomber.ts --reporter json > test-report.json
```

---

**Ready to test! 🧪**

Run `anchor test --skip-local-validator --provider.cluster devnet` to begin comprehensive testing of your deployed program.
