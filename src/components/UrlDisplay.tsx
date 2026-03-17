import { cn } from '../lib/utils';

interface UrlDisplayProps {
  url: string | null | undefined;
  className?: string;
  truncateAt?: number;
}

export function UrlDisplay({ url, className }: UrlDisplayProps) {
  const displayUrl = url || 'No URI';
  
  return (
    <span 
      className={cn(
        'text-xs text-muted-foreground truncate max-w-[300px] inline-block align-bottom',
        url ? 'cursor-help underline decoration-dotted underline-offset-2' : 'italic',
        className
      )}
      title={url || undefined}
    >
      {displayUrl}
    </span>
  );
}
