import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-accent text-accent-fg hover:brightness-110',
    secondary: 'bg-surface-2 text-fg border border-line hover:bg-surface-hover',
    ghost: 'text-fg-muted hover:text-fg hover:bg-surface-hover',
    danger: 'bg-negative-soft text-negative hover:brightness-110',
};

const SIZES: Record<Size, string> = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-2',
};

export const Button: React.FC<Props> = ({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, ...rest }) => (
    <button
        {...rest}
        disabled={disabled || loading}
        className={cn(
            'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            VARIANTS[variant],
            SIZES[size],
            className,
        )}
    >
        {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
        {children}
    </button>
);
