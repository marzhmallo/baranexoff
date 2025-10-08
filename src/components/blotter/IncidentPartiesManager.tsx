
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, User, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IncidentParty {
  id: string;
  incident_id: string;
  resident_id?: string;
  name: string;
  contact_info?: string;
  role: 'complainant' | 'respondent';
  created_at: string;
}

interface IncidentPartiesManagerProps {
  incidentId: string;
  onUpdate?: () => void;
}

const IncidentPartiesManager = ({ incidentId, onUpdate }: IncidentPartiesManagerProps) => {
  const [parties, setParties] = useState<IncidentParty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_parties')
        .select('*')
        .eq('incident_id', incidentId)
        .order('role', { ascending: true });

      if (error) throw error;
      
      // Type assertion to ensure role is properly typed
      const typedData = (data || []).map(party => ({
        ...party,
        role: party.role as 'complainant' | 'respondent'
      }));
      
      setParties(typedData);
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch incident parties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [incidentId]);

  const handleRemoveParty = async (partyId: string) => {
    try {
      const { error } = await supabase
        .from('incident_parties')
        .delete()
        .eq('id', partyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Party removed successfully",
      });

      fetchParties();
      onUpdate?.();
    } catch (error) {
      console.error('Error removing party:', error);
      toast({
        title: "Error",
        description: "Failed to remove party",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading parties...</div>;
  }

  const complainants = parties.filter(p => p.role === 'complainant');
  const respondents = parties.filter(p => p.role === 'respondent');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Complainants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            Complainants ({complainants.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {complainants.map((party) => (
            <div key={party.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <p className="font-medium text-sm">{party.name}</p>
                {party.contact_info && (
                  <p className="text-xs text-muted-foreground">{party.contact_info}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveParty(party.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {complainants.length === 0 && (
            <p className="text-sm text-muted-foreground">No complainants added</p>
          )}
        </CardContent>
      </Card>

      {/* Respondents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Respondents ({respondents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {respondents.map((party) => (
            <div key={party.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <p className="font-medium text-sm">{party.name}</p>
                {party.contact_info && (
                  <p className="text-xs text-muted-foreground">{party.contact_info}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveParty(party.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {respondents.length === 0 && (
            <p className="text-sm text-muted-foreground">No respondents added</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncidentPartiesManager;
