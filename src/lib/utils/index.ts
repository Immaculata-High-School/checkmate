import { type ClassValue, clsx } from 'clsx';

// Simple class merger (no tailwind-merge dependency)
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Generate random alphanumeric code
export function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Format date for display
export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  });
}

// Format relative time
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Get grade letter from percentage
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

// Get grade color class
export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 80) return 'text-blue-600';
  if (percentage >= 70) return 'text-yellow-600';
  if (percentage >= 60) return 'text-orange-600';
  return 'text-red-600';
}

// Get grade background color class
export function getGradeBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-100';
  if (percentage >= 80) return 'bg-blue-100';
  if (percentage >= 70) return 'bg-yellow-100';
  if (percentage >= 60) return 'bg-orange-100';
  return 'bg-red-100';
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Class colors
export const CLASS_COLORS = [
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6'
];

// Class emojis
export const CLASS_EMOJIS = [
  '📚', '🎓', '✏️', '📖', '🧮', '🔬',
  '🎨', '🎭', '🎵', '⚡', '🌟', '🚀'
];

// Get initials from name
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
