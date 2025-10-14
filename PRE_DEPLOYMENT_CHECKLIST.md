# Pre-Deployment Checklist

Complete this checklist before deploying to Vercel.

## ✅ Infrastructure

- [x] **Torii running on AWS**

  - URL: https://torii.praxys.academy
  - HTTPS enabled with Let's Encrypt
  - Nginx configured for long-lived gRPC connections
  - Systemd service enabled (auto-restart on reboot)

- [x] **Smart Contracts Deployed**
  - Network: Starknet Sepolia
  - World Address: `0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`
  - Escrow Contract: Deployed
  - All systems tested locally

## 🔧 Code Preparation

- [ ] **Latest code committed**

  ```bash
  git status  # Should be clean
  git push origin main  # Push to GitHub
  ```

- [x] **Configuration files ready**

  - [x] `vercel.json` exists in `apps/client/`
  - [x] `.gitignore` includes `.env` (never commit secrets)
  - [x] `toriiUrl.ts` utility configured for production

- [ ] **Build test locally**
  ```bash
  cd apps/client
  npm run build  # Should succeed
  npm run preview  # Test the production build
  ```

## 🌐 Environment Variables

Prepare these values for Vercel:

- [ ] **VITE_TORII_URL**

  - Value: `https://torii.praxys.academy`
  - Copy this exactly (no trailing slash)

- [ ] **VITE_STARKNET_RPC_URL**
  - Value: `https://api.cartridge.gg/x/starknet/sepolia`
  - Or your own RPC if you have one

## 🧪 Local Testing

Before deploying, test everything locally with production config:

- [ ] Create `.env` file with production values:

  ```bash
  cd apps/client
  echo "VITE_TORII_URL=https://torii.praxys.academy" > .env
  echo "VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia" >> .env
  ```

- [ ] Test locally with production settings:
  - [ ] `npm run dev` starts successfully
  - [ ] Can connect Cartridge Controller wallet
  - [ ] WBTC balance displays correctly
  - [ ] Can create a game
  - [ ] Game state updates via HTTP polling
  - [ ] Can complete a full match

## 📝 Vercel Account Setup

- [ ] **Vercel account created**

  - Go to [vercel.com](https://vercel.com)
  - Sign up with GitHub (recommended)
  - Verify email

- [ ] **GitHub repository access**
  - Vercel needs permission to access your repo
  - Install Vercel GitHub app if prompted

## 🎯 Deployment Settings

Double-check these before hitting deploy:

- [ ] **Root Directory:** `apps/client` (NOT the repo root!)
- [ ] **Framework:** Vite (should auto-detect)
- [ ] **Build Command:** `npm run build` (default)
- [ ] **Output Directory:** `dist` (default)
- [ ] **Install Command:** `npm install` (default)

## 🚨 Common Pitfalls to Avoid

- ❌ **Wrong root directory** → Build will fail

  - ✅ Must be `apps/client`, not repo root

- ❌ **Forgot environment variables** → App won't connect to Torii

  - ✅ Add both `VITE_TORII_URL` and `VITE_STARKNET_RPC_URL`

- ❌ **Trailing slash in VITE_TORII_URL** → API calls will fail

  - ✅ Use `https://torii.praxys.academy` (no `/` at end)

- ❌ **Committed `.env` file** → Secrets exposed
  - ✅ Always in `.gitignore`, set variables in Vercel dashboard

## 🎉 Post-Deployment Testing

After Vercel deployment succeeds, test these:

- [ ] **Site loads** (visit your Vercel URL)
- [ ] **No console errors** (open DevTools, check console)
- [ ] **Wallet connects** (Cartridge Controller)
- [ ] **Create game works** (transaction succeeds)
- [ ] **Game ID displays**
- [ ] **Invite URL works** (test in incognito)
- [ ] **Both players can join**
- [ ] **Can stake WBTC**
- [ ] **Can commit boards**
- [ ] **Gameplay works** (fire shots, apply proofs)
- [ ] **Winner gets stake**

## 📊 Monitoring

After deployment, monitor:

- [ ] **Vercel deployment logs** (check for warnings)
- [ ] **Torii logs on AWS**: `sudo journalctl -u torii -f`
- [ ] **Browser console** (users may report errors)
- [ ] **Starknet transactions**: https://sepolia.voyager.online

## 🆘 If Something Goes Wrong

1. **Check Vercel build logs** for errors
2. **Verify environment variables** are set correctly
3. **Test Torii directly**: `curl https://torii.praxys.academy/graphql`
4. **Check AWS Torii logs**: `sudo journalctl -u torii -n 100`
5. **Rollback in Vercel**: Deployments → Previous → Promote to Production

## ✅ Ready to Deploy?

If all checkboxes above are checked, you're ready!

**Next step:** Follow [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
