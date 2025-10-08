
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Phone, GraduationCap, Calendar, MapPin, Award, User, Briefcase, Users } from 'lucide-react';
import { Official, OfficialPosition } from '@/lib/types';
import { AddEditPositionDialog } from './AddEditPositionDialog';

interface OfficialDetailsDialogProps {
  officialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OfficialDetailsDialog = ({ officialId, open, onOpenChange }: OfficialDetailsDialogProps) => {
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<OfficialPosition | null>(null);
  
  // Fetch official details
  const { data: official, isLoading: officialLoading } = useQuery({
    queryKey: ['official-details', officialId],
    queryFn: async () => {
      if (!officialId) return null;
      
      const { data, error } = await supabase
        .from('officials')
        .select('*')
        .eq('id', officialId)
        .single();
        
      if (error) throw error;
      return data as Official;
    },
    enabled: !!officialId && open
  });
  
  // Fetch positions for the official
  const { data: positions, isLoading: positionsLoading, refetch: refetchPositions } = useQuery({
    queryKey: ['official-positions', officialId],
    queryFn: async () => {
      if (!officialId) return [];
      
      const { data, error } = await supabase
        .from('official_positions')
        .select('*')
        .eq('official_id', officialId)
        .order('term_start', { ascending: false });
        
      if (error) throw error;
      return data as OfficialPosition[];
    },
    enabled: !!officialId && open
  });
  
  // Format date to readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Format achievements into bullet points
  const formatAchievements = (achievements: any) => {
    if (!achievements) return null;
    
    // Handle different formats of the achievements field
    if (Array.isArray(achievements)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {achievements.map((achievement, i) => (
            <li key={i}>{achievement}</li>
          ))}
        </ul>
      );
    } else if (typeof achievements === 'object') {
      // If it's a JSON object, try to extract values
      const items = Object.values(achievements);
      if (Array.isArray(items) && items.length > 0) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {items.map((item, i) => (
              <li key={i}>{String(item)}</li>
            ))}
          </ul>
        );
      } else {
        // If we can't extract values, just stringify the object
        return <pre className="whitespace-pre-wrap">{JSON.stringify(achievements, null, 2)}</pre>;
      }
    } else {
      // If it's a string or other type, just display it directly
      return <p>{String(achievements)}</p>;
    }
  };
  
  // Format committees into bullet points
  const formatCommittees = (committees: any) => {
    if (!committees) return null;
    
    // Handle different formats of the committees field
    if (Array.isArray(committees)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {committees.map((committee, i) => (
            <li key={i}>{committee}</li>
          ))}
        </ul>
      );
    } else if (typeof committees === 'object') {
      // If it's a JSON object, try to extract values
      const items = Object.values(committees);
      if (Array.isArray(items) && items.length > 0) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {items.map((item, i) => (
              <li key={i}>{String(item)}</li>
            ))}
          </ul>
        );
      } else {
        // If we can't extract values, just stringify the object
        return <pre className="whitespace-pre-wrap">{JSON.stringify(committees, null, 2)}</pre>;
      }
    } else {
      // If it's a string or other type, just display it directly
      return <p>{String(committees)}</p>;
    }
  };
  
  // Filter positions into current and past
  const currentPositions = positions?.filter(position => 
    !position.term_end || new Date(position.term_end) >= new Date()
  ) || [];
  
  const pastPositions = positions?.filter(position => 
    position.term_end && new Date(position.term_end) < new Date()
  ) || [];
  
  const handleAddPosition = () => {
    setSelectedPosition(null);
    setIsPositionDialogOpen(true);
  };
  
  const handleEditPosition = (position: OfficialPosition) => {
    setSelectedPosition(position);
    setIsPositionDialogOpen(true);
  };
  
  // Get the current position
  const getCurrentPosition = () => {
    if (currentPositions.length > 0) {
      return currentPositions[0].position;
    } else if (pastPositions.length > 0) {
      return pastPositions[0].position;
    }
    return official?.position || 'Barangay Official';
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1e2637] border-[#2a3649] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {officialLoading ? <Skeleton className="h-8 w-64 bg-[#2a3649]" /> : official?.name}
            </DialogTitle>
          </DialogHeader>
          
          {officialLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full bg-[#2a3649]" />
              <Skeleton className="h-32 w-full bg-[#2a3649]" />
              <Skeleton className="h-32 w-full bg-[#2a3649]" />
            </div>
          ) : official && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column - Photo and basic info */}
              <div className="space-y-4">
                <div className="relative h-64 w-full overflow-hidden rounded-lg">
                  {official.photo_url ? (
                    <img
                      src={official.photo_url}
                      alt={official.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#2a3649] flex items-center justify-center">
                      <User className="h-20 w-20 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold">{official.name}</h3>
                    <p className="text-blue-400">{getCurrentPosition()}</p>
                  </div>
                  
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  {official.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="h-4 w-4" />
                      <span>{official.email}</span>
                    </div>
                  )}
                  
                  {official.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-4 w-4" />
                      <span>{official.phone}</span>
                    </div>
                  )}
                  
                  {official.address && (
                    <div className="flex items-start gap-2 text-gray-300">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      <span>{official.address}</span>
                    </div>
                  )}
                  
                  {official.birthdate && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="h-4 w-4" />
                      <span>Born: {formatDate(official.birthdate)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle column - Bio and education */}
              <div className="space-y-4 md:col-span-2">
                {official.bio && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Biography</h3>
                    <p className="text-gray-300 whitespace-pre-line">{official.bio}</p>
                  </div>
                )}
                
                {official.committees && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Committees
                    </h3>
                    <div className="text-gray-300">
                      {formatCommittees(official.committees)}
                    </div>
                  </div>
                )}
                
                {official.education && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </h3>
                    <p className="text-gray-300">{official.education}</p>
                  </div>
                )}
                
                {official.achievements && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Achievements
                    </h3>
                    <div className="text-gray-300">
                      {formatAchievements(official.achievements)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Positions section - Full width */}
              <div className="col-span-1 md:col-span-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Positions
                  </h3>
                  <Button onClick={handleAddPosition} variant="outline" className="border-[#2a3649] hover:bg-[#2a3649]">
                    Add Position
                  </Button>
                </div>
                
                <Tabs defaultValue="current">
                  <TabsList className="bg-[#2a3649]">
                    <TabsTrigger value="current">Current Positions</TabsTrigger>
                    <TabsTrigger value="past">Past Positions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="current">
                    {positionsLoading ? (
                      <Skeleton className="h-32 w-full bg-[#2a3649]" />
                    ) : currentPositions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-[#2a3649] border-[#2a3649]">
                            <TableHead>Position</TableHead>
                            <TableHead>Committee</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentPositions.map(position => (
                            <TableRow key={position.id} className="hover:bg-[#2a3649] border-[#2a3649]">
                              <TableCell className="font-medium">{position.position}</TableCell>
                              <TableCell>{position.committee || 'N/A'}</TableCell>
                              <TableCell>
                                {formatDate(position.term_start)} - {formatDate(position.term_end)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPosition(position)}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-400 py-4 text-center">No current positions found.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="past">
                    {positionsLoading ? (
                      <Skeleton className="h-32 w-full bg-[#2a3649]" />
                    ) : pastPositions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-[#2a3649] border-[#2a3649]">
                            <TableHead>Position</TableHead>
                            <TableHead>Committee</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastPositions.map(position => (
                            <TableRow key={position.id} className="hover:bg-[#2a3649] border-[#2a3649]">
                              <TableCell className="font-medium">{position.position}</TableCell>
                              <TableCell>{position.committee || 'N/A'}</TableCell>
                              <TableCell>
                                {formatDate(position.term_start)} - {formatDate(position.term_end)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPosition(position)}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-400 py-4 text-center">No past positions found.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-[#2a3649] hover:bg-[#2a3649]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding/editing positions */}
      <AddEditPositionDialog
        open={isPositionDialogOpen}
        onOpenChange={setIsPositionDialogOpen}
        position={selectedPosition}
        officialId={officialId}
        onSuccess={() => {
          refetchPositions();
        }}
      />
    </>
  );
};
