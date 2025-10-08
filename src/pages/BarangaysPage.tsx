import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building, Search, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EcheSidebar } from '@/components/layout/EcheSidebar';

interface Barangay {
  id: string;
  barangayname: string;
  municipality: string;
  province: string;
  region: string;
  country: string;
  created_at: string;
  is_custom: boolean;
  logo_url?: string;
}

const BarangaysPage: React.FC = () => {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<Barangay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBarangays();
  }, []);

  useEffect(() => {
    const filtered = barangays.filter(barangay =>
      barangay.barangayname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barangay.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barangay.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barangay.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBarangays(filtered);
  }, [searchTerm, barangays]);

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
          variant: "destructive",
        });
        return;
      }

      setBarangays(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch barangays",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full bg-background min-h-screen flex">
      <EcheSidebar activeRoute="barangays" />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {loading ? (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading barangays...</p>
            </div>
          </div>
        ) : (
          <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Barangays Management</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all barangays in the system
            </p>
          </div>

          {/* Search and Stats */}
          <div className="mb-6 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search barangays, municipalities, provinces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredBarangays.length} of {barangays.length} barangays
            </div>
          </div>

          {/* Barangays Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarangays.map((barangay) => (
              <Card key={barangay.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{barangay.barangayname}</h3>
                        <p className="text-sm text-muted-foreground">{barangay.municipality}</p>
                      </div>
                    </div>
                    {barangay.is_custom && (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{barangay.province}, {barangay.region}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Created {formatDate(barangay.created_at)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      ID: {barangay.id.slice(0, 8)}...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredBarangays.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No barangays found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'No barangays are registered in the system yet'}
              </p>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarangaysPage;