
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@/pages/CalendarPage";
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
import EventForm from "./EventForm";

interface EventCardProps {
  event: Event;
  onEventUpdated: () => void;
}

const EventCard = ({ event, onEventUpdated }: EventCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const { toast } = useToast();

  const isAllDay = event.start_time && event.end_time && 
    format(parseISO(event.start_time), "HH:mm") === "00:00" && 
    format(parseISO(event.end_time), "HH:mm") === "23:59";

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;
      
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted."
      });
      
      onEventUpdated();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const getEventTypeColor = (type?: string) => {
    switch(type?.toLowerCase()) {
      case "meeting": return "bg-blue-500";
      case "health": return "bg-red-500";
      case "environment": return "bg-green-500";
      case "education": return "bg-yellow-500";
      case "social": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <>
      <Card className="bg-card border-border hover:border-muted-foreground transition-colors overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            <div className={`${getEventTypeColor(event.event_type)} w-1.5`} />
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-foreground">{event.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
                        <span className="text-xs">⏱</span>
                      </div>
                      {isAllDay ? (
                        <span className="text-sm text-muted-foreground">All day</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(event.start_time), "h:mm a")} - {format(parseISO(event.end_time), "h:mm a")}
                        </span>
                      )}
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
                          <span className="text-xs">📍</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {event.event_type && (
                    <span className={`
                      text-xs px-3 py-1 rounded-full font-medium
                      ${event.event_type === 'meeting' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : ''}
                      ${event.event_type === 'health' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
                      ${event.event_type === 'environment' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                      ${event.event_type === 'education' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
                      ${event.event_type === 'social' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : ''}
                      ${!event.event_type ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-sm"
                >
                  View Details
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sm ml-2"
                  onClick={() => setShowEditForm(true)}
                >
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-sm text-destructive hover:text-destructive ml-2"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event "{event.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Form */}
      {showEditForm && (
        <EventForm 
          event={event}
          onClose={() => setShowEditForm(false)} 
          onSubmit={() => {
            onEventUpdated();
            setShowEditForm(false);
          }}
        />
      )}
    </>
  );
};

export default EventCard;
