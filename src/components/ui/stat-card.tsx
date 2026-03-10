import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                'text-sm font-medium',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-brand/10 p-2.5">
            <Icon className="h-5 w-5 text-brand" />
          </div>
        )}
      </div>
    </div>
  );
}
