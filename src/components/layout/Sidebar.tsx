import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Calendar, LayoutDashboard, FileText, BarChart3, MessageSquare, AlertTriangle, ChevronLeft, ChevronRight, Home, Award, Briefcase, BellRing, Bell, Settings, Sun, Moon, X, Menu, Shield, Users, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import { useLogoutWithLoader } from '@/hooks/useLogoutWithLoader';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  

  // Dispatch a custom event when sidebar state changes
  useEffect(() => {
    const event = new CustomEvent('sidebarStateChange', {
      detail: {
        isCollapsed
      }
    });
    window.dispatchEvent(event);
  }, [isCollapsed]);
  const { isLoggingOut, handleLogout } = useLogoutWithLoader();
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  if (isLoggingOut) {
    return <GlobalLoadingScreen message="Logging out..." />;
  }
  return <aside className={cn("fixed left-0 top-0 bottom-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4">
          {!isCollapsed && (
            <Link to="/dashboard" className="text-xl font-bold tracking-tight flex items-center">
              <span className="text-white bg-baranex-accent px-2 py-1 rounded mr-1">Bara</span>
              <span className="text-baranex-accent">NEX</span>
            </Link>
          )}
          <Button variant="sidebar" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          <Link to="/dashboard" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/dashboard") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <LayoutDashboard className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Dashboard</span>}
          </Link>

          <Link to="/residents" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/residents") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <User className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Residents</span>}
          </Link>

          <Link to="/households" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/households") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Home className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Households</span>}
          </Link>
          
          <Link to="/officials" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/officials") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Award className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Officials</span>}
          </Link>

          <Link to="/management" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/management") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Users className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">User Management</span>}
          </Link>

          <Link to="/nexus" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/nexus") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Network className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">The Nexus</span>}
          </Link>

          <Link to="/documents" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/documents") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <FileText className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Documents</span>}
          </Link>

          <Link to="/calendar" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/calendar") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Calendar className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Calendar</span>}
          </Link>

          <Link to="/announcements" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/announcements") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <BellRing className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Announcements</span>}
          </Link>

          <Link to="/notifications" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/notifications") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Bell className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Notifications</span>}
          </Link>

          <Link to="/forum" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/forum") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <MessageSquare className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Forum</span>}
          </Link>

          <Link to="/blotter" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/blotter") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <Shield className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Blotter</span>}
          </Link>

          <Link to="/feedback" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/feedback") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <MessageSquare className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Feedback & Reports</span>}
          </Link>

          <Link to="/statistics" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/statistics") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <BarChart3 className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Statistics</span>}
          </Link>

          <Link to="/emergency" className={cn("flex items-center py-2 px-3 rounded-md", isActive("/emergency") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
            <AlertTriangle className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Emergency Response</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <ThemeToggle isCollapsed={isCollapsed} />
          
          <Button variant="sidebar" className={cn("w-full justify-start mt-2", isCollapsed ? "px-2" : "")} onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </div>
    </aside>;
};
export default Sidebar;
