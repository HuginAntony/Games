'use client';

import { ButtonHTMLAttributes } from 'react';
import styles from './NeonButton.module.css';

type Variant = 'cyan' | 'pink' | 'ghost';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function NeonButton({
  variant = 'cyan',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: NeonButtonProps) {
  const cls = [
    styles.btn,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
