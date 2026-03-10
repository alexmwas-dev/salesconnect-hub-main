import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-success-muted text-success',
        warning: 'bg-warning-muted text-warning',
        destructive: 'bg-destructive-muted text-destructive',
        info: 'bg-info-muted text-info',
        brand: 'bg-brand/10 text-brand',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

export function StatusBadge({ children, variant, className, dot = false, pulse = false }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'destructive' && 'bg-destructive',
            variant === 'info' && 'bg-info',
            variant === 'brand' && 'bg-brand',
            variant === 'default' && 'bg-muted-foreground',
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
}
