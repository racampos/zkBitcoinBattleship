# Vercel Deployment Guide - ZK Battleship

Complete step-by-step guide to deploy your ZK Battleship game to Vercel.

## Prerequisites ✅

Before deploying to Vercel, ensure you have:

- [x] Torii running on AWS (https://torii.zkbattleship.fun) ✅
- [x] Game contracts deployed to Starknet Sepolia ✅
- [x] Code pushed to GitHub
- [ ] Vercel account (free)
- [ ] Environment variables ready

---

## Step 1: Prepare Your Repository

### 1.1 Ensure your code is pushed to GitHub

```bash
git status
git add -A
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 1.2 Verify vercel.json exists

Check that `apps/client/vercel.json` exists (it should be created automatically).

---

## Step 2: Create Vercel Project

### 2.1 Go to Vercel

1. Visit [vercel.com](https://vercel.com)
2. Sign up or log in (use GitHub for easy integration)
3. Click **"Add New Project"**

### 2.2 Import Your Repository

1. Click **"Import Git Repository"**
2. Select your GitHub organization/account
3. Find and select `BitcoinShip` repository
4. Click **"Import"**

### 2.3 Configure Build Settings

Vercel should auto-detect Vite, but verify these settings:

```
Framework Preset: Vite
Root Directory: apps/client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**IMPORTANT:** Set the root directory to `apps/client` (not the repo root)!

---

## Step 3: Configure Environment Variables

In the Vercel dashboard, add these environment variables:

### Required Variables:

```bash
VITE_TORII_URL=https://torii.zkbattleship.fun
VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia
```

### Optional (if using custom RPC):

```bash
# If you have your own Alchemy/Blast/Infura API key
VITE_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**How to add environment variables:**

1. In your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add each variable:
   - Name: `VITE_TORII_URL`
   - Value: `https://torii.zkbattleship.fun`
   - Environment: Select **Production**, **Preview**, and **Development**
4. Click **Save**
5. Repeat for `VITE_STARKNET_RPC_URL`

---

## Step 4: Deploy

Click **"Deploy"**! 🚀

Vercel will:

1. Install dependencies (`npm install`)
2. Build your app (`npm run build`)
3. Deploy to a production URL

**First deployment takes ~2-3 minutes.**

---

## Step 5: Test Your Deployment

### 5.1 Visit Your Site

Your app will be available at:

```
https://your-project-name.vercel.app
```

### 5.2 Run Through This Checklist:

- [ ] Site loads without errors
- [ ] Can connect Cartridge Controller wallet
- [ ] Can see your WBTC balance
- [ ] Can create a game (transaction succeeds)
- [ ] Game ID is displayed
- [ ] Can copy invite URL
- [ ] Open invite URL in incognito window
- [ ] Second player can join
- [ ] Both players can stake WBTC
- [ ] Both players can commit boards
- [ ] Can fire shots and apply proofs
- [ ] Game completes and winner receives stake

### 5.3 Check Console for Errors

Open browser DevTools (F12) and check:

- No CORS errors
- gRPC or HTTP polling working
- Game state updates appear

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `zkbattleship.fun`)
4. Follow Vercel's DNS instructions

### 6.2 Update DNS

Add these records to your DNS provider:

```
Type: A
Name: battleship (or @)
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**SSL Certificate:** Vercel automatically provides HTTPS via Let's Encrypt.

---

## Continuous Deployment 🔄

Vercel automatically deploys when you push to GitHub:

- **Production:** Push to `main` branch → deploys to `your-app.vercel.app`
- **Preview:** Push to any other branch → creates preview deployment

Every Pull Request gets its own preview URL!

---

## Troubleshooting

### Build Fails: "Module not found"

**Solution:** Ensure `apps/client` is set as root directory in Vercel settings.

### "Failed to fetch" errors in production

**Solution:**

- Check `VITE_TORII_URL` is set correctly
- Verify Torii is running on AWS
- Test Torii directly: `curl https://torii.zkbattleship.fun/graphql`

### WASM files not loading

**Solution:** Already configured in `vercel.json` with proper headers.

### Environment variables not working

**Solution:**

- Variable names MUST start with `VITE_` to be exposed to the client
- Redeploy after adding variables (Settings → Deployments → click "..." → Redeploy)

### Game state not updating

**Solution:**

- Check browser console for errors
- Verify `VITE_TORII_URL` points to your AWS Torii instance
- Check Torii logs on AWS: `sudo journalctl -u torii -f`

---

## Cost

- **Vercel Free Tier:**

  - ✅ Unlimited deployments
  - ✅ 100 GB bandwidth/month
  - ✅ Automatic HTTPS
  - ✅ Preview deployments
  - ✅ Sufficient for hobby/demo projects

- **Pro Tier ($20/month):**
  - Needed if you exceed bandwidth
  - Custom deployment regions
  - Advanced analytics

---

## Monitoring & Updates

### View Deployment Logs

1. Go to Vercel dashboard
2. Click on your project
3. Select **Deployments**
4. Click on any deployment to see build logs

### Update Your App

```bash
# Make changes locally
git add -A
git commit -m "Update: Added new feature"
git push origin main

# Vercel automatically deploys!
```

### Rollback a Deployment

1. Go to **Deployments**
2. Find a previous working deployment
3. Click **"..."** → **"Promote to Production"**

---

## Security Best Practices

### 1. Never commit `.env` file

Your `.env` file should be in `.gitignore` (it already is).

### 2. Use Vercel's Environment Variables

All sensitive data (API keys, RPC URLs) should be set in Vercel dashboard, not in code.

### 3. Protect Preview Deployments

In Vercel settings, you can password-protect preview deployments.

---

## Next Steps After Deployment

1. **Share your game!**

   - Tweet the URL
   - Post on Discord
   - Submit to Starknet ecosystem showcase

2. **Monitor usage:**

   - Check Vercel Analytics
   - Monitor Torii logs for activity
   - Track gas costs on Voyager

3. **Get feedback:**

   - Add analytics (optional)
   - Monitor error rates
   - Iterate based on user feedback

4. **Optimize:**
   - Enable Vercel's Speed Insights
   - Check bundle size in build logs
   - Optimize images if any

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Discord:** https://discord.gg/vercel
- **Your AWS Torii:** `sudo journalctl -u torii -f` (check logs)
- **Starknet Explorer:** https://sepolia.voyager.online

---

## Summary Checklist

Before going live:

- [x] Torii running on AWS with HTTPS
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Root directory set to `apps/client`
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] Wallet connection works
- [ ] Can create and play a game
- [ ] Game state updates correctly
- [ ] All features tested on production URL

**You're ready to ship! 🚀**
