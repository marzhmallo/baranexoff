
import { ForumPost, Comment } from '../types';

// Mock Forum Posts Data
export const forumPosts: ForumPost[] = [
  {
    id: '1',
    title: 'Water Supply Interruption',
    content: 'Has anyone else experienced water supply interruption in the western part of our barangay? It\'s been 2 days now and we\'re still without water.',
    authorId: '3',
    authorName: 'Pedro Reyes',
    datePosted: '2023-07-05',
    category: 'Concern',
    tags: ['utilities', 'water', 'service'],
    likes: 12,
    commentCount: 8
  },
  {
    id: '2',
    title: 'Stray Dogs Problem',
    content: 'There are too many stray dogs roaming around our area. Some are aggressive and chase children. What can we do about this issue?',
    authorId: '2',
    authorName: 'Maria Santos',
    datePosted: '2023-07-08',
    category: 'Concern',
    tags: ['safety', 'animals', 'community'],
    likes: 15,
    commentCount: 10
  },
  {
    id: '3',
    title: 'Basketball Tournament Proposal',
    content: 'I\'d like to propose organizing a basketball tournament for the youth in our barangay during the summer vacation. Who would be interested in participating or helping organize?',
    authorId: '4',
    authorName: 'Rosa Diaz',
    datePosted: '2023-07-10',
    category: 'Suggestion',
    tags: ['sports', 'youth', 'event'],
    likes: 25,
    commentCount: 12
  },
  {
    id: '4',
    title: 'Garbage Collection Schedule',
    content: 'Can someone please clarify the garbage collection schedule? It seems to have changed recently and our trash wasn\'t collected this week.',
    authorId: '1',
    authorName: 'Juan Dela Cruz',
    datePosted: '2023-07-12',
    category: 'Question',
    tags: ['waste management', 'schedule', 'service'],
    likes: 8,
    commentCount: 6
  },
  {
    id: '5',
    title: 'Senior Citizen Benefits',
    content: 'My father just turned 60. What benefits or programs are available for senior citizens in our barangay?',
    authorId: '5',
    authorName: 'Antonio Gonzales',
    datePosted: '2023-07-15',
    category: 'Question',
    tags: ['senior citizens', 'benefits', 'programs'],
    likes: 10,
    commentCount: 7
  }
];

// Mock Comments Data
export const comments: Comment[] = [
  {
    id: '1',
    postId: '1',
    authorId: '2',
    authorName: 'Maria Santos',
    content: 'We\'re experiencing the same issue in our area. I called the water utility company and they said they\'re fixing a main pipe that burst. Should be resolved by tomorrow.',
    datePosted: '2023-07-05',
    likes: 5
  },
  {
    id: '2',
    postId: '1',
    authorId: '4',
    authorName: 'Rosa Diaz',
    content: 'The barangay should provide water trucks during these interruptions. Many families are struggling without water.',
    datePosted: '2023-07-06',
    likes: 8
  },
  {
    id: '3',
    postId: '2',
    authorId: '1',
    authorName: 'Juan Dela Cruz',
    content: 'I agree this is becoming a serious problem. We should report this to the barangay animal control unit.',
    datePosted: '2023-07-08',
    likes: 6
  },
  {
    id: '4',
    postId: '3',
    authorId: '5',
    authorName: 'Antonio Gonzales',
    content: 'This is a great idea! My son would be interested in participating. I can also help with organization and maybe get some sponsors for prizes.',
    datePosted: '2023-07-10',
    likes: 10
  },
  {
    id: '5',
    postId: '4',
    authorId: '3',
    authorName: 'Pedro Reyes',
    content: 'The new schedule is Monday and Thursday mornings for our area. They announced it last month but didn\'t distribute printed schedules.',
    datePosted: '2023-07-12',
    likes: 4
  }
];
