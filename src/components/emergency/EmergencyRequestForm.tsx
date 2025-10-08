import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Heart, Droplet, Pill, AlertCircle, Shirt, HelpCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

const requestTypes = [
  { value: "Food", label: "Food", icon: Heart, color: "bg-orange-500" },
  { value: "Water", label: "Water", icon: Droplet, color: "bg-blue-500" },
  { value: "Medicine", label: "Medicine", icon: Pill, color: "bg-green-500" },
  { value: "Rescue", label: "Rescue", icon: AlertCircle, color: "bg-red-500" },
  { value: "Clothing", label: "Clothing", icon: Shirt, color: "bg-purple-500" },
  { value: "Other", label: "Other", icon: HelpCircle, color: "bg-gray-500" },
];

export const EmergencyRequestForm = ({ isOpen, onClose, userProfile }: EmergencyRequestFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [contactNumber, setContactNumber] = useState("");
  const [specificPlace, setSpecificPlace] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const getLocationFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || "Location detected";
    } catch (error) {
      console.error("Error getting address:", error);
      return "Location detected";
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await getLocationFromCoords(latitude, longitude);
        setLocation({ latitude, longitude, address });
        setGettingLocation(false);
        toast({
          title: "Location detected",
          description: "Your current location has been captured.",
        });
      },
      (error) => {
        setGettingLocation(false);
        toast({
          title: "Location error",
          description: "Unable to get your location. Please try again.",
          variant: "destructive",
        });
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const toggleNeed = (need: string) => {
    setSelectedNeeds(prev => 
      prev.includes(need) 
        ? prev.filter(n => n !== need)
        : [...prev, need]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedNeeds.length === 0) {
      toast({
        title: "Select needs",
        description: "Please select at least one type of help you need.",
        variant: "destructive",
      });
      return;
    }

    if (!location) {
      toast({
        title: "Location required",
        description: "Please detect your location before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!contactNumber) {
      toast({
        title: "Contact required",
        description: "Please provide a contact number.",
        variant: "destructive",
      });
      return;
    }

    if (!specificPlace.trim()) {
      toast({
        title: "Specific place required",
        description: "Please provide a specific place or landmark.",
        variant: "destructive",
      });
      return;
    }

    // Input validation
    if (contactNumber.trim().length < 7 || contactNumber.trim().length > 15) {
      toast({
        title: "Invalid contact number",
        description: "Contact number must be between 7-15 characters.",
        variant: "destructive",
      });
      return;
    }

    if (specificPlace.trim().length > 200) {
      toast({
        title: "Specific place too long",
        description: "Please keep the location description under 200 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("emergency_requests" as any)
        .insert({
          resident_id: userProfile.id,
          brgyid: userProfile.brgyid,
          request_type: selectedNeeds[0], // Primary need
          needs: selectedNeeds, // All selected needs as jsonb array
          contactno: contactNumber.trim(),
          specificplace: specificPlace.trim() || null,
          details: details.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
          status: "Pending",
        });

      if (error) throw error;

      toast({
        title: "Emergency request sent!",
        description: "Your request has been sent to your barangay officials.",
      });

      // Reset form
      setSelectedNeeds([]);
      setContactNumber("");
      setSpecificPlace("");
      setDetails("");
      setLocation(null);
      onClose();
    } catch (error: any) {
      console.error("Error submitting emergency request:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Unable to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="h-6 w-6 text-red-500" />
            Pin Emergency Location
          </DialogTitle>
          <DialogDescription>
            Report an emergency location that needs assistance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Detection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Emergency Location</Label>
            <Button
              type="button"
              onClick={handleGetLocation}
              disabled={gettingLocation}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Detecting Location...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-5 w-5" />
                  Use My Current Location
                </>
              )}
            </Button>
            
            {!location && (
              <p className="text-sm text-muted-foreground">
                Click the button above to detect your location.
              </p>
            )}

            {location && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold text-sm">Detected Location:</p>
                <p className="text-sm">{location.address}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Latitude: {location.latitude.toFixed(7)}</p>
                  <p>Longitude: {location.longitude.toFixed(7)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Number */}
          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number *</Label>
            <Input
              id="contact"
              type="tel"
              placeholder="e.g., 09171234567"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              maxLength={15}
              required
            />
          </div>

          {/* Specific Place/Landmark */}
          <div className="space-y-2">
            <Label htmlFor="specificPlace">Specific Place or Landmark *</Label>
            <Input
              id="specificPlace"
              type="text"
              placeholder="e.g., Near City Hall, Beside ABC Store, Green House"
              value={specificPlace}
              onChange={(e) => setSpecificPlace(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              Help responders find you faster by providing a nearby landmark or specific location description
            </p>
          </div>

          {/* Request Type Selection - Multiple Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">What do you need? * (Select multiple)</Label>
            {selectedNeeds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                {selectedNeeds.map((need) => (
                  <span
                    key={need}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm"
                  >
                    {need}
                    <button
                      type="button"
                      onClick={() => toggleNeed(need)}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {requestTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedNeeds.includes(type.value);
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleNeed(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all relative",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className={cn("p-3 rounded-full text-white", type.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              placeholder="Any additional information about the emergency..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={loading || !location || selectedNeeds.length === 0 || !contactNumber || !specificPlace}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Emergency"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
