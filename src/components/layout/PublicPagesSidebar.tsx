import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Award, 
  BellRing, 
  ArrowLeft,
  MapPin,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTheme } from '@/components/theme/ThemeProvider';

const PublicPagesSidebar = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Initialize collapsed state based on screen size
  useEffect(() => {
    if (isTablet) {
      setIsCollapsed(true);
    }
  }, [isTablet]);

  // Dispatch a custom event when sidebar state changes
  useEffect(() => {
    const event = new CustomEvent('publicSidebarStateChange', {
      detail: {
        isCollapsed
      }
    });
    window.dispatchEvent(event);
  }, [isCollapsed]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    {
      path: '/public/announcements',
      icon: BellRing,
      label: 'Announcements'
    },
    {
      path: '/public/events',
      icon: Calendar,
      label: 'Events'
    },
    {
      path: '/public/officials',
      icon: Award,
      label: 'Officials'
    },
    {
      path: '/public/emergency',
      icon: AlertTriangle,
      label: 'Emergency'
    },
    {
      path: '/public/forum',
      icon: MessageSquare,
      label: 'Forum'
    }
  ];

  // Mobile View
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-primary/95 to-primary/90 border-b border-primary-foreground/20 shadow-lg">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Center: Branding */}
            <Link to="/" className="flex items-center text-primary-foreground font-bold tracking-tight mx-auto">
              <MapPin className="h-5 w-5 mr-2" />
              <span className="text-base">Barangay Portal</span>
            </Link>
          </div>
        </header>

        {/* Bottom Navigation Tabs */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-primary/95 to-primary/90 border-t border-primary-foreground/20 shadow-lg">
          <div className="flex items-center justify-around h-14 px-2">
            {/* Menu Tab */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <Menu className="h-5 w-5 text-primary-foreground/80 group-hover:text-primary-foreground" />
              <span className="text-[10px] text-primary-foreground/80 group-hover:text-primary-foreground">Menu</span>
            </button>

            {/* Announcements Tab */}
            <Link
              to="/public/announcements"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <BellRing className={cn(
                "h-5 w-5 transition-colors",
                isActive('/public/announcements')
                  ? "text-primary-foreground"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )} />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive('/public/announcements')
                  ? "text-primary-foreground font-medium"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )}>
                Announce
              </span>
              {isActive('/public/announcements') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-foreground rounded-t-full" />
              )}
            </Link>

            {/* Events Tab */}
            <Link
              to="/public/events"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <Calendar className={cn(
                "h-5 w-5 transition-colors",
                isActive('/public/events')
                  ? "text-primary-foreground"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )} />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive('/public/events')
                  ? "text-primary-foreground font-medium"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )}>
                Events
              </span>
              {isActive('/public/events') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-foreground rounded-t-full" />
              )}
            </Link>

            {/* Officials Tab */}
            <Link
              to="/public/officials"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <Award className={cn(
                "h-5 w-5 transition-colors",
                isActive('/public/officials')
                  ? "text-primary-foreground"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )} />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive('/public/officials')
                  ? "text-primary-foreground font-medium"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )}>
                Officials
              </span>
              {isActive('/public/officials') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-foreground rounded-t-full" />
              )}
            </Link>

            {/* Emergency Tab */}
            <Link
              to="/public/emergency"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <AlertTriangle className={cn(
                "h-5 w-5 transition-colors",
                isActive('/public/emergency')
                  ? "text-primary-foreground"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )} />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive('/public/emergency')
                  ? "text-primary-foreground font-medium"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )}>
                Emergency
              </span>
              {isActive('/public/emergency') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-foreground rounded-t-full" />
              )}
            </Link>

            {/* Forum Tab */}
            <Link
              to="/public/forum"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 relative group"
            >
              <MessageSquare className={cn(
                "h-5 w-5 transition-colors",
                isActive('/public/forum')
                  ? "text-primary-foreground"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )} />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive('/public/forum')
                  ? "text-primary-foreground font-medium"
                  : "text-primary-foreground/80 group-hover:text-primary-foreground"
              )}>
                Forum
              </span>
              {isActive('/public/forum') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-foreground rounded-t-full" />
              )}
            </Link>
          </div>
        </nav>

        {/* Spacer for fixed headers */}
        <div className="h-28" />

        {/* Mobile Sheet Menu */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="w-64 bg-gradient-to-b from-primary via-primary/95 to-primary/90 border-r border-primary-foreground/20 p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-primary-foreground/20">
              <SheetTitle className="text-xl font-bold tracking-tight flex items-center text-primary-foreground">
                <MapPin className="h-6 w-6 mr-2" />
                <span>Barangay Portal</span>
              </SheetTitle>
            </SheetHeader>
            
            <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center py-3 px-3 rounded-lg transition-all duration-200 group",
                      isActive(item.path)
                        ? "bg-white/20 text-white shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 font-medium group-hover:translate-x-1 transition-transform duration-200">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer with Theme Toggle and Back Button */}
            <div className="p-4 border-t border-primary-foreground/20 space-y-2 mt-auto">
              <Button
                variant="ghost"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
                <span className="ml-3">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              
              <Link to="/" onClick={() => setIsMobileOpen(false)}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5 flex-shrink-0" />
                  <span className="ml-3">Back to Home</span>
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop View
  return (
    <aside className={cn(
      "fixed left-0 top-0 bottom-0 z-40 h-screen bg-gradient-to-b from-primary via-primary/95 to-primary/90 transition-all duration-300 ease-in-out shadow-2xl",
      isTablet ? "w-16" : (isCollapsed ? "w-16" : "w-64")
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-foreground/20">
          {!isCollapsed && (
            <Link to="/" className="text-xl font-bold tracking-tight flex items-center text-primary-foreground">
              <MapPin className="h-6 w-6 mr-2" />
              <span>Barangay Portal</span>
            </Link>
          )}
          {!isTablet && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="ml-auto text-primary-foreground hover:bg-primary-foreground/20"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-2 overflow-y-auto",
          isCollapsed || isTablet ? "p-2" : "p-4"
        )}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-200 group",
                  isCollapsed || isTablet
                    ? "w-10 h-10 mx-auto justify-center px-0"
                    : "py-3 px-3 justify-start",
                  isActive(item.path)
                    ? isCollapsed || isTablet
                      ? "bg-white/30 text-white border-l-4 border-white"
                      : "bg-white/20 text-white shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && !isTablet && (
                  <span className="ml-3 font-medium group-hover:translate-x-1 transition-transform duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-primary-foreground/20 space-y-2",
          isCollapsed || isTablet ? "p-2" : "p-4"
        )}>
          <ThemeToggle isCollapsed={isCollapsed || isTablet} />
          
          <Link to="/">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full text-primary-foreground hover:bg-primary-foreground/20 transition-all duration-200",
                isCollapsed || isTablet
                  ? "w-10 h-10 mx-auto justify-center px-0"
                  : "justify-start px-3"
              )}
            >
              <ArrowLeft className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && !isTablet && <span className="ml-3">Back to Home</span>}
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default PublicPagesSidebar;