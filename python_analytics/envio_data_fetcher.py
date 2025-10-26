"""
Envio Data Fetcher and Analytics Integration

This module demonstrates how to use the original CopyTrader Python classes
with data indexed by Envio HyperIndex. It queries the Envio GraphQL API
and processes the data using the existing business logic.

Key Features:
- GraphQL queries to Envio HyperIndex
- Integration with original CopyTrader classes
- Copy trading pattern detection
- Performance benchmarking
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
import requests
from decimal import Decimal

# Add original CopyTrader src to path
ORIGINAL_PROJECT_PATH = Path("/home/lukacsk/Development/CopyTrader")
sys.path.insert(0, str(ORIGINAL_PROJECT_PATH / "src"))

# Import original CopyTrader classes
try:
    from storage import StorageHandler
    from transaction_processor import ProcessedTransaction, TransactionProcessor
    from logger import get_logger
except ImportError as e:
    print(f"Error importing original CopyTrader classes: {e}")
    print(f"Make sure the original project exists at: {ORIGINAL_PROJECT_PATH}")
    sys.exit(1)


logger = get_logger(__name__)


class EnvioDataFetcher:
    """
    Fetch data from Envio HyperIndex GraphQL API
    """

    def __init__(self, graphql_endpoint: str):
        """
        Initialize fetcher with Envio GraphQL endpoint

        Args:
            graphql_endpoint: URL to Envio HyperIndex GraphQL endpoint
        """
        self.endpoint = graphql_endpoint
        logger.info(f"Initialized Envio data fetcher: {graphql_endpoint}")

    def query_trades(
        self,
        wallet_address: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Query trades from Envio HyperIndex

        Args:
            wallet_address: Filter by wallet address (optional)
            start_date: Start date (YYYY-MM-DD) (optional)
            end_date: End date (YYYY-MM-DD) (optional)
            limit: Maximum number of trades to return

        Returns:
            List of trade dictionaries
        """
        query = """
        query GetTrades($walletAddress: String, $limit: Int!) {
          trades(
            where: {
              walletAddress: { _eq: $walletAddress }
            }
            limit: $limit
            orderBy: { timestamp: desc }
          ) {
            id
            transactionHash
            timestamp
            blockNumber
            walletAddress
            walletName
            tradeType
            ethAmount
            usdcAmount
            price
            protocol
            poolAddress
            poolFee
          }
        }
        """

        variables = {
            "walletAddress": wallet_address.lower() if wallet_address else None,
            "limit": limit
        }

        try:
            response = requests.post(
                self.endpoint,
                json={"query": query, "variables": variables},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                logger.error(f"GraphQL errors: {data['errors']}")
                return []

            trades = data.get("data", {}).get("trades", [])
            logger.info(f"Fetched {len(trades)} trades from Envio")
            return trades

        except Exception as e:
            logger.error(f"Error querying Envio: {e}")
            return []

    def query_wallet_activity(
        self,
        wallet_address: str,
        date_str: str
    ) -> Optional[Dict[str, Any]]:
        """
        Query wallet activity for a specific date

        Args:
            wallet_address: Wallet address
            date_str: Date in YYYY-MM-DD format

        Returns:
            Wallet activity dictionary or None
        """
        query = """
        query GetWalletActivity($id: ID!) {
          walletActivity(id: $id) {
            id
            walletAddress
            walletName
            date
            transactionCount
            buyCount
            sellCount
            totalBuyEth
            totalSellEth
            totalBuyUsdc
            totalSellUsdc
            netEthPosition
            netUsdcPosition
            avgBuyPrice
            avgSellPrice
          }
        }
        """

        activity_id = f"{wallet_address.lower()}-{date_str}"

        try:
            response = requests.post(
                self.endpoint,
                json={"query": query, "variables": {"id": activity_id}},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                logger.error(f"GraphQL errors: {data['errors']}")
                return None

            return data.get("data", {}).get("walletActivity")

        except Exception as e:
            logger.error(f"Error querying wallet activity: {e}")
            return None

    def query_daily_summary(self, date_str: str) -> Optional[Dict[str, Any]]:
        """
        Query daily summary for a specific date

        Args:
            date_str: Date in YYYY-MM-DD format

        Returns:
            Daily summary dictionary or None
        """
        query = """
        query GetDailySummary($id: ID!) {
          dailySummary(id: $id) {
            id
            date
            totalTransactions
            totalVolumeEth
            totalVolumeUsdc
            uniqueWallets
            buyCount
            sellCount
            avgBuyPrice
            avgSellPrice
            minPrice
            maxPrice
          }
        }
        """

        summary_id = f"{date_str}-ethereum-mainnet"

        try:
            response = requests.post(
                self.endpoint,
                json={"query": query, "variables": {"id": summary_id}},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                logger.error(f"GraphQL errors: {data['errors']}")
                return None

            return data.get("data", {}).get("dailySummary")

        except Exception as e:
            logger.error(f"Error querying daily summary: {e}")
            return None


class EnvioAnalytics:
    """
    Analytics engine that combines Envio data with original CopyTrader logic
    """

    def __init__(self, envio_endpoint: str, output_dir: str = "./data"):
        """
        Initialize analytics engine

        Args:
            envio_endpoint: Envio GraphQL endpoint
            output_dir: Output directory for results
        """
        self.fetcher = EnvioDataFetcher(envio_endpoint)
        self.storage = StorageHandler(Path(output_dir), dry_run=False)
        self.processor = TransactionProcessor()
        logger.info("Envio analytics engine initialized")

    def convert_envio_trade_to_processed_tx(
        self,
        envio_trade: Dict[str, Any]
    ) -> ProcessedTransaction:
        """
        Convert Envio trade format to original ProcessedTransaction format

        Args:
            envio_trade: Trade data from Envio

        Returns:
            ProcessedTransaction object
        """
        return ProcessedTransaction(
            transaction_hash=envio_trade["transactionHash"],
            timestamp=datetime.fromtimestamp(int(envio_trade["timestamp"])),
            block_number=int(envio_trade["blockNumber"]),
            wallet_name=envio_trade.get("walletName", "Unknown"),
            wallet_address=envio_trade["walletAddress"],
            type=envio_trade["tradeType"].lower(),
            eth_amount=Decimal(str(envio_trade["ethAmount"])),
            usdc_amount=Decimal(str(envio_trade["usdcAmount"])),
            price=Decimal(str(envio_trade["price"])),
            protocol=envio_trade.get("protocol", "uniswap_v3"),
            pool_address=envio_trade["poolAddress"],
            pool_fee=envio_trade.get("poolFee", "unknown")
        )

    def analyze_wallet_performance(
        self,
        wallet_address: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Analyze wallet trading performance using Envio data

        Args:
            wallet_address: Wallet address to analyze
            days: Number of days to analyze

        Returns:
            Performance metrics dictionary
        """
        logger.info(f"Analyzing performance for {wallet_address} (last {days} days)")

        # Fetch trades from Envio
        envio_trades = self.fetcher.query_trades(
            wallet_address=wallet_address,
            limit=days * 100  # Assume max 100 trades per day
        )

        # Convert to ProcessedTransaction format
        transactions = [
            self.convert_envio_trade_to_processed_tx(t)
            for t in envio_trades
        ]

        # Filter by date range
        cutoff_date = datetime.now() - timedelta(days=days)
        transactions = [
            t for t in transactions
            if t.timestamp >= cutoff_date
        ]

        # Use original TransactionProcessor to calculate summary
        summary = self.processor.calculate_summary(transactions)

        logger.info(f"Performance analysis complete: {summary['transaction_count']} transactions")
        return summary

    def detect_copy_trading_patterns(
        self,
        reference_wallet: str,
        suspect_wallet: str,
        days: int = 7,
        time_threshold_seconds: int = 300
    ) -> List[Dict[str, Any]]:
        """
        Detect copy trading patterns between two wallets

        Args:
            reference_wallet: Reference wallet address
            suspect_wallet: Suspect wallet address
            days: Number of days to analyze
            time_threshold_seconds: Time threshold for pattern matching

        Returns:
            List of detected patterns
        """
        logger.info(
            f"Detecting copy trading patterns: "
            f"{reference_wallet[:10]}... vs {suspect_wallet[:10]}..."
        )

        # Fetch trades for both wallets
        ref_trades = self.fetcher.query_trades(wallet_address=reference_wallet)
        sus_trades = self.fetcher.query_trades(wallet_address=suspect_wallet)

        # Convert to ProcessedTransaction
        ref_txs = [self.convert_envio_trade_to_processed_tx(t) for t in ref_trades]
        sus_txs = [self.convert_envio_trade_to_processed_tx(t) for t in sus_trades]

        # Simple pattern matching algorithm
        patterns = []

        for ref_tx in ref_txs:
            for sus_tx in sus_txs:
                # Check if trades are similar
                time_diff = abs(
                    (sus_tx.timestamp - ref_tx.timestamp).total_seconds()
                )

                if time_diff <= time_threshold_seconds:
                    # Check if trade types match
                    if ref_tx.type == sus_tx.type:
                        # Calculate similarity score
                        eth_diff_pct = abs(
                            float(sus_tx.eth_amount - ref_tx.eth_amount) /
                            float(ref_tx.eth_amount)
                        ) if ref_tx.eth_amount > 0 else 0

                        patterns.append({
                            "reference_tx": ref_tx.transaction_hash,
                            "suspect_tx": sus_tx.transaction_hash,
                            "time_diff_seconds": time_diff,
                            "trade_type": ref_tx.type,
                            "similarity_score": 1.0 - min(eth_diff_pct, 1.0),
                            "reference_eth": float(ref_tx.eth_amount),
                            "suspect_eth": float(sus_tx.eth_amount),
                        })

        logger.info(f"Detected {len(patterns)} potential copy trading patterns")
        return patterns

    def export_to_original_format(
        self,
        wallet_address: str,
        target_date: date
    ) -> None:
        """
        Export Envio data to original CopyTrader JSON format

        Args:
            wallet_address: Wallet address
            target_date: Target date
        """
        logger.info(f"Exporting data for {wallet_address} on {target_date}")

        # Fetch trades
        envio_trades = self.fetcher.query_trades(wallet_address=wallet_address)

        # Convert and filter
        transactions = [
            self.convert_envio_trade_to_processed_tx(t)
            for t in envio_trades
            if datetime.fromtimestamp(int(t["timestamp"])).date() == target_date
        ]

        # Use original storage handler to save
        summary = self.processor.calculate_summary(transactions)

        wallet_name = transactions[0].wallet_name if transactions else "Unknown"

        self.storage.save_wallet_summary(
            wallet_name=wallet_name,
            wallet_address=wallet_address,
            target_date=target_date,
            transactions=transactions,
            summary=summary
        )

        logger.info(f"Exported {len(transactions)} transactions to original format")


def main():
    """
    Example usage demonstrating integration with original CopyTrader classes
    """
    # Configuration
    ENVIO_GRAPHQL_ENDPOINT = os.getenv(
        "ENVIO_GRAPHQL_ENDPOINT",
        "http://localhost:8080/v1/graphql"  # Default local Hasura endpoint
    )

    # Initialize analytics
    analytics = EnvioAnalytics(
        envio_endpoint=ENVIO_GRAPHQL_ENDPOINT,
        output_dir="./data"
    )

    # Example 1: Analyze wallet performance
    wallet = "0x66a9893c904a664803c4fcbfa47e75f5d30e7dab"
    performance = analytics.analyze_wallet_performance(wallet, days=7)
    print("\n=== Wallet Performance ===")
    print(f"Transactions: {performance['transaction_count']}")
    print(f"Total Buy ETH: {performance['total_buy_eth']:.4f}")
    print(f"Total Sell ETH: {performance['total_sell_eth']:.4f}")
    print(f"Avg Buy Price: ${performance['avg_buy_price']:.2f}")
    print(f"Avg Sell Price: ${performance['avg_sell_price']:.2f}")

    # Example 2: Detect copy trading patterns
    ref_wallet = "0x66a9893c904a664803c4fcbfa47e75f5d30e7dab"
    sus_wallet = "0xfbd4cdb40e862397a2f89a854e0e7e8f7e794c37"
    patterns = analytics.detect_copy_trading_patterns(ref_wallet, sus_wallet)

    print(f"\n=== Copy Trading Detection ===")
    print(f"Found {len(patterns)} potential patterns")
    for i, pattern in enumerate(patterns[:5]):  # Show top 5
        print(f"\nPattern {i+1}:")
        print(f"  Time diff: {pattern['time_diff_seconds']}s")
        print(f"  Similarity: {pattern['similarity_score']:.2%}")
        print(f"  Trade type: {pattern['trade_type']}")

    # Example 3: Export to original format
    target_date = date.today() - timedelta(days=1)
    analytics.export_to_original_format(wallet, target_date)
    print(f"\n=== Data Export ===")
    print(f"Exported data for {wallet} on {target_date}")


if __name__ == "__main__":
    main()
