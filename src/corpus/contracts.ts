import type { QuestionId, QuizQuestion } from '../types';

export interface QuestionFilters {
  subject?: string;
  topic?: string;
  subtopic?: string;
  search?: string;
}

export interface QuestionQuery extends QuestionFilters {
  offset: number;
  limit: number;
}

export interface QuestionPage {
  items: QuizQuestion[];
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface CorpusFacets {
  subjects: FacetValue[];
  topics: FacetValue[];
  subtopics: FacetValue[];
}

export interface QuestionRepository {
  open(): Promise<void>;
  query(query: QuestionQuery, signal?: AbortSignal): Promise<QuestionPage>;
  facets(filters: QuestionFilters, signal?: AbortSignal): Promise<CorpusFacets>;
  getById(id: QuestionId, signal?: AbortSignal): Promise<QuizQuestion | undefined>;
  close(): Promise<void>;
}

export type CorpusInstallPhase =
  | 'notInstalled'
  | 'checking'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'paused'
  | 'ready'
  | 'failed';

export type CorpusInstallErrorCode =
  | 'network'
  | 'insufficientStorage'
  | 'integrity'
  | 'incompatibleSchema'
  | 'storage'
  | 'unknown';

export interface CorpusInstallState {
  phase: CorpusInstallPhase;
  version?: string;
  completedBytes: number;
  totalBytes?: number;
  error?: {
    code: CorpusInstallErrorCode;
    message: string;
  };
}

export interface CorpusInstaller {
  getState(): Promise<CorpusInstallState>;
  subscribe(listener: (state: CorpusInstallState) => void): () => void;
  install(): Promise<void>;
  update(): Promise<void>;
  pause(): Promise<void>;
  retry(): Promise<void>;
}

export interface AssetResolver {
  resolve(source: string): Promise<string>;
  release(resolvedUrl: string): void;
}