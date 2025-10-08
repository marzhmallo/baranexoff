import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UAParser } from 'ua-parser-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Laptop, Smartphone, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

// Define a type for the session data returned by your function
type UserSession = {
    id: string;
    user_id: string;
    created_at: string;
    user_agent: string;
    ip: string;
};

const ViewSessions = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    // 1. FETCH SESSIONS using your new get_user_sessions function
    const { data: sessions, isLoading } = useQuery<UserSession[]>({
        queryKey: ['user-sessions'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_sessions');
            if (error) throw error;
            return data || [];
        }
    });

    // 2. SIGN OUT from other sessions using your new delete_user_sessions function
    const signOutMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('delete_user_sessions');
            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "You have been signed out from all other devices.",
            });
            // Refetch the sessions list to show only the current one remains
            queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to sign out from other sessions. " + error.message,
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return <p>Loading active sessions...</p>;
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${isMobile ? 'p-3' : 'p-6'}`}>
            <div className={`max-w-4xl mx-auto ${isMobile ? 'space-y-4' : 'space-y-8'}`}>
                {/* Header Section */}
                <div className={`text-center space-y-4 ${isMobile ? 'py-4' : 'py-8'}`}>
                    <div className={`inline-flex items-center justify-center ${isMobile ? 'w-14 h-14' : 'w-20 h-20'} rounded-full bg-primary/10 mb-4`}>
                        <Laptop className={`${isMobile ? 'h-7 w-7' : 'h-10 w-10'} text-primary`} />
                    </div>
                    <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold tracking-tight text-foreground`}>
                        Active Sessions
                    </h1>
                    <p className={`${isMobile ? 'text-sm' : 'text-lg'} text-muted-foreground max-w-2xl mx-auto`}>
                        Monitor and manage all devices currently signed into your account. Keep your account secure by reviewing active sessions.
                    </p>
                </div>

                {/* Sessions Card */}
                <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                    <CardHeader className={`space-y-4 ${isMobile ? 'pb-4' : 'pb-8'}`}>
                        <div className={`flex items-center justify-between ${isMobile ? 'flex-wrap gap-2' : ''}`}>
                            <CardTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} font-semibold flex items-center gap-3`}>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Connected Devices
                            </CardTitle>
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground bg-muted/50 px-3 py-1 rounded-full`}>
                                {sessions?.length || 0} active
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                        {sessions?.length === 0 ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No active sessions found</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {sessions?.map((session, index) => {
                                    const parser = new UAParser(session.user_agent);
                                    const result = parser.getResult();
                                    const deviceInfo = `${result.os.name || 'Unknown OS'} - ${result.browser.name || 'Unknown Browser'}`;
                                    const isMobile = result.device.type === 'mobile';
                                    const isCurrentSession = index === 0; // Assume first is current

                                    const isDeviceMobile = result.device.type === 'mobile';
                                    
                                    return (
                                        <div 
                                            key={session.id} 
                                            className={`relative group ${isMobile ? 'p-4' : 'p-6'} rounded-xl border transition-all duration-300 hover:shadow-lg overflow-hidden ${
                                                isCurrentSession 
                                                    ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/10' 
                                                    : 'bg-card hover:bg-muted/30 border-border'
                                            }`}
                                        >
                                            {isCurrentSession && (
                                                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold py-1.5 px-4 rounded-t-xl flex items-center justify-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse"></div>
                                                    Active Session
                                                </div>
                                            )}
                                            
                                            <div className={`${isCurrentSession ? 'mt-6' : ''}`}></div>
                                            
                                            <div className={`flex items-start justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
                                                <div className="flex items-start space-x-4 min-w-0 flex-1">
                                                    <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg ${isDeviceMobile ? 'bg-blue-500/10' : 'bg-green-500/10'} flex-shrink-0`}>
                                                        {isDeviceMobile ? 
                                                            <Smartphone className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600`} /> : 
                                                            <Laptop className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-green-600`} />
                                                        }
                                                    </div>
                                                    <div className="space-y-2 min-w-0 flex-1">
                                                        <h3 className={`font-semibold text-foreground ${isMobile ? 'text-base' : 'text-lg'} break-words`}>
                                                            {deviceInfo}
                                                        </h3>
                                                        <div className="space-y-1">
                                                            <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                                                                {!isMobile && <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0"></div>}
                                                                <span className="break-all">IP: {session.ip}</span>
                                                            </div>
                                                            <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                                                                {!isMobile && <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0"></div>}
                                                                <span className="break-words">
                                                                    {new Date(session.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {!isMobile && (
                                                    <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            isCurrentSession ? 'bg-green-500' : 'bg-yellow-500'
                                                        } animate-pulse`}></div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {isDeviceMobile ? 'Mobile' : 'Desktop'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Security Actions */}
                        <div className={`${isMobile ? 'pt-4' : 'pt-8'} border-t border-border`}>
                            <div className="space-y-4">
                                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
                                    <LogOut className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-destructive`} />
                                    Security Actions
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Sign out from all other devices to secure your account. This will keep you logged in on this device only.
                                </p>
                                <Button 
                                    onClick={() => signOutMutation.mutate()} 
                                    variant="destructive"
                                    size={isMobile ? "default" : "lg"}
                                    className={`w-full ${isMobile ? 'h-10 text-sm' : 'h-12 text-base'} font-medium shadow-lg hover:shadow-xl transition-all duration-300`}
                                    disabled={signOutMutation.isPending || sessions?.length <= 1}
                                >
                                    <LogOut className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-3'}`} />
                                    {signOutMutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                            {isMobile ? 'Signing out...' : 'Signing out from other devices...'}
                                        </>
                                    ) : (
                                        isMobile ? 'Sign Out From Other Devices' : 'Sign Out From All Other Devices'
                                    )}
                                </Button>
                                {sessions?.length <= 1 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        No other devices to sign out from
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ViewSessions;