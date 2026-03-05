export interface TranscriptionItem {
  id: string;           // unique id
  role: 'teacher' | 'student';
  text: string;
  timestamp: number;    // Unix timestamp
}