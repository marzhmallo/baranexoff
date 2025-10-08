
export type FeedbackType = 'barangay' | 'system';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface FeedbackReport {
  id: string;
  user_id: string;
  type: FeedbackType;
  category: string;
  description: string;
  status: FeedbackStatus;
  location?: string;
  attachments?: string[];
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  brgyid: string;
  // Additional fields for display
  user_name?: string;
  user_email?: string;
}

export const FEEDBACK_CATEGORIES = {
  barangay: [
    'Road Maintenance',
    'Garbage Collection',
    'Street Lighting',
    'Water Supply',
    'Drainage Issues',
    'Public Safety',
    'Noise Complaints',
    'Other'
  ],
  system: [
    'Bug Report',
    'Feature Request',
    'Performance Issue',
    'Login Problems',
    'Data Errors',
    'UI/UX Issues',
    'Other'
  ]
};

export const STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};
