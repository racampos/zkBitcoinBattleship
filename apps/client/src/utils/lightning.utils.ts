// Lightning Network utility functions

/**
 * Validate Lightning invoice (BOLT11)
 */
export function isValidLightningInvoice(invoice: string): boolean {
  if (!invoice || typeof invoice !== "string") return false;
  
  // BOLT11 invoices start with ln + network prefix
  // Mainnet: lnbc, Testnet: lnbcrt or lntb
  return /^ln(bc|bcrt|tb)[a-zA-Z0-9]+$/.test(invoice);
}

/**
 * Parse Lightning invoice amount (basic)
 */
export function parseLightningAmount(invoice: string): bigint | null {
  try {
    // Basic BOLT11 parsing - amount is encoded after "ln" prefix
    // This is a simplified version, full parsing would need a library
    const match = invoice.match(/ln[a-z]{2,4}(\d+)[munp]/);
    if (!match) return null;

    const amount = parseInt(match[1], 10);
    const unit = invoice.charAt(match.index! + match[0].length - 1);

    // Convert to millisatoshis then to satoshis
    let millisats = 0n;
    switch (unit) {
      case "m": // milli-bitcoin (0.001 BTC)
        millisats = BigInt(amount) * 100000000000n;
        break;
      case "u": // micro-bitcoin (0.000001 BTC)
        millisats = BigInt(amount) * 100000000n;
        break;
      case "n": // nano-bitcoin (0.000000001 BTC)
        millisats = BigInt(amount) * 100000n;
        break;
      case "p": // pico-bitcoin (0.000000000001 BTC)
        millisats = BigInt(amount) * 100n;
        break;
      default:
        return null;
    }

    // Convert millisats to sats
    return millisats / 1000n;
  } catch {
    return null;
  }
}

/**
 * Truncate Lightning invoice for display
 */
export function truncateLightningInvoice(invoice: string, chars = 12): string {
  if (invoice.length <= chars * 2) return invoice;
  return `${invoice.slice(0, chars)}...${invoice.slice(-chars)}`;
}

/**
 * Generate Lightning QR data URL (for fallback)
 */
export function generateLightningQRDataURL(invoice: string): string {
  // Return uppercase for better QR scanning
  return `lightning:${invoice.toUpperCase()}`;
}

/**
 * Estimate Lightning fee (rough estimate)
 */
export function estimateLightningFee(amountSats: bigint): bigint {
  // Lightning fees are typically 0.5-2 sats + 0.01-0.1% of amount
  const baseFee = 1n;
  const proportionalFee = amountSats / 1000n; // 0.1%
  return baseFee + proportionalFee;
}

