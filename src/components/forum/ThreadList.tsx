
import { formatDistanceToNow } from 'date-fns';
import { Thread } from './ThreadsView';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Eye, Share2, Flag, Pin, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ForumAvatar from '@/components/forum/ForumAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

interface ThreadListProps {
  threads: Thread[];
  onThreadSelect: (thread: Thread) => void;
  onPinToggle: (threadId: string, isPinned: boolean) => void;
  onLockToggle: (threadId: string, isLocked: boolean) => void;
  canModerate?: boolean;
  onEditThread?: (thread: Thread) => void;
  onDeleteThread?: (threadId: string) => void;
}

const ThreadList = ({ threads, onThreadSelect, onPinToggle, onLockToggle, canModerate = false, onEditThread, onDeleteThread }: ThreadListProps) => {
  const { userProfile } = useAuth();
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  if (threads.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No threads available in this forum.
      </div>
    );
  }

  // Separate pinned and regular threads
  const pinnedThreads = threads.filter(thread => thread.pinned);
  const regularThreads = threads.filter(thread => !thread.pinned);
  const displayThreads = [...pinnedThreads, ...regularThreads];

  return (
    <div className="space-y-3 sm:space-y-4">
      {displayThreads.map((thread) => {
        const isDeletedUser = thread.authorName === 'Deleted User';
        const initials = isDeletedUser 
          ? 'DU'
          : thread.authorName
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || 'UN';

        return (
          <div 
            key={thread.id} 
            className={`bg-card border border-border rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer ${
              thread.pinned ? 'bg-primary/5 border-primary/20' : ''
            }`}
            onClick={() => onThreadSelect(thread)}
          >
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <ForumAvatar
                    userId={thread.created_by}
                    name={thread.authorName || 'User'}
                    profilePicture={thread.authorAvatarUrl || undefined}
                    initials={initials}
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{thread.authorName}</h3>
                      {thread.pinned && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="hidden sm:inline">Pinned</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {thread.tags?.slice(0, 2).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0.5 rounded-full hidden sm:inline-flex">
                      {tag}
                    </Badge>
                  ))}
                  {(userProfile?.role === 'admin' && (thread.created_by === userProfile.id || canModerate)) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-1 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditThread?.(thread);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteThreadId(thread.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Thread
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1 text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {canModerate && (
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      thread.pinned 
                        ? 'bg-primary/20 text-primary border-primary/20' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinToggle(thread.id, thread.pinned);
                    }}
                  >
                    <Pin className="h-3 w-3" />
                    {thread.pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      thread.locked 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLockToggle(thread.id, thread.locked);
                    }}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                        thread.locked 
                          ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                          : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      } />
                    </svg>
                    {thread.locked ? 'Unlock' : 'Lock'}
                  </Button>
                </div>
              )}
              
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3 hover:text-primary cursor-pointer transition-colors duration-200 line-clamp-2">
                {thread.title}
              </h2>
              
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                {thread.content}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">{thread.reactionCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">{thread.commentCount || 0}</span>
                    <span className="text-xs sm:text-sm hidden sm:inline">replies</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground hidden sm:flex">
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">{thread.viewCount || 0}</span>
                    <span className="text-xs sm:text-sm hidden md:inline">views</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {thread.locked ? (
                    <>
                      <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-yellow-600">Thread locked</span>
                    </>
                  ) : (thread.commentCount || 0) > 0 && thread.lastReplyAt ? (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Last reply {formatDistanceToNow(new Date(thread.lastReplyAt), { addSuffix: true })}</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm">No replies</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      <AlertDialog open={deleteThreadId !== null} onOpenChange={() => setDeleteThreadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this thread? This action cannot be undone and will permanently remove the thread and all its replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteThreadId) {
                  onDeleteThread?.(deleteThreadId);
                  setDeleteThreadId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Thread
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ThreadList;
