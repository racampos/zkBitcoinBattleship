// PSBT Serialization Helper
// Converts PSBT objects to base64/hex strings for Xverse wallet

export function serializePSBT(psbt: any): string {
  console.log("🔧 Attempting to serialize PSBT...");
  console.log("  Type:", typeof psbt);
  console.log("  Constructor:", psbt?.constructor?.name);
  
  // Get available methods
  try {
    const proto = Object.getPrototypeOf(psbt);
    const methods = Object.getOwnPropertyNames(proto);
    console.log("  Available methods:", methods);
  } catch (e) {
    console.log("  Could not get methods:", e);
  }

  // Try different serialization methods
  if (typeof psbt === 'string') {
    console.log("✅ PSBT is already a string");
    return psbt;
  }
  
  if (typeof psbt.toBase64 === 'function') {
    console.log("✅ Using toBase64()");
    return psbt.toBase64();
  }
  
  if (typeof psbt.toHex === 'function') {
    console.log("✅ Using toHex()");
    return psbt.toHex();
  }
  
  if (typeof psbt.__toBuffer === 'function') {
    console.log("✅ Using __toBuffer()");
    const buffer = psbt.__toBuffer();
    return buffer.toString('base64');
  }
  
  if (typeof psbt.toPSBT === 'function') {
    console.log("✅ Using toPSBT()");
    const psbtObj = psbt.toPSBT();
    return serializePSBT(psbtObj); // Recursive call
  }

  // Try accessing __CACHE property (bitcoinjs-lib internal)
  if (psbt.__CACHE && psbt.__CACHE.__TX) {
    console.log("✅ Using __CACHE.__TX");
    const tx = psbt.__CACHE.__TX;
    if (typeof tx.toBuffer === 'function') {
      return tx.toBuffer().toString('base64');
    }
  }

  // Log available properties for debugging
  console.error("❌ No known serialization method found");
  console.error("  Available keys:", Object.keys(psbt));
  console.error("  Prototype:", Object.getPrototypeOf(psbt));
  
  throw new Error(
    `PSBT serialization failed. Constructor: ${psbt?.constructor?.name || 'unknown'}. ` +
    `Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(psbt)).join(', ')}`
  );
}

