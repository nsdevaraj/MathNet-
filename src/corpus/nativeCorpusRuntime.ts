import { Directory, Filesystem } from '@capacitor/filesystem';
import type { QuestionRepository } from './contracts';
import { capacitorCorpusOperations, createCapacitorCorpusInstaller } from './capacitorCorpusOperations';
import { CapacitorSqlConnection, filePathFromUri } from './capacitorSqlConnection';
import { SUPPORTED_CORPUS_SCHEMA_VERSION } from './manifest';
import { ACTIVE_CORPUS_DATABASE_PATH } from './nativeCorpusInstaller';
import { SqliteQuestionRepository } from './sqliteQuestionRepository';

export const configuredCorpusBaseUrl = import.meta.env.VITE_CORPUS_BASE_URL?.trim();

export const createNativeCorpusInstaller = () => {
  if (!configuredCorpusBaseUrl) throw new Error('No corpus download source is configured.');
  return createCapacitorCorpusInstaller(configuredCorpusBaseUrl);
};

export const openNativeQuestionRepository = async (): Promise<QuestionRepository> => {
  const databaseUri = await Filesystem.getUri({
    path: ACTIVE_CORPUS_DATABASE_PATH,
    directory: Directory.LibraryNoCloud,
  });
  const connection = new CapacitorSqlConnection(
    filePathFromUri(databaseUri.uri),
    SUPPORTED_CORPUS_SCHEMA_VERSION,
  );
  const repository = new SqliteQuestionRepository(connection);
  await repository.open();
  return repository;
};

export const hasNativeCorpus = (): Promise<boolean> => (
  capacitorCorpusOperations.exists(ACTIVE_CORPUS_DATABASE_PATH)
);