import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { CorpusManifest } from './manifest';
import type { SqlConnection, SqlQueryResult } from './sqliteQuestionRepository';

interface IntegrityRow {
  integrity_check: string;
}

interface CountRow {
  count: number;
}

interface MetadataRow {
  value: string;
}

export const filePathFromUri = (uri: string): string => {
  if (!uri.startsWith('file:')) return uri;
  return decodeURIComponent(new URL(uri).pathname);
};

export class CapacitorSqlConnection implements SqlConnection {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;

  constructor(
    private readonly databasePath: string,
    private readonly schemaVersion: number,
  ) {}

  async open(): Promise<void> {
    if (this.database) return;

    const existingConnection = await this.sqlite.isNCConnection(this.databasePath);
    this.database = existingConnection.result
      ? await this.sqlite.retrieveNCConnection(this.databasePath)
      : await this.sqlite.createNCConnection(this.databasePath, this.schemaVersion);

    if (!(await this.database.isDBOpen()).result) await this.database.open();
  }

  async query(statement: string, values: unknown[] = []): Promise<SqlQueryResult> {
    if (!this.database) throw new Error('Corpus database connection is not open.');
    return this.database.query(statement, values);
  }

  async close(): Promise<void> {
    if (!this.database) return;

    if ((await this.database.isDBOpen()).result) await this.database.close();
    await this.sqlite.closeNCConnection(this.databasePath);
    this.database = undefined;
  }
}

export const validateCorpusDatabase = async (
  databasePath: string,
  manifest: CorpusManifest,
): Promise<void> => {
  const connection = new CapacitorSqlConnection(databasePath, manifest.schemaVersion);
  await connection.open();

  try {
    const [integrityResult, versionResult, countResult, metadataResult] = await Promise.all([
      connection.query('PRAGMA integrity_check'),
      connection.query('PRAGMA user_version'),
      connection.query('SELECT COUNT(*) AS count FROM questions'),
      connection.query("SELECT value FROM metadata WHERE key = 'corpus_version' LIMIT 1"),
    ]);

    const integrity = integrityResult.values?.[0] as IntegrityRow | undefined;
    const schema = versionResult.values?.[0] as { user_version: number } | undefined;
    const count = countResult.values?.[0] as CountRow | undefined;
    const metadata = metadataResult.values?.[0] as MetadataRow | undefined;

    if (integrity?.integrity_check !== 'ok') throw new Error('Downloaded corpus failed SQLite integrity validation.');
    if (Number(schema?.user_version) !== manifest.schemaVersion) throw new Error('Downloaded corpus schema version does not match its manifest.');
    if (Number(count?.count) !== manifest.totalQuestions) throw new Error('Downloaded corpus question count does not match its manifest.');
    if (metadata?.value !== manifest.corpusVersion) throw new Error('Downloaded corpus version does not match its manifest.');
  } finally {
    await connection.close();
  }
};