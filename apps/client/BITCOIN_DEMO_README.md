# Bitcoin Integration Demo

Standalone testing page for Xverse wallet + Atomiq swaps integration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd apps/client
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in `apps/client/`:

```env
# Bitcoin Network (testnet, mainnet, testnet4, signet)
VITE_BITCOIN_NETWORK=testnet

# Atomiq Environment (testnet, mainnet)
VITE_ATOMIQ_ENV=testnet

# Starknet RPC URL (for Atomiq SDK)
VITE_STARKNET_RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR_INFURA_KEY
```

**Get a free Starknet RPC key from:**
- [Infura](https://www.infura.io/) - Create account → Create API key → Select Starknet Sepolia
- [Alchemy](https://www.alchemy.com/) - Similar process

### 3. Install Xverse Wallet

Download and install the [Xverse browser extension](https://www.xverse.app/):
- Chrome/Brave: [Chrome Web Store](https://chromewebstore.google.com/detail/xverse-wallet/idnnbdplmphpflfnlkomgpfbpcgelopg)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/xverse-wallet/)

**Important:** Switch Xverse to **Bitcoin Testnet** mode in settings!

### 4. Run the Demo

```bash
pnpm dev
```

Then open: **https://localhost:3000/bitcoin-demo.html**

(Note: Uses HTTPS with self-signed cert via `vite-plugin-mkcert`)

## 🧪 What You Can Test

### ✅ Current Features
1. **Xverse Connection**: Connect your Bitcoin wallet
2. **Atomiq Quote**: Get a swap quote (BTC → STRK)
3. **Environment Display**: See configured networks

### 🚧 Coming Soon (Phase 6-7)
- Full deposit flow with Lightning invoice
- QR code display for mobile wallets  
- Withdrawal flow (STRK → BTC)
- Game escrow integration
- Balance tracking

## 📋 Testing Checklist

- [ ] Xverse wallet installed and set to **testnet**
- [ ] `.env` file created with valid `VITE_STARKNET_RPC_URL`
- [ ] Demo page loads without errors
- [ ] "Connect Xverse Wallet" button works
- [ ] Xverse prompts for connection approval
- [ ] Bitcoin address displays after connection
- [ ] "Get Quote" button becomes enabled
- [ ] Clicking "Get Quote" shows quote details
- [ ] Quote displays: input amount, output amount, fee, rate
- [ ] No console errors

## 🐛 Troubleshooting

### Error: "Xverse not found"
- Make sure Xverse extension is installed
- Refresh the page after installing
- Check that Xverse is enabled in your browser extensions

### Error: "Failed to initialize Atomiq SDK"
- Verify `VITE_STARKNET_RPC_URL` is set correctly in `.env`
- Test your RPC URL: `curl -X POST YOUR_RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"starknet_chainId","params":[],"id":1}'`
- Expected response should include `"0x534e5f5345504f4c4941"` (Sepolia chain ID)

### Error: "User cancelled connection"
- This is normal - just try connecting again
- Make sure you approve the connection in Xverse popup

### Quote takes a long time
- Atomiq SDK is initializing (first time is slow)
- Check your internet connection
- Verify you're on testnet (mainnet may have issues)

## 📊 What Gets Tested

### Services Layer ✅
- `XverseService.connect()` - Wallet connection
- `XverseService.getBitcoinAddress()` - Address retrieval  
- `AtomiqService.initialize()` - SDK initialization
- `AtomiqService.getQuote()` - Quote fetching

### NOT Tested Yet ⏳
- `XverseService.signMessage()` - Message signing
- `AtomiqService.startLightningDeposit()` - Full deposit flow
- `AtomiqService.startLightningWithdrawal()` - Withdrawal flow
- Zustand stores - State management (not used in demo)
- React hooks - Custom hooks (not used in demo)
- UI Components - Deposit/withdraw modals (will test in Phase 2)

## 🔄 Next Steps

Once basic connection and quoting work:

1. **Test Full Deposit Flow**: Implement Lightning invoice display + payment
2. **Test Withdrawal**: Implement STRK → BTC withdrawal with PSBT signing
3. **Integrate with Game**: Connect to game escrow system
4. **Add UI Components**: Use the full Bitcoin component library
5. **Migrate to React**: Move entire game to React (see `REACT_MIGRATION.md`)

## 🌐 Network Information

### Bitcoin Testnet
- Network: `testnet3`
- Get testnet BTC: [Bitcoin Testnet Faucet](https://testnet-faucet.mempool.co/)
- Minimum swap: 1,000 sats
- Block explorer: [Mempool.space Testnet](https://mempool.space/testnet)

### Starknet Sepolia
- Network: `Sepolia Testnet`
- Get testnet STRK: [Starknet Faucet](https://faucet.goerli.starknet.io/) (may need Twitter verification)
- Block explorer: [Voyager Sepolia](https://sepolia.voyager.online/)

### Atomiq
- Docs: [Atomiq Documentation](https://docs.atomiq.io/)
- Status: [Status Page](https://status.atomiq.io/)
- Support: [Discord](https://discord.gg/atomiq)

## 💡 Tips

- **Use small amounts for testing** (1,000-10,000 sats)
- **Testnet transactions are free** (no real money involved)
- **Quotes expire after ~10 minutes** (re-request if expired)
- **Lightning is fast** (~3-10 seconds for deposit)
- **Check console logs** for detailed debugging info

## 📞 Need Help?

Check console logs for detailed error messages. Most issues are:
1. Missing environment variables
2. Xverse not on testnet
3. Invalid RPC URL
4. Network connectivity

---

**Happy Testing! 🚀**

