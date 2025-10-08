
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Forum } from "@/pages/ForumPage";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

interface ForumListProps {
  forums: Forum[];
  isLoading: boolean;
  onForumSelect: (forum: Forum) => void;
}

const ForumList = ({ forums, isLoading, onForumSelect }: ForumListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (forums.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No forums available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {forums.map((forum) => (
        <Card
          key={forum.id}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onForumSelect(forum)}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle>{forum.title}</CardTitle>
              {forum.is_public ? (
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Private
                </Badge>
              )}
            </div>
            <CardDescription>
              Created {formatDistanceToNow(new Date(forum.created_at), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forum.description || "No description available."}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ForumList;
