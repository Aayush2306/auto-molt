# AutoClaw - Production Deployment Guide

## Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Your SSH private key (for DigitalOcean droplet access)
- Your Ethereum wallet address on Base (for receiving payments)
- WalletConnect Project ID (get from https://cloud.walletconnect.com)

---

## Step 1: Prepare Your Repository

1. Create a new GitHub repository
2. Push the code:
```bash
cd C:\Users\Aayus\OneDrive\Desktop\auto-clod
git init
git add .
git commit -m "Initial commit - AutoClaw"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/autoclaw.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `autoclaw` repository
4. Railway will auto-detect Python and start building

### Configure Environment Variables in Railway:

Go to your project → Variables tab and add:

```
DIGITALOCEAN_TOKEN=your_digitalocean_api_token
SSH_KEY_ID=                                          # Leave empty for auto-detect
SSH_PRIVATE_KEY_BASE64=your_base64_encoded_ssh_key   # See below how to get this
FRONTEND_URL=https://your-app.vercel.app             # Update after Vercel deploy
ADDITIONAL_ORIGINS=https://yourdomain.com            # Your custom domain (optional)
```

### How to get SSH_PRIVATE_KEY_BASE64:

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Aayus\.ssh\id_ed25519"))
```

**On Mac/Linux:**
```bash
base64 -i ~/.ssh/id_ed25519
```

Copy the output and paste it as `SSH_PRIVATE_KEY_BASE64` in Railway.

### Add PostgreSQL Database:

1. In Railway, click "New" → "Database" → "PostgreSQL"
2. Railway automatically sets `DATABASE_URL` for you

### Get Your Backend URL:

1. Go to Settings → Domains
2. Click "Generate Domain" to get a URL like `autoclaw-production.up.railway.app`
3. Save this URL for the frontend configuration

---

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import your `autoclaw` repository
4. Configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Configure Environment Variables in Vercel:

```
VITE_API_URL=https://your-backend.up.railway.app     # Your Railway backend URL
VITE_PAYMENT_WALLET=0xYourEthereumWalletAddress      # Your ETH wallet on Base
VITE_WALLETCONNECT_PROJECT_ID=your_project_id       # From WalletConnect Cloud
```

5. Click "Deploy"

### Get Your Frontend URL:

After deployment, Vercel gives you a URL like `autoclaw.vercel.app`

---

## Step 4: Update CORS Settings

Go back to Railway and update:
```
FRONTEND_URL=https://autoclaw.vercel.app           # Your actual Vercel URL
```

---

## Step 5: Add Custom Domain (Optional)

### For Frontend (Vercel):
1. Go to your Vercel project → Settings → Domains
2. Add your domain (e.g., `autoclawd.com`)
3. Update DNS records as instructed

### For Backend (Railway):
1. Go to Railway project → Settings → Domains
2. Add custom domain (e.g., `api.autoclawd.com`)
3. Update DNS records as instructed

Then update environment variables:
- In Railway: `FRONTEND_URL=https://autoclawd.com`
- In Vercel: `VITE_API_URL=https://api.autoclawd.com`

---

## Step 6: Payment Configuration

The frontend is configured to accept 0.005 ETH on Base network. Payments are automatically processed using RainbowKit/wagmi.

Make sure your `VITE_PAYMENT_WALLET` is set to a valid Ethereum address on the Base network where you want to receive payments.

---

## Verification Checklist

- [ ] Backend is running on Railway (check `/` endpoint returns health check)
- [ ] Frontend is deployed on Vercel
- [ ] Environment variables are set correctly
- [ ] CORS is allowing your frontend domain
- [ ] Database is connected (deployments persist)
- [ ] SSH key is working (can provision droplets)
- [ ] Wallet payments work (test with small amount on devnet first)

---

## Troubleshooting

### "Unable to authenticate" error
- Check `SSH_PRIVATE_KEY_BASE64` is correct
- Make sure the SSH key is added to your DigitalOcean account

### CORS errors
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Include `https://` prefix

### Database issues
- Railway should auto-provision PostgreSQL
- Check `DATABASE_URL` is set in Railway variables

### Payments not working
- Verify `VITE_PAYMENT_WALLET` is a valid Ethereum address
- Ensure users have ETH on Base network
- Check `VITE_WALLETCONNECT_PROJECT_ID` is set correctly

---

## Support

For issues, check:
- Railway logs: Project → Deployments → View Logs
- Vercel logs: Project → Deployments → Functions tab
- Browser console for frontend errors
