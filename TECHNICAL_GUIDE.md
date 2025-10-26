# Technical Guide - Envio Integration Architecture

This guide explains the technical architecture and how the original CopyTrader classes are integrated with Envio HyperIndex.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENVIO HYPERINDEX LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ Uniswap V3   │    │ Uniswap V3   │    │ Uniswap V3   │    │
│  │ Pool 0.05%   │    │ Pool 0.3%    │    │ Pool 1%      │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                   │                   │              │
│         └───────────────────┴───────────────────┘              │
│                            │                                    │
│                   ┌────────▼─────────┐                         │
│                   │  EventHandlers.ts│                         │
│                   │  (TypeScript)    │                         │
│                   └────────┬─────────┘                         │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐               │
│         │                  │                  │               │
│    ┌────▼────┐      ┌─────▼──────┐    ┌─────▼──────┐        │
│    │  Trade  │      │   Daily    │    │  Wallet    │        │
│    │ Entity  │      │  Summary   │    │ Activity   │        │
│    └────┬────┘      └─────┬──────┘    └─────┬──────┘        │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                    │
│                   ┌────────▼─────────┐                         │
│                   │  PostgreSQL DB   │                         │
│                   │  (via Hasura)    │                         │
│                   └────────┬─────────┘                         │
│                            │                                    │
│                   ┌────────▼─────────┐                         │
│                   │  GraphQL API     │                         │
│                   └────────┬─────────┘                         │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│               PYTHON ANALYTICS LAYER                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  envio_data_fetcher.py                              │    │
│  │  - Queries Envio GraphQL API                        │    │
│  │  - Converts to ProcessedTransaction format          │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                     │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │  ORIGINAL COPYTRADER CLASSES (Reused)               │    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │ transaction_processor.py                    │   │    │
│  │  │ - ProcessedTransaction                      │   │    │
│  │  │ - TransactionProcessor                      │   │    │
│  │  │ - calculate_summary()                       │   │    │
│  │  │ - Trade direction detection logic           │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │ storage.py                                  │   │    │
│  │  │ - StorageHandler                            │   │    │
│  │  │ - save_wallet_summary()                     │   │    │
│  │  │ - JSON export functionality                 │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │ logger.py, config.py                        │   │    │
│  │  │ - Logging infrastructure                    │   │    │
│  │  │ - Configuration management                  │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OUTPUT                                              │   │
│  │  - Wallet performance metrics                        │   │
│  │  - Copy trading pattern detection                    │   │
│  │  - JSON exports (original format)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Event Ingestion (Envio HyperIndex)

**Source:** Uniswap V3 Pool Swap Events

```typescript
event Swap(
  address indexed sender,
  address indexed recipient,
  int256 amount0,
  int256 amount1,
  uint160 sqrtPriceX96,
  uint128 liquidity,
  int24 tick
)
```

**Processing:** `src/EventHandlers.ts`

1. Receives Swap event from Envio
2. Checks if sender/recipient is monitored wallet
3. Determines trade direction (buy/sell)
4. Calculates amounts and price
5. Stores in Trade entity
6. Updates DailySummary and WalletActivity

---

### 2. Trade Direction Logic (Reused from Original)

The TypeScript event handler implements the **exact same logic** as the original Python code:

**Python (original):**
```python
def _determine_trade_direction(
    self,
    swap: SwapEvent,
    wallet_address: str,
    eth_is_token0: bool,
    eth_amount_raw: Decimal,
    usdc_amount_raw: Decimal
) -> Optional[Literal["buy", "sell"]]:
    # Logic: BUY = wallet receives ETH
    #        SELL = wallet receives USDC
    if is_recipient:
        if eth_amount_raw > 0:
            return "buy"
        elif usdc_amount_raw > 0:
            return "sell"
    # ... more logic
```

**TypeScript (Envio):**
```typescript
function determineTradeDirection(
  sender: string,
  recipient: string,
  walletAddress: string,
  amount0: bigint,
  amount1: bigint,
  token0IsWETH: boolean
): TradeType | null {
  // Same logic translated to TypeScript
  if (isRecipient) {
    if (ethAmount > 0n) {
      return TradeType.BUY;
    } else if (usdcAmount > 0n) {
      return TradeType.SELL;
    }
  }
  // ... more logic
}
```

---

### 3. Data Storage

**Envio Entities → PostgreSQL**

