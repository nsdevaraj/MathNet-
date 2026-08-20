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
  // The native SQLite plugin holds one handle per connection. Overlapping calls
  // race inside that handle and abort the process on device, so every bridge
  // call is chained onto a single queue.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly databasePath: string,
    private readonly schemaVersion: number,
  ) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  open(): Promise<void> {
    return this.enqueue(async () => {
      if (this.database) return;

      const existingConnection = await this.sqlite.isNCConnection(this.databasePath);
      const database = existingConnection.result
        ? await this.sqlite.retrieveNCConnection(this.databasePath)
        : await this.sqlite.createNCConnection(this.databasePath, this.schemaVersion);

      if (!(await database.isDBOpen()).result) await database.open();
      this.database = database;
    });
  }

  query(statement: string, values: unknown[] = []): Promise<SqlQueryResult> {
    return this.enqueue(async () => {
      const database = this.database;
      if (!database) throw new Error('Corpus database connection is not open.');
      return database.query(statement, values);
    });
  }

  close(): Promise<void> {
    return this.enqueue(async () => {
      const database = this.database;
      if (!database) return;

      this.database = undefined;
      if ((await database.isDBOpen()).result) await database.close();
      await this.sqlite.closeNCConnection(this.databasePath);
    });
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