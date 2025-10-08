
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DayContentProps } from "react-day-picker";

// Mock event data
const events = [
  { id: 1, title: "Barangay Assembly", date: new Date(2023, 5, 15), type: "meeting" },
  { id: 2, title: "Vaccination Drive", date: new Date(2023, 5, 18), type: "health" },
  { id: 3, title: "Cleanup Drive", date: new Date(2023, 5, 22), type: "environment" },
  { id: 4, title: "COVID-19 Awareness", date: new Date(2023, 5, 25), type: "health" },
  { id: 5, title: "Budget Hearing", date: new Date(2023, 5, 28), type: "meeting" },
];

const CalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedEvents, setSelectedEvents] = useState<typeof events>([]);

  // Find events for selected date
  const handleSelect = (day: Date | undefined) => {
    setDate(day);
    if (day) {
      const dayEvents = events.filter(
        (event) => 
          event.date.getDate() === day.getDate() &&
          event.date.getMonth() === day.getMonth() &&
          event.date.getFullYear() === day.getFullYear()
      );
      setSelectedEvents(dayEvents);
    } else {
      setSelectedEvents([]);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            className="rounded-md border"
            components={{
              DayContent: (props: DayContentProps) => {
                const { date: dayDate } = props;
                
                // Find events for this day
                const dayEvents = events.filter(
                  (event) => 
                    event.date.getDate() === dayDate.getDate() &&
                    event.date.getMonth() === dayDate.getMonth() &&
                    event.date.getFullYear() === dayDate.getFullYear()
                );
                
                return (
                  <div className="relative h-full w-full p-2">
                    <span>{dayDate.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex gap-0.5">
                        {dayEvents.length > 3 ? (
                          <Badge className="h-1 w-4" variant="secondary" />
                        ) : (
                          dayEvents.map((event) => (
                            <Badge key={event.id} className="h-1 w-1" variant="secondary" />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-medium mb-4">
            {date ? (
              <>Events for {date.toLocaleDateString()}</>
            ) : (
              <>Select a date to view events</>
            )}
          </h3>
          <div className="space-y-4">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border rounded-md flex items-start gap-3"
                >
                  <div className={`w-2 h-full self-stretch rounded-full 
                    ${event.type === 'meeting' ? 'bg-blue-500' : 
                      event.type === 'health' ? 'bg-green-500' : 'bg-amber-500'}`}
                  />
                  <div>
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Badge className="mt-2" variant="outline">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No events scheduled for this day.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarView;
