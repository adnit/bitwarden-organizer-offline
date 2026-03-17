import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface PasswordDisplayProps {
  value: string | null | undefined;
  className?: string;
  iconSize?: number;
}

export function PasswordDisplay({ value, className, iconSize = 14 }: PasswordDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const password = value || '';
  const masked = '•'.repeat(Math.min(password.length, 16)) || '—';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('font-mono text-xs truncate', isVisible ? 'text-foreground/90' : 'text-muted-foreground/60 tracking-widest')}>
        {isVisible ? password : masked}
      </span>
      {password && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm hover:bg-secondary"
          title={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? (
            <EyeOff size={iconSize} />
          ) : (
            <Eye size={iconSize} />
          )}
        </button>
      )}
    </div>
  );
}
