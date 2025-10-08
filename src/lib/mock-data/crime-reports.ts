
import { CrimeReport } from '../types';

// Mock Crime Reports Data
export const crimeReports: CrimeReport[] = [
  {
    id: '1',
    reportNumber: 'CR-2023-001',
    reportTitle: 'Theft at Sari-Sari Store',
    description: 'At approximately 2:30 PM, a male suspect in his 20s took items from the store without paying and fled on a motorcycle. Items stolen include cigarettes and canned goods.',
    dateReported: '2023-07-01',
    dateOfIncident: '2023-07-01',
    location: 'Rizal Street, corner Bonifacio Avenue',
    reportedBy: {
      id: '5',
      name: 'Antonio Gonzales',
      contactNumber: '09567890123'
    },
    status: 'Investigating',
    severity: 'Moderate',
    assignedTo: 'Officer Santos',
    witnesses: ['Maria Reyes', 'Pablo Castro']
  },
  {
    id: '2',
    reportNumber: 'CR-2023-002',
    reportTitle: 'Vandalism at Plaza',
    description: 'Graffiti found on the walls of the public restrooms at the plaza. Suspected to have occurred overnight. Offensive language and symbols were spray-painted.',
    dateReported: '2023-07-03',
    dateOfIncident: '2023-07-02',
    location: 'Barangay Plaza',
    reportedBy: {
      id: '1',
      name: 'Juan Dela Cruz',
      contactNumber: '09123456789'
    },
    status: 'New',
    severity: 'Minor',
    witnesses: ['Park Security Guard']
  },
  {
    id: '3',
    reportNumber: 'CR-2023-003',
    reportTitle: 'Domestic Disturbance',
    description: 'Neighbors reported loud shouting and sounds of items breaking from the residence. This is the third reported incident from the same address this month.',
    dateReported: '2023-07-05',
    dateOfIncident: '2023-07-05',
    location: 'Luna Street, House #15',
    reportedBy: {
      id: '2',
      name: 'Maria Santos',
      contactNumber: '09234567890'
    },
    status: 'Investigating',
    severity: 'Serious',
    assignedTo: 'Officer Mendoza',
    witnesses: ['Multiple neighbors']
  },
  {
    id: '4',
    reportNumber: 'CR-2023-004',
    reportTitle: 'Motorcycle Theft',
    description: 'Red Honda motorcycle (Plate #: ABC 123) stolen from in front of the owner\'s residence between 10 PM and 6 AM.',
    dateReported: '2023-07-10',
    dateOfIncident: '2023-07-09',
    location: 'Mabini Street, House #78',
    reportedBy: {
      id: '3',
      name: 'Pedro Reyes',
      contactNumber: '09345678901'
    },
    status: 'Investigating',
    severity: 'Serious',
    assignedTo: 'Officer Reyes'
  },
  {
    id: '5',
    reportNumber: 'CR-2023-005',
    reportTitle: 'Drug Activity Report',
    description: 'Suspicious activities observed at the abandoned building, with multiple people coming and going throughout the night. Possible drug-related activities.',
    dateReported: '2023-07-15',
    dateOfIncident: '2023-07-14',
    location: 'Abandoned building near Aguinaldo Street',
    reportedBy: {
      id: '4',
      name: 'Rosa Diaz',
      contactNumber: '09456789012'
    },
    status: 'Transferred',
    severity: 'Critical',
    assignedTo: 'Transferred to Police',
    resolutionDetails: 'Case transferred to Municipal Police for further investigation due to scope and severity.'
  }
];