- **Trade**: Individual swap transactions
- **DailySummary**: Aggregated daily statistics
- **WalletActivity**: Per-wallet daily activity
- **MonitoredWallet**: Wallet tracking metadata

All queryable via GraphQL API.

---

### 4. Python Integration

**Query → Convert → Process → Analyze**

```python
# 1. Query from Envio GraphQL
envio_trades = fetcher.query_trades(wallet_address="0x...")

# 2. Convert to original format
transactions = [
    convert_envio_trade_to_processed_tx(t)
    for t in envio_trades
]

# 3. Process using ORIGINAL business logic
processor = TransactionProcessor()  # From original project
summary = processor.calculate_summary(transactions)

# 4. Export using ORIGINAL storage handler
storage = StorageHandler(Path("./data"))
storage.save_wallet_summary(
    wallet_name="Trader_1",
    wallet_address="0x...",
    target_date=date.today(),
    transactions=transactions,
    summary=summary
)
```

---

## Key Integration Points

### 1. ProcessedTransaction Model

**Shared Data Structure** between Envio and Python:

```python
class ProcessedTransaction(BaseModel):
    transaction_hash: str
    timestamp: datetime
    block_number: int
    wallet_name: str
    wallet_address: str
    type: Literal["buy", "sell"]
    eth_amount: Decimal
    usdc_amount: Decimal
    price: Decimal
    protocol: str
    pool_address: str
    pool_fee: str
```

This model is:
- Defined in original `transaction_processor.py`
- Used by all original business logic
- **Reconstructed from Envio GraphQL responses**

---

### 2. Summary Calculation

**Original Function** (reused):

```python
def calculate_summary(
    self,
    transactions: List[ProcessedTransaction]
) -> Dict[str, Any]:
    """Calculate summary statistics"""
    buys = [t for t in transactions if t.type == "buy"]
    sells = [t for t in transactions if t.type == "sell"]

    total_buy_eth = sum(t.eth_amount for t in buys)
    total_sell_eth = sum(t.eth_amount for t in sells)
    # ... more calculations

    return {
        "transaction_count": len(transactions),
        "total_buy_eth": float(total_buy_eth),
        "avg_buy_price": float(avg_buy_price),
        # ...
    }
```

**Usage with Envio data:**

```python
# Fetch from Envio
envio_trades = fetcher.query_trades(wallet_address="0x...")

# Convert to ProcessedTransaction
transactions = [convert_to_processed_tx(t) for t in envio_trades]

# Use ORIGINAL calculation logic
processor = TransactionProcessor()
summary = processor.calculate_summary(transactions)
```

---

### 3. Copy Trading Detection

**New Algorithm** using Envio data with original patterns:

```python
def detect_copy_trading_patterns(
    self,
    reference_wallet: str,
    suspect_wallet: str,
    time_threshold_seconds: int = 300
) -> List[Dict]:
    """Detect copy trading using temporal alignment"""

    # Fetch trades for both wallets from Envio
    ref_trades = self.fetcher.query_trades(wallet_address=reference_wallet)
    sus_trades = self.fetcher.query_trades(wallet_address=suspect_wallet)

    patterns = []
    for ref_tx in ref_txs:
        for sus_tx in sus_txs:
            time_diff = abs((sus_tx.timestamp - ref_tx.timestamp).total_seconds())

            if time_diff <= time_threshold_seconds:
                if ref_tx.type == sus_tx.type:
                    # Calculate similarity
                    similarity_score = calculate_similarity(ref_tx, sus_tx)
                    patterns.append({
                        "time_diff_seconds": time_diff,
                        "similarity_score": similarity_score,
                        "trade_type": ref_tx.type
                    })

    return patterns
```

---

## GraphQL Schema Mapping

### Envio Schema → Original Python Models

**Envio `Trade` entity:**
```graphql
type Trade @entity {
  id: ID!
  transactionHash: String!
  timestamp: BigInt!
  walletAddress: String!
  walletName: String
  tradeType: TradeType!
  ethAmount: BigDecimal!
  usdcAmount: BigDecimal!
  price: BigDecimal!
  # ...
}
```

**Maps to Python `ProcessedTransaction`:**
```python
ProcessedTransaction(
    transaction_hash=trade["transactionHash"],
    timestamp=datetime.fromtimestamp(int(trade["timestamp"])),
    wallet_name=trade["walletName"],
    wallet_address=trade["walletAddress"],
    type=trade["tradeType"].lower(),
    eth_amount=Decimal(str(trade["ethAmount"])),
    usdc_amount=Decimal(str(trade["usdcAmount"])),
    price=Decimal(str(trade["price"])),
    # ...
)
```

---

## Performance Comparison

### TheGraph (Original) vs Envio (New)

| Metric | TheGraph | Envio HyperIndex |
|--------|----------|------------------|
| **Query Limit** | 100K/month (free) | Unlimited (self-hosted) |
| **Sync Speed** | ~100 events/sec | 5000+ events/sec (50x faster) |
| **Historical Sync** | Hours/days | Minutes |
| **Multi-chain** | Separate subgraphs | Single config |
| **Local Dev** | Requires graph-node setup | Docker compose |
| **GraphQL API** | ✅ | ✅ |
| **Real-time** | Polling | WebSocket subscriptions |

---

## Code Reusability

### What Was Reused (No Changes)

✅ **transaction_processor.py** - All business logic
✅ **storage.py** - JSON export functionality
✅ **logger.py** - Logging infrastructure
✅ **config.py** - Configuration models (Pydantic)

### What Was Adapted

🔄 **Event Handlers** - Python → TypeScript (logic preserved)
🔄 **Data Fetching** - TheGraph GraphQL → Envio GraphQL
🔄 **Schema** - Subgraph schema → Envio schema.graphql

### What Was Added

➕ **envio_data_fetcher.py** - Bridge between Envio and original classes
➕ **Copy trading detection** - New pattern matching algorithm
➕ **Multi-pool support** - Three Uniswap V3 pools simultaneously

---

## Extension Points

### 1. Add More Pools

**config.yaml:**
```yaml
contracts:
  - name: UniswapV3Pool_New
    address:
      - 0xYOUR_POOL_ADDRESS
    handler: src/EventHandlers.ts
    events:
      - event: Swap(...)
```

### 2. Add Multi-chain Support

**config.yaml:**
```yaml
networks:
  - id: 1    # Ethereum
  - id: 42161  # Arbitrum
  - id: 137    # Polygon
```

### 3. Extend Schema

**schema.graphql:**
```graphql
type Trade @entity {
  # ... existing fields
  gasCost: BigDecimal
  mev_detected: Boolean
  frontrun_risk_score: BigDecimal
}
```

**EventHandlers.ts:**
```typescript
const trade: Trade = {
  // ... existing fields
  gasCost: calculateGasCost(event),
  mev_detected: detectMEV(event),
  frontrun_risk_score: calculateRisk(event),
};
```

---

## Testing

### Unit Tests (TypeScript)

```bash
pnpm test
```

### Integration Tests (Python)

```python
# python_analytics/test_integration.py
def test_envio_to_processed_tx_conversion():
    envio_trade = {
        "transactionHash": "0xabc...",
        "timestamp": "1640000000",
        "tradeType": "BUY",
        # ...
    }

    analytics = EnvioAnalytics("http://localhost:8080/v1/graphql")
    tx = analytics.convert_envio_trade_to_processed_tx(envio_trade)

    assert tx.transaction_hash == "0xabc..."
    assert tx.type == "buy"
```

---

## Monitoring

### Indexer Health

```bash
# Check indexer status
pnpm envio status

# View logs
pnpm envio logs

# Restart indexer
pnpm envio stop
pnpm dev
```

### GraphQL Metrics

Query Hasura console: http://localhost:8080/console

Check:
- Total indexed blocks
- Events processed
- Query performance

---

## Deployment Checklist

- [ ] Set `HYPERSYNC_API_KEY` in production `.env`
- [ ] Configure `start_block` for full historical sync
- [ ] Set up PostgreSQL database (production)
- [ ] Deploy Hasura GraphQL engine
- [ ] Configure monitoring (Datadog, Sentry, etc.)
- [ ] Set up alerts for indexer failures
- [ ] Deploy Python analytics as cron job or service
- [ ] Create backup strategy for indexed data

---

## Further Reading

- **Envio Docs**: https://docs.envio.dev
- **Original CopyTrader**: `/home/lukacsk/Development/CopyTrader/README.md`
- **Uniswap V3**: https://docs.uniswap.org/protocol/concepts/V3-overview/concentrated-liquidity

---

**Questions?** Open an issue or check the [SETUP_GUIDE.md](SETUP_GUIDE.md)
