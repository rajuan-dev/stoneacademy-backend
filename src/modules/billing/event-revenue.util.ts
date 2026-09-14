export type EventRevenueSplit = {
  grossAmountMinor: number;
  platformFeeAmountMinor: number;
  creatorShareAmountMinor: number;
  platformFeePercent: number;
};

const DEFAULT_PLATFORM_FEE_PERCENT = 10;

export function amountMajorToMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

export function amountMinorToMajor(amountMinor: number): number {
  return Number((amountMinor / 100).toFixed(2));
}

export function calculateEventRevenueSplit(
  grossAmountMinor: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
): EventRevenueSplit {
  const safeGross = Math.max(0, Math.trunc(grossAmountMinor));
  const safePercent = Math.min(100, Math.max(0, platformFeePercent));
  const platformFeeAmountMinor = Math.round((safeGross * safePercent) / 100);
  const creatorShareAmountMinor = safeGross - platformFeeAmountMinor;

  return {
    grossAmountMinor: safeGross,
    platformFeeAmountMinor,
    creatorShareAmountMinor,
    platformFeePercent: safePercent,
  };
}
