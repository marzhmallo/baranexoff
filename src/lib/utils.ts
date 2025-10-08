
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency symbol, defaults to ₱
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, currency: string = "₱") {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency}${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
