import { supabase } from "@/integrations/supabase/client";
import { FeedbackReport, FeedbackType, FeedbackStatus } from "@/lib/types/feedback";

export const feedbackAPI = {
  // Get all feedback reports (admin)
  getAllReports: async (brgyid: string, filters?: {
    type?: FeedbackType;
    status?: FeedbackStatus;
    search?: string;
  }) => {
    let query = supabase
      .from('feedback_reports')
      .select('*')
      .eq('brgyid', brgyid)
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
    }

    const { data: reports, error } = await query;
    if (error) throw error;

    // Fetch user profiles for all reports
    if (reports && reports.length > 0) {
      const userIds = [...new Set(reports.map(report => report.user_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return reports with unknown users if profile fetch fails
        return (reports || []).map(report => ({
          ...report,
          user_name: 'Unknown User',
          user_email: ''
        })) as FeedbackReport[];
      }

      // Map profiles to reports
      const profilesMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);
      
      return (reports || []).map((report: any) => {
        const profile = profilesMap.get(report.user_id);
        return {
          ...report,
          user_name: profile ? `${profile.firstname || ''} ${profile.lastname || ''}`.trim() : 'Unknown User',
          user_email: profile?.email || ''
        };
      }) as FeedbackReport[];
    }

    return [];
  },

  // Get user's own reports
  getUserReports: async (userId: string) => {
    const { data, error } = await supabase
      .from('feedback_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as FeedbackReport[];
  },

  // Create new report
  createReport: async (report: Omit<FeedbackReport, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('Creating report with data:', report);
    
    // Validate required fields
    if (!report.user_id) {
      throw new Error('User ID is required');
    }
    if (!report.brgyid) {
      throw new Error('Barangay ID is required');
    }
    if (!report.type) {
      throw new Error('Report type is required');
    }
    if (!report.category) {
      throw new Error('Category is required');
    }
    if (!report.description) {
      throw new Error('Description is required');
    }

    const { data, error } = await supabase
      .from('feedback_reports')
      .insert({
        user_id: report.user_id,
        brgyid: report.brgyid,
        type: report.type,
        category: report.category,
        description: report.description,
        location: report.location || null,
        attachments: report.attachments || null,
        status: report.status,
        admin_notes: report.admin_notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating report:', error);
      throw new Error(`Failed to create report: ${error.message}`);
    }
    
    console.log('Report created successfully:', data);
    return data as FeedbackReport;
  },

  // Update report status (admin)
  updateReportStatus: async (reportId: string, status: FeedbackStatus, adminNotes?: string) => {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    const { data, error } = await supabase
      .from('feedback_reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data as FeedbackReport;
  },

  // Update report (user)
  updateReport: async (reportId: string, updates: Partial<FeedbackReport>) => {
    const { data, error } = await supabase
      .from('feedback_reports')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data as FeedbackReport;
  },

  // Delete report
  deleteReport: async (reportId: string) => {
    const { error } = await supabase
      .from('feedback_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
  }
};
