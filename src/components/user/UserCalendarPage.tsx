import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import { format, isToday, isEqual, isSameMonth, parse, addDays, subDays, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Eye, Clock, MapPin, Users, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { useBarangaySelection } from '@/hooks/useBarangaySelection';
import { useIsMobile } from '@/hooks/use-mobile';

export type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  created_by?: string;
  target_audience?: string;
  event_type?: string;
  visibility: string;
  is_recurring?: boolean;
  reccuring?: boolean;
  rrule?: string;
  reminder_enabled?: boolean;
  reminder_time?: number;
  isRecurringInstance?: boolean;
  originalEventId?: string;
};

const eventCategories = [
  { value: "meeting", label: "Meetings", color: "bg-blue-500", bgLight: "bg-blue-100", bgDark: "bg-blue-900/30", text: "text-blue-800", textDark: "text-blue-300" },
  { value: "health", label: "Health", color: "bg-green-500", bgLight: "bg-green-100", bgDark: "bg-green-900/30", text: "text-green-800", textDark: "text-green-300" },
  { value: "sports", label: "Sports", color: "bg-purple-500", bgLight: "bg-purple-100", bgDark: "bg-purple-900/30", text: "text-purple-800", textDark: "text-purple-300" },
  { value: "holiday", label: "Holidays", color: "bg-red-500", bgLight: "bg-red-100", bgDark: "bg-red-900/30", text: "text-red-800", textDark: "text-red-300" },
  { value: "education", label: "Education", color: "bg-yellow-500", bgLight: "bg-yellow-100", bgDark: "bg-yellow-900/30", text: "text-yellow-800", textDark: "text-yellow-300" },
  { value: "social", label: "Social", color: "bg-pink-500", bgLight: "bg-pink-100", bgDark: "bg-pink-900/30", text: "text-pink-800", textDark: "text-pink-300" }
];

