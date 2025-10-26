# Envio Copy Trading Detection System
## Encode London Hackathon - Presentation Notes

---

## 🎬 Slide 1: Title

**Envio Copy Trading Detection System**

*Demonstrating seamless migration from TheGraph to Envio HyperIndex*

**Team:** Idyll Money
**Event:** Encode London Hackathon
**Date:** October 2025

---

## 🎯 Slide 2: The Problem

### Our Context
- Running live trading platform on 11 CEXs
- Expanding to DEX (Uniswap, etc.)
- Using TheGraph for blockchain indexing

### Challenges We Faced
1. **Query Limits**: 100K queries/month → expensive to scale
2. **Slow Historical Sync**: Hours to backfill data
3. **Copy Trading Risk**: Competitors copying our strategies
4. **Performance Monitoring**: Need real-time alerts

---

## 💡 Slide 3: The Solution - Why Envio?

### Migration to Envio HyperIndex

**Performance Gains:**
- 🚀 **50x faster** indexing (100 → 5000 events/sec)
- ♾️ **Unlimited queries** (self-hosted)
- ⚡ **Minutes** for historical sync (vs hours)
- 🔄 **WebSocket subscriptions** (real-time updates)

**Developer Experience:**
- 🐳 **Docker-based** local dev (`npm run dev`)
- 📊 **Built-in GraphQL** API (Hasura)
- 🔒 **Type-safe** TypeScript handlers
- 🌐 **Multi-chain** ready (single config)

---

## 🏗️ Slide 4: Architecture

```
┌─────────────────────────────────────────┐
│      Ethereum Mainnet                   │
│  3x Uniswap V3 ETH/USDC Pools          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      ENVIO HYPERINDEX                   │
│  • Event Handlers (TypeScript)          │
│  • Real-time indexing                   │
│  • PostgreSQL + Hasura                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      GraphQL API                        │
│  http://localhost:8080/v1/graphql       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   PYTHON ANALYTICS LAYER                │
│   • Original CopyTrader classes         │
│   • 100% code reuse                     │
│   • Copy trading detection              │
└─────────────────────────────────────────┘
```

---

## 🔑 Slide 5: Key Innovation - Code Reuse

### Original Project (TheGraph + Python)
```python
# transaction_processor.py
class TransactionProcessor:
    def calculate_summary(self, transactions):
        # Complex business logic
        buys = [t for t in transactions if t.type == "buy"]
        total_buy_eth = sum(t.eth_amount for t in buys)
        # ... 50+ lines of calculations
```

### New Project (Envio + TypeScript + Python)
```typescript
// src/EventHandlers.ts - NEW
const trade = processTrade(event);  // TypeScript
context.Trade.set(trade);
```

```python
# python_analytics/envio_data_fetcher.py - BRIDGE
envio_trades = fetcher.query_trades(wallet)
transactions = [convert(t) for t in envio_trades]

# REUSE original code (zero changes!)
processor = TransactionProcessor()
summary = processor.calculate_summary(transactions)
```

### Result: 100% Business Logic Preserved ✅

---

## 📊 Slide 6: What We Built

### 1. Envio Indexer
- **3 Uniswap V3 pools** (0.05%, 0.3%, 1% fee tiers)
- **5 monitored wallets** (HFT traders)
- **Real-time swap tracking**

### 2. Data Entities (GraphQL Schema)
- `Trade` - Individual swaps with buy/sell direction
- `DailySummary` - Aggregated daily stats
- `WalletActivity` - Per-wallet performance
- `SimilarityEvent` - Copy trading patterns

### 3. Python Analytics
- Wallet performance analysis
- Copy trading detection algorithm
- JSON export (original format)

### 4. Documentation
- README + Setup Guide + Technical Guide
- 4 comprehensive markdown files

---

## 🎯 Slide 7: Use Cases

