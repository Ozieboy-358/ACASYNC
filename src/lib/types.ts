export interface Class {
  id: string;
  name: string;
  color: string;
  notebookUrl?: string; // Link to external NotebookLM or resource
  credits?: number; // For GPA calculation
  icalUrl?: string; // Class specific iCal/D2L feed URL
  code?: string; // Course code e.g. PHYS 101, CS 201
  instructor?: string;
}

export interface CompletionStep {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface CoreObjective {
  id: string;
  classId: string; // Belongs to a specific class or 'global'
  title: string;
  description: string;
  category?: 'course' | 'assignment' | 'exam' | 'project';
  targetDate?: string;
  completed: boolean;
  guides: CompletionStep[];
  createdAt: string;
}

export interface AcademicEvent {
  id: string;
  classId: string;
  title: string;
  date: string; // ISO string YYYY-MM-DD
  type: 'assignment' | 'exam' | 'quiz' | 'material';
  description?: string;
  materialUrl?: string; // Link to PDF/Doc or D2L item
  score?: number; // For grade tracking
  totalScore?: number; // For grade tracking
  weight?: number; // For grade tracking (percentage)
  completed?: boolean; // For task tracking
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  objectives?: string[]; // Objective IDs or strings
  completionSteps?: CompletionStep[]; // Step-by-step guide to completion
  icalFeedId?: string; // Source iCal feed ID
}

export interface NotebookSource {
  id: string;
  classId: string; // Course ID this source belongs to, or 'global'
  title: string;
  type: 'note' | 'link' | 'pdf' | 'syllabus' | 'd2l_material';
  content: string; // Full text content used for searching & queries
  url?: string;
  wordCount: number;
  addedAt: string;
}

export interface Flashcard {
  id: string;
  classId: string;
  question: string;
  answer: string;
  interval: number; // Days until next review
  easeFactor: number; // SM-2 ease factor
  repetitions: number; // Number of consecutive reviews
  nextReviewDate: string; // YYYY-MM-DD format
}

export interface SavedICalFeed {
  id: string;
  name: string;
  url: string;
  classId?: string;
  lastSyncedAt?: string;
  autoSync: boolean;
  eventCount?: number;
}
