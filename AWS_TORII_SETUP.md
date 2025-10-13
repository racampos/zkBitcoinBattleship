# Deploy Torii to AWS - Step by Step Guide

## Step 1: Launch EC2 Instance

### Instance Configuration:
- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: `t3.small` (2 vCPU, 2GB RAM) - minimum recommended
- **Storage**: 20GB gp3 (SSD)
- **Key Pair**: Create or use existing SSH key

### Security Group (CRITICAL):
Open these ports:

| Port  | Protocol | Source    | Purpose                |
|-------|----------|-----------|------------------------|
| 22    | TCP      | Your IP   | SSH access             |
| 8080  | TCP      | 0.0.0.0/0 | Torii GraphQL (HTTP)   |
| 8081  | TCP      | 0.0.0.0/0 | Torii gRPC             |
| 50051 | TCP      | 0.0.0.0/0 | Torii gRPC (optional)  |

### Launch & Note:
- Save your **Public IPv4 address** (e.g., `54.123.45.67`)
- Save your **Public IPv4 DNS** (e.g., `ec2-54-123-45-67.compute-1.amazonaws.com`)

---

## Step 2: Connect to Your Instance

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@54.123.45.67

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## Step 3: Install Dependencies

```bash
# Install required packages
sudo apt install -y curl git build-essential

# Install Rust (required by Dojo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Verify Rust installation
rustc --version
```

---

## Step 4: Install Dojo (includes Torii)

```bash
# Install Dojo toolchain
curl -L https://install.dojoengine.org | bash

# Add to PATH
source ~/.bashrc

# Install specific version (use latest stable)
dojoup

# Verify installation
torii --version
```

---

## Step 5: Clone Your Repository

```bash
# Clone your BitcoinShip repo
cd ~
git clone https://github.com/YOUR_USERNAME/BitcoinShip.git
cd BitcoinShip/chain/dojo
```

---

## Step 6: Verify Torii Configuration

Check your `torii.toml`:

```bash
cat torii.toml
```

Should look like:
```toml
# Torii configuration for Sepolia testnet
world_address = "0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69"
rpc = "https://api.cartridge.gg/x/starknet/sepolia"
start_block = 0
database_dir = ".torii_db_sepolia"
manifest_path = "../apps/client/src/dojo/manifest_sepolia.json"
```

---

## Step 7: Start Torii (Test Run)

```bash
# Start Torii with CORS enabled (foreground for testing)
torii --config torii.toml \
  --allowed-origins "*" \
  --http.addr 0.0.0.0 \
  --grpc.addr 0.0.0.0
```

**Expected output:**
```
🌐 Starting Torii indexer...
📡 Listening on 0.0.0.0:8080 (HTTP)
📡 Listening on 0.0.0.0:8081 (gRPC)
🔄 Syncing from block 0...
```

**Leave this running** and open a new terminal to test!

---

## Step 8: Test from Your Local Machine

Open a new terminal on your **local machine**:

```bash
# Test GraphQL endpoint (should return HTML page)
curl http://54.123.45.67:8080/graphql

# Test with a simple GraphQL query
curl -X POST http://54.123.45.67:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ entities(first: 1) { edges { node { keys } } } }"}'
```

**Expected**: JSON response with entities data

---

## Step 9: Test with Local Dev Server

On your **local machine**:

```bash
cd BitcoinShip/apps/client

# Create .env file with AWS Torii URL
echo "VITE_TORII_URL=http://54.123.45.67:8081" > .env

# Start dev server
npm run dev
```

**Test the game:**
1. Open `http://localhost:4000`
2. Connect Cartridge wallet
3. Create a game
4. Check if game appears (Torii indexing works!)
5. Watch Torii logs on AWS - you should see new entities being indexed

---

## Step 10: Run Torii as Background Service (Production)

Once testing works, set up Torii as a systemd service for auto-restart:

### Create service file:
```bash
sudo nano /etc/systemd/system/torii.service
```

### Paste this configuration:
```ini
[Unit]
Description=Torii Indexer for BitcoinShip
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/BitcoinShip/chain/dojo
ExecStart=/home/ubuntu/.dojo/bin/torii --config torii.toml --allowed-origins "*" --http.addr 0.0.0.0 --grpc.addr 0.0.0.0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Enable and start the service:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable torii

# Start service
sudo systemctl start torii

# Check status
sudo systemctl status torii

# View logs
sudo journalctl -u torii -f
```

---

## Step 11: Configure HTTPS (Optional but Recommended)

For production, use HTTPS with Let's Encrypt:

```bash
# Install Nginx as reverse proxy
sudo apt install -y nginx certbot python3-certbot-nginx

# Get a domain name (e.g., torii.yourdomain.com)
# Point DNS A record to your EC2 IP

# Install SSL certificate
sudo certbot --nginx -d torii.yourdomain.com

# Configure Nginx to proxy Torii
sudo nano /etc/nginx/sites-available/torii
```

Add:
```nginx
server {
    listen 80;
    server_name torii.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name torii.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/torii.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/torii.yourdomain.com/privkey.pem;
    
    location /graphql {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin *;
    }
    
    location /grpc {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        add_header Access-Control-Allow-Origin *;
    }
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/torii /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now use: `VITE_TORII_URL=https://torii.yourdomain.com`

---

## Troubleshooting

### Torii won't start:
```bash
# Check logs
sudo journalctl -u torii -n 50

# Common issues:
# - Wrong world address in torii.toml
# - RPC URL not accessible
# - Manifest file path incorrect
```

### Can't connect from local dev:
```bash
# Check security group allows port 8080, 8081
# Check if Torii is listening on 0.0.0.0 (not 127.0.0.1)
sudo netstat -tlnp | grep torii
```

### Slow syncing:
```bash
# Check RPC rate limits
# Consider using paid RPC provider (Alchemy, Blast)
# Increase start_block in torii.toml to skip old blocks
```

### Out of memory:
```bash
# Upgrade to t3.medium (4GB RAM)
# Or add swap:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Cost Estimate

- **EC2 t3.small**: ~$15/month (24/7)
- **20GB Storage**: ~$2/month
- **Data Transfer**: Minimal (~$1/month for light usage)
- **Total**: ~$18/month

### Cost Optimization:
- Use **Reserved Instance** for 1-year commitment: ~$9/month (save 40%)
- Use **Spot Instance** for dev/testing: ~$4/month (but can be interrupted)

---

## Next Steps After AWS Setup

Once Torii is running on AWS and tested:

1. ✅ Torii running on AWS
2. ✅ Tested with local dev server
3. 📝 Deploy frontend to Vercel:
   - Set `VITE_TORII_URL=http://your-ec2-ip:8081`
   - Set `VITE_STARKNET_RPC_URL=https://...`
   - Deploy!

---

## Monitoring & Maintenance

### Check Torii health:
```bash
# Check service status
sudo systemctl status torii

# View recent logs
sudo journalctl -u torii -n 100 --no-pager

# Follow logs in real-time
sudo journalctl -u torii -f
```

### Update Torii:
```bash
# Stop service
sudo systemctl stop torii

# Update Dojo
dojoup

# Restart service
sudo systemctl start torii
```

### Backup database (optional):
```bash
cd ~/BitcoinShip/chain/dojo
tar -czf torii_backup_$(date +%Y%m%d).tar.gz .torii_db_sepolia/
```

---

## Support

- [Dojo Discord](https://discord.gg/dojoengine) - #support channel
- [Torii Documentation](https://book.dojoengine.org/toolchain/torii)
- AWS EC2 SSH troubleshooting: Check security group, key permissions (`chmod 400 key.pem`)

