import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { getHouseholds, deleteHousehold } from "@/lib/api/households";
import { Household } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import HouseholdDetails from './HouseholdDetails';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
const HouseholdList: React.FC = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [purokFilter, setPurokFilter] = useState<string>('');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [householdToDelete, setHouseholdToDelete] = useState<string | null>(null);

  // Sorting and pagination states
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const {
    data: householdsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['households'],
    queryFn: getHouseholds
  });
  const deleteHouseholdMutation = useMutation({
    mutationFn: (id: string) => deleteHousehold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['households']
      });
      toast({
        title: "Household Deleted",
        description: "The household has been successfully deleted."
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the household.",
        variant: "destructive"
      });
    }
  });
  const handleViewDetails = (household: Household) => {
    setSelectedHousehold(household);
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };
  const handleEditHousehold = (household: Household) => {
    setSelectedHousehold(household);
    setIsEditMode(true);
    setIsDetailsOpen(true);
  };
  const handleViewMore = (household: Household) => {
    navigate(`/households/${household.id}`);
  };
  const confirmDelete = (id: string) => {
    setHouseholdToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  const handleDelete = () => {
    if (householdToDelete) {
      deleteHouseholdMutation.mutate(householdToDelete);
    }
  };
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };
  const SortIcon = ({
    field
  }: {
    field: string;
  }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />;
  };
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'permanent':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Permanent</Badge>;
      case 'temporary':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Temporary</Badge>;
      case 'relocated':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Relocated</Badge>;
      case 'abandoned':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Abandoned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const uniquePuroks = useMemo(() => {
    if (!householdsData?.data) return [];
    const puroks = new Set<string>();
    householdsData.data.forEach((household: Household) => {
      if (household.purok) {
        puroks.add(household.purok);
      }
    });
    return Array.from(puroks).sort();
  }, [householdsData?.data]);
  const uniqueStatuses = useMemo(() => {
    if (!householdsData?.data) return [];
    const statuses = new Set<string>();
    householdsData.data.forEach((household: Household) => {
      if (household.status) {
        statuses.add(household.status);
      }
    });
    return Array.from(statuses).sort();
  }, [householdsData?.data]);
  const householdStats = useMemo(() => {
    if (!householdsData?.data) return {
      total: 0,
      permanent: 0,
      temporary: 0,
      relocated: 0,
      abandoned: 0
    };
    const stats = {
      total: householdsData.data.length,
      permanent: 0,
      temporary: 0,
      relocated: 0,
      abandoned: 0
    };
    householdsData.data.forEach((household: Household) => {
      if (household.status?.toLowerCase() === 'permanent') stats.permanent++;else if (household.status?.toLowerCase() === 'temporary') stats.temporary++;else if (household.status?.toLowerCase() === 'relocated') stats.relocated++;else if (household.status?.toLowerCase() === 'abandoned') stats.abandoned++;
    });
    return stats;
  }, [householdsData?.data]);
  const sortedAndFilteredHouseholds = useMemo(() => {
    if (!householdsData?.data) return [];
    let filtered = householdsData.data.filter((household: Household) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = household.name?.toLowerCase().includes(query) || false || household.address?.toLowerCase().includes(query) || false || household.head_of_family_name?.toLowerCase().includes(query) || false || household.purok?.toLowerCase().includes(query) || false || household.contact_number?.toLowerCase().includes(query) || false;
      const matchesStatus = !statusFilter || statusFilter === "all-statuses" ? true : household.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesPurok = !purokFilter || purokFilter === "all-puroks" ? true : household.purok?.toLowerCase() === purokFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesPurok;
    });

    // Apply sorting
    if (sortField) {
      filtered.sort((a: Household, b: Household) => {
        let aValue = '';
        let bValue = '';
        switch (sortField) {
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'address':
            aValue = a.address || '';
            bValue = b.address || '';
            break;
          case 'head_of_family_name':
            aValue = a.head_of_family_name || '';
            bValue = b.head_of_family_name || '';
            break;
          case 'contact_number':
            aValue = a.contact_number || '';
            bValue = b.contact_number || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          default:
            return 0;
        }
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [householdsData?.data, searchQuery, statusFilter, purokFilter, sortField, sortDirection]);
  const totalItems = sortedAndFilteredHouseholds.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentHouseholds = sortedAndFilteredHouseholds.slice(startIndex, endIndex);
  const currentHouseholdIds = useMemo(() => currentHouseholds.map(h => h?.id).filter(Boolean) as string[], [currentHouseholds]);
  const {
    data: headNamesMap
  } = useQuery({
    queryKey: ['household-heads', currentHouseholdIds],
    queryFn: async () => {
      if (!currentHouseholdIds.length) return {} as Record<string, string>;
      const {
        data,
        error
      } = await supabase.from('householdmembers').select('householdid, role, residents:residentid(first_name, middle_name, last_name)').in('householdid', currentHouseholdIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((m: any) => {
        const role = (m.role || '').toLowerCase();
        const isHead = role.includes('head');
        if (isHead) {
          const r = m.residents;
          const name = r ? [r.first_name, r.middle_name ? r.middle_name.charAt(0) + '.' : null, r.last_name].filter(Boolean).join(' ') : null;
          if (name) map[m.householdid] = name;
        }
      });
      return map;
    },
    enabled: currentHouseholdIds.length > 0
  });
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const handlePageSizeChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, purokFilter, itemsPerPage]);
  if (isLoading) return <div className="p-4 text-center">Loading households...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading households: {error.toString()}</div>;
  return <>
      {/* Enhanced Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-2">
        {/* Total Households */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{householdStats.total}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total</p>
            </div>
          </div>
          <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{
            width: '100%'
          }}></div>
          </div>
        </div>
        
        {/* Permanent Households */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{householdStats.permanent}</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Permanent</p>
            </div>
          </div>
          <div className="h-2 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{
            width: householdStats.total > 0 ? `${householdStats.permanent / householdStats.total * 100}%` : '0%'
          }}></div>
          </div>
        </div>
        
        {/* Temporary Households */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-yellow-500 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{householdStats.temporary}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Temporary</p>
            </div>
          </div>
          <div className="h-2 bg-yellow-200 dark:bg-yellow-800 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full" style={{
            width: householdStats.total > 0 ? `${householdStats.temporary / householdStats.total * 100}%` : '0%'
          }}></div>
          </div>
        </div>
        
        {/* Relocated Households */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-500 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{householdStats.relocated}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Relocated</p>
            </div>
          </div>
          <div className="h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{
            width: householdStats.total > 0 ? `${householdStats.relocated / householdStats.total * 100}%` : '0%'
          }}></div>
          </div>
        </div>
        
        {/* Abandoned Households */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-red-500 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{householdStats.abandoned}</p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Abandoned</p>
            </div>
          </div>
          <div className="h-2 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{
            width: householdStats.total > 0 ? `${householdStats.abandoned / householdStats.total * 100}%` : '0%'
          }}></div>
          </div>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 px-[12px]">
          <Input placeholder="Search households by name, address, head of family, etc." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full px-[15px]" />
        </div>
        
        <div className="flex gap-2 px-[15px]">
          <Select value={purokFilter} onValueChange={setPurokFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Purok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-puroks">All Puroks</SelectItem>
              {uniquePuroks.map(purok => <SelectItem key={purok} value={purok}>{purok}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-statuses">All Statuses</SelectItem>
              {uniqueStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Pagination controls and info */}
      <div className="flex justify-between items-center mb-4 px-4">
        
        
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">Show:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
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
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('name')}>
              Name <SortIcon field="name" />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('address')}>
              Address <SortIcon field="address" />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('head_of_family_name')}>
              Head of Family <SortIcon field="head_of_family_name" />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('contact_number')}>
              Contact Number <SortIcon field="contact_number" />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/50 select-none" onClick={() => handleSort('status')}>
              Status <SortIcon field="status" />
            </TableHead>
            <TableHead className="text-right px-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentHouseholds.length > 0 ? currentHouseholds.map((household: Household) => <TableRow key={household.id}>
                <TableCell className="font-medium">{household.name}</TableCell>
                <TableCell>{household.address}</TableCell>
                <TableCell>{headNamesMap?.[household.id] || "Not specified"}</TableCell>
                <TableCell>{household.contact_number || "Not available"}</TableCell>
                <TableCell>{getStatusBadge(household.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(household)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View Details</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditHousehold(household)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(household.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>) : <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                {searchQuery || statusFilter || purokFilter ? "No households found matching your search criteria." : "No households available. Add a household to get started."}
              </TableCell>
            </TableRow>}
        </TableBody>
      </Table>
      
      {/* Enhanced Pagination - matching residents page style */}
      {totalItems > 0 && <div className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {totalItems} households
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
              
              {Array.from({
            length: totalPages
          }).map((_, i) => {
            const pageNum = i + 1;

            // Show first page, last page, and pages around current page
            if (pageNum === 1 || pageNum === totalPages || pageNum >= currentPage - 1 && pageNum <= currentPage + 1) {
              return <PaginationItem key={pageNum}>
                      <PaginationLink isActive={pageNum === currentPage} onClick={() => handlePageChange(pageNum)}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>;
            }

            // Show ellipsis for gaps
            if (pageNum === 2 || pageNum === totalPages - 1) {
              return <PaginationItem key={`ellipsis-${pageNum}`}>
                      <PaginationEllipsis />
                    </PaginationItem>;
            }
            return null;
          })}
              
              <PaginationItem>
                <PaginationNext onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>}
      
      {/* Household Details Dialog */}
      <HouseholdDetails household={selectedHousehold} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} initialEditMode={isEditMode} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the household
              and all associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};
export default HouseholdList;