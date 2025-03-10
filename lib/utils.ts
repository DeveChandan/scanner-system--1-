import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num === undefined || num === null) return "0"
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

