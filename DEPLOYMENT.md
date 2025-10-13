# Deployment Guide for ZK Battleship

## Tech Stack

- **Frontend**: Vite + React (SPA)
- **Blockchain**: Starknet Sepolia (testnet)
- **Indexer**: Torii (Dojo)
- **Wallets**: Cartridge Controller (Starknet), Xverse (Bitcoin)

## Prerequisites for Production

### 1. Torii Indexer (Required!)

Your game requires a running Torii instance to index game state. You have two options:

#### Option A: Deploy Your Own Torii (Recommended)

Deploy Torii on a VPS (DigitalOcean, AWS, etc.):

```bash
# On your server
git clone <your-repo>
cd BitcoinShip/chain/dojo

# Install Dojo
curl -L https://install.dojoengine.org | bash
dojoup

# Start Torii with CORS enabled
torii --config torii.toml \
  --allowed-origins "*" \
  --world 0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69 \
  --rpc https://api.cartridge.gg/x/starknet/sepolia
```

**Expose Ports**: 8080 (HTTP), 8081 (gRPC)

#### Option B: Use Slot (Cartridge's Hosted Torii)

If available, you can use Cartridge's hosted indexer service. Check their documentation.

### 2. Environment Variables

The app needs these environment variables in production:

```bash
# Torii URL (your deployed Torii instance)
VITE_TORII_URL=https://your-torii-instance.com:8081

# Starknet RPC (get API key from Alchemy/Blast/Infura)
VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

## Deployment Options

### Option 1: Vercel (Recommended ⭐)

1. **Push to GitHub**:

   ```bash
   git push origin main
   ```

2. **Connect to Vercel**:

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Framework: Vite
   - Root Directory: `apps/client`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables** in Vercel dashboard:

   ```
   VITE_TORII_URL=https://your-torii-instance.com:8081
   VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

4. **Deploy**: Vercel auto-deploys on every push!

### Option 2: Netlify

Very similar to Vercel:

- Drag and drop `apps/client/dist` folder
- Or connect GitHub repo
- Set environment variables in dashboard

### Option 3: Cloudflare Pages

1. Connect GitHub repo
2. Build command: `npm run build`
3. Output: `dist`
4. Set environment variables

### Option 4: GitHub Pages (Free but Limited)

```bash
cd apps/client
npm run build

# Deploy to gh-pages branch
npx gh-pages -d dist
```

## Build Locally (Test Before Deploying)

```bash
cd apps/client

# Set environment variables (create .env file):
# VITE_TORII_URL=https://your-torii-instance.com:8081
# VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY

npm run build

# Test the production build locally
npm run preview
```

## Post-Deployment Checklist

- [ ] Torii is running and accessible
- [ ] Environment variables are set correctly
- [ ] Can connect Cartridge Controller wallet
- [ ] Can create a game (transaction succeeds)
- [ ] Game state updates in real-time (Torii subscriptions work)
- [ ] Can deposit BTC via Atomiq
- [ ] Can stake WBTC
- [ ] Can play a full match

## Troubleshooting

### "Failed to fetch" or "Network Error"

- Check CORS on your Torii instance
- Verify `VITE_TORII_URL` environment variable
- Ensure Torii is running and accessible

### "Game not found" after creating

- Torii might not be synced yet (wait ~30s)
- Check Torii logs for indexing errors
- Verify world address in `torii.toml` matches your deployment

### Wallet connection issues

- Ensure you're on the correct network (Sepolia)
- Check RPC URL is valid and has API credits
- Try refreshing the page

## Estimated Costs

- **Vercel/Netlify**: Free tier (sufficient for hobby/demo)
- **Torii VPS**: $5-10/month (DigitalOcean Droplet, 1GB RAM)
- **RPC API**: Free tier on Alchemy/Blast (generous limits)

## Next Steps for Mainnet

1. Deploy contracts to Starknet Mainnet
2. Switch `VITE_STARKNET_RPC_URL` to mainnet
3. Update `torii.toml` to point to mainnet
4. Switch Atomiq to mainnet BTC/WBTC
5. Test thoroughly on mainnet testnet first!

## Support

- [Dojo Documentation](https://book.dojoengine.org)
- [Starknet Documentation](https://docs.starknet.io)
- [Cartridge Discord](https://discord.gg/cartridge)
