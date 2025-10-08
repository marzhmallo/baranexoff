
import { DashboardStats } from '../types';

// Mock Dashboard Statistics
export const dashboardStats: DashboardStats = {
  totalResidents: 856,
  newResidentsThisMonth: 12,
  activeAnnouncements: 8,
  openCrimeReports: 7,
  upcomingEvents: 3,
  maleResidents: 412,
  femaleResidents: 444,
  averageAge: 34,
  ageGroups: [
    { label: '0-14', value: 186 },
    { label: '15-24', value: 147 },
    { label: '25-44', value: 278 },
    { label: '45-64', value: 165 },
    { label: '65+', value: 80 }
  ],
  mostActiveForumCategories: [
    { category: 'Concern', count: 45 },
    { category: 'Question', count: 32 },
    { category: 'Suggestion', count: 27 },
    { category: 'General', count: 21 },
    { category: 'Other', count: 8 }
  ],
  crimeReportsByMonth: [
    { month: 'Jan', count: 6 },
    { month: 'Feb', count: 8 },
    { month: 'Mar', count: 5 },
    { month: 'Apr', count: 7 },
    { month: 'May', count: 10 },
    { month: 'Jun', count: 8 },
    { month: 'Jul', count: 12 }
  ]
};