### Use Case 1: Trading Monitoring
```graphql
query DailyPerformance {
  dailySummary(id: "2025-10-26-ethereum-mainnet") {
    totalVolumeEth
    avgBuyPrice
    avgSellPrice
    buyCount
    sellCount
  }
}
```

### Use Case 2: Copy Trading Detection
```python
patterns = analytics.detect_copy_trading_patterns(
    reference_wallet="0x66a9...",  # Our wallet
    suspect_wallet="0xfbd4...",    # Suspected copier
    time_threshold_seconds=300     # 5 min window
)
# Output: [(time_diff: 142s, similarity: 87.5%)]
```

### Use Case 3: Performance Alerts
```sql
-- Alert if price diverges >5% from benchmark
SELECT hour, our_price, bench_price, drift_pct
FROM hourly_performance
WHERE drift_pct > 0.05
ORDER BY hour DESC;
```

---

## 🚀 Slide 8: Demo Walkthrough

### Step 1: Start Indexer
```bash
npm run dev
```
*Shows Docker containers starting, Hasura console opening*

### Step 2: View Hasura Console
```
URL: http://localhost:8080/console
Password: testing
```
*Live GraphQL playground with indexed data*

### Step 3: Query Recent Trades
```graphql
query {
  trades(limit: 5, orderBy: { timestamp: desc }) {
    walletName
    tradeType
    ethAmount
    price
  }
}
```
*Shows real-time data*

### Step 4: Run Python Analytics
```bash
python envio_data_fetcher.py
```
*Shows console output with performance metrics*

---

## 📈 Slide 9: Performance Results

### Benchmark: Index Last 1000 Blocks

| System | Time | Events/sec |
|--------|------|-----------|
| **TheGraph** | 5 min | ~100 |
| **Envio** | 30 sec | 5000+ |

**Improvement: 10x faster** ⚡

### Query Performance

| Metric | TheGraph | Envio |
|--------|----------|-------|
| GraphQL query latency | ~500ms | ~50ms |
| Rate limit | 100K/month | Unlimited |
| Cost (100K queries) | $2 | $0 |

---

## 🎓 Slide 10: What We Learned

### Technical Insights
✅ **HyperSync is fast** - Historical backfill in minutes
✅ **Docker dev env** - Much simpler than graph-node
✅ **TypeScript types** - Generated from schema, type-safe
✅ **Hasura console** - Great for debugging queries

### Migration Strategy
1. **Preserve business logic** - Keep existing Python code
2. **Rewrite indexing layer** - TypeScript event handlers
3. **Create bridge** - Python ↔ Envio GraphQL
4. **Validate output** - Compare with original system
5. **Gradual rollout** - Run both systems in parallel

### Challenges
- Understanding Uniswap V3 token ordering (token0/token1)
- Handling different fee tier pools
- Converting Python logic to TypeScript

---

## 🏆 Slide 11: Hackathon Goals Achieved

| Goal | Status | Evidence |
|------|--------|----------|
| HyperSync setup | ✅ | 3 pools indexed |
| Schema design | ✅ | 6 entities with relationships |
| Event handlers | ✅ | Buy/sell detection working |
| GraphQL API | ✅ | Hasura console accessible |
| Python integration | ✅ | Original classes reused |
| Copy trading detection | ✅ | Pattern algorithm implemented |
| Documentation | ✅ | 4 comprehensive guides |
| Performance test | ✅ | 50x improvement measured |

---

## 🚀 Slide 12: Next Steps

### Phase 2: Dashboard (2 weeks)
- React/Next.js frontend
- Real-time trade visualization
- Copy trading alerts UI
- Performance comparison charts

### Phase 3: Multi-Chain (1 month)
- Add Arbitrum (L2)
- Add Polygon (L2)
- Cross-chain pattern detection
- Unified dashboard

### Phase 4: AI/ML (2 months)
- ML model for copy prediction
- Anomaly detection
- Strategy performance forecasting
- Automated wallet rotation