const UserCalendarPage = () => {
  const [searchParams] = useSearchParams();
  const { selectedBarangay } = useBarangaySelection();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const eventsPerPage = 5;
  const { userProfile, user } = useAuth();
  const isMobile = useIsMobile();
  
  // Get barangay ID from URL params (for public access), user profile (for logged-in users), or selected barangay (from localStorage)
  const barangayId = searchParams.get('barangay') || userProfile?.brgyid || selectedBarangay?.id;

  // Fetch events from Supabase
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', barangayId],
    queryFn: async () => {
      if (!barangayId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('brgyid', barangayId)
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!barangayId
  });

  // Helper function to describe RRULE in human-readable format
  const describeRecurrence = (rrule: string | null | undefined) => {
    if (!rrule) return null;
    
    const parts = rrule.split(';');
    let frequency = '';
    let interval = 1;
    let byDay: string[] = [];
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      switch (key) {
        case 'FREQ':
          frequency = value;
          break;
        case 'INTERVAL':
          interval = parseInt(value);
          break;
        case 'BYDAY':
          byDay = value.split(',');
          break;
      }
    });
    
    const dayMap: { [key: string]: string } = {
      'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday', 
      'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
    };
    
    switch (frequency) {
      case 'DAILY':
        return interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
      case 'WEEKLY':
        if (byDay.length > 0) {
          const dayNames = byDay.map(day => dayMap[day]).join(', ');
          return interval === 1 ? `Repeats weekly on ${dayNames}` : `Repeats every ${interval} weeks on ${dayNames}`;
        }
        return interval === 1 ? 'Repeats weekly' : `Repeats every ${interval} weeks`;
      case 'MONTHLY':
        return interval === 1 ? 'Repeats monthly' : `Repeats every ${interval} months`;
      case 'YEARLY':
        return interval === 1 ? 'Repeats yearly' : `Repeats every ${interval} years`;
      default:
        return 'Recurring event';
    }
  };

  // Helper function to generate recurring event instances from RRULE
  const generateRecurringEvents = (event: any, startDate: Date, endDate: Date) => {
    if (!event.reccuring || !event.rrule) return [event];
    
    const instances = [event]; // Include the original event
    const rruleParts = event.rrule.split(';');
    let frequency = '';
    let interval = 1;
    let byDay: string[] = [];
    let until: Date | null = null;
    
    // Parse RRULE
    rruleParts.forEach((part: string) => {
      const [key, value] = part.split('=');
      switch (key) {
        case 'FREQ':
          frequency = value;
          break;
        case 'INTERVAL':
          interval = parseInt(value);
          break;
        case 'BYDAY':
          byDay = value.split(',');
          break;
        case 'UNTIL':
          until = new Date(value.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
          break;
      }
    });
    
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const eventDuration = eventEnd.getTime() - eventStart.getTime();
    
    let currentDate = new Date(eventStart);
    
    // Generate instances up to endDate or until date
    const maxDate = until && until < endDate ? until : endDate;
    
    while (currentDate <= maxDate) {
      let nextDate = new Date(currentDate);
      
      // Calculate next occurrence based on frequency
      switch (frequency) {
        case 'DAILY':
          nextDate.setDate(currentDate.getDate() + interval);
          break;
        case 'WEEKLY':
          if (byDay.length > 0) {
            // For weekly with specific days
            const dayMap: { [key: string]: number } = {
              'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
            };
            let found = false;
            for (let i = 1; i <= 7; i++) {
              const testDate = new Date(currentDate);
              testDate.setDate(currentDate.getDate() + i);
              if (byDay.includes(Object.keys(dayMap)[testDate.getDay()])) {
                nextDate = testDate;
                found = true;
                break;
              }
            }
            if (!found) {
              nextDate.setDate(currentDate.getDate() + (7 * interval));
            }
          } else {
            nextDate.setDate(currentDate.getDate() + (7 * interval));
          }
          break;
        case 'MONTHLY':
          nextDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'YEARLY':
          nextDate.setFullYear(currentDate.getFullYear() + interval);
          break;
        default:
          return instances; // Unknown frequency
      }
      
      // If we've moved beyond our original event date, create instance
      if (nextDate > eventStart && nextDate >= startDate && nextDate <= maxDate) {
        const instanceEnd = new Date(nextDate.getTime() + eventDuration);
        instances.push({
          ...event,
          id: `${event.id}-${nextDate.getTime()}`, // Unique ID for each instance
          start_time: nextDate.toISOString(),
          end_time: instanceEnd.toISOString(),
          isRecurringInstance: true,
          originalEventId: event.id
        });
      }
      
      currentDate = nextDate;
      
      // Safety check to prevent infinite loops
      if (instances.length > 365) break;
    }
    
    return instances;
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventDetails(true);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  // Helper function to get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return getAllEventInstances()?.filter(event => {
      const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
      return eventDate === dateStr;
    }) || [];
  };

  // Helper function to get all event instances including recurring ones
  const getAllEventInstances = () => {
    if (!events) return [];
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Extend date range to cover the entire calendar view (includes previous/next month days)
    const calendarStart = subDays(startOfMonth, startOfMonth.getDay());
    const calendarEnd = addDays(endOfMonth, 6 - endOfMonth.getDay());
    
    const allInstances: Event[] = [];
    
    events.forEach(event => {
      const eventInstances = generateRecurringEvents(event, calendarStart, calendarEnd);
      allInstances.push(...eventInstances);
    });
    
    return allInstances;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startOfCalendar = subDays(startOfMonth, startOfMonth.getDay());
    const endOfCalendar = addDays(endOfMonth, 6 - endOfMonth.getDay());

    const days = [];
    let day = startOfCalendar;

    while (day <= endOfCalendar) {
      const eventsForDay = getEventsForDate(day);
      days.push({
        date: new Date(day),
        isCurrentMonth: isSameMonth(day, currentDate),
        events: eventsForDay
      });
      day = addDays(day, 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  
  const now = new Date();
  
  // Helper function to deduplicate recurring events for list display
  const deduplicateRecurringEvents = (eventList: Event[]) => {
    const seenOriginalIds = new Set<string>();
    return eventList.filter(event => {
      // If it's a recurring instance, check if we've already seen the original
      if (event.isRecurringInstance && event.originalEventId) {
        if (seenOriginalIds.has(event.originalEventId)) {
          return false; // Skip this instance
        }
        seenOriginalIds.add(event.originalEventId);
        return false; // Skip instances, we want to show the original
      }
      
      // If it's an original recurring event, check if we've seen it
      if (event.rrule || event.is_recurring || event.reccuring) {
        if (seenOriginalIds.has(event.id)) {
          return false;
        }
        seenOriginalIds.add(event.id);
        return true; // Show the original recurring event
      }
      
      // For non-recurring events, always show
      return true;
    });
  };
  
  const allEventInstances = getAllEventInstances();
  const upcomingEventsAll = allEventInstances?.filter(event => new Date(event.start_time) >= now) || [];
  const pastEventsAll = allEventInstances?.filter(event => new Date(event.start_time) < now) || [];
  
  // Deduplicate recurring events for the lists
  const upcomingEvents = deduplicateRecurringEvents(upcomingEventsAll);
  const pastEvents = deduplicateRecurringEvents(pastEventsAll);

  // Show loading screen similar to feedback page
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading events</p>
            <p className="text-xs text-muted-foreground mt-1">Preparing calendar data and upcoming events</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isMobile ? 'p-2' : 'p-6'} bg-background min-h-screen`}>
      <div className="max-w-none mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className={`bg-primary text-primary-foreground ${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold`}>Barangay Calendar</h1>
                <p className={`text-primary-foreground/80 mt-1 ${isMobile ? 'text-sm' : ''}`}>View community events and activities</p>
              </div>
            </div>
          </div>

          <div className={`${isMobile ? 'p-2' : 'p-6'} bg-card`}>
            <div className={`${isMobile ? 'flex-col space-y-3' : 'flex items-center justify-between'} mb-4`}>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size={isMobile ? "sm" : "icon"} onClick={handlePreviousMonth} className="hover:bg-muted">
                  <ChevronLeft className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
                <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-card-foreground`}>
                  {format(currentDate, isMobile ? "MMM yyyy" : "MMMM yyyy")}
                </h2>
                <Button variant="ghost" size={isMobile ? "sm" : "icon"} onClick={handleNextMonth} className="hover:bg-muted">
                  <ChevronRight className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
              </div>
              <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
                <Button 
                  variant={view === 'month' ? 'default' : 'ghost'} 
                  onClick={() => setView('month')}
                  className={view !== 'month' ? 'hover:bg-muted' : ''}
                  size={isMobile ? 'sm' : 'default'}
                >
                  {isMobile ? 'Mo' : 'Month'}
                </Button>
                <Button 
                  variant={view === 'week' ? 'default' : 'ghost'} 
                  onClick={() => setView('week')}
                  className={view !== 'week' ? 'hover:bg-muted' : ''}
                  size={isMobile ? 'sm' : 'default'}
                >
                  {isMobile ? 'Wk' : 'Week'}
                </Button>
                <Button 
                  variant={view === 'day' ? 'default' : 'ghost'} 
                  onClick={() => setView('day')}
                  className={view !== 'day' ? 'hover:bg-muted' : ''}
                  size={isMobile ? 'sm' : 'default'}
                >
                  Day
                </Button>
              </div>
            </div>

            {/* Calendar Headers */}
            <div className={`grid grid-cols-7 ${isMobile ? 'gap-0.5' : 'gap-1'} mb-2`}>
              {(isMobile ? ["S", "M", "T", "W", "T", "F", "S"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((day, index) => (
                <div key={day} className={`${isMobile ? 'p-1' : 'p-3'} text-xs font-semibold text-muted-foreground text-center`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {view === 'month' && (
              <div className={`grid grid-cols-7 ${isMobile ? 'gap-0.5' : 'gap-1'} bg-muted ${isMobile ? 'p-0.5' : 'p-1'} rounded-lg`}>
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDate && isEqual(day.date, selectedDate);
                  const hasEvents = day.events.length > 0;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day.date)}
                      className={`
                        bg-card border border-border ${isMobile ? 'p-0.5 min-h-14' : 'p-2 min-h-24'} rounded hover:bg-accent cursor-pointer transition-colors duration-200
                        ${!day.isCurrentMonth ? "text-muted-foreground opacity-50" : ""}
                        ${isToday(day.date) ? "bg-primary/10 border-primary/30" : ""}
                        ${isSelected ? "ring-2 ring-primary" : ""}
                      `}
                    >
                      <div className={`text-xs ${isToday(day.date) ? "font-bold text-primary" : "font-semibold text-card-foreground"}`}>
                        {format(day.date, "d")}
                      </div>
                      {hasEvents && (
                        <div className={`mt-0.5 space-y-0.5 ${isMobile ? 'max-h-8 overflow-hidden' : ''}`}>
                          {day.events.slice(0, isMobile ? 2 : 3).map((event, eventIndex) => {
                            const category = eventCategories.find(cat => cat.value === event.event_type);
                            return (
                              <div
                                key={eventIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                className={`
                                  ${isMobile ? 'text-xs p-0.5' : 'text-xs p-1'} rounded text-white font-medium cursor-pointer hover:opacity-80 truncate
                                  ${category ? category.color : 'bg-gray-500'}
                                `}
                                title={event.title}
                              >
                                {isMobile ? event.title.substring(0, 8) + (event.title.length > 8 ? '...' : '') : event.title}
                              </div>
                            );
                          })}
                          {day.events.length > (isMobile ? 2 : 3) && (
                            <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground font-medium`}>
                              +{day.events.length - (isMobile ? 2 : 3)} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Week View - Responsive */}
            {view === 'week' && (
              <div className="space-y-2">
                {isMobile ? (
                  // Mobile week view: vertical stack of days
                  <div className="space-y-2">
                    {Array.from({ length: 7 }, (_, i) => {
                      const weekStart = subDays(currentDate, currentDate.getDay());
                      const dayDate = addDays(weekStart, i);
                      const dayEvents = getEventsForDate(dayDate);
                      
                      return (
                        <Card key={i} className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-semibold text-sm">
                              {format(dayDate, "EEE, MMM d")}
                            </div>
                            {isToday(dayDate) && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Today</span>
                            )}
                          </div>
                          {dayEvents.length > 0 ? (
                            <div className="space-y-1">
                              {dayEvents.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  onClick={() => handleEventClick(event)}
                                  className="p-2 bg-muted rounded text-sm cursor-pointer hover:bg-accent"
                                >
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(event.start_time), "h:mm a")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No events</div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  // Desktop week view: horizontal grid
                  <div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="p-3 text-sm font-semibold text-muted-foreground text-center">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 bg-muted p-1 rounded-lg">
                      {Array.from({ length: 7 }, (_, i) => {
                        const weekStart = subDays(currentDate, currentDate.getDay());
                        const dayDate = addDays(weekStart, i);
                        const dayEvents = getEventsForDate(dayDate);
                        
                        return (
                          <div
                            key={i}
                            className="bg-card border border-border p-3 min-h-32 rounded hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => handleDateClick(dayDate)}
                          >
                            <div className={`text-sm font-semibold mb-2 ${isToday(dayDate) ? "text-primary" : "text-card-foreground"}`}>
                              {format(dayDate, "d")}
                              {isToday(dayDate) && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Today</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.map((event, eventIndex) => {
                                const category = eventCategories.find(cat => cat.value === event.event_type);
                                return (
                                  <div
                                    key={eventIndex}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                    className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors
                                      ${category ? `${category.bgLight} dark:${category.bgDark} ${category.text} dark:${category.textDark}` : 'bg-muted text-muted-foreground'}
                                      hover:opacity-80
                                    `}
                                  >
                                    {event.title}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Day View - Responsive */}
            {view === 'day' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">
                    {format(currentDate, "EEEE, MMMM d, yyyy")}
                  </h3>
                </div>
                <Card className={`${isMobile ? 'p-3' : 'p-6'}`}>
                  {(() => {
                    const dayEvents = getEventsForDate(currentDate);
                    return dayEvents.length > 0 ? (
                      <div className="space-y-3">
                        {dayEvents.map((event, index) => (
                          <div
                            key={index}
                            onClick={() => handleEventClick(event)}
                            className="p-3 border border-border rounded-lg cursor-pointer hover:bg-accent"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-card-foreground">{event.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                                </div>
                              </div>
                              <div className={`
                                px-2 py-1 rounded text-xs font-medium
                                ${eventCategories.find(cat => cat.value === event.event_type)?.color || 'bg-gray-500'} text-white
                              `}>
                                {eventCategories.find(cat => cat.value === event.event_type)?.label || 'Event'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No events scheduled for this day</p>
                      </div>
                    );
                  })()}
                </Card>
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 ${isMobile ? '' : 'lg:grid-cols-2'} gap-4 ${isMobile ? 'p-2' : 'p-6'} bg-muted/30`}>
            <div className="bg-card border border-border rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-card-foreground mb-4">Upcoming Events</h3>
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past Events</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="space-y-4">
                  {upcomingEvents.length > 0 ? (
                    <>
                      {upcomingEvents.slice((upcomingPage - 1) * eventsPerPage, upcomingPage * eventsPerPage).map((event) => {
                        const category = eventCategories.find(cat => cat.value === event.event_type);
                        return (
                          <div key={event.id} className="flex items-start space-x-4 p-4 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 bg-card">
                            <div className={`p-2 rounded-full ${category ? `${category.bgLight} dark:${category.bgDark}` : 'bg-muted'}`}>
                              <CalendarIcon className={`h-5 w-5 ${category ? `${category.text} dark:${category.textDark}` : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-card-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.start_time), "MMMM d, yyyy - h:mm a")}
                              </p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleEventClick(event as any)}
                                  className="hover:bg-muted"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {upcomingEvents.length > eventsPerPage && (
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setUpcomingPage(prev => Math.max(prev - 1, 1))}
                                className={upcomingPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: Math.ceil(upcomingEvents.length / eventsPerPage) }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setUpcomingPage(page)}
                                  isActive={page === upcomingPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setUpcomingPage(prev => Math.min(prev + 1, Math.ceil(upcomingEvents.length / eventsPerPage)))}
                                className={upcomingPage === Math.ceil(upcomingEvents.length / eventsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No upcoming events.</p>
                  )}
                </TabsContent>
                <TabsContent value="past" className="space-y-4">
                  {pastEvents.length > 0 ? (
                    <>
                      {pastEvents.slice((pastPage - 1) * eventsPerPage, pastPage * eventsPerPage).map((event) => {
                        const category = eventCategories.find(cat => cat.value === event.event_type);
                        return (
                          <div key={event.id} className="flex items-start space-x-4 p-4 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 bg-card opacity-75">
                            <div className={`p-2 rounded-full ${category ? `${category.bgLight} dark:${category.bgDark}` : 'bg-muted'}`}>
                              <CalendarIcon className={`h-5 w-5 ${category ? `${category.text} dark:${category.textDark}` : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-card-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.start_time), "MMMM d, yyyy - h:mm a")}
                              </p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleEventClick(event as any)}
                                  className="hover:bg-muted"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {pastEvents.length > eventsPerPage && (
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setPastPage(prev => Math.max(prev - 1, 1))}
                                className={pastPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: Math.ceil(pastEvents.length / eventsPerPage) }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setPastPage(page)}
                                  isActive={page === pastPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setPastPage(prev => Math.min(prev + 1, Math.ceil(pastEvents.length / eventsPerPage)))}
                                className={pastPage === Math.ceil(pastEvents.length / eventsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No past events.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-card-foreground mb-4">Event Categories</h3>
                <div className="space-y-3">
                  {eventCategories.map((category) => {
                    const categoryCount = events?.filter(event => event.event_type === category.value).length || 0;
                    return (
                      <div key={category.value} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 ${category.color} rounded-full mr-3`}></div>
                          <span className="text-sm text-card-foreground">{category.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{categoryCount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-4rem)] lg:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-card-foreground flex items-center gap-2 leading-tight pr-8">
              <CalendarIcon className="h-5 w-5 flex-shrink-0" />
              {selectedEvent ? selectedEvent.title : `Events for ${selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}`}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-6">
              {/* Event Category Badge */}
              {selectedEvent.event_type && (
                <div className="flex justify-start gap-2">
                  {(() => {
                    const category = eventCategories.find(cat => cat.value === selectedEvent.event_type);
                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                        ${category ? `${category.bgLight} dark:${category.bgDark} ${category.text} dark:${category.textDark}` : 'bg-muted text-muted-foreground'}
                      `}>
                        {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                      </span>
                    );
                  })()}
                  
                  {/* Recurring Event Badge */}
                  {(selectedEvent.reccuring || selectedEvent.isRecurringInstance) && selectedEvent.rrule && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      <Repeat className="h-3 w-3 mr-1" />
                      {describeRecurrence(selectedEvent.rrule)}
                    </span>
                  )}
                </div>
              )}

              {/* Show recurring badge even if no event_type */}
              {!selectedEvent.event_type && (selectedEvent.reccuring || selectedEvent.isRecurringInstance) && selectedEvent.rrule && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    <Repeat className="h-3 w-3 mr-1" />
                    {describeRecurrence(selectedEvent.rrule)}
                  </span>
                </div>
              )}

              {/* Event Description */}
              {selectedEvent.description && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-card-foreground leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedEvent.start_time), "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedEvent.start_time), "h:mm a")} - {format(new Date(selectedEvent.end_time), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedEvent.target_audience && (
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">Target Audience</p>
                        <p className="text-sm text-muted-foreground">{selectedEvent.target_audience}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Eye className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Visibility</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.visibility === 'public' ? "Public Event" : 
                         selectedEvent.visibility === 'users' ? "All Logged-in Users" : 
                         selectedEvent.visibility === 'internal' ? "Internal" : "Private Event"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-6 border-t">
                <Button variant="outline" onClick={() => setShowEventDetails(false)} className="border-border">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            selectedDate && (
              <div className="space-y-4">
                {getEventsForDate(selectedDate).map((event) => (
                  <div key={event.id} className="p-3 border border-border rounded-lg bg-card">
                    <h4 className="font-medium text-card-foreground">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), "h:mm a")}
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                  </div>
                ))}
                {getEventsForDate(selectedDate).length === 0 && (
                  <p className="text-muted-foreground">No events scheduled for this day.</p>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserCalendarPage;