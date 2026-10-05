import React from 'react';
import { cn } from '../../lib/cn';

/** Símbolo do Escalada (manual de identidade, p. 12): quadrado arredondado com o triângulo de progresso. */
export const BrandSymbol: React.FC<{ size?: number; className?: string; inverted?: boolean }> = ({ size = 24, className, inverted }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
        <rect x="96" y="96" width="320" height="320" rx="72" fill={inverted ? '#000' : 'currentColor'} />
        <path d="M232 164 L380 164 L380 312 Z" fill={inverted ? '#fff' : 'var(--canvas)'} />
    </svg>
);

/** Lettering "ESCALADA" em Montserrat, com o Λ no lugar dos A como no logotipo. */
export const BrandWordmark: React.FC<{ className?: string }> = ({ className }) => (
    <span className={cn('font-brand font-bold tracking-[0.22em] leading-none', className)} aria-label="Escalada">
        ESCΛLΛDΛ
    </span>
);

export const BrandLogo: React.FC<{ size?: number; className?: string }> = ({ size = 22, className }) => (
    <span className={cn('inline-flex items-center gap-2 text-fg', className)}>
        <BrandSymbol size={size} />
        <BrandWordmark className="text-[15px]" />
    </span>
);