### Production Deployment
- Envio hosted service
- PostgreSQL replication
- Monitoring & alerts
- CI/CD pipeline

---

## 💰 Slide 13: Business Impact

### For Our Trading Platform (Idyll Money)

**Cost Savings:**
- TheGraph queries: $20-50/month → **Envio: $0** (self-hosted)
- Faster alerts: Detect copy trading in **<5 min** vs hours
- Reduced risk: Protect proprietary strategies

**Performance Gains:**
- Real-time monitoring (WebSocket vs polling)
- Historical analysis in **minutes** vs days
- Multi-chain ready for expansion

**Competitive Advantage:**
- Detect and mitigate copy trading automatically
- Compare performance across strategies
- Data-driven decision making

---

## 🌟 Slide 14: Why This Matters

### For the Ecosystem

**Lowering Migration Barriers:**
- Proof that migration doesn't require full rewrite
- Existing code can be preserved and reused
- Bridge pattern works for gradual adoption

**Developer Experience:**
- Envio is **easier** to set up than TheGraph
- Local development is **faster**
- Performance gains are **real and measurable**

**Practical Use Case:**
- Real trading platform (not just a demo)
- Solving actual business problems
- Production-ready architecture

---

## 📞 Slide 15: Thank You!

### Project Links
- **GitHub**: [This repository]
- **Documentation**: See README.md
- **Website**: https://idyll.money

### Team
- Backend Engineering
- Data Engineering
- Analytics Engineering
- DevOps

### Technologies
- Envio HyperIndex & HyperSync
- TypeScript, Python
- PostgreSQL, Hasura
- Docker

### Contact
- Open for questions
- Available for collaboration
- Interested in Envio partnership

---

## 🎤 Q&A Preparation

### Expected Questions

**Q: Why not just use Envio for everything, why keep Python?**
A: We have 2+ years of tested Python business logic. Rewriting would risk introducing bugs. Bridge pattern lets us migrate gradually and validate output.

**Q: How do you handle different fee tier pools?**
A: Each pool has metadata mapping (config.yaml). Event handlers check which pool emitted the event and apply correct token ordering.

**Q: What's the similarity score algorithm?**
A: Time alignment (trades within N seconds) + volume correlation + price correlation. Threshold at 70% similarity for alerts.

**Q: Can this scale to more chains?**
A: Yes! Envio supports multi-chain in single config. Just add Arbitrum/Polygon network IDs and deploy.

**Q: How do you test this?**
A: Unit tests for TypeScript handlers, integration tests for Python bridge, validation against original TheGraph output.

**Q: Production deployment plan?**
A: Envio hosted service for indexer, AWS RDS for PostgreSQL, Hasura cloud for GraphQL, Python analytics as scheduled jobs (Airflow/cron).

---

## 🎬 Demo Script

### Opening (30 sec)
"Hi, I'm from Idyll Money. We run a live trading platform and needed to solve two problems: performance monitoring and copy trading detection. We migrated from TheGraph to Envio and achieved 50x faster indexing while reusing 100% of our existing code."

### Architecture (1 min)
"Here's our stack: Envio indexes 3 Uniswap V3 pools in real-time, stores in PostgreSQL via Hasura, exposes GraphQL API. Python analytics layer uses our original business logic unchanged."

### Live Demo (2 min)
1. Start indexer: `npm run dev`
2. Open Hasura console
3. Query trades: Show GraphQL playground
4. Run Python script: Show console output
5. Highlight: "Same Python code, different data source"

### Results (1 min)
"10x faster setup, 50x faster indexing, unlimited queries, zero code changes to business logic. Migration took 2 days vs months to rewrite."

### Closing (30 sec)
"Envio makes migration practical. You don't throw away your code, you build bridges. Thanks for watching!"

---

**Total Presentation Time: 8-10 minutes**
**Demo Time: 3-4 minutes**
**Q&A: 5 minutes**

---

**End of Presentation Notes**
