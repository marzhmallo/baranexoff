import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, User, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchResidents } from "@/lib/api/households";
import { supabase } from '@/integrations/supabase/client';

interface Resident {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  purok: string;
  full_name: string;
  household_id?: string | null;
}

interface HeadOfFamilyInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onResidentSelect: (residentId: string | null) => void;
  selectedResidentId?: string | null;
  placeholder?: string;
  currentHouseholdId?: string | null;
  onValidationChange?: (isValid: boolean) => void;
}

const HeadOfFamilyInput: React.FC<HeadOfFamilyInputProps> = ({
  value,
  onValueChange,
  onResidentSelect,
  selectedResidentId,
  placeholder = "Enter head of family name or search residents...",
  currentHouseholdId,
  onValidationChange
}) => {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if a resident is already a member of another household via householdmembers table
  const checkResidentHousehold = async (residentId: string) => {
    try {
      const { data, error } = await supabase
        .from('householdmembers')
        .select('householdid')
        .eq('residentid', residentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking resident household:', error);
        return null;
      }

      return data?.householdid || null;
    } catch (error) {
      console.error('Error in checkResidentHousehold:', error);
      return null;
    }
  };

  const validateResidentSelection = async (residentId: string) => {
    const residentHouseholdId = await checkResidentHousehold(residentId);
    
    // If resident has a household_id and it's different from current household
    if (residentHouseholdId && residentHouseholdId !== currentHouseholdId) {
      const errorMessage = "This resident is already a member of another household and cannot be selected as head of family.";
      setValidationError(errorMessage);
      onValidationChange?.(false);
      return false;
    }

    setValidationError(null);
    onValidationChange?.(true);
    return true;
  };

  useEffect(() => {
    const searchForResidents = async () => {
      if (value && value.length >= 2) {
        setIsLoading(true);
        const result = await searchResidents(value);
        if (result.success) {
          // Include household_id in the results for validation
          const residentsWithHousehold = await Promise.all(
            result.data.map(async (resident) => {
              const householdId = await checkResidentHousehold(resident.id);
              return { ...resident, household_id: householdId };
            })
          );
          setSearchResults(residentsWithHousehold);
        }
        setIsLoading(false);
      } else {
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchForResidents, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  // Validate when selectedResidentId changes
  useEffect(() => {
    if (selectedResidentId) {
      validateResidentSelection(selectedResidentId);
    } else {
      setValidationError(null);
      onValidationChange?.(true);
    }
  }, [selectedResidentId, currentHouseholdId]);

  const handleResidentSelect = async (resident: Resident) => {
    const isValid = await validateResidentSelection(resident.id);
    
    if (isValid) {
      onValueChange(resident.full_name);
      onResidentSelect(resident.id);
      setOpen(false);
      // Keep focus on input after selection
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
    // If user is typing freely, clear any selected resident and validation error
    if (selectedResidentId) {
      onResidentSelect(null);
      setValidationError(null);
      onValidationChange?.(true);
    }
    if (newValue.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleClearSelection = () => {
    onValueChange("");
    onResidentSelect(null);
    setValidationError(null);
    onValidationChange?.(true);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (value.length >= 2) {
      setOpen(true);
    }
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value.length >= 2) {
      setOpen(true);
    }
  };

  // Ensure input stays focused when popover opens
  const handlePopoverOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Use a longer timeout to ensure the popover is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Handle focus restoration when popover content is mounted
  useEffect(() => {
    if (open) {
      // Ensure focus is maintained when popover opens
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              placeholder={placeholder}
              className={cn(
                "w-full pr-20",
                selectedResidentId && !validationError && "border-green-500 bg-green-50 dark:bg-green-950",
                validationError && "border-red-500 bg-red-50 dark:bg-red-950"
              )}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {validationError && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              {selectedResidentId && !validationError && (
                <User className="h-4 w-4 text-green-600" />
              )}
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0" 
          align="start" 
          side="bottom" 
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            // Prevent the popover from stealing focus
            e.preventDefault();
            // Ensure input keeps focus
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Searching residents...</CommandEmpty>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>
                  {value.length >= 2 ? "No residents found. Text will be saved as entered." : "Type to search residents..."}
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Registered Residents">
                  {searchResults.map((resident) => {
                    const isAlreadyMember = resident.household_id && resident.household_id !== currentHouseholdId;
                    return (
                      <CommandItem
                        key={resident.id}
                        value={resident.full_name}
                        onSelect={() => handleResidentSelect(resident)}
                        className={cn(
                          "flex items-center justify-between cursor-pointer",
                          isAlreadyMember && "opacity-50 cursor-not-allowed"
                        )}
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                        disabled={isAlreadyMember}
                      >
                        <div>
                          <div className="font-medium">{resident.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Purok {resident.purok}
                            {isAlreadyMember && (
                              <span className="text-red-500 ml-2">
                                (Already a household member)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAlreadyMember && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedResidentId === resident.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {validationError && (
        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {validationError}
        </p>
      )}
    </div>
  );
};

export default HeadOfFamilyInput;
