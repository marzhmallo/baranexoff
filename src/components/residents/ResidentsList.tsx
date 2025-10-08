import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, UserPlus, Edit, Trash2, ChevronDown, MoreHorizontal, Eye, Download, Printer, FileText, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Resident } from '@/lib/types';
import { getResidents, deleteResident } from '@/lib/api/residents';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EditResidentModal from './EditResidentModal';
import ResidentStatusCard from './ResidentStatusCard';
import ClassificationStatusCard from './ClassificationStatusCard';
import ResidentDetails from './ResidentDetails';
import { toast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the age group options
type AgeGroup = 'Child' | 'Teen' | 'Young Adult' | 'Adult' | 'Elderly';

// Define the sort options
type SortField = 'name' | 'gender' | 'status' | 'age' | 'ageGroup' | 'purok' | 'contact';
type SortDirection = 'asc' | 'desc';

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Define the ResidentRow component to display each resident
const ResidentRow = ({
  resident,
  onViewDetails,
  onEditResident,
  onDeleteResident
}: {
  resident: Resident;
  onViewDetails: (resident: Resident) => void;
  onEditResident: (resident: Resident) => void;
  onDeleteResident: (resident: Resident) => void;
}) => {
  // Calculate age from birthDate
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || m === 0 && today.getDate() < birthDateObj.getDate()) {
      age--;
    }
    return age;
  };
  const age = calculateAge(resident.birthDate);
  const ageGroup = (age: number): AgeGroup => {
    if (age <= 12) return 'Child';
    if (age <= 19) return 'Teen';
    if (age <= 29) return 'Young Adult';
    if (age <= 59) return 'Adult';
    return 'Elderly';
  };

  // Map status to badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Permanent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Permanent</Badge>;
      case 'Temporary':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Temporary</Badge>;
      case 'Deceased':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Deceased</Badge>;
      case 'Relocated':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Relocated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  return <TableRow>
      <TableCell className="font-medium">{resident.firstName} {resident.lastName}</TableCell>
      <TableCell>{resident.gender}</TableCell>
      <TableCell>{getStatusBadge(resident.status)}</TableCell>
      <TableCell>{age}</TableCell>
      <TableCell>{ageGroup(age)}</TableCell>
      <TableCell>{resident.purok || 'N/A'}</TableCell>
      <TableCell>{resident.contactNumber || 'N/A'}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {resident.classifications && resident.classifications.map((classification, index) => <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              {classification}
            </Badge>)}
          {(!resident.classifications || resident.classifications.length === 0) && 'None'}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(resident)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditResident(resident)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDeleteResident(resident)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>;
};
const ResidentsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [isAddResidentOpen, setIsAddResidentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add state for edit dialog
  const [isEditResidentOpen, setIsEditResidentOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null);

  // Add state for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Active sorting cards state - modified to allow both to be active simultaneously
  const [activeStatusCard, setActiveStatusCard] = useState<string | null>(null);
  const [activeClassificationCard, setActiveClassificationCard] = useState<string | null>(null);

  // Use pre-loaded residents data or fetch if not available
  const {
    data: residentsData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      // Always fetch fresh data from API to ensure latest updates
      return getResidents();
    },
    staleTime: 0 // Always fetch fresh data when query is invalidated
  });
  const queryClient = useQueryClient();

  // Show error toast if there's an error fetching data
  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching residents",
        description: "There was a problem loading the resident data.",
        variant: "destructive"
      });
    }
  }, [error]);

  // Calculate counts by status - with null safety
  const permanentCount = residentsData.filter(r => r.status === 'Permanent').length;
  const temporaryCount = residentsData.filter(r => r.status === 'Temporary').length;
  const deceasedCount = residentsData.filter(r => r.status === 'Deceased').length;
  const relocatedCount = residentsData.filter(r => r.status === 'Relocated').length;

  // Calculate counts by classification
  const getClassificationCount = (classification: string) => {
    return residentsData.filter(resident => resident.classifications && Array.isArray(resident.classifications) && resident.classifications.includes(classification)).length;
  };

  // Define classification count variables
  const indigentCount = getClassificationCount('Indigent');
  const studentCount = getClassificationCount('Student');
  const ofwCount = getClassificationCount('OFW');
  const pwdCount = getClassificationCount('PWD');
  const missingCount = getClassificationCount('Missing');

  // Get unique classifications - with null safety
  const allClassifications = useMemo(() => {
    const classifications = new Set<string>();
    if (Array.isArray(residentsData)) {
      residentsData.forEach(resident => {
        if (resident.classifications && Array.isArray(resident.classifications)) {
          resident.classifications.forEach(c => classifications.add(c));
        }
      });
    }
    return Array.from(classifications);
  }, [residentsData]);

  // Function to determine age group
  const getAgeGroup = (age: number): AgeGroup => {
    if (age <= 12) return 'Child';
    if (age <= 19) return 'Teen';
    if (age <= 29) return 'Young Adult';
    if (age <= 59) return 'Adult';
    return 'Elderly';
  };

  // Function to handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-2" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />;
  };

  // Apply filtering and sorting with null safety
  const filteredResidents = useMemo(() => {
    // Ensure we have data to filter
    if (!Array.isArray(residentsData)) {
      return [];
    }

    // Filter by search, status, tab, and classifications
    const filtered = residentsData.filter(resident => {
      // Search filter
      const matchesSearch = searchQuery === '' || `${resident.firstName} ${resident.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || resident.address && resident.address.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter - Check both dropdown and card filters
      const matchesStatus = selectedStatus === null && activeStatusCard === null || selectedStatus !== null && resident.status === selectedStatus || activeStatusCard !== null && resident.status === activeStatusCard;

      // Classifications filter - Check both dropdown and card filters
      const hasClassificationsArray = resident.classifications && Array.isArray(resident.classifications);
      let matchesClassifications = true;
      if (selectedClassifications.length > 0 && hasClassificationsArray) {
        matchesClassifications = selectedClassifications.some(classification => resident.classifications!.includes(classification));
      } else if (activeClassificationCard !== null && hasClassificationsArray) {
        matchesClassifications = resident.classifications!.includes(activeClassificationCard);
      } else if (selectedClassifications.length > 0 && !hasClassificationsArray) {
        matchesClassifications = false;
      }

      // Age group filter
      let matchesAgeGroup = true;
      if (selectedAgeGroup !== null) {
        const today = new Date();
        const birthDateObj = new Date(resident.birthDate);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || m === 0 && today.getDate() < birthDateObj.getDate()) {
          age--;
        }
        const residentAgeGroup = getAgeGroup(age);
        matchesAgeGroup = residentAgeGroup === selectedAgeGroup;
      }
      return matchesSearch && matchesStatus && matchesClassifications && matchesAgeGroup;
    });

    // Apply sorting with null safety
    return [...filtered].sort((a, b) => {
      // Calculate ages first to avoid repeated calculations
      const dateA = new Date(a.birthDate);
      const dateB = new Date(b.birthDate);
      const today = new Date();

      // Age calculation code is kept here
      let ageA = today.getFullYear() - dateA.getFullYear();
      const mA = today.getMonth() - dateA.getMonth();
      if (mA < 0 || mA === 0 && today.getDate() < dateA.getDate()) {
        ageA--;
      }
      let ageB = today.getFullYear() - dateB.getFullYear();
      const mB = today.getMonth() - dateB.getMonth();
      if (mB < 0 || mB === 0 && today.getDate() < dateB.getDate()) {
        ageB--;
      }
      const ageGroupA = getAgeGroup(ageA);
      const ageGroupB = getAgeGroup(ageB);
      const directionModifier = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * directionModifier;
        case 'gender':
          return a.gender.localeCompare(b.gender) * directionModifier;
        case 'status':
          return a.status.localeCompare(b.status) * directionModifier;
        case 'age':
          return (ageA - ageB) * directionModifier;
        case 'ageGroup':
          const ageGroupOrder = {
            'Child': 1,
            'Teen': 2,
            'Young Adult': 3,
            'Adult': 4,
            'Elderly': 5
          };
          return (ageGroupOrder[ageGroupA] - ageGroupOrder[ageGroupB]) * directionModifier;
        case 'purok':
          // Some residents might not have a purok field
          const purokA = a.purok || '';
          const purokB = b.purok || '';
          return purokA.localeCompare(purokB) * directionModifier;
        case 'contact':
          return (a.contactNumber || '').localeCompare(b.contactNumber || '') * directionModifier;
        default:
          return 0;
      }
    });
  }, [searchQuery, residentsData, sortField, sortDirection, activeStatusCard, activeClassificationCard, selectedStatus, selectedClassifications, selectedAgeGroup]);

  // Calculate pagination
  const pageCount = Math.ceil(filteredResidents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredResidents.length);
  const paginatedResidents = filteredResidents.slice(startIndex, endIndex);
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status);
    setCurrentPage(1); // Reset to first page on filter change
  };
  const handleClassificationToggle = (classification: string) => {
    if (selectedClassifications.includes(classification)) {
      setSelectedClassifications(prev => prev.filter(c => c !== classification));
    } else {
      setSelectedClassifications(prev => [...prev, classification]);
    }
    setCurrentPage(1); // Reset to first page on filter change
  };
  const handleAgeGroupFilter = (ageGroup: AgeGroup | null) => {
    setSelectedAgeGroup(ageGroup);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Updated to allow both status and classification to be active together
  const handleStatusCardClick = (status: string) => {
    // If clicking on the already active card, toggle it off
    if (activeStatusCard === status) {
      setActiveStatusCard(null);
    } else {
      setActiveStatusCard(status);
    }
    setCurrentPage(1); // Reset to first page on status card click
  };

  // Updated to allow both status and classification to be active together
  const handleClassificationCardClick = (classification: string) => {
    // If clicking on the already active card, toggle it off
    if (activeClassificationCard === classification) {
      setActiveClassificationCard(null);
    } else {
      setActiveClassificationCard(classification);
    }
    setCurrentPage(1); // Reset to first page on classification card click
  };

  // Generate title based on active cards
  const getFilterTitle = () => {
    if (activeStatusCard && activeClassificationCard) {
      return `${activeStatusCard} ${activeClassificationCard} Residents`;
    } else if (activeStatusCard) {
      return `${activeStatusCard} Residents`;
    } else if (activeClassificationCard) {
      return `${activeClassificationCard} Residents`;
    }
    return 'All Residents';
  };
  const handleViewDetails = (resident: Resident) => {
    setSelectedResident(resident);
    setIsDetailsOpen(true);
  };
  const handleCloseDetails = () => {
    // Add a small delay before fully closing to ensure proper cleanup
    setTimeout(() => {
      setSelectedResident(null);
    }, 100);
    setIsDetailsOpen(false);
  };
  const handleEditResident = (resident: Resident) => {
    setResidentToEdit(resident);
    setIsEditResidentOpen(true);
  };
  const handleCloseEditDialog = () => {
    // First close the dialog through state
    setIsEditResidentOpen(false);

    // Then clean up any lingering effects to ensure UI remains interactive
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.pointerEvents = '';

      // Remove any focus traps or aria-hidden attributes that might be lingering
      const elements = document.querySelectorAll('[aria-hidden="true"]');
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'false');
      });

      // After everything is cleaned up, we can reset the resident to edit
      setResidentToEdit(null);
    }, 150);
  };
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Mock implementation for deleteResident since it's imported but not provided
  const handleDeleteResident = (resident: Resident) => {
    setResidentToDelete(resident);
    setIsDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!residentToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteResident(residentToDelete.id);
      if (result.success) {
        toast({
          title: "Resident deleted",
          description: `${residentToDelete.firstName} ${residentToDelete.lastName} has been successfully deleted.`,
          variant: "default"
        });

        // Refresh the residents list
        queryClient.invalidateQueries({
          queryKey: ['residents']
        });

        // Close the dialog
        setIsDeleteDialogOpen(false);
        setResidentToDelete(null);
      } else {
        toast({
          title: "Error deleting resident",
          description: result.error || "There was a problem deleting the resident.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting resident:', error);
      toast({
        title: "Error deleting resident",
        description: "An unexpected error occurred while deleting the resident.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setResidentToDelete(null);
  };
  return <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
        <ResidentStatusCard label="Permanent Residents" count={permanentCount} bgColor="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/30" textColor="text-green-800 dark:text-green-300" iconBgColor="bg-green-200 dark:bg-green-800" iconColor="text-green-700 dark:text-green-300" onClick={() => handleStatusCardClick('Permanent')} isActive={activeStatusCard === 'Permanent'} />
        
        <ResidentStatusCard label="Temporary Residents" count={temporaryCount} bgColor="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30" textColor="text-blue-800 dark:text-blue-300" iconBgColor="bg-blue-200 dark:bg-blue-800" iconColor="text-blue-700 dark:text-blue-300" onClick={() => handleStatusCardClick('Temporary')} isActive={activeStatusCard === 'Temporary'} />
        
        <ResidentStatusCard label="Deceased Residents" count={deceasedCount} bgColor="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30" textColor="text-red-800 dark:text-red-300" iconBgColor="bg-red-200 dark:bg-red-800" iconColor="text-red-700 dark:text-red-300" onClick={() => handleStatusCardClick('Deceased')} isActive={activeStatusCard === 'Deceased'} />
        
        <ResidentStatusCard label="Relocated Residents" count={relocatedCount} bgColor="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30" textColor="text-purple-800 dark:text-purple-300" iconBgColor="bg-purple-200 dark:bg-purple-800" iconColor="text-purple-700 dark:text-purple-300" onClick={() => handleStatusCardClick('Relocated')} isActive={activeStatusCard === 'Relocated'} />
      </div>
      
      {/* Classification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6">
        <ClassificationStatusCard label="Indigent" count={indigentCount} bgColor="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30" textColor="text-amber-800 dark:text-amber-300" iconBgColor="bg-amber-200 dark:bg-amber-800" iconColor="text-amber-700 dark:text-amber-300" onClick={() => handleClassificationCardClick('Indigent')} isActive={activeClassificationCard === 'Indigent'} />
        
        <ClassificationStatusCard label="Student" count={studentCount} bgColor="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/40 dark:to-cyan-900/30" textColor="text-cyan-800 dark:text-cyan-300" iconBgColor="bg-cyan-200 dark:bg-cyan-800" iconColor="text-cyan-700 dark:text-cyan-300" onClick={() => handleClassificationCardClick('Student')} isActive={activeClassificationCard === 'Student'} />
        
        <ClassificationStatusCard label="OFW" count={ofwCount} bgColor="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30" textColor="text-indigo-800 dark:text-indigo-300" iconBgColor="bg-indigo-200 dark:bg-indigo-800" iconColor="text-indigo-700 dark:text-indigo-300" onClick={() => handleClassificationCardClick('OFW')} isActive={activeClassificationCard === 'OFW'} />
        
        <ClassificationStatusCard label="PWD" count={pwdCount} bgColor="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/40 dark:to-pink-900/30" textColor="text-pink-800 dark:text-pink-300" iconBgColor="bg-pink-200 dark:bg-pink-800" iconColor="text-pink-700 dark:text-pink-300" onClick={() => handleClassificationCardClick('PWD')} isActive={activeClassificationCard === 'PWD'} />
        
        <ClassificationStatusCard label="Missing" count={missingCount} bgColor="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30" textColor="text-orange-800 dark:text-orange-300" iconBgColor="bg-orange-200 dark:bg-orange-800" iconColor="text-orange-700 dark:text-orange-300" onClick={() => handleClassificationCardClick('Missing')} isActive={activeClassificationCard === 'Missing'} />
      </div>
      
      {/* Show active filter title */}
      {(activeStatusCard || activeClassificationCard) && <div className="px-6">
          <h3 className="text-xl font-semibold text-foreground flex items-center">
            {getFilterTitle()}
            <Button variant="ghost" size="sm" className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => {
          setActiveStatusCard(null);
          setActiveClassificationCard(null);
          setSelectedAgeGroup(null);
          setCurrentPage(1);
        }}>
              Clear filters
            </Button>
          </h3>
        </div>}
      
      <div className="bg-card text-card-foreground rounded-lg shadow-md">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border-b bg-muted/50">
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder="Search residents..." className="pl-9 w-full sm:w-[250px]" value={searchQuery} onChange={handleSearch} />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {selectedStatus || "All Statuses"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusFilter(null)}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('Permanent')}>
                    Permanent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('Temporary')}>
                    Temporary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('Deceased')}>
                    Deceased
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('Relocated')}>
                    Relocated
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {allClassifications.length > 0 && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Classifications
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Classification</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allClassifications.map(classification => <DropdownMenuItem key={classification} onClick={() => handleClassificationToggle(classification)}>
                        <div className="flex items-center">
                          {selectedClassifications.includes(classification) && <Check className="h-4 w-4 mr-2 text-primary" />}
                          <span className={selectedClassifications.includes(classification) ? "ml-6" : ""}>
                            {classification}
                          </span>
                        </div>
                      </DropdownMenuItem>)}
                    {selectedClassifications.length > 0 && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSelectedClassifications([])}>
                          Clear filters
                        </DropdownMenuItem>
                      </>}
                  </DropdownMenuContent>
                </DropdownMenu>}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {selectedAgeGroup || "All Age Groups"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Age Group</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter(null)}>
                    All Age Groups
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter('Child')}>
                    Child (0-12)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter('Teen')}>
                    Teen (13-19)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter('Young Adult')}>
                    Young Adult (20-29)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter('Adult')}>
                    Adult (30-59)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgeGroupFilter('Elderly')}>
                    Elderly (60+)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <EditResidentModal 
                isOpen={isAddResidentOpen} 
                onClose={() => {
                  // First close the dialog through state
                  setIsAddResidentOpen(false);

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
                }}
                resident={null}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-card border-b">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex items-center">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Report
              </Button>
            </div>
            <div className="flex items-center gap-4">
              
              
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Tabs Content - Only include status tabs */}
          {['all', 'permanent', 'temporary', 'deceased', 'relocated'].map(tab => <TabsContent key={tab} value={tab} className="m-0">
              {isLoading ? <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-baranex-primary"></div>
                </div> : <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('name')}>
                          <div className="flex items-center">
                            Name {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('gender')}>
                          <div className="flex items-center">
                            Gender {getSortIcon('gender')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('status')}>
                          <div className="flex items-center">
                            Status {getSortIcon('status')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('age')}>
                          <div className="flex items-center">
                            Age {getSortIcon('age')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('ageGroup')}>
                          <div className="flex items-center">
                            Age Group {getSortIcon('ageGroup')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('purok')}>
                          <div className="flex items-center">
                            Purok {getSortIcon('purok')}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('contact')}>
                          <div className="flex items-center">
                            Contact {getSortIcon('contact')}
                          </div>
                        </TableHead>
                        <TableHead>Classifications</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResidents.map(resident => <ResidentRow key={resident.id} resident={resident} onViewDetails={handleViewDetails} onEditResident={handleEditResident} onDeleteResident={handleDeleteResident} />)}
                    </TableBody>
                  </Table>
                </div>}
              
              {filteredResidents.length === 0 && !isLoading && <div className="py-12 text-center text-muted-foreground bg-muted/30">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="h-12 w-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium text-foreground">No residents found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filter criteria.</p>
                  </div>
                </div>}
            </TabsContent>)}
          
          {/* Pagination */}
          {filteredResidents.length > 0 && <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {filteredResidents.length} residents
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} />
                  </PaginationItem>
                  
                  {Array.from({
                length: pageCount
              }).map((_, i) => {
                const pageNum = i + 1;

                // Show first page, last page, and pages around current page
                if (pageNum === 1 || pageNum === pageCount || pageNum >= currentPage - 1 && pageNum <= currentPage + 1) {
                  return <PaginationItem key={pageNum}>
                          <PaginationLink isActive={pageNum === currentPage} onClick={() => handlePageChange(pageNum)}>
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>;
                }

                // Show ellipsis for gaps
                if (pageNum === 2 || pageNum === pageCount - 1) {
                  return <PaginationItem key={`ellipsis-${pageNum}`}>
                          <PaginationEllipsis />
                        </PaginationItem>;
                }
                return null;
              })}
                  
                  <PaginationItem>
                    <PaginationNext onClick={() => handlePageChange(Math.min(pageCount, currentPage + 1))} className={currentPage === pageCount ? "pointer-events-none opacity-50" : ""} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>}
        </Tabs>
      </div>
      
      {/* Resident Details Dialog */}
      {selectedResident && <ResidentDetails resident={selectedResident} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />}
      
      {/* Edit Resident Modal */}
      <EditResidentModal 
        isOpen={isEditResidentOpen} 
        onClose={handleCloseEditDialog}
        resident={residentToEdit}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Resident
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-foreground">
                  {residentToDelete?.firstName} {residentToDelete?.lastName}
                </span>
                ?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All resident data, including personal information, 
                documents, and related records will be permanently removed from the system.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {isDeleting ? <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Deleting...
                </> : <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Resident
                </>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default ResidentsList;