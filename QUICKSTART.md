# Quick Start Guide - 5 Minutes to Running

Get the Envio Copy Trading Indexer running in 5 minutes.

---

## ⚡ Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js (need v18+)
node --version

# Check Docker (need Docker Desktop running)
docker --version

# Check Python (need 3.10+)
python3 --version
```

**Missing something?**
- Node.js: https://nodejs.org
- Docker: https://www.docker.com/products/docker-desktop
- Python: https://www.python.org/downloads

---

## 🚀 5-Minute Setup

### Step 1: Clone & Install (1 min)

```bash
# If you don't have the repo yet
git clone <your-repo-url>
cd EnvioCopyTradeIndexerETHUSD

# Install Node.js dependencies
npm install
```

### Step 2: Configure Environment (1 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

**Add your Envio API key:**
```bash
HYPERSYNC_API_KEY=your_key_here
```

**Don't have an API key yet?**
- Visit: https://envio.dev
- Sign up (free)
- Create project
- Copy API key

### Step 3: Start Indexer (2 min)

```bash
# Start Docker containers and Envio indexer
npm run dev
```

**What happens:**
- Docker containers start (PostgreSQL, Hasura)
- Envio begins indexing blocks
- Hasura console opens automatically

**Console URL:** http://localhost:8080/console
**Password:** `testing`

### Step 4: Verify It's Working (1 min)

**Open Hasura console** → Navigate to "API" tab

**Run this query:**
```graphql
query {
  trades(limit: 5, orderBy: { timestamp: desc }) {
    id
    walletName
    tradeType
    ethAmount
    usdcAmount
    price
  }
}
```

**See data?** ✅ You're done!
**No data yet?** ⏳ Wait 1-2 minutes for initial sync

---

## 🐍 Bonus: Python Analytics (Optional)

### Setup Python Environment (2 min)

```bash
# Navigate to Python directory
cd python_analytics

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r ../../../CopyTrader/requirements.txt
```

### Run Analytics (1 min)

```bash
# Make sure you're in python_analytics directory
# Make sure Envio indexer is running (npm run dev)

python envio_data_fetcher.py
```

**Expected output:**
```
=== Wallet Performance ===
Transactions: 47
Total Buy ETH: 12.5420
Total Sell ETH: 10.3210
Avg Buy Price: $2,432.78
Avg Sell Price: $2,435.00

=== Copy Trading Detection ===
Found 3 potential patterns
Pattern 1:
  Time diff: 142s
  Similarity: 87.5%
  Trade type: buy
...
```

---

## 🔍 Troubleshooting

### "Docker daemon not running"
```bash
# Start Docker Desktop
# Wait for it to fully start
# Then: npm run dev
```

### "Port 8080 already in use"
```bash
# Find what's using port 8080
lsof -ti:8080

# Kill it
lsof -ti:8080 | xargs kill -9

# Try again
npm run dev
```

### "No trades appearing"
- **Wait 2-3 minutes** for initial indexing
- Check logs: Look for "Processed BUY/SELL" messages
- Verify `start_block` in config.yaml (should be recent)

### "Python import errors"
```bash
# Check original project path
ls /home/lukacsk/Development/CopyTrader

# Update path in .env if needed
ORIGINAL_PROJECT_PATH=/your/path/to/CopyTrader
```

### "HYPERSYNC_API_KEY not set"
```bash
# Check .env file exists
cat .env

# Verify key is set (no spaces, no quotes)
HYPERSYNC_API_KEY=5c3827b8-9d05-4a63-bd10-9d69800a0088
```

---

## 📚 Next Steps

Once you have it running:

1. **Explore Hasura Console**
   - Try different GraphQL queries
   - Check database schema
   - View indexed data

2. **Customize Monitored Wallets**
   - Edit `config.yaml`
   - Add your wallet addresses
   - Restart indexer

3. **Read Documentation**
   - [README.md](README.md) - Full overview
   - [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup
   - [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) - Architecture

4. **Build Something**
   - Create a dashboard
   - Add new entities to schema
   - Extend Python analytics

---

## 🎯 Quick Command Reference

```bash
# Start indexer
npm run dev

# Stop indexer
npm run envio stop

# View logs
npm run envio logs

# Access Hasura console
open http://localhost:8080/console

# Run Python analytics
cd python_analytics && python envio_data_fetcher.py

# Restart from scratch
npm run envio stop
docker system prune -a  # Warning: removes all Docker data
npm run dev
```

---

## 🆘 Still Stuck?

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting
2. Review [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) for architecture help
3. Check Envio docs: https://docs.envio.dev
4. Open GitHub issue

---

## ✅ Success Checklist

- [ ] Docker Desktop is running
- [ ] Node.js v18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with HYPERSYNC_API_KEY
- [ ] Indexer started (`npm run dev`)
- [ ] Hasura console accessible (http://localhost:8080)
- [ ] GraphQL query returns data
- [ ] (Optional) Python analytics working

**All checked?** 🎉 **You're ready to go!**

---

## 🚀 What You've Built

You now have:
- **Real-time blockchain indexer** for Uniswap V3
- **GraphQL API** with queryable trade data
- **Python analytics** using original business logic
- **Copy trading detection** system
- **Complete monitoring platform**

**Time to build something awesome!** 🔨

---

**Questions?** Check [README.md](README.md) or open an issue.

**Ready for more?** See [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) for advanced topics.

---

*Last updated: October 26, 2025*
