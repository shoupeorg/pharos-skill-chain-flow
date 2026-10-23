export const DECIMALS = 18;

export function parseDecimal(value, decimals = DECIMALS) {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error("Amount must be a non-negative decimal string.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`Amount exceeds ${decimals} decimal places.`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
}

export function formatDecimal(raw, decimals = DECIMALS) {
  const value = BigInt(raw);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = (absolute % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export const ceilDiv = (a, b) => (a + b - 1n) / b;
export const isAddress = value => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);

