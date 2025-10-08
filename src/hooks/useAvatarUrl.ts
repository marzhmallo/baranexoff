import { useQuery } from '@tanstack/react-query';
import { getSignedProfilePictureUrl } from '@/lib/avatar';

export const fetchAvatarUrl = async (
  inputUrlOrPath?: string | null
): Promise<string | null> => {
  if (!inputUrlOrPath) return null;
  const url = await getSignedProfilePictureUrl(inputUrlOrPath);
  return url ?? null;
};

interface UseAvatarUrlOptions {
  userId?: string;
  profilePicture?: string | null;
  initialUrl?: string | null;
  enabled?: boolean;
}

export const useAvatarUrl = ({
  userId,
  profilePicture,
  initialUrl,
  enabled = true,
}: UseAvatarUrlOptions) => {
  return useQuery({
    queryKey: ['avatar-url', userId ?? 'anon', profilePicture ?? null],
    queryFn: async () => {
      if (!profilePicture) return null;
      return await fetchAvatarUrl(profilePicture);
    },
    enabled: enabled && !!userId, // Always enabled if user exists, even without profile picture
    staleTime: 8 * 60 * 1000, // 8 minutes (under 10m signed URL)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours in cache
    initialData: initialUrl ?? undefined,
  });
};
