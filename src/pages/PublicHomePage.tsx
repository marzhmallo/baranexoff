import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, MapPin, Users, Calendar, AlertTriangle, MessageSquare, FileText, BellRing } from "lucide-react";
import { BarangaySelectionModal } from "@/components/public/BarangaySelectionModal";
import { BarangayBanner } from "@/components/public/BarangayBanner";
import { useBarangaySelection } from "@/hooks/useBarangaySelection";
import { ThemeToggle } from "@/components/theme/IconThemeToggle";

const PublicHomePage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<
    "announcements" | "events" | "officials" | "emergency" | "forum"
  >("announcements");
  const { selectedBarangay, showBanner, clearSelection, dismissBanner } = useBarangaySelection();
  const navigate = useNavigate();

  const handleContentNavigation = (contentType: "announcements" | "events" | "officials" | "emergency" | "forum") => {
    if (selectedBarangay) {
      // If barangay is already selected, navigate directly
      navigate(`/public/${contentType}?barangay=${selectedBarangay.id}`);
    } else {
      // Show modal for barangay selection
      setSelectedContentType(contentType);
      setModalOpen(true);
    }
  };

  const handleChangeBarangay = () => {
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Public Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 md:px-4 py-4 lg:py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 md:gap-2">
            <div className="h-10 w-10 lg:h-12 lg:w-12 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold">Barangay Portal</h1>
          </Link>
          <nav className="hidden md:flex items-center gap-2 md:gap-3 lg:gap-6">
            <button
              onClick={() => handleContentNavigation("announcements")}
              className="text-xs md:text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              Announcements
            </button>
            <button
              onClick={() => handleContentNavigation("events")}
              className="text-xs md:text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              Events
            </button>
            <button
              onClick={() => handleContentNavigation("officials")}
              className="text-xs md:text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              Officials
            </button>
            <button
              onClick={() => handleContentNavigation("emergency")}
              className="text-xs md:text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              Emergency
            </button>
            <button
              onClick={() => handleContentNavigation("forum")}
              className="text-xs md:text-xs lg:text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              Forum
            </button>
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm" className="text-xs md:text-xs lg:text-sm md:px-2 lg:px-4">
                <LogIn className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden lg:inline">Login</span>
                <span className="lg:hidden">Login</span>
              </Button>
            </Link>
          </nav>
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Barangay Banner */}
      {showBanner && selectedBarangay && (
        <BarangayBanner onChangeBarangay={handleChangeBarangay} onDismiss={clearSelection} />
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-10 md:py-10 lg:py-16">
        <div className="container mx-auto px-4 md:px-4 md:max-w-[95%] lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold mb-4 md:mb-6">
            Welcome to Your <span className="text-primary">Barangay Portal</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl md:max-w-3xl mx-auto px-4">
            Stay connected with your community. Access important announcements, events, officials information, and
            emergency services all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center max-w-lg mx-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto text-sm md:text-base"
              onClick={() => handleContentNavigation("announcements")}
            >
              View Latest Announcements
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-sm md:text-base"
              onClick={() => handleContentNavigation("emergency")}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Emergency Services
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-10 md:py-10 lg:py-16">
        <div className="container mx-auto px-4 md:px-4 md:max-w-[95%]">
          <h3 className="text-2xl lg:text-3xl font-bold text-center mb-6 md:mb-8 lg:mb-12">Community Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-6 max-w-6xl mx-auto">
            <Card
              className="h-full hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleContentNavigation("announcements")}
            >
              <CardHeader className="p-3 md:p-3 lg:p-6">
                <FileText className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                <CardTitle className="break-words hyphens-auto">Announcements</CardTitle>
                <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                  Stay updated with the latest news and announcements from your barangay
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="h-full hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleContentNavigation("events")}
            >
              <CardHeader className="p-3 md:p-3 lg:p-6">
                <Calendar className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                <CardTitle className="break-words hyphens-auto">Events Calendar</CardTitle>
                <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                  View upcoming community events, meetings, and important dates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="h-full hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleContentNavigation("officials")}
            >
              <CardHeader className="p-3 md:p-3 lg:p-6">
                <Users className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                <CardTitle className="break-words hyphens-auto">Barangay Officials</CardTitle>
                <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                  Meet your elected officials and learn about their roles and responsibilities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="h-full hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleContentNavigation("emergency")}
            >
              <CardHeader className="p-3 md:p-3 lg:p-6">
                <AlertTriangle className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                <CardTitle className="break-words hyphens-auto">Emergency Services</CardTitle>
                <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                  Access emergency contacts, evacuation centers, and disaster preparedness info
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="h-full hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleContentNavigation("forum")}
            >
              <CardHeader className="p-3 md:p-3 lg:p-6">
                <MessageSquare className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                <CardTitle className="break-words hyphens-auto">Community Forum</CardTitle>
                <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                  Participate in community discussions and share your thoughts
                </CardDescription>
              </CardHeader>
            </Card>

            <Link to="/login">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
                <CardHeader className="p-3 md:p-3 lg:p-6">
                  <LogIn className="h-8 w-8 md:h-7 md:w-7 lg:h-8 lg:w-8 text-primary mb-2" />
                  <CardTitle className="break-words hyphens-auto">For Administrators</CardTitle>
                  <CardDescription className="text-sm md:text-sm lg:text-base break-words">
                    Login to access the administrative dashboard and management tools
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-8 md:py-8 lg:py-12 mt-auto">
        <div className="container mx-auto px-4 md:px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-sm md:text-base lg:text-lg font-bold mb-3 lg:mb-4">Barangay Portal</h3>
              <p className="text-muted-foreground mb-3 lg:mb-4 text-sm lg:text-base break-words">
                Your gateway to community services and information
              </p>
              <p className="text-muted-foreground text-sm lg:text-base break-words">
                Connecting communities, one click at a time
              </p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-sm md:text-base lg:text-lg font-bold mb-3 lg:mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleContentNavigation("announcements")}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base"
                  >
                    Announcements
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleContentNavigation("events")}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base"
                  >
                    Events Calendar
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleContentNavigation("officials")}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base"
                  >
                    Barangay Officials
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleContentNavigation("emergency")}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base"
                  >
                    Emergency Services
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleContentNavigation("forum")}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base"
                  >
                    Community Forum
                  </button>
                </li>
              </ul>
            </div>
            <div className="text-center md:text-left md:col-span-2 lg:col-span-1">
              <h3 className="text-sm md:text-base lg:text-lg font-bold mb-3 lg:mb-4">Information</h3>
              <p className="text-muted-foreground mb-3 lg:mb-4 text-sm lg:text-base break-words">
                This portal provides access to public information and services
              </p>
              <p className="text-muted-foreground text-sm lg:text-base break-words">
                For administrative access, please contact your local officials
              </p>
            </div>
          </div>
          <div className="border-t border-border mt-6 lg:mt-8 pt-6 lg:pt-8 text-center text-xs md:text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Barangay Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Barangay Selection Modal */}
      <BarangaySelectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contentType={selectedContentType}
      />
    </div>
  );
};

export default PublicHomePage;
