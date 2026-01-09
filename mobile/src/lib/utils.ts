export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const COLORS = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  background: '#ffffff',
  backgroundDark: '#0a0a0a',
  card: '#f4f4f5',
  cardDark: '#1c1c1e',
  text: '#0a0a0a',
  textDark: '#fafafa',
  textMuted: '#71717a',
  textMutedDark: '#a1a1aa',
  border: '#e4e4e7',
  borderDark: '#27272a',
  danger: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
  // Gradient colors for headers
  gradientStart: '#16a34a',    // Green - light theme start
  gradientEnd: '#22c55e',       // Lighter green - light theme end
  gradientStartDark: '#15803d', // Dark green - dark theme start
  gradientEndDark: '#16a34a',   // Medium green - dark theme end
};

export function getThemedColors(theme: 'light' | 'dark') {
  return {
    primary: COLORS.primary,
    primaryDark: COLORS.primaryDark,
    background: theme === 'dark' ? COLORS.backgroundDark : COLORS.background,
    card: theme === 'dark' ? COLORS.cardDark : COLORS.card,
    text: theme === 'dark' ? COLORS.textDark : COLORS.text,
    textMuted: theme === 'dark' ? COLORS.textMutedDark : COLORS.textMuted,
    border: theme === 'dark' ? COLORS.borderDark : COLORS.border,
    danger: COLORS.danger,
    warning: COLORS.warning,
    success: COLORS.success,
    gradientStart: theme === 'dark' ? COLORS.gradientStartDark : COLORS.gradientStart,
    gradientEnd: theme === 'dark' ? COLORS.gradientEndDark : COLORS.gradientEnd,
  };
}
