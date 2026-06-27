import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40',
  secondary:
    'glass text-slate-700 hover:bg-white/60',
  ghost:
    'text-slate-600 hover:bg-white/40',
};

/**
 * A pill button with the liquid-glass sheen sweep. Handles a `loading` state
 * with an inline spinner and disables interaction while busy.
 */
export function GlassButton({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`glass-sheen relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
        transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60
        ${variants[variant]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
