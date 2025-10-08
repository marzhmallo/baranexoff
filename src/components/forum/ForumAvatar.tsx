import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { useMemo } from 'react';

interface ForumAvatarProps {
  userId?: string;
  name?: string | null;
  profilePicture?: string | null;
  initials?: string | null;
  className?: string;
}

const ForumAvatar = ({ userId, name, profilePicture, initials, className }: ForumAvatarProps) => {
  const { data: url, isLoading } = useAvatarUrl({
    userId,
    profilePicture,
    initialUrl: profilePicture,
  });

  // Ensure we always have fallback initials, even for minimal data
  const displayInitials = useMemo(() => {
    if (initials && initials.trim().length > 0) {
      return initials.trim().substring(0, 2).toUpperCase();
    }
    
    if (name && name.trim().length > 0) {
      return name
        .trim()
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    
    // Ultimate fallback for users with no name data
    return 'U';
  }, [initials, name]);

  return (
    <Avatar className={className}>
      {url && (
        <AvatarImage
          src={url}
          alt={name || 'User'}
          onError={(e) => {
            // Hide failed image to show fallback
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {displayInitials}
      </AvatarFallback>
    </Avatar>
  );
};

export default ForumAvatar;
