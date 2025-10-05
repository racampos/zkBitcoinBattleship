// Bitcoin utility functions

/**
 * Convert satoshis to BTC
 */
export function satsToBTC(sats: bigint): number {
  return Number(sats) / 1e8;
}

/**
 * Convert BTC to satoshis
 */
export function btcToSats(btc: number): bigint {
  return BigInt(Math.floor(btc * 1e8));
}

/**
 * Format satoshis for display
 */
export function formatSats(sats: bigint, showUnit = true): string {
  const formatted = sats.toLocaleString();
  return showUnit ? `${formatted} sats` : formatted;
}

/**
 * Format BTC for display
 */
export function formatBTC(sats: bigint, decimals = 8): string {
  const btc = satsToBTC(sats);
  return `${btc.toFixed(decimals)} BTC`;
}

/**
 * Parse satoshis from string input
 */
export function parseSats(input: string): bigint | null {
  try {
    const cleaned = input.replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

/**
 * Validate Bitcoin address (basic check)
 */
export function isValidBitcoinAddress(
  address: string,
  network: "mainnet" | "testnet" = "testnet"
): boolean {
  if (!address || typeof address !== "string") return false;

  if (network === "testnet") {
    // Testnet addresses start with m, n, or tb1
    return /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
           /^tb1[a-z0-9]{39,59}$/.test(address);
  } else {
    // Mainnet addresses start with 1, 3, or bc1
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
           /^bc1[a-z0-9]{39,59}$/.test(address);
  }
}

/**
 * Truncate Bitcoin address for display
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Estimate USD value of satoshis
 */
export function estimateUSD(sats: bigint, btcPrice: number): number {
  const btc = satsToBTC(sats);
  return btc * btcPrice;
}

/**
 * Format USD value
 */
export function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

