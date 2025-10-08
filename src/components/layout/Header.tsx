
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  MessageSquare,
  BarChart3,
  Calendar,
  FileText,
  AlertTriangle,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-baranex-primary text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] bg-sidebar">
              <nav className="flex flex-col space-y-4 mt-8">
                <Link to="/" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <User className="mr-2 h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/residents" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <User className="mr-2 h-5 w-5" />
                  <span>Residents</span>
                </Link>
                <Link to="/announcements" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <Calendar className="mr-2 h-5 w-5" />
                  <span>Announcements</span>
                </Link>
                <Link to="/forum" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  <span>Forum</span>
                </Link>
                <Link to="/crime-reports" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <FileText className="mr-2 h-5 w-5" />
                  <span>Crime Reports</span>
                </Link>
                <Link to="/statistics" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  <span>Statistics</span>
                </Link>
                <Link to="/emergencies" className="flex items-center py-2 px-4 text-white hover:bg-sidebar-accent rounded-md">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  <span>Emergency Response</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center">
            <span className="text-white bg-baranex-accent px-2 py-1 rounded mr-1">Baran</span>
            <span className="text-baranex-accent">EX</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1">
          <Link to="/" className="px-3 py-2 text-sm font-medium rounded-md text-white hover:bg-baranex-primary/80">
            Dashboard
          </Link>
          <Link to="/residents" className="px-3 py-2 text-sm font-medium rounded-md text-white hover:bg-baranex-primary/80">
            Residents
          </Link>
          <Link to="/announcements" className="px-3 py-2 text-sm font-medium rounded-md text-white hover:bg-baranex-primary/80">
            Announcements
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-3 py-2 text-sm font-medium rounded-md text-white hover:bg-baranex-primary/80 flex items-center">
                More 
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/forum" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Forum</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/crime-reports" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Crime Reports</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/statistics" className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Statistics</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-white">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
          </Button>
          <Button variant="outline" size="sm" className="bg-white text-baranex-primary hover:bg-gray-100">
            Admin
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
