export interface Class {
  id: string;
  name: string;
  color: string;
  notebookUrl?: string; // Link to NotebookLM
  credits?: number; // For GPA calculation
}

export interface AcademicEvent {
  id: string;
  classId: string;
  title: string;
  date: string; // ISO string
  type: 'assignment' | 'exam' | 'quiz' | 'material';
  description?: string;
  materialUrl?: string; // Link to PDF/Doc
  score?: number; // For grade tracking
  totalScore?: number; // For grade tracking
  weight?: number; // For grade tracking (percentage)
  completed?: boolean; // For task tracking
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
}

export interface NotebookSource {
  id: string;
  classId: string; // Course ID this source belongs to, or 'global'
  title: string;
  type: 'note' | 'link' | 'pdf' | 'syllabus';
  content: string; // Full text content used for searching & queries
  url?: string;
  wordCount: number;
  addedAt: string;
}


