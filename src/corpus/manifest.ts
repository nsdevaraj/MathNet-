export interface CorpusDatabaseArtifact {
  file: string;
  bytes: number;
  sha256: string;
}

export const SUPPORTED_CORPUS_SCHEMA_VERSION = 1;

export interface CorpusManifest {
  schemaVersion: number;
  corpusVersion: string;
  totalQuestions: number;
  rejectedQuestions: number;
  database: CorpusDatabaseArtifact;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isPositiveInteger = (value: unknown): value is number => (
  Number.isInteger(value) && Number(value) > 0
);

export const parseCorpusManifest = (value: unknown): CorpusManifest => {
  if (!isRecord(value) || !isRecord(value.database)) {
    throw new Error('Corpus manifest must be an object with a database artifact.');
  }

  const { database } = value;
  if (!isPositiveInteger(value.schemaVersion)) throw new Error('Corpus schemaVersion must be a positive integer.');
  if (typeof value.corpusVersion !== 'string' || value.corpusVersion.trim() === '') {
    throw new Error('Corpus version is missing.');
  }
  if (!isPositiveInteger(value.totalQuestions)) throw new Error('Corpus totalQuestions must be a positive integer.');
  if (!Number.isInteger(value.rejectedQuestions) || Number(value.rejectedQuestions) < 0) {
    throw new Error('Corpus rejectedQuestions must be a non-negative integer.');
  }
  if (typeof database.file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(database.file)) {
    throw new Error('Corpus database file is invalid.');
  }
  if (database.file.split('/').includes('..')) throw new Error('Corpus database file cannot traverse directories.');
  if (!isPositiveInteger(database.bytes)) throw new Error('Corpus database size must be a positive integer.');
  if (typeof database.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(database.sha256)) {
    throw new Error('Corpus database SHA-256 is invalid.');
  }

  return {
    schemaVersion: value.schemaVersion,
    corpusVersion: value.corpusVersion,
    totalQuestions: value.totalQuestions,
    rejectedQuestions: Number(value.rejectedQuestions),
    database: {
      file: database.file,
      bytes: database.bytes,
      sha256: database.sha256.toLowerCase(),
    },
  };
};

export const resolveCorpusUrl = (baseUrl: string, relativePath: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(relativePath, normalizedBaseUrl);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Corpus downloads require HTTPS outside local development.');
  }

  return url.toString();
};