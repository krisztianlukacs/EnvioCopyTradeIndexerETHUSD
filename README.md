# Envio × Encode London

## Project Title
**Copy Trading Defense System & Trading Monitoring System**

## TL;DR
We have a functioning crypto trading platform currently live on 11 CEXs, with a DEX module under closed beta testing. We identified two key challenges in our DEX environment that we aim to solve using Envio’s **HyperIndex** and **HyperSync**:

1. **Trading Monitoring System** — Compare our trading algorithm’s performance with that of other monitored algorithms. When performance diverges significantly, we want to be alerted to investigate whether it’s caused by technical issues, market anomalies, or model drift. Data is further used to train AI models for fair, comparable benchmarking across strategies.

2. **Copy Trading Defense System** — Detect traders or bots that are copying our trades by analyzing on-chain activity patterns using Envio and AI. If copy-trading is detected, we rotate wallets or modify execution behavior to make our strategy harder to replicate.

Goal: Build a demonstrable Encode London dApp using HyperIndex and HyperSync to transform blockchain data into intelligent, queryable insights across multiple chains.

---

## Problem Description

### 1. Monitoring & Benchmarking
- Hard to compare algorithmic strategies fairly — different frequency, trade size, slippage, and instruments.  
- If our strategy underperforms, we want to know *why*: data issue, latency, front-running, or execution bug?

### 2. Copy Trading Detection
- Copy trading may be manual or via automated bots.  
- Requires cross-chain event monitoring to spot repetitive trade patterns, time alignment, and correlated gas or slippage behavior.

---

## Solution Overview — Powered by Envio

### 1. Data Ingestion via **HyperSync**
- Real-time collection of on-chain events: swaps, transfers, approvals, liquidity changes across Ethereum, Arbitrum, and Polygon.
- Off-chain ingestion via webhooks/Kafka from trade engine logs and exchange execution data.

### 2. Indexing via **HyperIndex**
- Schema maps all relevant trade and wallet events into normalized views.  
- Indexed datasets: trade events, wallet activity, and strategy metadata for multi-chain unified querying.

### 3. Query & Analytics
- Real-time and historical queries (ROI, Sharpe ratio, drawdown, slippage, latency).  
- Correlation and pattern similarity analysis for detecting strategy drift or copy behavior.

### 4. AI & Modeling Pipeline
- HyperIndex outputs normalized, timestamped events to an ML feature store.  
- Two model families: performance comparison and copy-trade detection (pattern similarity + anomaly detection).  
- Models run in online inference for real-time alerts.

### 5. Automated Alerts & Mitigation
- Threshold-based alerts for performance drift and suspected copy-trading.  
- Automated mitigation: wallet rotation, delayed execution, or obfuscation strategies.

---

## High-Level Architecture

1. **Data Sources** — On-chain events, backend trade logs, market data.  
2. **Sync Layer** — Envio HyperSync (real-time multi-chain ingestion).  
3. **Index Layer** — Envio HyperIndex (schema + materialized views).  
4. **Analytics Layer** — Feature store + query engine.  
5. **ML Layer** — Model training & inference pipelines.  
6. **Alert & Ops Layer** — Monitoring, wallet rotation automation, Slack notifications.  
7. **UI Layer** — Encode London dApp dashboard: visual alerts, replay tools, analytics charts.

---

## Example HyperIndex Schemas

### `trades` Table
| Field | Type | Description |
|-------|------|-------------|
| trade_id | string | Unique identifier |
| timestamp | timestamptz | Event time |
| chain | string | Blockchain name |
| protocol | string | DEX protocol (Uniswap, etc.) |
| initiator | address | Wallet initiating the trade |
| side | enum | buy/sell |
| size_quote | decimal | Trade size |
| price | decimal | Executed price |
| slippage | decimal | Slippage percentage |
| strategy_id | string | Linked strategy |
| meta | jsonb | Raw event payload |

### `wallet_activity` Table
Tracks address activity (swaps, approvals, liquidity changes).

### `similarity_events` Table
Stores detected copy-trading evidence with fields like `suspect_wallet`, `similarity_score`, and `action_taken`.

---

## Example Queries

**Find top wallets most similar to our strategy (past 7 days):**
```sql
SELECT suspect_wallet, AVG(similarity_score) AS avg_sim
FROM similarity_events
WHERE probe_strategy = 'strategy_X' AND timestamp >= now() - interval '7 days'
GROUP BY suspect_wallet
ORDER BY avg_sim DESC
LIMIT 10;
```

**Performance Drift Detection:**
```sql
SELECT date_trunc('hour', timestamp) AS hour,
  AVG(CASE WHEN strategy_id='ours' THEN pnl_pct END) AS ours_pnl,
  AVG(CASE WHEN strategy_id='benchmark' THEN pnl_pct END) AS bench_pnl
FROM trades
WHERE timestamp >= now() - interval '14 days'
GROUP BY hour
ORDER BY hour;
```

---

## Demo Plan for Encode London
1. **Setup HyperSync** — Real-time stream from a testnet.  
2. **Show HyperIndex Views** — `trades` and `wallet_activity` tables in action.  
3. **Dashboard Demo** — Live performance drift alert + simulated copy-trade detection.  
4. **Deep Dive** — Schema, queries, and AI inference workflow.

---

## Success Metrics
- >60% true-positive rate for detected copy cases.  
- <30 min time-to-detect drift.  
- <5% false-positive rate for auto-mitigations.  
- Query latency <200ms in demo.

---

## Tech Stack
Envio HyperIndex & HyperSync · Python/Node.js backend · PyTorch/Scikit-learn models · ClickHouse/Postgres storage · React dashboard (Recharts/D3) · Slack/PagerDuty alerts.

---

## Hackathon Roadmap
| Day | Deliverable |
|-----|--------------|
| 1 | HyperSync setup & basic schema |
| 2 | Materialized views & monitoring dashboard |
| 3 | Copy-detection prototype, alert automation & final demo |

---

## Team Roles
- Backend Engineer – ingestion & sync setup  
- Data Engineer – schema design & queries  
- ML Engineer – similarity & drift detection models  
- Frontend Engineer – dApp UI/dashboard  
- Ops Lead – mitigation flow integration

---

**End of Document**  
*Envio × Encode London – Hackathon Submission*  
