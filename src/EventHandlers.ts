/*
 * Event Handlers for Copy Trading Detection and Monitoring System
 *
 * This file contains the core logic for processing Uniswap V3 Swap events
 * Migrated from the original Python-based CopyTrader project
 *
 * Key Features:
 * - Real-time swap event processing for ETH/USDC pools
 * - Trade direction detection (buy/sell from wallet perspective)
 * - Daily summaries and wallet activity tracking
 * - Copy trading pattern detection
 */

import {
  UniswapV3Pool_005,
  UniswapV3Pool_030,
  UniswapV3Pool_100,
  Trade,
  DailySummary,
  WalletActivity,
  MonitoredWallet,
  PoolStats,
  TradeType,
} from "generated";

// Token addresses (lowercase for comparison)
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const USDC_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

// Monitored wallets from config (lowercase)
const MONITORED_WALLETS = new Map<string, string>([
  ["0x66a9893c904a664803c4fcbfa47e75f5d30e7dab", "HFT_Trader_1"],
  ["0xfbd4cdb40e862397a2f89a854e0e7e8f7e794c37", "Active_Trader_2"],
  ["0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", "Active_Trader_3"],
  ["0x51c72848c68a965f66fa7a88855f9f7784502a7f", "Frequent_Swapper"],
  ["0xa69babef1ca67a37ffaf7a485dfff3382056e78c", "Regular_Trader"],
]);

// Pool metadata
interface PoolMetadata {
  name: string;
  fee: string;
  feeTier: number;
  token0IsWETH: boolean;
}

const POOL_METADATA = new Map<string, PoolMetadata>([
  [
    "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    {
      name: "ETH-USDC-0.05",
      fee: "0.05%",
      feeTier: 500,
      token0IsWETH: false, // USDC is token0
    },
  ],
  [
    "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    {
      name: "ETH-USDC-0.3",
      fee: "0.3%",
      feeTier: 3000,
      token0IsWETH: true, // WETH is token0
    },
  ],
  [
    "0x7bea39867e4169dbe237d55c8242a8f2fcdcc387",
    {
      name: "ETH-USDC-1.0",
      fee: "1%",
      feeTier: 10000,
      token0IsWETH: false, // USDC is token0
    },
  ],
]);

/**
 * Helper function to determine if a wallet is monitored
 */
function getWalletName(address: string): string | undefined {
  return MONITORED_WALLETS.get(address.toLowerCase());
}

/**
 * Helper function to determine trade direction from wallet perspective
 *
 * Logic (from original Python code):
 * - BUY: Wallet receives ETH (gives USDC)
 * - SELL: Wallet receives USDC (gives ETH)
 *
 * In Uniswap V3:
 * - Positive amount = token flows out of pool (recipient receives)
 * - Negative amount = token flows into pool (sender gives)
 */
function determineTradeDirection(
  sender: string,
  recipient: string,
  walletAddress: string,
  amount0: bigint,
  amount1: bigint,
  token0IsWETH: boolean
): TradeType | null {
  const wallet = walletAddress.toLowerCase();
  const isSender = sender.toLowerCase() === wallet;
  const isRecipient = recipient.toLowerCase() === wallet;

  if (!isSender && !isRecipient) {
    return null;
  }

  // Determine which amount is ETH and which is USDC
  const ethAmount = token0IsWETH ? amount0 : amount1;
  const usdcAmount = token0IsWETH ? amount1 : amount0;

  if (isRecipient) {
    // Wallet is recipient
    if (ethAmount > 0n) {
      // Wallet receives ETH -> BUY
      return TradeType.BUY;
    } else if (usdcAmount > 0n) {
      // Wallet receives USDC -> SELL
      return TradeType.SELL;
    }
  }

  if (isSender) {
    // Wallet is sender
    if (ethAmount < 0n) {
      // Wallet sends ETH -> SELL
      return TradeType.SELL;
    } else if (usdcAmount < 0n) {
      // Wallet sends USDC -> BUY
      return TradeType.BUY;
    }
  }

  return null;
}

/**
 * Convert token amount to decimal representation
 * ETH has 18 decimals, USDC has 6 decimals
 */
function toDecimal(amount: bigint, decimals: number): number {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  return Number(wholePart) + Number(fractionalPart) / Number(divisor);
}

/**
 * Calculate price (USDC per ETH)
 */
function calculatePrice(ethAmount: number, usdcAmount: number): number {
  if (ethAmount === 0) return 0;
  return usdcAmount / ethAmount;
}

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().split("T")[0];
}

/**
 * Process Swap event from Uniswap V3 pools
 * This handler is called for all three pool contracts
 */
async function processSwapEvent(
  event: any,
  context: any,
  poolAddress: string
) {
  const { sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick } =
    event.params;
  const { transaction, block, logIndex } = event;

  // Get pool metadata
  const poolMeta = POOL_METADATA.get(poolAddress.toLowerCase());
  if (!poolMeta) {
    context.log.warn(`Unknown pool address: ${poolAddress}`);
    return;
  }

  // Check if sender or recipient is a monitored wallet
  const senderName = getWalletName(sender);
  const recipientName = getWalletName(recipient);

  // Process for sender if monitored
  if (senderName) {
    await processTradeForWallet(
      event,
      context,
      sender,
      senderName,
      poolAddress,
      poolMeta,
      true
    );
  }

  // Process for recipient if monitored
  if (recipientName) {
    await processTradeForWallet(
      event,
      context,
      recipient,
      recipientName,
      poolAddress,
      poolMeta,
      false
    );
  }
}

/**
 * Process trade for a specific monitored wallet
 */
async function processTradeForWallet(
  event: any,
  context: any,
  walletAddress: string,
  walletName: string,
  poolAddress: string,
  poolMeta: PoolMetadata,
  isSender: boolean
) {
  const { sender, recipient, amount0, amount1 } = event.params;
  const { transaction, block, logIndex } = event;

  // Determine trade direction
  const tradeType = determineTradeDirection(
    sender,
    recipient,
    walletAddress,
    amount0,
    amount1,
    poolMeta.token0IsWETH
  );

  if (!tradeType) {
    context.log.warn(
      `Could not determine trade direction for wallet ${walletName}`
    );
    return;
  }

  // Calculate amounts
  const ethAmountRaw = poolMeta.token0IsWETH ? amount0 : amount1;
  const usdcAmountRaw = poolMeta.token0IsWETH ? amount1 : amount0;

  // Convert to decimal (absolute values)
  const ethAmount = Math.abs(toDecimal(ethAmountRaw, 18));
  const usdcAmount = Math.abs(toDecimal(usdcAmountRaw, 6));

  // Calculate price
  const price = calculatePrice(ethAmount, usdcAmount);

  // Create trade entity
  const tradeId = `${transaction.hash}-${logIndex}`;
  const dateStr = getDateString(BigInt(block.timestamp));

  const trade: Trade = {
    id: tradeId,
    transactionHash: transaction.hash,
    timestamp: BigInt(block.timestamp),
    blockNumber: BigInt(block.number),
    logIndex: logIndex,
    chain: "ethereum-mainnet",
    protocol: "uniswap_v3",
    poolAddress: poolAddress.toLowerCase(),
    poolFee: poolMeta.fee,
    walletAddress: walletAddress.toLowerCase(),
    walletName: walletName,
    tradeType: tradeType,
    ethAmount: ethAmount,
    usdcAmount: usdcAmount,
    price: price,
    sender: sender.toLowerCase(),
    recipient: recipient.toLowerCase(),
    amount0: toDecimal(amount0, poolMeta.token0IsWETH ? 18 : 6),
    amount1: toDecimal(amount1, poolMeta.token0IsWETH ? 6 : 18),
    slippage: 0, // TODO: Calculate slippage
  };

  // Save trade
  context.Trade.set(trade);

  context.log.info(
    `Processed ${tradeType} for ${walletName}: ${ethAmount.toFixed(
      4
    )} ETH @ $${price.toFixed(2)}`
  );

  // Update daily summary
  await updateDailySummary(context, dateStr, trade);

  // Update wallet activity
  await updateWalletActivity(context, walletAddress, walletName, dateStr, trade);

  // Update monitored wallet stats
  await updateMonitoredWallet(context, walletAddress, walletName, trade);
}

/**
 * Update daily summary with new trade
 */
async function updateDailySummary(
  context: any,
  dateStr: string,
  trade: Trade
) {
  const summaryId = `${dateStr}-ethereum-mainnet`;

  let summary = await context.DailySummary.get(summaryId);

  if (!summary) {
    // Create new summary
    summary = {
      id: summaryId,
      date: dateStr,
      chain: "ethereum-mainnet",
      totalTransactions: 0,
      totalVolumeEth: 0,
      totalVolumeUsdc: 0,
      uniqueWallets: 0,
      uniquePools: 0,
      buyCount: 0,
      sellCount: 0,
      totalBuyEth: 0,
      totalSellEth: 0,
      totalBuyUsdc: 0,
      totalSellUsdc: 0,
      avgBuyPrice: 0,
      avgSellPrice: 0,
      minPrice: trade.price,
      maxPrice: trade.price,
      lastUpdated: trade.timestamp,
    };
  }

  // Update summary
  summary.totalTransactions += 1;
  summary.totalVolumeEth += trade.ethAmount;
  summary.totalVolumeUsdc += trade.usdcAmount;
  summary.lastUpdated = trade.timestamp;

  if (trade.tradeType === TradeType.BUY) {
    summary.buyCount += 1;
    summary.totalBuyEth += trade.ethAmount;
    summary.totalBuyUsdc += trade.usdcAmount;
    summary.avgBuyPrice =
      summary.totalBuyEth > 0
        ? summary.totalBuyUsdc / summary.totalBuyEth
        : 0;
  } else {
    summary.sellCount += 1;
    summary.totalSellEth += trade.ethAmount;
    summary.totalSellUsdc += trade.usdcAmount;
    summary.avgSellPrice =
      summary.totalSellEth > 0
        ? summary.totalSellUsdc / summary.totalSellEth
        : 0;
  }

  summary.minPrice = Math.min(summary.minPrice, trade.price);
  summary.maxPrice = Math.max(summary.maxPrice, trade.price);

  context.DailySummary.set(summary);
}

