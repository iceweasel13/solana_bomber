# 🦊 Phantom Connection Troubleshooting Guide

## Current Issue: Cannot Connect to Phantom

### Step 1: Open Browser Console
Press `F12` or right-click → "Inspect" → "Console" tab

---

## Diagnostic Steps

### 1. Check if Phantom is Installed

In the browser console, type:
```javascript
window.solana
```

**Expected Output:**
```javascript
{isPhantom: true, publicKey: ..., connect: ƒ, ...}
```

**If you see `undefined`:**
- ❌ Phantom is NOT installed
- 👉 Install from: https://phantom.app
- 🔄 Refresh the page after installation

---

### 2. Check Phantom Network

Open Phantom wallet:
1. Click the settings icon (⚙️) in Phantom
2. Go to "Developer Settings"
3. Check the "Network" setting

**Must be:** `Devnet`

**If it shows Mainnet:**
- Switch to Devnet
- Close and reopen Phantom
- Refresh the admin panel page

---

### 3. Check Phantom Permissions

1. Open Phantom
2. Click the hamburger menu (☰)
3. Go to "Trusted Apps"
4. Look for `localhost:3000`

**If localhost:3000 is NOT listed:**
- Try connecting again from the admin panel
- Approve the connection request in Phantom

**If localhost:3000 IS listed but still can't connect:**
- Remove it from Trusted Apps
- Try connecting again (Phantom will ask for approval)

---

### 4. Test Connection Manually

In browser console, paste this code:

```javascript
(async () => {
  console.log("Testing Phantom connection...");

  // Check if Phantom exists
  if (!window.solana) {
    console.error("❌ Phantom not found!");
    return;
  }

  console.log("✓ Phantom found:", window.solana.isPhantom);

  // Try to connect
  try {
    const response = await window.solana.connect();
    console.log("✅ Connected!");
    console.log("Public Key:", response.publicKey.toString());
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
})();
```

**Possible Outputs:**

**Success:**
```
Testing Phantom connection...
✓ Phantom found: true
✅ Connected!
Public Key: GLJ8JosW...NHDjU2w
```

**User Rejected:**
```
❌ Connection failed: Error: User rejected the request
```
👉 Click "Connect" in Phantom popup

**Phantom Locked:**
```
❌ Connection failed: Error: Wallet is locked
```
👉 Unlock Phantom with your password

---

### 5. Check Browser Extension Status

**Chrome/Edge:**
1. Go to `chrome://extensions/`
2. Find "Phantom"
3. Make sure it's ENABLED
4. Check "Allow in incognito" if using incognito mode

**Firefox:**
1. Go to `about:addons`
2. Find "Phantom"
3. Make sure it's ENABLED

---

### 6. Clear localStorage and Retry

In browser console:
```javascript
localStorage.removeItem("walletConnected");
location.reload();
```

Then try connecting again.

---

### 7. Check for Extension Conflicts

Some extensions can interfere with Phantom:

**Potential Conflicts:**
- Other Solana wallets (Solflare, Slope, etc.)
- Ad blockers
- Privacy extensions

**Try:**
1. Disable other extensions temporarily
2. Try connecting again
3. Re-enable extensions one by one to find the culprit

---

### 8. Check Connection Logs

In the admin panel:
1. Click "Connect Phantom"
2. Watch the console for these logs:

**Expected Flow:**
```
🔘 Connect button clicked
💡 Check browser console for detailed connection logs
🔌 Connect function called, silent: false
✓ Phantom provider found: {isPhantom: true, ...}
📡 Attempting to connect to Phantom (silent: false)
✅ Connected to Phantom! Response: {...}
✓ Created Solana connection to: https://api.devnet.solana.com
🔧 Initializing program service...
✅ Wallet setup complete!
📍 Connected wallet: GLJ8JosW...NHDjU2w
```

**If logs stop at a certain point:**
- Note where they stop
- That's where the issue is occurring

---

## Common Issues & Solutions

### Issue 1: "Phantom wallet not found in window"
**Cause:** Extension not loaded yet
**Solution:**
- Wait 2-3 seconds after page load
- Refresh the page
- Reinstall Phantom extension

### Issue 2: "User rejected the connection request"
**Cause:** Didn't approve in Phantom popup
**Solution:**
- Click "Connect" button again
- Look for Phantom popup (might be hidden)
- Approve the connection request

### Issue 3: Auto-connects without popup
**Cause:** Phantom already trusts the site
**Solution:**
- This is NORMAL behavior!
- Phantom remembers approved sites
- Transactions will still show popups for approval

### Issue 4: "Cannot read properties of undefined"
**Cause:** programService not initialized
**Solution:**
- Make sure wallet is connected first
- Check console for connection errors
- Try disconnecting and reconnecting

### Issue 5: Page freezes when connecting
**Cause:** Extension timeout or conflict
**Solution:**
- Close and reopen browser
- Disable other extensions
- Try in incognito mode (with Phantom enabled)

---

## Still Not Working?

### Last Resort Steps:

1. **Reinstall Phantom:**
   - BACKUP YOUR SEED PHRASE FIRST! 🚨
   - Uninstall Phantom extension
   - Restart browser
   - Install Phantom from https://phantom.app
   - Restore wallet with seed phrase
   - Try connecting again

2. **Try Different Browser:**
   - Test in Chrome, Firefox, or Brave
   - See if issue persists across browsers

3. **Check Phantom Status:**
   - Visit: https://status.phantom.app
   - Check for any service issues

4. **Ask for Help:**
   - Share console logs (hide sensitive info!)
   - Describe exact error message
   - Mention your browser and OS version

---

## Debug Checklist ✅

Before asking for help, verify:

- [ ] Phantom extension is installed and enabled
- [ ] Phantom is unlocked (not password-protected)
- [ ] Phantom is on Devnet (not Mainnet)
- [ ] Browser console is open and showing logs
- [ ] Page was refreshed after installing Phantom
- [ ] No other Solana wallets are installed
- [ ] Tried in incognito mode
- [ ] Tried clearing localStorage
- [ ] Copied full error message from console

---

## Contact Info

If issues persist, provide these details:
- Browser name and version
- OS (Windows/Mac/Linux)
- Phantom version
- Full console error logs
- Screenshot of the error

---

Good luck! 🚀
