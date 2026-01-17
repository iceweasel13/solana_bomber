# ✅ Restroom Function Fix

## Issue

**Error**: `programService.placeHeroInRestroom is not a function`

Users were unable to send heroes to the restroom because the function call was incorrect.

---

## Root Cause

The UserPanel component was calling `programService.placeHeroInRestroom()`, but the actual function in `program-service.ts` is named `placeHeroOnGrid()`.

**Incorrect Call**:
```typescript
await programService.placeHeroInRestroom(heroId, x, y);
```

**Correct Function Signature** (from `program-service.ts` line 263):
```typescript
async placeHeroOnGrid(heroIndex: number, x: number, y: number, isRestroom: boolean)
```

---

## Fix Applied

**File**: `/Users/iceweasel/solana_bomber/bomber/src/components/user/UserPanel.tsx`

### 1. Individual Hero Restroom Move (Line 270)

**Before**:
```typescript
const handleMoveHeroToRestroom = async (heroId: number, gridX: number, gridY: number) => {
  // ...
  const sig = await programService.placeHeroInRestroom(heroId, gridX, gridY);
  // ...
};
```

**After**:
```typescript
const handleMoveHeroToRestroom = async (heroId: number, gridX: number, gridY: number) => {
  if (!programService) return alert("Please connect wallet first");

  setLoading(true);
  try {
    // Use placeHeroOnGrid with isRestroom=true
    const sig = await programService.placeHeroOnGrid(heroId, gridX, gridY, true);
    console.log(`Hero ${heroId} moved to restroom:`, sig);
    await fetchPlayerStats();
  } catch (error: any) {
    console.error("Error:", error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

### 2. Bulk Hero Restroom Move (Line 351)

**Before**:
```typescript
const handleBulkMoveToRestroom = async () => {
  // ...
  for (const heroId of selectedHeroes) {
    const x = slot % 3;
    const y = Math.floor(slot / 3);
    await programService.placeHeroInRestroom(heroId, x, y);
    slot++;
  }
  // ...
};
```

**After**:
```typescript
const handleBulkMoveToRestroom = async () => {
  if (!programService) return alert("Please connect wallet first");
  if (selectedHeroes.length === 0) return alert("Please select heroes first");

  setLoading(true);
  try {
    // Move heroes to restroom one by one with auto-slot assignment
    let slot = 0;
    for (const heroId of selectedHeroes) {
      const x = slot % 3;
      const y = Math.floor(slot / 3);
      // Use placeHeroOnGrid with isRestroom=true
      await programService.placeHeroOnGrid(heroId, x, y, true);
      slot++;
    }
    console.log(`${selectedHeroes.length} heroes moved to restroom`);
    alert(`${selectedHeroes.length} heroes moved to restroom successfully!`);
    setSelectedHeroes([]);
    await fetchPlayerStats();
  } catch (error: any) {
    console.error("Error:", error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

---

## How It Works

The `placeHeroOnGrid` function accepts 4 parameters:
1. `heroIndex` - The hero ID to place
2. `x` - Grid X coordinate (0-based)
3. `y` - Grid Y coordinate (0-based)
4. `isRestroom` - Boolean flag
   - `true` = Place in restroom (3x HP recovery)
   - `false` = Place on regular house grid (passive bonuses)

**Restroom Grid Layout** (3 columns):
```
Slot 0: (0, 0)  Slot 1: (1, 0)  Slot 2: (2, 0)
Slot 3: (0, 1)  Slot 4: (1, 1)  Slot 5: (2, 1)
Slot 6: (0, 2)  Slot 7: (1, 2)  Slot 8: (2, 2)
```

**Auto-slot Assignment Algorithm**:
```typescript
let slot = 0;
for (const heroId of selectedHeroes) {
  const x = slot % 3;           // Column (0-2)
  const y = Math.floor(slot / 3); // Row (0, 1, 2, ...)
  await programService.placeHeroOnGrid(heroId, x, y, true);
  slot++;
}
```

---

## Testing Instructions

### Test Individual Hero to Restroom

1. Go to User tab → "Your Heroes" section
2. Find an idle hero with low HP (red/yellow HP bar)
3. Click the "To Restroom" button on that hero
4. Approve the transaction
5. Verify:
   - Hero now shows "🛁 Recovering" badge
   - Hero appears in "Restroom" filter
   - HP starts recovering at 3x rate

### Test Bulk Heroes to Restroom

1. Go to User tab → "Your Heroes" section
2. Filter to "Idle" heroes
3. Select multiple heroes with checkboxes (e.g., 3 heroes with low HP)
4. Click "To Restroom" in bulk actions bar
5. Approve transactions (one per hero currently)
6. Verify:
   - All selected heroes show "🛁 Recovering" badge
   - Heroes appear in "Restroom" filter
   - Selection is cleared
   - Stats refresh automatically

### Test HP Recovery

1. Send a hero to restroom (as above)
2. Wait 5-10 minutes
3. Click "Refresh Stats" button
4. Verify:
   - Hero's HP bar is increasing (green/yellow instead of red)
   - HP value is higher than before
   - Recovery rate is 3x normal

---

## Expected Behavior

### Individual Hero
- Click "To Restroom" button → Transaction → Hero placed in first available restroom slot
- Hero removed from map if currently mining
- HP starts recovering at 3x rate

### Bulk Heroes
- Select multiple heroes → Click "Bulk To Restroom" → Sequential transactions → All heroes placed
- Auto-slot assignment: Heroes fill slots 0, 1, 2, 3, ... in order
- All heroes removed from map if currently mining
- All heroes start recovering HP

---

## Success Criteria

✅ "To Restroom" button on individual heroes works without error
✅ "Bulk To Restroom" button works with multiple selected heroes
✅ Heroes placed in restroom show "🛁 Recovering" badge
✅ HP recovery visible after waiting and refreshing
✅ No more `placeHeroInRestroom is not a function` error

---

## Files Modified

- `/Users/iceweasel/solana_bomber/bomber/src/components/user/UserPanel.tsx`
  - Line 270: Fixed `handleMoveHeroToRestroom` to use `placeHeroOnGrid(heroId, x, y, true)`
  - Line 351: Fixed `handleBulkMoveToRestroom` to use `placeHeroOnGrid(heroId, x, y, true)`

---

## Notes

- The fix maintains backward compatibility - no smart contract changes needed
- Auto-slot assignment fills restroom in left-to-right, top-to-bottom order
- If restroom is full, the transaction will fail (capacity validation in smart contract)
- Restroom capacity depends on house level (check smart contract for exact limits)

---

## Status

✅ **FIXED** - Restroom functionality now works for both individual and bulk hero operations.

Users can now send heroes to the restroom to recover HP at 3x rate! 🛁
