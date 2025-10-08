
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ResidentsList from "@/components/residents/ResidentsList";
import DashboardStats from "@/components/dashboard/DashboardStats";
import AnnouncementsList from "@/components/announcements/AnnouncementsList";
import CalendarView from "@/components/calendar/CalendarView";
import DocumentsPage from "@/components/documents/DocumentsPage";
import { Bell, FileText, LogOut, Search, User, Settings } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import BarangayLocationMap from "@/components/dashboard/BarangayLocationMap";
import { useData } from "@/context/DataContext";

const Index = () => {
  const { barangayName } = useData();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <DashboardHeader />
            <DashboardStats />
            <DashboardCharts />
            <BarangayLocationMap barangayName={barangayName} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
