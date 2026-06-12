import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_ASSETS } from '@/lib/branding';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  subtitle?: string;
  className?: string;
  imageClassName?: string;
}

const sizeClasses = {
  sm: 'w-32 md:w-36',
  md: 'w-40 md:w-44',
  lg: 'w-56 md:w-72',
};

export function BrandLogo({
  size = 'md',
  align = 'left',
  subtitle,
  className,
  imageClassName,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <img
        src={BRAND_ASSETS.logo}
        alt="Claw Protect"
        className={cn('h-auto object-contain drop-shadow-[0_16px_40px_rgba(87,95,255,0.18)]', sizeClasses[size], imageClassName)}
      />
      {subtitle ? (
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