/**
 * Update wallet activity with new trade
 */
async function updateWalletActivity(
  context: any,
  walletAddress: string,
  walletName: string,
  dateStr: string,
  trade: Trade
) {
  const activityId = `${walletAddress.toLowerCase()}-${dateStr}`;

  let activity = await context.WalletActivity.get(activityId);

  if (!activity) {
    // Create new activity
    activity = {
      id: activityId,
      walletAddress: walletAddress.toLowerCase(),
      walletName: walletName,
      date: dateStr,
      chain: "ethereum-mainnet",
      transactionCount: 0,
      buyCount: 0,
      sellCount: 0,
      totalBuyEth: 0,
      totalSellEth: 0,
      totalBuyUsdc: 0,
      totalSellUsdc: 0,
      netEthPosition: 0,
      netUsdcPosition: 0,
      avgBuyPrice: 0,
      avgSellPrice: 0,
      realizedPnl: 0,
      lastUpdated: trade.timestamp,
    };
  }

  // Update activity
  activity.transactionCount += 1;
  activity.lastUpdated = trade.timestamp;

  if (trade.tradeType === TradeType.BUY) {
    activity.buyCount += 1;
    activity.totalBuyEth += trade.ethAmount;
    activity.totalBuyUsdc += trade.usdcAmount;
    activity.avgBuyPrice =
      activity.totalBuyEth > 0
        ? activity.totalBuyUsdc / activity.totalBuyEth
        : 0;
  } else {
    activity.sellCount += 1;
    activity.totalSellEth += trade.ethAmount;
    activity.totalSellUsdc += trade.usdcAmount;
    activity.avgSellPrice =
      activity.totalSellEth > 0
        ? activity.totalSellUsdc / activity.totalSellEth
        : 0;
  }

  // Calculate net positions
  activity.netEthPosition = activity.totalBuyEth - activity.totalSellEth;
  activity.netUsdcPosition = activity.totalSellUsdc - activity.totalBuyUsdc;

  context.WalletActivity.set(activity);
}

/**
 * Update monitored wallet statistics
 */
async function updateMonitoredWallet(
  context: any,
  walletAddress: string,
  walletName: string,
  trade: Trade
) {
  const walletId = walletAddress.toLowerCase();

  let wallet = await context.MonitoredWallet.get(walletId);

  if (!wallet) {
    // Create new monitored wallet
    wallet = {
      id: walletId,
      walletAddress: walletAddress.toLowerCase(),
      walletName: walletName,
      isActive: true,
      addedAt: trade.timestamp,
      totalTrades: 0,
      firstTradeAt: trade.timestamp,
      lastTradeAt: trade.timestamp,
      chain: "ethereum-mainnet",
    };
  }

  // Update wallet
  wallet.totalTrades += 1;
  wallet.lastTradeAt = trade.timestamp;

  if (!wallet.firstTradeAt || trade.timestamp < wallet.firstTradeAt) {
    wallet.firstTradeAt = trade.timestamp;
  }

  context.MonitoredWallet.set(wallet);
}

/**
 * Event handler for UniswapV3Pool_005 (0.05% fee)
 */
UniswapV3Pool_005.Swap.handler(async ({ event, context }) => {
  await processSwapEvent(
    event,
    context,
    "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
  );
});

/**
 * Event handler for UniswapV3Pool_030 (0.3% fee)
 */
UniswapV3Pool_030.Swap.handler(async ({ event, context }) => {
  await processSwapEvent(
    event,
    context,
    "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
  );
});

/**
 * Event handler for UniswapV3Pool_100 (1% fee)
 */
UniswapV3Pool_100.Swap.handler(async ({ event, context }) => {
  await processSwapEvent(
    event,
    context,
    "0x7bea39867e4169dbe237d55c8242a8f2fcdcc387"
  );
});
