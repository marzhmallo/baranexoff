import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Calendar, LayoutDashboard, FileText, BarChart3, MessageSquare, AlertTriangle, ChevronLeft, ChevronRight, Home, Award, Briefcase, BellRing, Bell, Settings, Sun, Moon, X, Menu, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import { useLogoutWithLoader } from '@/hooks/useLogoutWithLoader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
const PublicSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Set sidebar collapsed by default on tablet mode (768px - 1023px) and keep it collapsed
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const tablet = width >= 768 && width < 1024;
      setIsTablet(tablet);
      if (tablet) {
        setIsCollapsed(true);
      }
    };

    // Run on mount
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dispatch a custom event when sidebar state changes
  useEffect(() => {
    const event = new CustomEvent('publicSidebarStateChange', {
      detail: {
        isCollapsed: isMobile ? false : isCollapsed
      }
    });
    window.dispatchEvent(event);
  }, [isCollapsed, isMobile]);

  const { isLoggingOut, handleLogout } = useLogoutWithLoader();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  if (isLoggingOut) {
    return <GlobalLoadingScreen message="Logging out..." />;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4">
        {(!isCollapsed || isMobile) && <Link to="/hub" className="text-xl font-bold tracking-tight flex items-center">
            <span className="text-white bg-baranex-accent px-2 py-1 rounded mr-1">Bara</span>
            <span className="text-baranex-accent">NEX</span>
          </Link>}
        {!isMobile && !isTablet && (
          <Button variant="sidebar" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {[
          { to: "/hub", icon: Home, label: "Home" },
          { to: "/hub/calendar", icon: Calendar, label: "Calendar" },
          { to: "/hub/announcements", icon: BellRing, label: "Announcements" },
          { to: "/hub/notifications", icon: Bell, label: "Notifications" },
          { to: "/hub/officials", icon: Award, label: "Officials" },
          { to: "/hub/forum", icon: MessageSquare, label: "Forum" },
          { to: "/hub/documents", icon: FileText, label: "Documents" },
          { to: "/hub/emergency", icon: AlertTriangle, label: "Emergency" },
          { to: "/feedback", icon: MessageSquare, label: "Feedback" },
          { to: "/hub/settings", icon: Settings, label: "Settings" }
        ].map((item) => (
          <Link 
            key={item.to}
            to={item.to} 
            className={cn(
              "flex items-center py-2 px-3 rounded-md", 
              isActive(item.to) ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            onClick={() => isMobile && setIsMobileOpen(false)}
          >
            <item.icon className="h-5 w-5" />
            {(!isCollapsed || isMobile) && <span className="ml-2">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Link 
          to="/profile" 
          className={cn(
            "flex items-center py-2 rounded-md mb-2", 
            (isCollapsed && !isMobile) ? "px-0 justify-center" : "px-3 justify-start",
            isActive("/profile") ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
          onClick={() => isMobile && setIsMobileOpen(false)}
        >
          <User className="h-5 w-5" />
          {(!isCollapsed || isMobile) && <span className="ml-2">Profile</span>}
        </Link>
        
        <ThemeToggle isCollapsed={isCollapsed && !isMobile} />
        
        <Button variant="sidebar" className={cn("w-full justify-start mt-2", (isCollapsed && !isMobile) ? "px-2" : "")} onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          {(!isCollapsed || isMobile) && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Facebook-Style Two-Tier Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background shadow-md">
          {/* Top Tier: App Bar with Branding + Global Actions */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-border">
            <Link to="/hub" className="text-xl font-bold tracking-tight">
              <span className="text-white bg-baranex-accent px-2 py-1 rounded mr-1">Bara</span>
              <span className="text-baranex-accent">NEX</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <BellRing className="h-5 w-5" />
              </Button>
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Tier: Primary Navigation Tabs */}
          <nav className="flex justify-around h-14">
            {/* Menu Tab */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <button className="flex-1 flex flex-col items-center justify-center relative group hover:bg-muted/50">
                  <Menu className="h-6 w-6 text-muted-foreground" />
                  <div className="h-1 w-8 mt-1 rounded-full bg-transparent" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            {/* Calendar Tab */}
            <Link 
              to="/hub/calendar" 
              className="flex-1 flex flex-col items-center justify-center relative group hover:bg-muted/50"
            >
              <Calendar className={cn("h-6 w-6", isActive("/hub/calendar") ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("h-1 w-8 mt-1 rounded-full transition-all", 
                isActive("/hub/calendar") ? "bg-primary" : "bg-transparent")} />
            </Link>

            {/* Announcements Tab */}
            <Link 
              to="/hub/announcements" 
              className="flex-1 flex flex-col items-center justify-center relative group hover:bg-muted/50"
            >
              <BellRing className={cn("h-6 w-6", isActive("/hub/announcements") ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("h-1 w-8 mt-1 rounded-full transition-all", 
                isActive("/hub/announcements") ? "bg-primary" : "bg-transparent")} />
            </Link>

            {/* Documents Tab */}
            <Link 
              to="/hub/documents" 
              className="flex-1 flex flex-col items-center justify-center relative group hover:bg-muted/50"
            >
              <FileText className={cn("h-6 w-6", isActive("/hub/documents") ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("h-1 w-8 mt-1 rounded-full transition-all", 
                isActive("/hub/documents") ? "bg-primary" : "bg-transparent")} />
            </Link>

            {/* Home Tab */}
            <Link 
              to="/hub" 
              className="flex-1 flex flex-col items-center justify-center relative group hover:bg-muted/50"
            >
              <Home className={cn("h-6 w-6", isActive("/hub") ? "text-primary" : "text-muted-foreground")} />
              <div className={cn("h-1 w-8 mt-1 rounded-full transition-all", 
                isActive("/hub") ? "bg-primary" : "bg-transparent")} />
            </Link>
          </nav>
        </header>
        
        {/* Spacer for fixed two-tier header */}
        <div className="h-28"></div>
      </>
    );
  }

  return (
    <aside className={cn("fixed left-0 top-0 bottom-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out", isCollapsed ? "w-16" : "w-64")}>
      <SidebarContent />
    </aside>
  );
};
export default PublicSidebar;