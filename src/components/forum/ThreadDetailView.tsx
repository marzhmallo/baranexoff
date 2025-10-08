
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ThumbsUp, MessageSquare, Share, Send, Heart, Smile, Camera, X } from 'lucide-react';
import SmartPhotoDisplay from '@/components/ui/SmartPhotoDisplay';
import { Thread } from './ThreadsView';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import ForumAvatar from '@/components/forum/ForumAvatar';
import CachedAvatar from '@/components/ui/CachedAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  thread_id: string;
  parent_id: string | null;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  photo_url?: string | null;
  authorName?: string;
  authorInitials?: string;
  authorAvatarUrl?: string | null;
  replies?: Comment[];
  reactionCounts?: {
    [key: string]: number;
  };
  userReaction?: string | null;
}

interface Reaction {
  id: string;
  comment_id?: string;
  thread_id?: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ThreadDetailViewProps {
  thread: Thread;
  onBack: () => void;
  isUserFromSameBarangay: boolean;
  isPublicForum?: boolean;
}

const AVAILABLE_REACTIONS = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '👎', name: 'thumbs_down' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😊', name: 'smile' },
  { emoji: '🔥', name: 'fire' },
];

const ThreadDetailView = ({ thread, onBack, isUserFromSameBarangay, isPublicForum = false }: ThreadDetailViewProps) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [commentContent, setCommentContent] = useState('');
  const [commentPhoto, setCommentPhoto] = useState<File | null>(null);
  const [commentPhotoPreview, setCommentPhotoPreview] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{[key: string]: string}>({});
  const [replyPhotos, setReplyPhotos] = useState<{[key: string]: File | null}>({});
  const [replyPhotosPreviews, setReplyPhotosPreviews] = useState<{[key: string]: string | null}>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const replyPhotoInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const [threadReactions, setThreadReactions] = useState<{[key: string]: number}>({});
  const [userThreadReaction, setUserThreadReaction] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Session tracking for view counts - prevent spam
  const incrementViewCount = async () => {
    try {
      // Check if this thread has already been viewed in this session
      const sessionViewedThreads = JSON.parse(sessionStorage.getItem('viewedThreads') || '[]');
      
      if (!sessionViewedThreads.includes(thread.id)) {
        // Increment view count in database
        const { error } = await supabase
          .from('threads')
          .update({ viewcount: (thread.viewcount || 0) + 1 })
          .eq('id', thread.id);
        
        if (error) {
          console.error('Error incrementing view count:', error);
        } else {
          // Mark thread as viewed in session
          sessionViewedThreads.push(thread.id);
          sessionStorage.setItem('viewedThreads', JSON.stringify(sessionViewedThreads));
        }
      }
    } catch (error) {
      console.error('Error handling view count:', error);
    }
  };

  // Increment view count when component mounts
  useEffect(() => {
    incrementViewCount();
  }, [thread.id]);

  // Fetch comments and reactions
  const fetchCommentsAndReactions = async () => {
    try {
      // Fetch all comments for this thread
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;

      // Fetch user profiles to get author names and profile pictures
      const userIds = [...new Set(commentsData.map((comment: Comment) => comment.created_by))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, profile_picture')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user IDs to names
      const userMap = profilesData.reduce((acc: Record<string, string>, user: any) => {
        acc[user.id] = `${user.firstname} ${user.lastname}`;
        return acc;
      }, {});

      // Create avatar URL map, preloading signed URLs
      const { getSignedProfilePictureUrl } = await import('@/lib/avatar');
      const avatarEntries = await Promise.all(
        profilesData.map(async (user: any) => {
          const url = await getSignedProfilePictureUrl(user.profile_picture);
          return [user.id, url] as const;
        })
      );
      const avatarMap = Object.fromEntries(avatarEntries) as Record<string, string | undefined>;

      // Preload avatar images so they are fully rendered before loader hides
      const avatarUrls = Object.values(avatarMap).filter(Boolean) as string[];
      await Promise.all(
        avatarUrls.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            })
        )
      );

      // Get initials for avatar fallback
      const initialsMap = profilesData.reduce((acc: Record<string, string>, user: any) => {
        const first = (user.firstname || '').toString();
        const last = (user.lastname || '').toString();
        acc[user.id] = `${first[0] || ''}${last[0] || ''}` || 'UN';
        return acc;
      }, {});


      // Fetch all reactions (for both thread and comments)
      let reactionsQuery = supabase
        .from('reactions')
        .select('*');
      
      if (commentsData.length > 0) {
        reactionsQuery = reactionsQuery.or(`thread_id.eq.${thread.id},comment_id.in.(${commentsData.map((c: Comment) => c.id).join(',')})`);
      } else {
        reactionsQuery = reactionsQuery.eq('thread_id', thread.id);
      }
      
      const { data: reactionsData, error: reactionsError } = await reactionsQuery;
      
      if (reactionsError) throw reactionsError;

      // Process thread reactions
      const threadReactions = reactionsData.filter((r: Reaction) => r.thread_id === thread.id);
      const threadReactionCounts: {[key: string]: number} = {};
      let userReaction = null;
      
      threadReactions.forEach((reaction: Reaction) => {
        threadReactionCounts[reaction.emoji] = (threadReactionCounts[reaction.emoji] || 0) + 1;
        if (userProfile && reaction.user_id === userProfile.id) {
          userReaction = reaction.emoji;
        }
      });
      
      setThreadReactions(threadReactionCounts);
      setUserThreadReaction(userReaction);

      // Process comment reactions
      const commentReactions = reactionsData.filter((r: Reaction) => r.comment_id);
      const commentReactionMap: {[key: string]: {[key: string]: number}} = {};
      const userCommentReactions: {[key: string]: string | null} = {};
      
      commentReactions.forEach((reaction: Reaction) => {
        if (reaction.comment_id) {
          if (!commentReactionMap[reaction.comment_id]) {
            commentReactionMap[reaction.comment_id] = {};
          }
          commentReactionMap[reaction.comment_id][reaction.emoji] = 
            (commentReactionMap[reaction.comment_id][reaction.emoji] || 0) + 1;
          
          if (userProfile && reaction.user_id === userProfile.id) {
            userCommentReactions[reaction.comment_id] = reaction.emoji;
          }
        }
      });

      const commentsWithAuthors = commentsData.map((comment: Comment) => ({
        ...comment,
        authorName: userMap[comment.created_by] || 'Deleted User',
        authorInitials: initialsMap[comment.created_by] || 'DU',
        authorAvatarUrl: avatarMap[comment.created_by] || null,
        reactionCounts: {},
        userReaction: null,
        replies: []
      }));
      // Apply reaction data after base map so avatar/name are ready
      commentsWithAuthors.forEach((c: any) => {
        c.reactionCounts = commentReactionMap[c.id] || {};
        c.userReaction = userCommentReactions[c.id] || null;
      });
      // Organize into parent-child structure
      const rootComments: Comment[] = [];
      const commentMap: { [key: string]: Comment } = {};

      commentsWithAuthors.forEach(comment => {
        commentMap[comment.id] = comment;
        if (!comment.parent_id) {
          rootComments.push(comment);
        }
      });
      
      commentsWithAuthors.forEach(comment => {
        if (comment.parent_id && commentMap[comment.parent_id]) {
          if (!commentMap[comment.parent_id].replies) {
            commentMap[comment.parent_id].replies = [];
          }
          commentMap[comment.parent_id].replies!.push(comment);
        }
      });

      return rootComments;
    } catch (error) {
      console.error('Error fetching comments and reactions:', error);
      throw error;
    }
  };

  const { data: comments, isLoading: isCommentsLoading, error: commentsError, refetch: refetchComments } = useQuery({
    queryKey: ['comments', thread.id],
    queryFn: fetchCommentsAndReactions,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  // Set up real-time subscriptions
  useEffect(() => {
    let commentChannel: any;
    let reactionChannel: any;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to comment changes
      commentChannel = supabase
        .channel(`comments-${thread.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `thread_id=eq.${thread.id}`
          },
          () => {
            refetchComments();
          }
        )
        .subscribe();

      // Subscribe to reaction changes
      reactionChannel = supabase
        .channel(`reactions-${thread.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reactions'
          },
          (payload: any) => {
            // Only refetch if this reaction is related to our thread or its comments
            const payloadNew = payload.new || {};
            const payloadOld = payload.old || {};
            if (payloadNew.thread_id === thread.id || payloadOld.thread_id === thread.id ||
                payloadNew.comment_id || payloadOld.comment_id) {
              refetchComments();
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscriptions();

    return () => {
      if (commentChannel) {
        supabase.removeChannel(commentChannel);
      }
      if (reactionChannel) {
        supabase.removeChannel(reactionChannel);
      }
    };
  }, [thread.id, refetchComments]);

  const handlePhotoSelect = (file: File | null) => {
    setCommentPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCommentPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCommentPhotoPreview(null);
    }
  };

  const handleReplyPhotoSelect = (commentId: string, file: File | null) => {
    setReplyPhotos(prev => ({...prev, [commentId]: file}));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReplyPhotosPreviews(prev => ({...prev, [commentId]: reader.result as string}));
      };
      reader.readAsDataURL(file);
    } else {
      setReplyPhotosPreviews(prev => ({...prev, [commentId]: null}));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile?.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('forum')
        .upload(fileName, file);

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentContent.trim() && !commentPhoto) || !userProfile) return;

    setIsSubmitting(true);
    try {
      let photoUrl = null;
      if (commentPhoto) {
        photoUrl = await uploadPhoto(commentPhoto);
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          thread_id: thread.id,
          content: commentContent.trim(),
          created_by: userProfile.id,
          parent_id: null,
          photo_url: photoUrl
        })
        .select();

      if (error) throw error;
      
      setCommentContent('');
      setCommentPhoto(null);
      setCommentPhotoPreview(null);
      refetchComments();
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if ((!replyContent[parentId]?.trim() && !replyPhotos[parentId]) || !userProfile) return;

    setIsSubmitting(true);
    try {
      let photoUrl = null;
      if (replyPhotos[parentId]) {
        photoUrl = await uploadPhoto(replyPhotos[parentId]!);
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          thread_id: thread.id,
          content: replyContent[parentId].trim(),
          created_by: userProfile.id,
          parent_id: parentId,
          photo_url: photoUrl
        })
        .select();

      if (error) throw error;
      
      setReplyContent(prev => ({...prev, [parentId]: ''}));
      setReplyPhotos(prev => ({...prev, [parentId]: null}));
      setReplyPhotosPreviews(prev => ({...prev, [parentId]: null}));
      setReplyingTo(null);
      refetchComments();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({
        title: "Error",
        description: "Failed to post reply: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactionClick = async (emoji: string, commentId?: string) => {
    if (!userProfile) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to react to comments"
      });
      return;
    }

    try {
      // Check if the user already reacted with this emoji
      const target = commentId ? { comment_id: commentId } : { thread_id: thread.id };
      const currentReaction = commentId ? 
        comments?.find(c => c.id === commentId)?.userReaction : 
        userThreadReaction;
      
      if (currentReaction === emoji) {
        // User clicked the same reaction, so remove it
        const { error } = await supabase
          .from('reactions')
          .delete()
          .match({
            user_id: userProfile.id,
            ...(commentId ? { comment_id: commentId } : { thread_id: thread.id })
          });
          
        if (error) throw error;
      } else {
        // Remove any existing reaction from this user on this item
        await supabase
          .from('reactions')
          .delete()
          .match({
            user_id: userProfile.id,
            ...(commentId ? { comment_id: commentId } : { thread_id: thread.id })
          });
          
        // Add the new reaction
        const { error } = await supabase
          .from('reactions')
          .insert({
            ...target,
            user_id: userProfile.id,
            emoji
          });
          
        if (error) throw error;
      }
      
      refetchComments();
    } catch (error: any) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to process reaction"
      });
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !userProfile) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentToDelete)
        .eq('created_by', userProfile.id);

      if (error) throw error;
      
      toast({
        title: "Comment Deleted",
        description: "Your comment has been removed."
      });
      
      refetchComments();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment: " + error.message,
        variant: "destructive",
      });
    } finally {
      setCommentToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isCommentOwner = userProfile && comment.created_by === userProfile.id;
    const userHasLiked = comment.userReaction === '👍';
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-6 sm:ml-10 md:ml-13 mt-3 rounded-lg p-2 sm:p-2.5 md:p-3 border-l-2 border-border' : 'rounded-lg p-2 sm:p-3 md:p-4'}`}>
        <div className="flex items-start space-x-2 sm:space-x-3">
          <ForumAvatar
            userId={comment.created_by}
            name={comment.authorName}
            profilePicture={comment.authorAvatarUrl || undefined}
            initials={comment.authorInitials || 'U'}
            className={`${isReply ? 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8' : 'w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10'} flex-shrink-0`}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className={`font-medium text-foreground ${isReply ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                {comment.authorName}
              </h4>
              <span className={`text-muted-foreground ${isReply ? 'text-[10px] sm:text-xs' : 'text-[10px] sm:text-xs'}`}>
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <p className={`text-foreground mb-2 ${isReply ? 'text-xs' : 'text-xs sm:text-sm'}`}>
              {comment.content}
            </p>

            {/* Photo attachment */}
            {comment.photo_url && (
              <div className="mb-3">
                <SmartPhotoDisplay 
                  bucketName="forum" 
                  filePath={comment.photo_url} 
                  isPublic={true}
                  alt="Comment attachment"
                  className={`${isReply ? 'max-w-48' : 'max-w-64'} h-auto rounded-lg`}
                  enableZoom={true}
                />
              </div>
            )}
            
            <div className={`flex items-center ${isReply ? 'space-x-2 sm:space-x-2.5 md:space-x-3' : 'space-x-2 sm:space-x-3 md:space-x-4'}`}>
              <button 
                className={`flex items-center space-x-1 ${isReply ? 'text-xs' : 'text-xs'} transition-colors group ${
                  userHasLiked 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
                onClick={() => handleReactionClick('👍', comment.id)}
              >
                <ThumbsUp 
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform ${
                    userHasLiked ? 'fill-current' : ''
                  }`} 
                />
                <span>{comment.reactionCounts?.['👍'] || 0}</span>
              </button>
              
              <button 
                className={`flex items-center space-x-1 ${isReply ? 'text-xs' : 'text-xs'} text-muted-foreground hover:text-yellow-600 transition-colors group`}
                onClick={() => handleReactionClick('😊', comment.id)}
              >
                <Smile className={`h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform`} />
                <span>{comment.reactionCounts?.['😊'] || 0}</span>
              </button>
              
              {(isUserFromSameBarangay || isPublicForum) && !thread.locked && (
                <button 
                  className={`${isReply ? 'text-xs' : 'text-xs'} text-muted-foreground hover:text-primary transition-colors`}
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  Reply
                </button>
              )}
            </div>
            
            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <ForumAvatar
                    userId={userProfile?.id || ''}
                    name={`${userProfile?.firstname || ''} ${userProfile?.lastname || ''}`.trim()}
                    profilePicture={userProfile?.profile_picture}
                    initials={`${userProfile?.firstname?.[0] || ''}${userProfile?.lastname?.[0] || ''}` || 'U'}
                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-border">
                      <input 
                        type="text" 
                        placeholder="Write a reply..." 
                        value={replyContent[comment.id] || ''}
                        onChange={(e) => setReplyContent(prev => ({...prev, [comment.id]: e.target.value}))}
                        className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-xs sm:text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitReply(comment.id);
                          }
                        }}
                      />
                    </div>
                    {/* Photo preview for reply */}
                    {replyPhotosPreviews[comment.id] && (
                      <div className="mt-2 relative inline-block">
                        <img 
                          src={replyPhotosPreviews[comment.id]} 
                          alt="Photo preview"
                          className="w-24 h-24 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => handleReplyPhotoSelect(comment.id, null)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleReplyPhotoSelect(comment.id, e.target.files?.[0] || null)}
                      className="hidden"
                      ref={(el) => replyPhotoInputRefs.current[comment.id] = el}
                    />
                    <button 
                      onClick={() => replyPhotoInputRefs.current[comment.id]?.click()}
                      className="p-1.5 sm:p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 hover:scale-105"
                    >
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={isSubmitting || !replyContent[comment.id]?.trim()}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors hover:scale-105 transform disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const userHasLikedThread = thread.userReaction === '👍' || userThreadReaction === '👍';

  return (
    <div className="w-full py-2 px-2 sm:py-4 sm:px-4 md:py-6 md:px-6 relative">
      {isCommentsLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-medium text-foreground">Loading Thread</p>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Forum
        </Button>
        
        {/* Thread Card */}
        <div className="w-full mx-auto bg-card rounded-xl shadow-lg overflow-hidden border border-border">
          <div className="p-3 sm:p-4 md:p-6 border-b border-border">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <ForumAvatar
                userId={thread.created_by}
                name={thread.authorName || 'User'}
                profilePicture={thread.authorAvatarUrl || undefined}
                initials={thread.authorName === 'Deleted User' ? 'DU' : thread.authorName?.substring(0, 2) || 'UN'}
                className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12"
              />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{thread.authorName || 'Deleted User'}</h3>
                <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">
                  {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm md:text-base text-foreground leading-relaxed mb-4 mt-4">
              {thread.content}
            </p>
            
            {thread.photo_url && (
              <div className="mb-4">
                <SmartPhotoDisplay 
                  bucketName="forum" 
                  filePath={thread.photo_url.split('/').slice(-2).join('/')} 
                  isPublic={true}
                  alt="Thread photo"
                  className="w-full h-auto rounded-lg"
                  enableZoom={true}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6 text-muted-foreground text-xs sm:text-sm">
              <button 
                className={`flex items-center space-x-1 transition-colors ${
                  userHasLikedThread 
                    ? 'text-primary' 
                    : 'hover:text-primary'
                }`}
                onClick={() => handleReactionClick('👍')}
              >
                <ThumbsUp 
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${userHasLikedThread ? 'fill-current' : ''}`} 
                />
                <span>{threadReactions['👍'] || thread.reactionCount || 0}</span>
              </button>
              <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                {isCommentsLoading ? (
                  <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <span>{comments ? comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0) : 0}</span>
                )}
              </button>
              <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                <Share className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="max-h-[500px] sm:max-h-[450px] md:max-h-[400px] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 space-y-3 sm:space-y-4">
            {isCommentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-accent/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-12 w-full mb-2" />
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-6 w-12" />
                          <Skeleton className="h-6 w-12" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map(comment => renderComment(comment))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No comments yet</p>
                <p className="text-sm">Be the first to join the discussion!</p>
              </div>
            )}
          </div>

          {/* Comment Input - Hidden when thread is locked */}
          {!thread.locked && (
            <div className="border-t border-border p-2 sm:p-3 md:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <CachedAvatar
                  userId={userProfile?.id || ''}
                  profilePicture={userProfile?.profile_picture}
                  fallback={`${userProfile?.firstname?.[0] || ''}${userProfile?.lastname?.[0] || ''}` || 'U'}
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-border">
                    <input 
                      type="text" 
                      placeholder="Write a comment..." 
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-xs sm:text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitComment(e);
                        }
                      }}
                    />
                  </div>
                  {/* Photo preview */}
                  {commentPhotoPreview && (
                    <div className="mt-2 relative inline-block">
                      <img 
                        src={commentPhotoPreview} 
                        alt="Photo preview"
                        className="w-24 h-24 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => handlePhotoSelect(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                    className="hidden"
                    ref={photoInputRef}
                  />
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="p-1.5 sm:p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 hover:scale-105"
                  >
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button className="p-1.5 sm:p-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-all duration-200 hover:scale-105">
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || (!commentContent.trim() && !commentPhoto)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors hover:scale-105 transform disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Locked Thread Message */}
          {thread.locked && (
            <div className="border-t border-border p-4 bg-muted/30">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-medium">This thread has been locked. No new comments can be added.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ThreadDetailView;
