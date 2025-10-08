import { supabase } from '@/integrations/supabase/client';

// Extract file path from possible full URLs pointing to the profilepictures bucket
const extractProfilePicPath = (urlOrPath: string) => {
  if (!urlOrPath) return '';
  if (urlOrPath.includes('/storage/v1/object/public/profilepictures/')) {
    return urlOrPath.split('/storage/v1/object/public/profilepictures/')[1];
  }
  if (urlOrPath.includes('/storage/v1/object/sign/profilepictures/')) {
    return urlOrPath.split('/storage/v1/object/sign/profilepictures/')[1].split('?')[0];
  }
  return urlOrPath; // already a path
};

export const getSignedProfilePictureUrl = async (inputUrlOrPath?: string | null) => {
  if (!inputUrlOrPath) return undefined;
  const filePath = extractProfilePicPath(inputUrlOrPath);
  if (!filePath) return undefined;

  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('profilepictures')
      .createSignedUrl(filePath, 600); // 10 minutes

    if (!signedUrlError && signedUrlData?.signedUrl) {
      return signedUrlData.signedUrl as string;
    }

    const { data: publicUrlData } = supabase.storage
      .from('profilepictures')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl;
  } catch (e) {
    console.error('getSignedProfilePictureUrl error:', e);
    return undefined;
  }
};
