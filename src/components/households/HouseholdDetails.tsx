import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Household } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import HouseholdForm from "./HouseholdForm";
import { ZoomIn, X, Clock, History } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
type HouseholdDetailsProps = {
  household: Household | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEditMode?: boolean;
};
const HouseholdDetails = ({
  household,
  open,
  onOpenChange,
  initialEditMode = false
}: HouseholdDetailsProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();

  const { data: headMember } = useQuery({
    queryKey: ['household-head', household?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('householdmembers')
        .select('role, residents:residentid(id, first_name, middle_name, last_name)')
        .eq('householdid', household.id);
      if (error) throw error;
      const head = (data || []).find((m: any) => (m.role || '').toLowerCase().includes('head'));
      return head || null;
    },
    enabled: !!household?.id
  });

  const headName = headMember?.residents
    ? [headMember.residents.first_name, headMember.residents.middle_name ? headMember.residents.middle_name.charAt(0) + '.' : null, headMember.residents.last_name]
        .filter(Boolean)
        .join(' ')
    : null;
  const isRegisteredHead = !!headMember?.residents;

  // Set edit mode when dialog opens based on initialEditMode prop
  useEffect(() => {
    if (open) {
      setIsEditMode(initialEditMode);
    }
  }, [open, initialEditMode]);
  if (!household) return null;
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Permanent':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Permanent</Badge>;
      case 'Temporary':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Temporary</Badge>;
      case 'Relocated':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Relocated</Badge>;
      case 'Abandoned':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Abandoned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const handleClose = () => {
    console.log("HouseholdDetails - handling close");

    // Reset edit mode when closing
    setIsEditMode(false);

    // First close the dialog through state
    onOpenChange(false);

    // Then clean up any lingering effects to ensure UI remains interactive
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.pointerEvents = '';

      // Remove any focus traps or aria-hidden attributes that might be lingering
      const elements = document.querySelectorAll('[aria-hidden="true"]');
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'false');
      });
    }, 150);
  };
  const handleFormSubmit = () => {
    console.log("HouseholdDetails - form submitted, resetting edit mode");
    setIsEditMode(false);
    handleClose();
  };

  // Navigate to the household details page
  const handleViewMoreDetails = () => {
    handleClose();
    navigate(`/households/${household.id}`);
  };

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date in HouseholdDetails:", dateString);
        return "Invalid date";
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date in HouseholdDetails:", error, "Date string:", dateString);
      return "Date error";
    }
  };

  // Helper function to format the new address
  const formatAddress = (household: Household) => {
    const addressParts = [household.barangayname, household.municipality, household.province, household.purok ? `Purok ${household.purok}` : null].filter(Boolean);
    return addressParts.length > 0 ? addressParts.join(', ') : household.address || "Address not specified";
  };
  return <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col" onInteractOutside={e => {
      console.log("Interaction outside dialog detected in HouseholdDetails");
      e.preventDefault();
    }} onEscapeKeyDown={e => {
      console.log("Escape key pressed in HouseholdDetails");
      e.preventDefault();
    }}>
        {isEditMode ? <>
            <DialogHeader className="shrink-0">
              <DialogTitle>Edit Household</DialogTitle>
              <DialogDescription>
                Update information for {household.name}
              </DialogDescription>
            </DialogHeader>
            <HouseholdForm onSubmit={handleFormSubmit} household={household} />
          </> : <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>Household Details</span>
              </DialogTitle>
              <DialogDescription>
                Complete profile information for household {household.name}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="grid gap-6 pr-4 pb-4">
                {/* Basic Information */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">
                        {household.name}
                        <span className="ml-2">{getStatusBadge(household.status)}</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Head of Family</p>
                          <p>{headName || "Not specified"}</p>
                          {isRegisteredHead && <p className="text-xs text-green-600">✓ Registered resident</p>}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Contact Number</p>
                          <p>{household.contact_number || "Not specified"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Address</p>
                          <p>{formatAddress(household)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Year Established</p>
                          <p>{household.year_established || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Monthly Income</p>
                          <p>{household.monthly_income || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Address Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Barangay</p>
                        <p>{household.barangayname || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Municipality</p>
                        <p>{household.municipality || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Province</p>
                        <p>{household.province || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Region</p>
                        <p>{household.region || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Country</p>
                        <p>{household.country || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Purok</p>
                        <p>{household.purok}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Property Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Property Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Property Type</p>
                        <p>{household.property_type || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">House Type</p>
                        <p>{household.house_type || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Water Source</p>
                        <p>{household.water_source || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Electricity Source</p>
                        <p>{household.electricity_source || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Toilet Type</p>
                        <p>{household.toilet_type || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Garbage Disposal</p>
                        <p>{household.garbage_disposal || "Not specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                    <div>
                      <p className="text-sm text-gray-500">Remarks</p>
                      <p>{household.remarks || "No remarks provided"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Record Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <History className="mr-2 h-4 w-4" />
                      Record Information
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="flex items-center">
                          <Clock className="mr-2 h-3 w-3 text-gray-400" />
                          {household.created_at ? formatDate(household.created_at) : "Not available"}
                        </p>
                      </div>
                      {household.updated_at && <div>
                          <p className="text-sm text-gray-500">Last Updated</p>
                          <p className="flex items-center">
                            <Clock className="mr-2 h-3 w-3 text-gray-400" />
                            {formatDate(household.updated_at)}
                          </p>
                        </div>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-2 pt-4 border-t mt-4 w-full shrink-0">
              
              <Button onClick={handleViewMoreDetails}>More Details</Button>
              <Button variant="ghost" onClick={handleClose}>Close</Button>
            </div>
          </>}
      </DialogContent>
    </Dialog>;
};
export default HouseholdDetails;