
export enum AppMode {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface TranscriptionItem {
  id: string;
  role: 'teacher' | 'student';
  text: string;
  timestamp: number;
}

export interface Point {
  x: number;
  y: number;
}
