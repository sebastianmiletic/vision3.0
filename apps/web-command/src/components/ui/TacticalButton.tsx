import clsx from 'clsx';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type TacticalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  size?: 'sm' | 'md';
  children: ReactNode;
};

export function TacticalButton({ active = false, size = 'md', children, className, ...props }: TacticalButtonProps) {
  return (
    <button className={clsx('tactical-button', `tactical-button-${size}`, active && 'active', className)} {...props}>
      {children}
    </button>
  );
}
