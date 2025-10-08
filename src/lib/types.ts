
// Resident types
export interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  gender: string;
  birthdate: string; // ISO format date string
  address: string;
  mobile_number?: string;
  email?: string;
  status: 'Permanent' | 'Temporary' | 'Deceased' | 'Relocated' | 'Missing';
  civil_status?: string;
  occupation?: string;
  years_in_barangay?: number;
  classifications?: string[];
  educationLevel?: string;
  familySize?: number;
  created_at?: string;
  nationality?: string;
  monthly_income?: number;
  purok?: string;
  barangaydb?: string;
  municipalitycity?: string;
  provinze?: string;
  regional?: string;
  countryph?: string;
  is_voter?: boolean;
  has_philhealth?: boolean;
  has_sss?: boolean;
  has_pagibig?: boolean;
  has_tin?: boolean;
  remarks?: string;
  photo_url?: string;
  died_on?: string | null;
  household_id?: string | null;
  updated_at?: string;
  brgyid?: string;
  recordedby?: string; // Added recordedby field
  editedby?: string; // Added editedby field
  emname?: string; // Emergency contact name
  emrelation?: string; // Emergency contact relationship
  emcontact?: string; // Emergency contact number
  
  // Keep legacy camelCase for backward compatibility
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string;
  contactNumber?: string;
  civilStatus?: string;
  yearsInBarangay?: number;
  monthlyIncome?: number;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  country?: string;
  isVoter?: boolean;
  hasPhilhealth?: boolean;
  hasSss?: boolean;
  hasPagibig?: boolean;
  hasTin?: boolean;
  photoUrl?: string;
  diedOn?: string | null;
  householdId?: string | null;
  emergencyContact?: {
    name: string;
    relationship: string;
    contactNumber: string;
  };
}

// Announcement types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  datePosted: string;
  category: 'Event' | 'News' | 'Alert' | 'Service' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  imageUrl?: string;
  attachmentUrl?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

// Forum types
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  datePosted: string;
  category: 'General' | 'Question' | 'Suggestion' | 'Concern' | 'Other';
  tags: string[];
  likes: number;
  commentCount: number;
  imageUrl?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  datePosted: string;
  likes: number;
}

// Crime report types
export interface CrimeReport {
  id: string;
  reportNumber: string;
  reportTitle: string;
  description: string;
  dateReported: string;
  dateOfIncident: string;
  location: string;
  reportedBy: {
    id: string;
    name: string;
    contactNumber: string;
  };
  status: 'New' | 'Investigating' | 'Resolved' | 'Closed' | 'Transferred';
  severity: 'Minor' | 'Moderate' | 'Serious' | 'Critical';
  assignedTo?: string;
  witnesses?: string[];
  evidenceList?: string[];
  resolutionDetails?: string;
  imageUrls?: string[];
}

// Dashboard statistics
export interface DashboardStats {
  totalResidents: number;
  newResidentsThisMonth: number;
  activeAnnouncements: number;
  openCrimeReports: number;
  upcomingEvents: number;
  maleResidents: number;
  femaleResidents: number;
  averageAge: number;
  ageGroups: {
    label: string;
    value: number;
  }[];
  mostActiveForumCategories: {
    category: string;
    count: number;
  }[];
  crimeReportsByMonth: {
    month: string;
    count: number;
  }[];
}

// Household types
export interface Household {
  id: string;
  name: string;
  address?: string; // Keep for backward compatibility but make optional
  barangayname?: string | null; // New address field
  municipality?: string | null; // New address field
  province?: string | null; // New address field
  region?: string | null; // New address field
  country?: string | null; // New address field
  purok: string;
  head_of_family?: string | null; // UUID reference to resident
  headname?: string | null; // Plain text name
  head_of_family_name?: string | null; // Computed field for display
  contact_number?: string | null;
  year_established?: number | null;
  status: string;
  monthly_income?: string | null;
  property_type?: string | null;
  house_type?: string | null;
  water_source?: string | null;
  electricity_source?: string | null;
  toilet_type?: string | null;
  garbage_disposal?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  brgyid?: string | null;
  recordedby?: string | null; // Added recordedby field
  updatedby?: string | null; // Added updatedby field
}

// Document types
export interface DocumentType {
  id: string;
  name: string;
  description?: string;
  template: string;
  required_fields: Record<string, string>;
  fee: number;
  validity_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IssuedDocument {
  id: string;
  document_type_id: string;
  resident_id?: string;
  household_id?: string;
  document_number: string;
  purpose?: string;
  data: Record<string, any>;
  issued_date: string;
  issued_by?: string;
  expiry_date?: string;
  status: 'issued' | 'pending' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'waived';
  payment_amount?: number;
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentLog {
  id: string;
  document_id: string;
  action: 'issued' | 'updated' | 'cancelled' | 'reprinted';
  performed_by?: string;
  details?: Record<string, any>;
  created_at: string;
}

// Updated Official interface to match the database structure
export interface Official {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  bio?: string;
  photo_url?: string;
  coverurl?: string; // Added for cover photo
  term_start?: string;
  term_end?: string;
  created_at?: string;
  updated_at?: string;
  brgyid?: string;
  is_sk?: boolean[];
  birthdate?: string;
  address?: string;
  educ?: any;
  achievements?: any;
  committees?: any;
  education?: string;
  position_no?: number; // Added position_no for custom sorting
  officialPositions?: OfficialPosition[];
  rank_number?: string | null; // Added for ranking system
  rank_label?: string | null; // Added for ranking system
  recordedby?: string | null; // Added for tracking who created the record
  editedby?: string | null; // Added for tracking who last edited the record
}

// New interface for official positions
export interface OfficialPosition {
  id: string;
  official_id: string;
  position: string;
  committee?: string;
  term_start: string;
  term_end?: string;
  sk?: boolean;
  created_at?: string;
  updated_at?: string;
  description?: string;
  position_no?: number; // Added position_no for custom sorting
  tenure?: string; // Added tenure field
}
