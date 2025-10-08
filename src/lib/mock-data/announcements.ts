
import { Announcement } from '../types';

// Mock Announcements Data
export const announcements: Announcement[] = [
  {
    id: '1',
    title: 'COVID-19 Vaccination Schedule',
    content: 'Free COVID-19 vaccination for residents on June 15-16, 2023 at the Barangay Hall from 8AM to 5PM. Bring valid ID and registration form.',
    authorId: 'admin1',
    authorName: 'Barangay Secretary',
    datePosted: '2023-06-10',
    category: 'Service',
    priority: 'High',
    startDate: '2023-06-15',
    endDate: '2023-06-16',
    location: 'Barangay Hall'
  },
  {
    id: '2',
    title: 'Barangay Fiesta Celebration',
    content: 'Annual Barangay Fiesta will be celebrated on July 25-26, 2023. Various activities including sports competitions, cultural shows, and religious ceremonies are planned.',
    authorId: 'admin1',
    authorName: 'Barangay Captain',
    datePosted: '2023-06-25',
    category: 'Event',
    priority: 'Medium',
    startDate: '2023-07-25',
    endDate: '2023-07-26',
    location: 'Barangay Plaza'
  },
  {
    id: '3',
    title: 'Road Construction Notice',
    content: 'Road construction on Rizal Street will begin on July 5, 2023 and continue for approximately 2 weeks. Please use alternative routes during this period.',
    authorId: 'admin2',
    authorName: 'Barangay Engineer',
    datePosted: '2023-07-01',
    category: 'Alert',
    priority: 'Medium',
    startDate: '2023-07-05',
    endDate: '2023-07-19',
    location: 'Rizal Street'
  },
  {
    id: '4',
    title: 'Typhoon Warning',
    content: 'Typhoon expected to hit our area within 48 hours. Residents are advised to secure their homes and prepare emergency supplies. Evacuation centers are being prepared.',
    authorId: 'admin1',
    authorName: 'Barangay Captain',
    datePosted: '2023-07-15',
    category: 'Alert',
    priority: 'Urgent',
    location: 'Entire Barangay'
  },
  {
    id: '5',
    title: 'Free Medical Mission',
    content: 'Free medical check-ups, dental services, and eye examinations will be provided on August 5, 2023 at the Barangay covered court. First-come, first-served basis.',
    authorId: 'admin3',
    authorName: 'Barangay Health Worker',
    datePosted: '2023-07-20',
    category: 'Service',
    priority: 'Medium',
    startDate: '2023-08-05',
    endDate: '2023-08-05',
    location: 'Barangay Covered Court'
  }
];
