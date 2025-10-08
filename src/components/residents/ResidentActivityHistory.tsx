import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Activity, RefreshCw, Eye, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useResidentActivityLogs } from "@/hooks/useResidentActivityLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CachedAvatar from "@/components/ui/CachedAvatar";
import { UAParser } from 'ua-parser-js';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  ip?: string;
  agent?: string;
  brgyid: string;
}

interface UserProfile {
  id: string;
  firstname?: string;
  lastname?: string;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

interface ResidentActivityHistoryProps {
  residentId: string;
}

export default function ResidentActivityHistory({ residentId }: ResidentActivityHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const { activities, userProfiles, loading, totalItems, refetch } = useResidentActivityLogs({
    residentId,
    currentPage,
    itemsPerPage
  });

  const parseDeviceInfo = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown Device';
    
    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      
      const { browser, os, device } = result;
      
      if (device.type === 'mobile' || device.type === 'tablet') {
        if (device.vendor && device.model) {
          return `${device.vendor} ${device.model} (${browser.name || 'Unknown Browser'})`;
        } else if (os.name && os.version) {
          return `${os.name} ${os.version} (${browser.name || 'Unknown Browser'})`;
        } else {
          return `Mobile Device (${browser.name || 'Unknown Browser'})`;
        }
      }
      
      let deviceInfo = '';
      
      if (os.name) {
        deviceInfo = os.name;
        if (os.version) {
          deviceInfo += ` ${os.version}`;
        }
      } else {
        deviceInfo = 'Unknown OS';
      }
      
      if (browser.name) {
        deviceInfo += ` (${browser.name}`;
        if (browser.version) {
          const majorVersion = browser.version.split('.')[0];
          deviceInfo += ` ${majorVersion}`;
        }
        deviceInfo += ')';
      }
      
      return deviceInfo || 'Unknown Device';
    } catch (error) {
      console.error('Error parsing user agent:', error);
      return 'Unknown Device';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'resident_added':
      case 'create':
        return '➕';
      case 'resident_updated':
      case 'update':
        return '✏️';
      case 'resident_deleted':
      case 'delete':
        return '🗑️';
      case 'document_issued':
        return '📋';
      case 'photo_updated':
        return '📷';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'resident_added':
      case 'create':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'resident_updated':
      case 'update':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resident_deleted':
      case 'delete':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'document_issued':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'photo_updated':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return 'Unknown User';
    
    if (profile.firstname && profile.lastname) {
      return `${profile.firstname} ${profile.lastname}`;
    }
    return profile.username || profile.email || 'Unknown User';
  };

  const getUserRole = (userId: string) => {
    const profile = userProfiles[userId];
    return profile?.role || 'Unknown';
  };

  const getActionTitle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'resident_added':
        return 'Resident Created';
      case 'resident_updated':
        return 'Profile Updated';
      case 'resident_deleted':
        return 'Resident Deleted';
      case 'document_issued':
        return 'Document Issued';
      case 'photo_updated':
        return 'Photo Updated';
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  };

  const getActionDescription = (action: string, details: any) => {
    switch (action.toLowerCase()) {
      case 'resident_added':
        return 'New resident record was created in the system';
      case 'resident_updated':
        return 'Resident information was modified';
      case 'resident_deleted':
        return 'Resident record was removed from the system';
      case 'document_issued':
        return `Document "${details?.document_type || 'Unknown'}" was issued`;
      case 'photo_updated':
        return 'Resident photo was updated';
      default:
        return 'Action was performed on this resident';
    }
  };

  const handleViewDetails = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Activity History</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Activity History</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  All activities related to this resident
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {totalItems} Total Activities
              </Badge>
              <Button
                onClick={refetch}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Activity Found</h3>
              <p className="text-muted-foreground">
                No activity logs found for this resident yet.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <CachedAvatar
                        userId={activity.user_id}
                        profilePicture={userProfiles[activity.user_id]?.profile_picture}
                        fallback={getUserName(activity.user_id).substring(0, 2).toUpperCase()}
                        className="h-10 w-10"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getActionIcon(activity.action)}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getActionColor(activity.action)}`}
                            >
                              {getActionTitle(activity.action)}
                            </Badge>
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium text-foreground">
                              {getUserName(activity.user_id)}
                            </span>
                            <span className="text-muted-foreground">
                              {' '}• {getActionDescription(activity.action, activity.details)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span className="capitalize">{getUserRole(activity.user_id)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleViewDetails(activity)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} activities
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span className="text-xl">{getActionIcon(selectedActivity.action)}</span>
                <span>{getActionTitle(selectedActivity.action)} Details</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Performed By</label>
                  <div className="flex items-center space-x-2">
                    <CachedAvatar
                      userId={selectedActivity.user_id}
                      profilePicture={userProfiles[selectedActivity.user_id]?.profile_picture}
                      fallback={getUserName(selectedActivity.user_id).substring(0, 2).toUpperCase()}
                      className="h-8 w-8"
                    />
                    <div>
                      <div className="font-medium">{getUserName(selectedActivity.user_id)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{getUserRole(selectedActivity.user_id)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <div className="text-sm">
                    <div>{format(new Date(selectedActivity.created_at), 'PPpp')}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedActivity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                
                {selectedActivity.ip && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {selectedActivity.ip}
                    </div>
                  </div>
                )}
                
                {selectedActivity.agent && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Device</label>
                    <div className="text-sm">
                      {parseDeviceInfo(selectedActivity.agent)}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedActivity.details && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Details</label>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedActivity.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}