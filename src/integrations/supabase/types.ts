export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          agent: string | null
          brgyid: string
          created_at: string | null
          details: Json
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          action: string
          agent?: string | null
          brgyid: string
          created_at?: string | null
          details: Json
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          action?: string
          agent?: string | null
          brgyid?: string
          created_at?: string | null
          details?: Json
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          attachment_url: string | null
          audience: string
          brgyid: string
          category: string
          content: string
          created_at: string
          created_by: string
          embedding: string | null
          id: string
          is_pinned: boolean | null
          photo_url: string | null
          title: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          attachment_url?: string | null
          audience?: string
          brgyid: string
          category: string
          content: string
          created_at?: string
          created_by: string
          embedding?: string | null
          id?: string
          is_pinned?: boolean | null
          photo_url?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          attachment_url?: string | null
          audience?: string
          brgyid?: string
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          embedding?: string | null
          id?: string
          is_pinned?: boolean | null
          photo_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      barangays: {
        Row: {
          backgroundurl: string | null
          barangayname: string
          country: string
          created_at: string
          email: string | null
          "gcash#": number | null
          gcashname: string[] | null
          gcashurl: string | null
          halllat: number | null
          halllong: number | null
          id: string
          instructions: string | null
          is_custom: boolean
          logo_url: string | null
          municipality: string
          officehours: string | null
          payreq: boolean | null
          phone: string | null
          plazid: string | null
          province: string
          region: string
          submitter: string | null
          updated_at: string | null
        }
        Insert: {
          backgroundurl?: string | null
          barangayname: string
          country: string
          created_at: string
          email?: string | null
          "gcash#"?: number | null
          gcashname?: string[] | null
          gcashurl?: string | null
          halllat?: number | null
          halllong?: number | null
          id?: string
          instructions?: string | null
          is_custom?: boolean
          logo_url?: string | null
          municipality: string
          officehours?: string | null
          payreq?: boolean | null
          phone?: string | null
          plazid?: string | null
          province: string
          region: string
          submitter?: string | null
          updated_at?: string | null
        }
        Update: {
          backgroundurl?: string | null
          barangayname?: string
          country?: string
          created_at?: string
          email?: string | null
          "gcash#"?: number | null
          gcashname?: string[] | null
          gcashurl?: string | null
          halllat?: number | null
          halllong?: number | null
          id?: string
          instructions?: string | null
          is_custom?: boolean
          logo_url?: string | null
          municipality?: string
          officehours?: string | null
          payreq?: boolean | null
          phone?: string | null
          plazid?: string | null
          province?: string
          region?: string
          submitter?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blotters: {
        Row: {
          complainant_id: string | null
          complaint_details: string
          created_at: string | null
          id: string
          incident_date: string
          incident_location: string
          resolution: string | null
          respondent_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          complainant_id?: string | null
          complaint_details: string
          created_at?: string | null
          id?: string
          incident_date: string
          incident_location: string
          resolution?: string | null
          respondent_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          complainant_id?: string | null
          complaint_details?: string
          created_at?: string | null
          id?: string
          incident_date?: string
          incident_location?: string
          resolution?: string | null
          respondent_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blotters_complainant_id_fkey"
            columns: ["complainant_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blotters_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_faq: {
        Row: {
          answer_text: Json[] | null
          answer_textz: string
          category: string
          created_at: string
          id: string
          question_keywords: Json
          relevant_roles: Json
          updated_at: string
        }
        Insert: {
          answer_text?: Json[] | null
          answer_textz: string
          category: string
          created_at?: string
          id?: string
          question_keywords?: Json
          relevant_roles?: Json
          updated_at?: string
        }
        Update: {
          answer_text?: Json[] | null
          answer_textz?: string
          category?: string
          created_at?: string
          id?: string
          question_keywords?: Json
          relevant_roles?: Json
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          parent_id: string | null
          photo_url: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          parent_id?: string | null
          photo_url?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          parent_id?: string | null
          photo_url?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_zones: {
        Row: {
          brgyid: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          polygon_coords: Json
          risk_level: string | null
          updated_at: string | null
          zone_name: string
          zone_type: Database["public"]["Enums"]["disaster_zone_type"]
        }
        Insert: {
          brgyid: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          polygon_coords: Json
          risk_level?: string | null
          updated_at?: string | null
          zone_name: string
          zone_type: Database["public"]["Enums"]["disaster_zone_type"]
        }
        Update: {
          brgyid?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          polygon_coords?: Json
          risk_level?: string | null
          updated_at?: string | null
          zone_name?: string
          zone_type?: Database["public"]["Enums"]["disaster_zone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "disaster_zones_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_zones_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      dnexus: {
        Row: {
          accepted_on: string | null
          created_at: string
          dataid: string[]
          datatype: string | null
          destination: string
          id: string
          initiator: string
          notes: string | null
          reviewer: string | null
          source: string
          status: string
          transfernotes: Json | null
        }
        Insert: {
          accepted_on?: string | null
          created_at?: string
          dataid?: string[]
          datatype?: string | null
          destination?: string
          id?: string
          initiator: string
          notes?: string | null
          reviewer?: string | null
          source?: string
          status: string
          transfernotes?: Json | null
        }
        Update: {
          accepted_on?: string | null
          created_at?: string
          dataid?: string[]
          datatype?: string | null
          destination?: string
          id?: string
          initiator?: string
          notes?: string | null
          reviewer?: string | null
          source?: string
          status?: string
          transfernotes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dnexus_destination_fkey"
            columns: ["destination"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dnexus_destination_fkey"
            columns: ["destination"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dnexus_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dnexus_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      docrequests: {
        Row: {
          amount: number | null
          brgyid: string
          "contact#": number | null
          created_at: string
          docnumber: string
          email: string | null
          embedding: string | null
          id: string
          issued_at: string
          method: string | null
          notes: string | null
          ornumber: string | null
          paydate: string | null
          paymenturl: Json[] | null
          processedby: string | null
          purpose: string
          receiver: Json | null
          resident_id: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          brgyid?: string
          "contact#"?: number | null
          created_at?: string
          docnumber: string
          email?: string | null
          embedding?: string | null
          id?: string
          issued_at: string
          method?: string | null
          notes?: string | null
          ornumber?: string | null
          paydate?: string | null
          paymenturl?: Json[] | null
          processedby?: string | null
          purpose: string
          receiver?: Json | null
          resident_id?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          brgyid?: string
          "contact#"?: number | null
          created_at?: string
          docnumber?: string
          email?: string | null
          embedding?: string | null
          id?: string
          issued_at?: string
          method?: string | null
          notes?: string | null
          ornumber?: string | null
          paydate?: string | null
          paymenturl?: Json[] | null
          processedby?: string | null
          purpose?: string
          receiver?: Json | null
          resident_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docrequests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docrequests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_logs: {
        Row: {
          action: string
          brgyid: string
          created_at: string | null
          details: Json | null
          document_id: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          brgyid?: string
          created_at?: string | null
          details?: Json | null
          document_id: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          brgyid?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      document_types: {
        Row: {
          brgyid: string
          content: string | null
          created_at: string | null
          description: string | null
          fee: number | null
          id: string
          name: string
          required_fields: Json
          template: string
          type: string
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          brgyid: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          name: string
          required_fields?: Json
          template: string
          type: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          brgyid?: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          name?: string
          required_fields?: Json
          template?: string
          type?: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      docx: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          id: string
          notes: string | null
          resid: string | null
          userid: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          id?: string
          notes?: string | null
          resid?: string | null
          userid?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          id?: string
          notes?: string | null
          resid?: string | null
          userid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docx_resid_fkey"
            columns: ["resid"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          brgyid: string
          created_at: string | null
          created_by: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone_number: string
          type: Database["public"]["Enums"]["emergency_contact_type"]
          updated_at: string | null
        }
        Insert: {
          brgyid: string
          created_at?: string | null
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone_number: string
          type: Database["public"]["Enums"]["emergency_contact_type"]
          updated_at?: string | null
        }
        Update: {
          brgyid?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone_number?: string
          type?: Database["public"]["Enums"]["emergency_contact_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          brgyid: string
          contactno: string | null
          created_at: string | null
          details: string | null
          id: string
          latitude: number | null
          longitude: number | null
          needs: Json | null
          request_type: string
          resident_id: string
          specificplace: string | null
          status: string
        }
        Insert: {
          brgyid: string
          contactno?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          needs?: Json | null
          request_type: string
          resident_id: string
          specificplace?: string | null
          status?: string
        }
        Update: {
          brgyid?: string
          contactno?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          needs?: Json | null
          request_type?: string
          resident_id?: string
          specificplace?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_centers: {
        Row: {
          address: string
          brgyid: string
          capacity: number
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          facilities: string[] | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          occupancy: number | null
          status: Database["public"]["Enums"]["evacuation_center_status"] | null
          updated_at: string | null
        }
        Insert: {
          address: string
          brgyid: string
          capacity?: number
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facilities?: string[] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          occupancy?: number | null
          status?:
            | Database["public"]["Enums"]["evacuation_center_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          brgyid?: string
          capacity?: number
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facilities?: string[] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          occupancy?: number | null
          status?:
            | Database["public"]["Enums"]["evacuation_center_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_centers_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuation_centers_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_routes: {
        Row: {
          brgyid: string
          created_at: string | null
          created_by: string
          distance_km: number | null
          end_point: Json
          estimated_time_minutes: number | null
          id: string
          route_coords: Json
          route_name: string
          start_point: Json
          updated_at: string | null
        }
        Insert: {
          brgyid: string
          created_at?: string | null
          created_by: string
          distance_km?: number | null
          end_point: Json
          estimated_time_minutes?: number | null
          id?: string
          route_coords: Json
          route_name: string
          start_point: Json
          updated_at?: string | null
        }
        Update: {
          brgyid?: string
          created_at?: string | null
          created_by?: string
          distance_km?: number | null
          end_point?: Json
          estimated_time_minutes?: number | null
          id?: string
          route_coords?: Json
          route_name?: string
          start_point?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_routes_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuation_routes_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          brgyid: string
          created_at: string | null
          created_by: string
          description: string | null
          embedding: string | null
          end_time: string | null
          event_type: string | null
          id: string
          location: string | null
          reccuring: boolean | null
          rrule: string | null
          start_time: string
          target_audience: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          brgyid: string
          created_at?: string | null
          created_by: string
          description?: string | null
          embedding?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          reccuring?: boolean | null
          rrule?: string | null
          start_time: string
          target_audience?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          brgyid?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          embedding?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          reccuring?: boolean | null
          rrule?: string | null
          start_time?: string
          target_audience?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          admin_notes: string | null
          attachments: string[] | null
          brgyid: string
          category: string
          created_at: string
          description: string
          id: string
          location: string
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          attachments?: string[] | null
          brgyid: string
          category: string
          created_at?: string
          description: string
          id?: string
          location: string
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          attachments?: string[] | null
          brgyid?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reports_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_reports_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_individuals: {
        Row: {
          alias: string | null
          brgyid: string
          created_at: string
          created_by: string
          full_name: string | null
          id: string
          linked_report_id: string
          reason: string
          residentname: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          updated_at: string
        }
        Insert: {
          alias?: string | null
          brgyid: string
          created_at?: string
          created_by: string
          full_name?: string | null
          id?: string
          linked_report_id: string
          reason: string
          residentname?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          updated_at?: string
        }
        Update: {
          alias?: string | null
          brgyid?: string
          created_at?: string
          created_by?: string
          full_name?: string | null
          id?: string
          linked_report_id?: string
          reason?: string
          residentname?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_individuals_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_individuals_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_individuals_linked_report_id_fkey"
            columns: ["linked_report_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_individuals_residentname_fkey"
            columns: ["residentname"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          brgyid: string
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string
          viewcount: number
        }
        Insert: {
          brgyid: string
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string
          viewcount?: number
        }
        Update: {
          brgyid?: string
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string
          viewcount?: number
        }
        Relationships: []
      }
      hieroglyphics: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          last_verified_at: string | null
          secret: string | null
          userid: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_verified_at?: string | null
          secret?: string | null
          userid: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_verified_at?: string | null
          secret?: string | null
          userid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mfa_settings_user_id_fkey"
            columns: ["userid"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mfa_settings_user_id_fkey"
            columns: ["userid"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      householdmembers: {
        Row: {
          created_at: string | null
          householdid: string
          id: string
          residentid: string
          role: Database["public"]["Enums"]["householdrole"]
        }
        Insert: {
          created_at?: string | null
          householdid: string
          id?: string
          residentid: string
          role: Database["public"]["Enums"]["householdrole"]
        }
        Update: {
          created_at?: string | null
          householdid?: string
          id?: string
          residentid?: string
          role?: Database["public"]["Enums"]["householdrole"]
        }
        Relationships: [
          {
            foreignKeyName: "householdmembers_householdid_fkey"
            columns: ["householdid"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "householdmembers_residentid_fkey"
            columns: ["residentid"]
            isOneToOne: true
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address: string
          barangayname: string | null
          brgyid: string | null
          contact_number: string | null
          country: string | null
          created_at: string | null
          electricity_source: string | null
          embedding: string | null
          garbage_disposal: string | null
          head_of_family: string | null
          headname: string | null
          house_type: string | null
          id: string
          members: Json | null
          monthly_income: string | null
          municipality: string | null
          name: string
          name_extension: string | null
          property_type: string | null
          province: string | null
          purok: string
          recordedby: string | null
          region: string | null
          remarks: string | null
          status: string
          toilet_type: string | null
          updated_at: string | null
          updatedby: string | null
          water_source: string | null
          year_established: number | null
        }
        Insert: {
          address: string
          barangayname?: string | null
          brgyid?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string | null
          electricity_source?: string | null
          embedding?: string | null
          garbage_disposal?: string | null
          head_of_family?: string | null
          headname?: string | null
          house_type?: string | null
          id: string
          members?: Json | null
          monthly_income?: string | null
          municipality?: string | null
          name: string
          name_extension?: string | null
          property_type?: string | null
          province?: string | null
          purok: string
          recordedby?: string | null
          region?: string | null
          remarks?: string | null
          status: string
          toilet_type?: string | null
          updated_at?: string | null
          updatedby?: string | null
          water_source?: string | null
          year_established?: number | null
        }
        Update: {
          address?: string
          barangayname?: string | null
          brgyid?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string | null
          electricity_source?: string | null
          embedding?: string | null
          garbage_disposal?: string | null
          head_of_family?: string | null
          headname?: string | null
          house_type?: string | null
          id?: string
          members?: Json | null
          monthly_income?: string | null
          municipality?: string | null
          name?: string
          name_extension?: string | null
          property_type?: string | null
          province?: string | null
          purok?: string
          recordedby?: string | null
          region?: string | null
          remarks?: string | null
          status?: string
          toilet_type?: string | null
          updated_at?: string | null
          updatedby?: string | null
          water_source?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "households_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_head_of_family_fkey"
            columns: ["head_of_family"]
            isOneToOne: true
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_parties: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          incident_id: string
          name: string
          resident_id: string | null
          role: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          incident_id: string
          name: string
          resident_id?: string | null
          role: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          name?: string
          resident_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_parties_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_parties_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          brgyid: string
          created_at: string
          created_by: string
          date_reported: string
          description: string
          id: string
          location: string
          report_type: Database["public"]["Enums"]["report_type"]
          reporter_contact: string | null
          reporter_name: string
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          brgyid: string
          created_at?: string
          created_by: string
          date_reported?: string
          description: string
          id?: string
          location: string
          report_type: Database["public"]["Enums"]["report_type"]
          reporter_contact?: string | null
          reporter_name: string
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          brgyid?: string
          created_at?: string
          created_by?: string
          date_reported?: string
          description?: string
          id?: string
          location?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reporter_contact?: string | null
          reporter_name?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      monthlyreport: {
        Row: {
          brgyid: string
          created_at: string
          id: number
          munid: string
          report: Json
          reportperiod: string
          status: string
          submittedon: string
        }
        Insert: {
          brgyid?: string
          created_at?: string
          id?: number
          munid?: string
          report: Json
          reportperiod: string
          status: string
          submittedon: string
        }
        Update: {
          brgyid?: string
          created_at?: string
          id?: number
          munid?: string
          report?: Json
          reportperiod?: string
          status?: string
          submittedon?: string
        }
        Relationships: []
      }
      notification: {
        Row: {
          archived: boolean | null
          category: string | null
          created_at: string | null
          id: string
          linkurl: string | null
          message: string | null
          priority: string | null
          read: boolean | null
          type: string
          updated_at: string | null
          userid: string | null
        }
        Insert: {
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          linkurl?: string | null
          message?: string | null
          priority?: string | null
          read?: boolean | null
          type: string
          updated_at?: string | null
          userid?: string | null
        }
        Update: {
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          linkurl?: string | null
          message?: string | null
          priority?: string | null
          read?: boolean | null
          type?: string
          updated_at?: string | null
          userid?: string | null
        }
        Relationships: []
      }
      official_positions: {
        Row: {
          committee: string | null
          created_at: string
          description: string | null
          id: string
          is_current: boolean | null
          official_id: string
          position: string
          position_no: number | null
          sk: boolean | null
          tenure: string
          term_end: string
          term_start: string
          updated_at: string | null
        }
        Insert: {
          committee?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_current?: boolean | null
          official_id: string
          position: string
          position_no?: number | null
          sk?: boolean | null
          tenure: string
          term_end: string
          term_start: string
          updated_at?: string | null
        }
        Update: {
          committee?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_current?: boolean | null
          official_id?: string
          position?: string
          position_no?: number | null
          sk?: boolean | null
          tenure?: string
          term_end?: string
          term_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "official_positions_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
        ]
      }
      officialranks: {
        Row: {
          bio: string | null
          brgyid: string
          created_at: string
          id: string
          officialid: string | null
          ranklabel: string | null
          rankno: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          brgyid?: string
          created_at?: string
          id: string
          officialid?: string | null
          ranklabel?: string | null
          rankno: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          brgyid?: string
          created_at?: string
          id?: string
          officialid?: string | null
          ranklabel?: string | null
          rankno?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officialranks_officialid_fkey"
            columns: ["officialid"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
        ]
      }
      officials: {
        Row: {
          achievements: Json | null
          address: string | null
          bio: string | null
          birthdate: string
          brgyid: string
          committees: Json | null
          coverurl: string | null
          created_at: string
          editedby: string | null
          educ: Json | null
          education: string | null
          email: string | null
          id: string
          "is_sk old": boolean[] | null
          name: string
          phone: string | null
          photo_url: string | null
          position_no: number | null
          recordedby: string
          term_end: string | null
          term_start: string | null
          updated_at: string
        }
        Insert: {
          achievements?: Json | null
          address?: string | null
          bio?: string | null
          birthdate: string
          brgyid?: string
          committees?: Json | null
          coverurl?: string | null
          created_at?: string
          editedby?: string | null
          educ?: Json | null
          education?: string | null
          email?: string | null
          id?: string
          "is_sk old"?: boolean[] | null
          name: string
          phone?: string | null
          photo_url?: string | null
          position_no?: number | null
          recordedby: string
          term_end?: string | null
          term_start?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: Json | null
          address?: string | null
          bio?: string | null
          birthdate?: string
          brgyid?: string
          committees?: Json | null
          coverurl?: string | null
          created_at?: string
          editedby?: string | null
          educ?: Json | null
          education?: string | null
          email?: string | null
          id?: string
          "is_sk old"?: boolean[] | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          position_no?: number | null
          recordedby?: string
          term_end?: string | null
          term_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officials_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officials_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      payme: {
        Row: {
          brgyid: string
          created_at: string
          credz: Json
          enabled: boolean
          gname: string
          id: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          brgyid?: string
          created_at?: string
          credz: Json
          enabled?: boolean
          gname: string
          id?: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          brgyid?: string
          created_at?: string
          credz?: Json
          enabled?: boolean
          gname?: string
          id?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      plaza: {
        Row: {
          barangay: string
          country: string
          created_at: string
          id: string
          municipality: string
          province: string
          region: string
        }
        Insert: {
          barangay: string
          country: string
          created_at?: string
          id: string
          municipality: string
          province: string
          region: string
        }
        Update: {
          barangay?: string
          country?: string
          created_at?: string
          id?: string
          municipality?: string
          province?: string
          region?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adminid: string | null
          bday: string
          bio: string | null
          brgyid: string | null
          created_at: string | null
          dis: Json | null
          email: string
          firstname: string | null
          gender: string
          id: string
          last_login: string
          lastname: string | null
          mid: string | null
          middlename: string | null
          notes: Json | null
          online: boolean | null
          padlock: boolean | null
          phone: string | null
          plazid: string | null
          profile_picture: string | null
          purok: string
          role: string
          status: string
          suffix: string | null
          superior_admin: boolean
          username: string
        }
        Insert: {
          adminid?: string | null
          bday: string
          bio?: string | null
          brgyid?: string | null
          created_at?: string | null
          dis?: Json | null
          email: string
          firstname?: string | null
          gender?: string
          id?: string
          last_login?: string
          lastname?: string | null
          mid?: string | null
          middlename?: string | null
          notes?: Json | null
          online?: boolean | null
          padlock?: boolean | null
          phone?: string | null
          plazid?: string | null
          profile_picture?: string | null
          purok: string
          role: string
          status?: string
          suffix?: string | null
          superior_admin?: boolean
          username: string
        }
        Update: {
          adminid?: string | null
          bday?: string
          bio?: string | null
          brgyid?: string | null
          created_at?: string | null
          dis?: Json | null
          email?: string
          firstname?: string | null
          gender?: string
          id?: string
          last_login?: string
          lastname?: string | null
          mid?: string | null
          middlename?: string | null
          notes?: Json | null
          online?: boolean | null
          padlock?: boolean | null
          phone?: string | null
          plazid?: string | null
          profile_picture?: string | null
          purok?: string
          role?: string
          status?: string
          suffix?: string | null
          superior_admin?: boolean
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          emoji: string
          id: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          emoji: string
          id?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          created_at: string | null
          id: string
          related_resident_id: string
          relationship_type: string
          resident_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_resident_id: string
          relationship_type: string
          resident_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          related_resident_id?: string
          relationship_type?: string
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_related_resident_id_fkey"
            columns: ["related_resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          parameters: Json | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id: string
          parameters?: Json | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          parameters?: Json | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      residents: {
        Row: {
          address: string | null
          barangaydb: string
          birthdate: string
          brgyid: string
          civil_status: string
          classifications: string[] | null
          countryph: string
          created_at: string | null
          died_on: string | null
          editedby: string | null
          email: string | null
          embedding: string | null
          emcontact: number | null
          emname: string | null
          emrelation: string | null
          first_name: string
          gender: string
          has_pagibig: boolean | null
          has_philhealth: boolean | null
          has_sss: boolean | null
          has_tin: boolean | null
          household_id: string | null
          id: string
          is_voter: boolean | null
          last_name: string
          middle_name: string | null
          mobile_number: string | null
          monthly_income: number | null
          municipalitycity: string
          nationality: string
          occupation: string | null
          photo_url: string | null
          provinze: string
          purok: string
          recordedby: string | null
          regional: string
          remarks: string | null
          status: string
          suffix: string | null
          updated_at: string | null
          years_in_barangay: number | null
        }
        Insert: {
          address?: string | null
          barangaydb: string
          birthdate: string
          brgyid?: string
          civil_status: string
          classifications?: string[] | null
          countryph: string
          created_at?: string | null
          died_on?: string | null
          editedby?: string | null
          email?: string | null
          embedding?: string | null
          emcontact?: number | null
          emname?: string | null
          emrelation?: string | null
          first_name: string
          gender: string
          has_pagibig?: boolean | null
          has_philhealth?: boolean | null
          has_sss?: boolean | null
          has_tin?: boolean | null
          household_id?: string | null
          id: string
          is_voter?: boolean | null
          last_name: string
          middle_name?: string | null
          mobile_number?: string | null
          monthly_income?: number | null
          municipalitycity: string
          nationality: string
          occupation?: string | null
          photo_url?: string | null
          provinze: string
          purok: string
          recordedby?: string | null
          regional: string
          remarks?: string | null
          status?: string
          suffix?: string | null
          updated_at?: string | null
          years_in_barangay?: number | null
        }
        Update: {
          address?: string | null
          barangaydb?: string
          birthdate?: string
          brgyid?: string
          civil_status?: string
          classifications?: string[] | null
          countryph?: string
          created_at?: string | null
          died_on?: string | null
          editedby?: string | null
          email?: string | null
          embedding?: string | null
          emcontact?: number | null
          emname?: string | null
          emrelation?: string | null
          first_name?: string
          gender?: string
          has_pagibig?: boolean | null
          has_philhealth?: boolean | null
          has_sss?: boolean | null
          has_tin?: boolean | null
          household_id?: string | null
          id?: string
          is_voter?: boolean | null
          last_name?: string
          middle_name?: string | null
          mobile_number?: string | null
          monthly_income?: number | null
          municipalitycity?: string
          nationality?: string
          occupation?: string | null
          photo_url?: string | null
          provinze?: string
          purok?: string
          recordedby?: string | null
          regional?: string
          remarks?: string | null
          status?: string
          suffix?: string | null
          updated_at?: string | null
          years_in_barangay?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_household"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          fingerprint: string | null
          first_seen_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen_at: string | null
          login_count: number | null
          user_agent: string | null
          userid: string
        }
        Insert: {
          created_at?: string | null
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          login_count?: number | null
          user_agent?: string | null
          userid: string
        }
        Update: {
          created_at?: string | null
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          login_count?: number | null
          user_agent?: string | null
          userid?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          userid: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          userid?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          userid?: string
          value?: string
        }
        Relationships: []
      }
      settings_duplicate: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          userid: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          userid?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          userid?: string | null
          value?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          brgyid: string
          content: string
          created_at: string
          created_by: string
          forum_id: string
          id: string
          locked: boolean
          photo_url: string | null
          pinned: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
          viewcount: number
        }
        Insert: {
          brgyid: string
          content: string
          created_at?: string
          created_by: string
          forum_id: string
          id?: string
          locked?: boolean
          photo_url?: string | null
          pinned?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
          viewcount?: number
        }
        Update: {
          brgyid?: string
          content?: string
          created_at?: string
          created_by?: string
          forum_id?: string
          id?: string
          locked?: boolean
          photo_url?: string | null
          pinned?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          viewcount?: number
        }
        Relationships: [
          {
            foreignKeyName: "threads_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          authid: string
          brgyid: string | null
          created_at: string
          email: string | null
          firstname: string
          id: string
          lastname: string
          middlename: string | null
          password: string | null
          phone: string | null
          role: string
          status: string
          username: string | null
        }
        Insert: {
          authid?: string
          brgyid?: string | null
          created_at?: string
          email?: string | null
          firstname: string
          id?: string
          lastname: string
          middlename?: string | null
          password?: string | null
          phone?: string | null
          role: string
          status: string
          username?: string | null
        }
        Update: {
          authid?: string
          brgyid?: string | null
          created_at?: string
          email?: string | null
          firstname?: string
          id?: string
          lastname?: string
          middlename?: string | null
          password?: string | null
          phone?: string | null
          role?: string
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_brgyid_fkey"
            columns: ["brgyid"]
            isOneToOne: false
            referencedRelation: "public_barangays"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_barangays: {
        Row: {
          barangayname: string | null
          country: string | null
          email: string | null
          gcashurl: string | null
          halllat: number | null
          halllong: number | null
          id: string | null
          instructions: string | null
          municipality: string | null
          officehours: string | null
          phone: string | null
          province: string | null
          region: string | null
        }
        Insert: {
          barangayname?: string | null
          country?: string | null
          email?: string | null
          gcashurl?: string | null
          halllat?: number | null
          halllong?: number | null
          id?: string | null
          instructions?: string | null
          municipality?: string | null
          officehours?: string | null
          phone?: string | null
          province?: string | null
          region?: string | null
        }
        Update: {
          barangayname?: string | null
          country?: string | null
          email?: string | null
          gcashurl?: string | null
          halllat?: number | null
          halllong?: number | null
          id?: string | null
          instructions?: string | null
          municipality?: string | null
          officehours?: string | null
          phone?: string | null
          province?: string | null
          region?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          firstname: string | null
          id: string | null
          lastname: string | null
          middlename: string | null
          suffix: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          firstname?: string | null
          id?: string | null
          lastname?: string | null
          middlename?: string | null
          suffix?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          firstname?: string | null
          id?: string | null
          lastname?: string | null
          middlename?: string | null
          suffix?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          aal: "aal1" | "aal2" | "aal3" | null
          created_at: string | null
          factor_id: string | null
          id: string | null
          ip: unknown | null
          not_after: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          aal?: "aal1" | "aal2" | "aal3" | null
          created_at?: string | null
          factor_id?: string | null
          id?: string | null
          ip?: unknown | null
          not_after?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          aal?: "aal1" | "aal2" | "aal3" | null
          created_at?: string | null
          factor_id?: string | null
          id?: string | null
          ip?: unknown | null
          not_after?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_data_transfer: {
        Args: { transferid: string }
        Returns: string
      }
      auth_lookup_email_by_username: {
        Args: { username_input: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_rejected_unprocessed_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_user_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_age_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          age_group: string
          count: number
        }[]
      }
      get_barangay_admins: {
        Args: { _brgyid: string }
        Returns: {
          admin_id: string
        }[]
      }
      get_barangay_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          barangayname: string
          country: string
          id: string
          municipality: string
        }[]
      }
      get_current_user_admin_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          brgyid: string
          is_admin: boolean
        }[]
      }
      get_gender_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          gender: string
        }[]
      }
      get_my_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          adminid: string | null
          bday: string
          bio: string | null
          brgyid: string | null
          created_at: string | null
          dis: Json | null
          email: string
          firstname: string | null
          gender: string
          id: string
          last_login: string
          lastname: string | null
          mid: string | null
          middlename: string | null
          notes: Json | null
          online: boolean | null
          padlock: boolean | null
          phone: string | null
          plazid: string | null
          profile_picture: string | null
          purok: string
          role: string
          status: string
          suffix: string | null
          superior_admin: boolean
          username: string
        }[]
      }
      get_public_barangay_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          backgroundurl: string | null
          barangayname: string
          country: string
          created_at: string
          email: string | null
          "gcash#": number | null
          gcashname: string[] | null
          gcashurl: string | null
          halllat: number | null
          halllong: number | null
          id: string
          instructions: string | null
          is_custom: boolean
          logo_url: string | null
          municipality: string
          officehours: string | null
          payreq: boolean | null
          phone: string | null
          plazid: string | null
          province: string
          region: string
          submitter: string | null
          updated_at: string | null
        }[]
      }
      get_purok_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          purok: string
        }[]
      }
      get_user_brgyid: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_sessions: {
        Args: Record<PropertyKey, never>
        Returns: {
          aal: string
          created_at: string
          factor_id: string
          id: string
          ip: string
          not_after: string
          updated_at: string
          user_agent: string
          user_id: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_service_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      search_barangays_public: {
        Args: { search_query?: string }
        Returns: {
          barangayname: string
          id: string
          municipality: string
          province: string
        }[]
      }
      semantic_search_all: {
        Args: {
          brgyid_filter: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          display_name: string
          entity_id: string
          entity_type: string
          metadata: Json
          relevance: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user" | "glyph" | "overseer"
      disaster_zone_type:
        | "flood"
        | "fire"
        | "landslide"
        | "earthquake"
        | "typhoon"
        | "other"
      emergency_contact_type:
        | "fire"
        | "police"
        | "medical"
        | "disaster"
        | "rescue"
      evacuation_center_status: "available" | "full" | "closed" | "maintenance"
      feedback_status: "pending" | "in_progress" | "resolved" | "rejected"
      feedback_type: "barangay" | "system"
      householdrole: "Head" | "Spouse" | "Child" | "Other"
      incident_status: "Open" | "Under_Investigation" | "Resolved" | "Dismissed"
      report_type: "Theft" | "Dispute" | "Vandalism" | "Curfew" | "Others"
      risk_level: "Low" | "Moderate" | "High"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "user", "glyph", "overseer"],
      disaster_zone_type: [
        "flood",
        "fire",
        "landslide",
        "earthquake",
        "typhoon",
        "other",
      ],
      emergency_contact_type: [
        "fire",
        "police",
        "medical",
        "disaster",
        "rescue",
      ],
      evacuation_center_status: ["available", "full", "closed", "maintenance"],
      feedback_status: ["pending", "in_progress", "resolved", "rejected"],
      feedback_type: ["barangay", "system"],
      householdrole: ["Head", "Spouse", "Child", "Other"],
      incident_status: ["Open", "Under_Investigation", "Resolved", "Dismissed"],
      report_type: ["Theft", "Dispute", "Vandalism", "Curfew", "Others"],
      risk_level: ["Low", "Moderate", "High"],
    },
  },
} as const
