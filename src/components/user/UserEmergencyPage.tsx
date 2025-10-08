import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MapPin, Phone, AlertTriangle } from "lucide-react";
import EmergencyContactsManager from "@/components/emergency/EmergencyContactsManager";
import EmergencyDashboard from "@/components/emergency/EmergencyDashboard";
import RiskMapPage from "@/pages/RiskMapPage";
import { useAuth } from "@/components/AuthProvider";
import { useEmergencyRealtimeSync } from "@/hooks/useEmergencyRealtimeSync";

const UserEmergencyPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Setup realtime sync for all emergency data
  useEmergencyRealtimeSync();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-yellow-950/20">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-orange-600 dark:from-red-500 dark:via-red-600 dark:to-orange-500 p-4 md:p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
            <div className="h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          </div>
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12">
            <div className="h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </div>
          <div className="relative flex items-center gap-3 md:gap-4">
            <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm flex-shrink-0">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-4xl font-bold tracking-tight">Emergency Preparedness & Response</h1>
              <p className="mt-1 md:mt-2 text-white/90 text-xs md:text-sm lg:text-lg">Stay informed during emergencies. Connect with help, view danger zones, and find safe places.</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 p-1.5 md:p-2 gap-1 md:gap-1.5 rounded-xl shadow-lg overflow-hidden h-auto">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center justify-center gap-1 md:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-xs md:text-sm min-h-[44px] px-2 md:px-3"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="riskmap" 
              className="flex items-center justify-center gap-1 md:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-xs md:text-sm min-h-[44px] px-2 md:px-3"
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Risk Map</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              className="flex items-center justify-center gap-1 md:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200 text-xs md:text-sm min-h-[44px] px-2 md:px-3"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="dashboard" className="mt-4 md:mt-6">
          <EmergencyDashboard onTabChange={setActiveTab} />
        </TabsContent>

        <TabsContent value="riskmap" className="mt-4 md:mt-6">
          <RiskMapPage />
        </TabsContent>

          <TabsContent value="contacts" className="mt-4 md:mt-6">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-t-lg border-b border-red-200/30 dark:border-red-700/30 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl lg:text-2xl">
                  <Phone className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
                  Emergency Contacts Management
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-xs md:text-xs lg:text-sm">
                  Manage emergency service contacts for your barangay
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <EmergencyContactsManager readOnly={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserEmergencyPage;
