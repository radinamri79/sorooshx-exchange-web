import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  error?: boolean;
  suffix?: React.ReactNode;
  inputPrefix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, suffix, inputPrefix, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {inputPrefix && (
          <span className="absolute left-3 text-text-secondary text-sm">
            {inputPrefix}
          </span>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-border bg-background-tertiary px-3 py-1 text-sm text-text-primary shadow-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-text-muted',
            'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-trading-short focus:ring-trading-short',
            inputPrefix && 'pl-10',
            suffix && 'pr-16',
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-text-secondary text-sm">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
