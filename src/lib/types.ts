export interface Class {
  id: string;
  name: string;
  color: string;
}

export interface AcademicEvent {
  id: string;
  classId: string;
  title: string;
  date: string; // ISO string
  type: 'assignment' | 'exam' | 'quiz' | 'material';
  description?: string;
}
