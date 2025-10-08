import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Building,
  FileText,
  Check,
  X,
  Users,
  Bell,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import { useLogoutWithLoader } from '@/hooks/useLogoutWithLoader';
import { EcheSidebar } from '@/components/layout/EcheSidebar';

interface SubmitterProfile {
  id: string;
  username: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
}

interface Barangay {
  id: string;
  barangayname: string;
  municipality: string;
  province: string;
  region: string;
  country: string;
  created_at: string;
  is_custom: boolean;
  submitter: string | null;
  submitter_profile?: SubmitterProfile;
}

const EchelonPage = () => {
  const navigate = useNavigate();
  const { isLoggingOut, handleLogout } = useLogoutWithLoader();
  const [activeTab, setActiveTab] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null);
  const [pendingBarangays, setPendingBarangays] = useState<Barangay[]>([]);
  const [registeredBarangays, setRegisteredBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);


  const fetchBarangays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barangays')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching barangays",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Collect submitter IDs and fetch their profiles
      const submitterIds = Array.from(
        new Set((data ?? []).map((b: any) => b.submitter).filter(Boolean))
      ) as string[];

      let profilesMap: Record<string, SubmitterProfile> = {};
      if (submitterIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, username, firstname, lastname, email')
          .in('id', submitterIds);

        if (profErr) {
          console.error('Error fetching submitter profiles:', profErr);
        } else if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map((p: any) => [p.id, p as SubmitterProfile])
          );
        }
      }

      const withProfiles: Barangay[] = (data ?? []).map((b: any) => ({
        ...b,
        submitter_profile: b.submitter ? profilesMap[b.submitter] : undefined,
      }));

      const pending = withProfiles.filter(b => !b.is_custom) || [];
      const registered = withProfiles.filter(b => b.is_custom) || [];
      
      setPendingBarangays(pending);
      setRegisteredBarangays(registered);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch barangays",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
     fetchBarangays();
   }, []);

  const handleApprove = async (barangay: Barangay) => {
    console.log('Attempting to approve barangay:', barangay);
    try {
      const { data, error } = await supabase
        .from('barangays')
        .update({ is_custom: true })
        .eq('id', barangay.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Error approving barangay:', error);
        toast({
          title: 'Error approving barangay',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Promote submitter to admin and superior_admin
      if (barangay.submitter) {
        const { error: promoteErr } = await supabase.functions.invoke('promote-user', {
          body: { userId: barangay.submitter, barangayId: barangay.id },
        });
        if (promoteErr) {
          console.error('Failed to promote submitter:', promoteErr);
          toast({
            title: 'Barangay approved, but failed to promote submitter',
            description: 'The barangay is approved. Please manually promote the submitter.',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Barangay Approved',
        description: `${barangay.barangayname} has been approved successfully.`,
      });

      fetchBarangays();
    } catch (error) {
      console.error('Caught error:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve barangay',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (barangay: Barangay) => {
    try {
      // If there is a submitter, delete the user (auth + profile) via Edge Function
      if (barangay.submitter) {
        const { error: delUserErr } = await supabase.functions.invoke('delete-user', {
          body: { userId: barangay.submitter },
        });
        if (delUserErr) {
          toast({
            title: 'Failed to delete submitter',
            description: delUserErr.message || 'Please try again.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Delete the barangay record
      const { error } = await supabase
        .from('barangays')
        .delete()
        .eq('id', barangay.id);

      if (error) {
        toast({
          title: 'Error rejecting barangay',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Barangay Rejected',
        description: `${barangay.barangayname} has been rejected and removed.`,
        variant: 'destructive',
      });

      fetchBarangays();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject barangay',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen flex">
      <EcheSidebar activeRoute="dashboard" />
      
      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        {/* Header with Pending Approvals */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, Super Admin!</h1>
            <p className="text-gray-600">Wednesday, July 9, 2025</p>
          </div>
          
          {/* Pending Approvals Notification */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-[200px]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="text-orange-600 h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Pending Approvals</h3>
                <p className="text-2xl font-bold text-orange-600">{pendingBarangays.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="text-blue-600 h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Municipalities</h3>
            <p className="text-3xl font-bold text-gray-800">12</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="text-green-600 h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Barangays</h3>
            <p className="text-3xl font-bold text-gray-800">342</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="text-orange-600 h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">System-Wide Residents</h3>
            <p className="text-3xl font-bold text-gray-800">145,987</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="text-purple-600 h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Documents Issued</h3>
            <p className="text-3xl font-bold text-gray-800">289,450</p>
          </div>
        </div>
        
        {/* Management Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Onboarding & Registration Management</h2>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button 
                className={`py-4 px-2 font-medium ${
                  activeTab === 'pending'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('pending')}
              >
                Pending Approvals
              </button>
              <button 
                className={`py-4 px-2 font-medium ${
                  activeTab === 'registered'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('registered')}
              >
                Registered Entities
              </button>
            </div>
          </div>
          
          {/* Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading barangays...
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'pending' ? pendingBarangays : registeredBarangays).map((barangay) => (
                      <tr key={barangay.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {barangay.barangayname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Badge 
                            variant="outline" 
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            Barangay
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {barangay.municipality}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {barangay.province}, {barangay.region}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            const p = barangay.submitter_profile;
                            if (!p) return '—';
                            const name = [p.firstname, p.lastname].filter(Boolean).join(' ').trim();
                            return name || p.username || p.email || '—';
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(barangay.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activeTab === 'pending' ? (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setApprovingId(barangay.id);
                                  try {
                                    await handleApprove(barangay);
                                  } finally {
                                    setApprovingId(null);
                                  }
                                }}
                                disabled={approvingId === barangay.id}
                                className="bg-primary hover:bg-primary/90 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {approvingId === barangay.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  setRejectingId(barangay.id);
                                  try {
                                    await handleReject(barangay);
                                  } finally {
                                    setRejectingId(null);
                                  }
                                }}
                                disabled={rejectingId === barangay.id}
                                className="border-border text-foreground hover:bg-muted disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {rejectingId === barangay.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Approved
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Approval Modal */}
      {isModalOpen && selectedBarangay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Approve New Barangay Registration
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Barangay Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent Municipality
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={selectedBarangay.municipality}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Official Barangay Name
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={selectedBarangay.barangayname}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Create Initial Barangay Admin Account
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name of Admin
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Juan de la Cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., brgyadmin_mankilam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., admin@mankilam.gov.ph"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Application Approved",
                    description: `${selectedBarangay.barangayname} has been successfully approved and registered.`,
                  });
                  setIsModalOpen(false);
                }}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Finalize Barangay Approval
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EchelonPage;