
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Search, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EditFlaggedDialog from "./EditFlaggedDialog";

interface FlaggedIndividual {
  id: string;
  full_name: string;
  alias?: string;
  reason: string;
  risk_level: string;
  created_at: string;
  incident_reports: {
    id: string;
    title: string;
    date_reported: string;
  };
}

const WatchlistTable = () => {
  const [flaggedIndividuals, setFlaggedIndividuals] = useState<FlaggedIndividual[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [editingFlagged, setEditingFlagged] = useState<FlaggedIndividual | null>(null);
  const { userProfile } = useAuth();

  const fetchFlaggedIndividuals = async () => {
    if (!userProfile?.brgyid) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('flagged_individuals')
        .select(`
          *,
          incident_reports (
            id,
            title,
            date_reported
          )
        `)
        .eq('brgyid', userProfile.brgyid)
        .order('risk_level', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterRisk !== "all") {
        query = query.eq('risk_level', filterRisk as "Low" | "Moderate" | "High");
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,alias.ilike.%${searchTerm}%,reason.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching flagged individuals:', error);
        toast({
          title: "Error",
          description: "Failed to fetch watchlist data",
          variant: "destructive",
        });
        return;
      }

      setFlaggedIndividuals(data || []);
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
    fetchFlaggedIndividuals();
  }, [userProfile?.brgyid, filterRisk, searchTerm]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'High') {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  const deleteFlaggedIndividual = async (id: string) => {
    if (!confirm('Are you sure you want to remove this individual from the watchlist?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('flagged_individuals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting flagged individual:', error);
        toast({
          title: "Error",
          description: "Failed to remove individual from watchlist",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Individual removed from watchlist",
      });

      fetchFlaggedIndividuals();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
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
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200/30 dark:border-purple-700/30 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-purple-500 dark:text-purple-400" />
          <Input
            placeholder="Search by name, alias, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50 focus:border-purple-400 dark:focus:border-purple-500"
          />
        </div>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50">
            <SelectValue placeholder="Filter by risk level" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/50">
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="High">High Risk</SelectItem>
            <SelectItem value="Moderate">Moderate Risk</SelectItem>
            <SelectItem value="Low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Watchlist Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Flagged</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">{flaggedIndividuals.length}</p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">High Risk</p>
                <p className="text-3xl font-bold text-red-800 dark:text-red-200">
                  {flaggedIndividuals.filter(f => f.risk_level === 'High').length}
                </p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Moderate Risk</p>
                <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                  {flaggedIndividuals.filter(f => f.risk_level === 'Moderate').length}
                </p>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Low Risk</p>
                <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {flaggedIndividuals.filter(f => f.risk_level === 'Low').length}
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Watchlist Table */}
      <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-t-lg border-b border-purple-200/30 dark:border-purple-700/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Flagged Individuals
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Individuals flagged in incident reports, sorted by risk level
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {flaggedIndividuals.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-purple-500/10 rounded-full w-fit mx-auto mb-6">
                <AlertTriangle className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Flagged Individuals</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                No flagged individuals found matching your search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-purple-200/30 dark:border-purple-700/30">
              <Table>
                <TableHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <TableRow className="border-purple-200/30 dark:border-purple-700/30">
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Name</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Risk Level</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Reason</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Related Report</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Date Added</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedIndividuals.map((individual, index) => (
                    <TableRow 
                      key={individual.id} 
                      className={`
                        border-purple-200/20 dark:border-purple-700/20 
                        hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 
                        dark:hover:from-purple-950/20 dark:hover:to-pink-950/20 
                        transition-all duration-200
                        ${index % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-purple-50/20 dark:bg-purple-950/10'}
                      `}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{individual.full_name}</p>
                          {individual.alias && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Alias: {individual.alias}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRiskColor(individual.risk_level)} font-medium shadow-sm`}>
                          {getRiskIcon(individual.risk_level)}
                          {individual.risk_level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs text-gray-700 dark:text-gray-300" title={individual.reason}>
                          {individual.reason.length > 50 ? `${individual.reason.substring(0, 50)}...` : individual.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{individual.incident_reports.title}</p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {new Date(individual.incident_reports.date_reported).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(individual.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingFlagged(individual)}
                            className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-600 text-blue-600 dark:text-blue-400 transition-all duration-200"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFlaggedIndividual(individual.id)}
                            className="border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-600 text-red-600 dark:text-red-400 transition-all duration-200"
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditFlaggedDialog
        flaggedIndividual={editingFlagged}
        open={!!editingFlagged}
        onOpenChange={(open) => !open && setEditingFlagged(null)}
        onSuccess={fetchFlaggedIndividuals}
      />
    </div>
  );
};

export default WatchlistTable;
