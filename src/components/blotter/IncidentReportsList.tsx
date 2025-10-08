
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, MapPin, Calendar, User, Phone, AlertTriangle, Users, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EditIncidentDialog from "./EditIncidentDialog";
import FlagIndividualDialog from "./FlagIndividualDialog";
import IncidentPartiesManager from "./IncidentPartiesManager";

interface IncidentReport {
  id: string;
  title: string;
  description: string;
  report_type: string;
  status: string;
  date_reported: string;
  location: string;
  reporter_name: string;
  reporter_contact?: string;
  created_at: string;
  flagged_individuals?: Array<{
    id: string;
    full_name: string;
    risk_level: string;
    reason: string;
  }>;
  incident_parties?: Array<{
    id: string;
    name: string;
    role: string;
    contact_info?: string;
  }>;
}

const IncidentReportsList = () => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null);
  const [flaggingIncident, setFlaggingIncident] = useState<IncidentReport | null>(null);
  const { userProfile } = useAuth();

  const fetchIncidents = async () => {
    if (!userProfile?.brgyid) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('incident_reports')
        .select(`
          *,
          flagged_individuals (
            id,
            full_name,
            risk_level,
            reason
          ),
          incident_parties (
            id,
            name,
            role,
            contact_info
          )
        `)
        .eq('brgyid', userProfile.brgyid)
        .order('date_reported', { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq('status', filterStatus as "Open" | "Under_Investigation" | "Resolved" | "Dismissed");
      }

      if (filterType !== "all") {
        query = query.eq('report_type', filterType as "Theft" | "Dispute" | "Vandalism" | "Curfew" | "Others");
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,reporter_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incidents:', error);
        toast({
          title: "Error",
          description: "Failed to fetch incident reports",
          variant: "destructive",
        });
        return;
      }

      setIncidents(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [userProfile?.brgyid, filterStatus, filterType, searchTerm]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'Under_Investigation': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Theft': return 'bg-purple-100 text-purple-800';
      case 'Dispute': return 'bg-orange-100 text-orange-800';
      case 'Vandalism': return 'bg-red-100 text-red-800';
      case 'Curfew': return 'bg-blue-100 text-blue-800';
      case 'Others': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200/30 dark:border-blue-700/30 backdrop-blur-sm">
        <Input
          placeholder="Search by title, location, or reporter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50 focus:border-blue-400 dark:focus:border-blue-500"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Under_Investigation">Under Investigation</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
            <SelectItem value="Dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-blue-200/50 dark:border-blue-700/50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Theft">Theft</SelectItem>
            <SelectItem value="Dispute">Dispute</SelectItem>
            <SelectItem value="Vandalism">Vandalism</SelectItem>
            <SelectItem value="Curfew">Curfew</SelectItem>
            <SelectItem value="Others">Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incident Cards */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <CardContent className="text-center py-12">
              <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-6">
                <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Incident Reports</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                No incident reports found matching your search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => {
            const complainants = incident.incident_parties?.filter(p => p.role === 'complainant') || [];
            const respondents = incident.incident_parties?.filter(p => p.role === 'respondent') || [];
            
            return (
              <Collapsible key={incident.id}>
                <Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/20 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-1 bg-blue-500/20 rounded-full">
                              {expandedCards.has(incident.id) ? (
                                <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <CardTitle className="text-lg text-gray-800 dark:text-gray-200">{incident.title}</CardTitle>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge className={`${getStatusColor(incident.status)} font-medium shadow-sm`}>
                              {incident.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={`${getTypeColor(incident.report_type)} font-medium shadow-sm`}>
                              {incident.report_type}
                            </Badge>
                            {complainants.length > 0 && (
                              <Badge variant="outline" className="text-blue-600 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30">
                                <User className="h-3 w-3 mr-1" />
                                {complainants.length} Complainant{complainants.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {respondents.length > 0 && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/30">
                                <Users className="h-3 w-3 mr-1" />
                                {respondents.length} Respondent{respondents.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {incident.flagged_individuals && incident.flagged_individuals.length > 0 && (
                              <Badge variant="outline" className="text-red-600 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/30">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {incident.flagged_individuals.length} Flagged
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full">
                                <Calendar className="h-3 w-3" />
                              </div>
                              {new Date(incident.date_reported).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full">
                                <MapPin className="h-3 w-3" />
                              </div>
                              {incident.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <div className="space-y-6">
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-700/50 dark:to-blue-950/20 rounded-lg">
                          <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Description</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{incident.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                            <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              Reporter Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-700 dark:text-gray-300">{incident.reporter_name}</span>
                              </div>
                              {incident.reporter_contact && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-gray-500" />
                                  <span className="text-gray-700 dark:text-gray-300">{incident.reporter_contact}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {incident.flagged_individuals && incident.flagged_individuals.length > 0 && (
                            <div className="p-4 bg-red-50/50 dark:bg-red-950/20 backdrop-blur-sm rounded-lg border border-red-200/50 dark:border-red-700/50">
                              <h4 className="font-semibold mb-3 text-red-800 dark:text-red-300 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Flagged Individuals
                              </h4>
                              <div className="space-y-3">
                                {incident.flagged_individuals.map((individual) => (
                                  <div key={individual.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                                    <div>
                                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{individual.full_name}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">{individual.reason}</p>
                                    </div>
                                    <Badge className={`${getRiskColor(individual.risk_level)} font-medium shadow-sm`}>
                                      {individual.risk_level}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Incident Parties Manager */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg border border-indigo-200/30 dark:border-indigo-700/30">
                          <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            Parties Involved
                          </h4>
                          <IncidentPartiesManager 
                            incidentId={incident.id} 
                            onUpdate={fetchIncidents}
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlaggingIncident(incident);
                            }}
                            className="border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-600 text-red-600 dark:text-red-400 transition-all duration-200"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flag Individual
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingIncident(incident);
                            }}
                            className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-600 text-blue-600 dark:text-blue-400 transition-all duration-200"
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      <EditIncidentDialog
        incident={editingIncident}
        open={!!editingIncident}
        onOpenChange={(open) => !open && setEditingIncident(null)}
        onSuccess={fetchIncidents}
      />

      <FlagIndividualDialog
        incident={flaggingIncident}
        open={!!flaggingIncident}
        onOpenChange={(open) => !open && setFlaggingIncident(null)}
        onSuccess={fetchIncidents}
      />
    </div>
  );
};

export default IncidentReportsList;
