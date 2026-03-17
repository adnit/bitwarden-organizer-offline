import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-transparent bg-primary/20 text-primary',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive/20 text-red-400',
  outline: 'border-border text-foreground',
  success: 'border-transparent bg-green-500/20 text-green-400',
  warning: 'border-transparent bg-amber-500/20 text-amber-400',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
