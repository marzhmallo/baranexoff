import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmergencyFeedToggleProps {
  requestCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const EmergencyFeedToggle = ({ requestCount, isOpen, onToggle }: EmergencyFeedToggleProps) => {
  if (isOpen) return null;

  return (
    <Button
      onClick={onToggle}
      size="lg"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-[1000] shadow-2xl h-auto py-4 px-3 flex-col gap-1 hover:scale-105 transition-all"
      variant={requestCount > 0 ? "destructive" : "secondary"}
    >
      <AlertCircle className="h-6 w-6" />
      {requestCount > 0 && (
        <Badge variant="secondary" className="bg-background text-foreground text-xs px-1.5 min-w-[20px]">
          {requestCount}
        </Badge>
      )}
    </Button>
  );
};
