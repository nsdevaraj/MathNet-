export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  answer: string;
  solution?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';