import { FileText, LucideIcon } from 'lucide-react';

interface LocalizedLoadingScreenProps {
  isLoading: boolean;
  icon?: LucideIcon;
  loadingText?: string;
}

const LocalizedLoadingScreen = ({ 
  isLoading, 
  icon: Icon = FileText, 
  loadingText = "Loading documents" 
}: LocalizedLoadingScreenProps) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Icon className="h-8 w-8 animate-spin text-primary" />
          <div className="absolute inset-0 h-8 w-8 animate-pulse rounded-full border border-primary/20" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{loadingText}</p>
          <div className="flex space-x-1 mt-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalizedLoadingScreen;