
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, AlertTriangle } from "lucide-react";
import IncidentReportsList from "@/components/blotter/IncidentReportsList";
import WatchlistTable from "@/components/blotter/WatchlistTable";
import CreateIncidentDialog from "@/components/blotter/CreateIncidentDialog";
import CreateFlaggedDialog from "@/components/blotter/CreateFlaggedDialog";

const BlotterPage = () => {
  const [activeTab, setActiveTab] = useState("incidents");
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [showCreateFlagged, setShowCreateFlagged] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-700 dark:from-blue-500 dark:via-indigo-600 dark:to-purple-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
            <div className="h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          </div>
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12">
            <div className="h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Crime Incident Reporting (Blotter)</h1>
              <p className="mt-2 text-white/90 text-lg">Manage incident reports and maintain watchlist for community safety and law enforcement.</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-2 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 p-1 rounded-xl shadow-lg">
              <TabsTrigger 
                value="incidents" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
              >
                <Shield className="h-4 w-4" />
                Incident Reports
              </TabsTrigger>
              <TabsTrigger 
                value="watchlist" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
              >
                <AlertTriangle className="h-4 w-4" />
                Watchlist
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-3">
              <Button 
                onClick={() => setShowCreateIncident(true)} 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                File Report
              </Button>
              {activeTab === "watchlist" && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateFlagged(true)}
                  className="border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add to Watchlist
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="incidents" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-t-lg border-b border-blue-200/30 dark:border-blue-700/30">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  Incident Reports
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  View and manage all crime incident reports in your barangay
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <IncidentReportsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watchlist" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-t-lg border-b border-purple-200/30 dark:border-purple-700/30">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <AlertTriangle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  Flagged Individuals Watchlist
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Monitor individuals flagged in incident reports, sorted by risk level
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <WatchlistTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateIncidentDialog 
          open={showCreateIncident} 
          onOpenChange={setShowCreateIncident}
        />

        <CreateFlaggedDialog 
          open={showCreateFlagged} 
          onOpenChange={setShowCreateFlagged}
        />
      </div>
    </div>
  );
};

export default BlotterPage;
