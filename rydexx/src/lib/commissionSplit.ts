/**
 * Calculate the partner payout and admin commission for a given fare.
 *
 * Rules:
 *  - Partner receives 90% of the actual paid fare (post-discount).
 *  - Admin retains 10% of the actual paid fare.
 *
 * @param paidFare  The fare the rider actually paid (after any promo discount).
 * @returns { partnerAmount, adminCommission } — both rounded to 2 decimal places.
 */
export function applyCommissionSplit(paidFare: number): {
  partnerAmount: number;
  adminCommission: number;
} {
  const safe = Math.max(0, paidFare);
  const partnerAmount = Math.round(safe * 0.9 * 100) / 100;
  const adminCommission = Math.round(safe * 0.1 * 100) / 100;
  return { partnerAmount, adminCommission };
}
