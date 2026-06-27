import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}

/**
 * A frosted "liquid glass" panel. `strong` uses a more opaque, higher-blur
 * variant for foreground surfaces like auth cards and modals.
 */
export function GlassCard({ children, className = '', strong = false }: GlassCardProps) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} rounded-3xl ${className}`}>
      {children}
    </div>
  );
}
