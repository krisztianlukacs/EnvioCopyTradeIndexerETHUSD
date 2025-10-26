# Setup Guide - Envio Copy Trading Indexer

This guide walks you through setting up and running the Envio-based copy trading detection system.

## Prerequisites

### Required Software

1. **Node.js** v18 or newer
   ```bash
   node --version  # Should be v18+
   ```

2. **pnpm** (or npm/yarn)
   ```bash
   npm install -g pnpm
   # Or use npx: npx pnpm
   ```

3. **Docker Desktop** (for local development)
   - Download from: https://www.docker.com/products/docker-desktop
   - Required for running Hasura GraphQL engine locally

4. **Python 3.10+** (for analytics integration)
   ```bash
   python3 --version  # Should be 3.10+
   ```

5. **Envio CLI**
   ```bash
   pnpm install -g envio
   # Or use npx: npx envio
   ```

---

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd EnvioCopyTradeIndexerETHUSD

# Install Node.js dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env and add your HYPERSYNC_API_KEY
```

### 2. Get API Keys

#### Envio HyperSync API Key
1. Visit https://envio.dev
2. Sign up/login
3. Create a new project
4. Copy your HyperSync API key
5. Add to `.env`:
   ```
   HYPERSYNC_API_KEY=your_key_here
   ```

#### TheGraph API Key (Optional)
For comparison with the original system:
1. Visit https://thegraph.com/studio/
2. Create API key
3. Add to `.env`:
   ```
   THEGRAPH_API_KEY=your_key_here
   ```

### 3. Run Envio Indexer

```bash
# Start local development environment (Docker required)
pnpm dev
```

This will:
- Start Docker containers
- Launch Hasura GraphQL engine
- Begin indexing Uniswap V3 swap events
- Open Hasura console at http://localhost:8080

**Hasura password:** `testing`

### 4. Query Data

Once indexing starts, you can query via:

#### GraphQL Playground (Hasura Console)
- URL: http://localhost:8080/console
- Navigate to "API" → "GraphQL"

Example query:
```graphql
query GetRecentTrades {
  trades(
    limit: 10
    orderBy: { timestamp: desc }
  ) {
    id
    walletName
    tradeType
    ethAmount
    usdcAmount
    price
    timestamp
  }
}
```

#### GraphQL API Endpoint
```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ trades(limit: 5) { id walletName tradeType ethAmount } }"
  }'
```

---

## Python Analytics Integration

The Python integration allows you to use the original CopyTrader business logic with Envio-indexed data.

### 1. Setup Python Environment

```bash
# Navigate to Python analytics directory
cd python_analytics

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install original CopyTrader dependencies
cd /home/lukacsk/Development/CopyTrader
pip install -r requirements.txt
cd -
```

### 2. Run Analytics

```bash
# Make sure Envio indexer is running (pnpm dev in main directory)
python envio_data_fetcher.py
```

This will:
- Fetch trades from Envio GraphQL API
- Convert to original `ProcessedTransaction` format
- Analyze wallet performance using original business logic
- Detect copy trading patterns
- Export to original JSON format

### 3. Example Usage

```python
from envio_data_fetcher import EnvioAnalytics

# Initialize
analytics = EnvioAnalytics(
    envio_endpoint="http://localhost:8080/v1/graphql",
    output_dir="./data"
)

# Analyze wallet performance
performance = analytics.analyze_wallet_performance(
    wallet_address="0x66a9893c904a664803c4fcbfa47e75f5d30e7dab",
    days=7
)

print(f"Total trades: {performance['transaction_count']}")
print(f"Avg buy price: ${performance['avg_buy_price']:.2f}")

# Detect copy trading
patterns = analytics.detect_copy_trading_patterns(
    reference_wallet="0x66a9893c904a664803c4fcbfa47e75f5d30e7dab",
    suspect_wallet="0xfbd4cdb40e862397a2f89a854e0e7e8f7e794c37"
)

print(f"Found {len(patterns)} potential copy trading patterns")
```

---

## Project Structure

```
EnvioCopyTradeIndexerETHUSD/
├── config.yaml                 # Envio configuration (chains, contracts, events)
├── schema.graphql              # GraphQL schema (entities/tables)
├── src/
│   └── EventHandlers.ts        # TypeScript event processing logic
├── python_analytics/
│   ├── envio_data_fetcher.py   # Python integration with original code
│   └── requirements.txt        # Python dependencies
├── .env                        # API keys (DO NOT COMMIT)
├── .env.example                # Example environment variables
├── package.json                # Node.js dependencies
├── README.md                   # Main documentation
└── SETUP_GUIDE.md              # This file
```

---

## Configuration

### Monitored Wallets

Edit `config.yaml` to add/remove wallets:

```yaml
monitoredWallets:
  - address: "0x66a9893c904a664803c4fcbfa47e75f5d30e7dab"
    name: "HFT_Trader_1"
  - address: "0xYOUR_WALLET_HERE"
    name: "My_Wallet"
```

### Pool Configuration

The system monitors three Uniswap V3 ETH/USDC pools:

- **0.05% fee**: `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640`
- **0.3% fee**: `0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8`
- **1% fee**: `0x7BeA39867e4169DBe237d55C8242a8f2fcDcc387`

### Start Block

Adjust in `config.yaml` to control indexing start point:

```yaml
networks:
  - id: 1
    start_block: 19000000  # Ethereum mainnet
```

Lower block = more historical data (slower initial sync)
Higher block = less historical data (faster initial sync)

---

## Troubleshooting

### Docker not starting
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop
# Then: pnpm dev
```

### Port conflicts (8080 already in use)
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or edit docker-compose.yml to use different port
```

### Hasura console not accessible
- Check Docker containers: `docker ps`
- Check logs: `pnpm envio logs`
- Restart: `pnpm envio stop` then `pnpm dev`

### Python import errors
```bash
# Ensure original CopyTrader project exists
ls /home/lukacsk/Development/CopyTrader

# Update path in .env:
ORIGINAL_PROJECT_PATH=/your/path/to/CopyTrader
```

### No trades appearing
- Check start_block in config.yaml
- Monitor recent blocks may not have trades yet
- Lower start_block to index more historical data
- Check logs: Look for "Processed BUY/SELL" messages

---

## Production Deployment

### Option 1: Envio Hosted Service

```bash
# Deploy to Envio cloud
envio deploy

# Follow prompts to configure
# Hosted endpoint will be provided
```

### Option 2: Self-Hosted

1. Set up PostgreSQL database
2. Configure production environment variables
3. Run indexer as service
4. Deploy Hasura GraphQL engine
5. Configure monitoring and alerts

See [Envio Hosted Service Docs](https://docs.envio.dev/docs/HyperIndex/hosted-service)

---

## Next Steps

1. **Customize Schema** - Add fields to `schema.graphql`
2. **Extend Event Handlers** - Add logic to `src/EventHandlers.ts`
3. **Build Dashboard** - Create React/Next.js frontend
4. **Add AI Models** - Integrate ML for pattern detection
5. **Multi-chain** - Add Arbitrum, Polygon in config.yaml

---

## Support

- **Envio Docs**: https://docs.envio.dev
- **Discord**: https://discord.gg/envio
- **GitHub Issues**: [Your repo]/issues

---

**Happy Indexing! 🚀**
