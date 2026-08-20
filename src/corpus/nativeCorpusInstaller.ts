import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { CorpusInstallErrorCode, CorpusInstaller, CorpusInstallState } from './contracts';
import {
  parseCorpusManifest,
  resolveCorpusUrl,
  SUPPORTED_CORPUS_SCHEMA_VERSION,
  type CorpusManifest,
} from './manifest';

const ACTIVE_DATABASE_PATH = 'corpus/current.sqlite3';
const PREVIOUS_DATABASE_PATH = 'corpus/previous.sqlite3';
const STAGING_DATABASE_PATH = 'corpus/staging.sqlite3';
const INSTALL_STATE_PATH = 'corpus/install-state.json';

export interface CorpusDownloadProgress {
  completedBytes: number;
  totalBytes?: number;
}

export interface NativeCorpusOperations {
  ensureDirectory(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  getUri(path: string): Promise<string>;
  stat(path: string): Promise<{ size: number }>;
  readText(path: string): Promise<string | undefined>;
  writeText(path: string, value: string): Promise<void>;
  readBase64Chunks(path: string, chunkSize: number, onChunk: (chunk: string) => void): Promise<void>;
  download(url: string, destinationUri: string, onProgress: (progress: CorpusDownloadProgress) => void): Promise<void>;
}

export interface NativeCorpusInstallerDependencies {
  baseUrl: string;
  operations: NativeCorpusOperations;
  fetchJson(url: string): Promise<unknown>;
  validateDatabase(databasePath: string, manifest: CorpusManifest): Promise<void>;
}

const initialState = (): CorpusInstallState => ({
  phase: 'notInstalled',
  completedBytes: 0,
});

const cloneState = (state: CorpusInstallState): CorpusInstallState => ({
  ...state,
  error: state.error ? { ...state.error } : undefined,
});

const bytesFromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const errorCodeFor = (error: unknown): CorpusInstallErrorCode => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('space') || message.includes('storage full')) return 'insufficientStorage';
  if (message.includes('schema')) return 'incompatibleSchema';
  if (message.includes('hash') || message.includes('integrity') || message.includes('count')) return 'integrity';
  if (message.includes('network') || message.includes('fetch') || message.includes('http')) return 'network';
  if (message.includes('file') || message.includes('directory') || message.includes('storage')) return 'storage';
  return 'unknown';
};

export class NativeCorpusInstaller implements CorpusInstaller {
  private state = initialState();
  private stateLoaded = false;
  private pauseRequested = false;
  private activeOperation?: Promise<void>;
  private readonly listeners = new Set<(state: CorpusInstallState) => void>();

  constructor(private readonly dependencies: NativeCorpusInstallerDependencies) {}

  async getState(): Promise<CorpusInstallState> {
    if (!this.stateLoaded) await this.loadPersistedState();
    return cloneState(this.state);
  }

  subscribe(listener: (state: CorpusInstallState) => void): () => void {
    this.listeners.add(listener);
    listener(cloneState(this.state));
    return () => this.listeners.delete(listener);
  }

  install(): Promise<void> {
    return this.start();
  }

  update(): Promise<void> {
    return this.start();
  }

  async pause(): Promise<void> {
    this.pauseRequested = true;
  }

  retry(): Promise<void> {
    return this.start();
  }

  private start(): Promise<void> {
    if (this.activeOperation) return this.activeOperation;

    this.pauseRequested = false;
    this.activeOperation = this.performInstall().finally(() => {
      this.activeOperation = undefined;
    });
    return this.activeOperation;
  }

  private async performInstall(): Promise<void> {
    try {
      const entryState = this.state;
      this.setState({ phase: 'checking', completedBytes: 0 });
      await this.dependencies.operations.ensureDirectory('corpus');

      const manifestUrl = resolveCorpusUrl(this.dependencies.baseUrl, 'manifest.json');
      const manifest = parseCorpusManifest(await this.dependencies.fetchJson(manifestUrl));
      if (manifest.schemaVersion !== SUPPORTED_CORPUS_SCHEMA_VERSION) {
        throw new Error(`Corpus schema ${manifest.schemaVersion} is incompatible with this app.`);
      }
      const persistedState = await this.getPersistedState();
      if (
        persistedState?.phase === 'ready'
        && persistedState.version === manifest.corpusVersion
        && await this.dependencies.operations.exists(ACTIVE_DATABASE_PATH)
      ) {
        this.setState(persistedState);
        return;
      }

      if (this.pauseRequested) {
        this.setState({ phase: 'paused', version: manifest.corpusVersion, completedBytes: 0, totalBytes: manifest.database.bytes });
        return;
      }

      const canResumeStaging = entryState.phase === 'paused'
        && entryState.version === manifest.corpusVersion
        && await this.dependencies.operations.exists(STAGING_DATABASE_PATH);

      if (!canResumeStaging) {
        await this.removeIfPresent(STAGING_DATABASE_PATH);
        const stagingUri = await this.dependencies.operations.getUri(STAGING_DATABASE_PATH);
        const databaseUrl = resolveCorpusUrl(this.dependencies.baseUrl, manifest.database.file);

        this.setState({
          phase: 'downloading',
          version: manifest.corpusVersion,
          completedBytes: 0,
          totalBytes: manifest.database.bytes,
        });
        await this.dependencies.operations.download(databaseUrl, stagingUri, (progress) => {
          this.setState({
            phase: 'downloading',
            version: manifest.corpusVersion,
            completedBytes: Math.min(progress.completedBytes, manifest.database.bytes),
            totalBytes: manifest.database.bytes,
          });
        });
      }

      if (this.pauseRequested) {
        this.setState({
          phase: 'paused',
          version: manifest.corpusVersion,
          completedBytes: manifest.database.bytes,
          totalBytes: manifest.database.bytes,
        });
        return;
      }

      this.setState({
        phase: 'verifying',
        version: manifest.corpusVersion,
        completedBytes: manifest.database.bytes,
        totalBytes: manifest.database.bytes,
      });
      await this.verifyStagingDatabase(manifest);

      this.setState({
        phase: 'installing',
        version: manifest.corpusVersion,
        completedBytes: manifest.database.bytes,
        totalBytes: manifest.database.bytes,
      });
      const readyState: CorpusInstallState = {
        phase: 'ready',
        version: manifest.corpusVersion,
        completedBytes: manifest.database.bytes,
        totalBytes: manifest.database.bytes,
      };
      await this.activateStagingDatabase(manifest, readyState);
      this.setState(readyState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setState({
        phase: 'failed',
        completedBytes: this.state.completedBytes,
        totalBytes: this.state.totalBytes,
        version: this.state.version,
        error: { code: errorCodeFor(error), message },
      });
      throw error;
    }
  }

  private async verifyStagingDatabase(manifest: CorpusManifest): Promise<void> {
    const file = await this.dependencies.operations.stat(STAGING_DATABASE_PATH);
    if (file.size !== manifest.database.bytes) {
      throw new Error(`Corpus file size mismatch: expected ${manifest.database.bytes}, received ${file.size}.`);
    }

    const hash = sha256.create();
    await this.dependencies.operations.readBase64Chunks(
      STAGING_DATABASE_PATH,
      1024 * 1024,
      (chunk) => hash.update(bytesFromBase64(chunk)),
    );

    const actualHash = bytesToHex(hash.digest());
    if (actualHash !== manifest.database.sha256) {
      throw new Error(`Corpus hash mismatch: expected ${manifest.database.sha256}, received ${actualHash}.`);
    }

    const stagingUri = await this.dependencies.operations.getUri(STAGING_DATABASE_PATH);
    await this.dependencies.validateDatabase(stagingUri, manifest);
  }

  private async activateStagingDatabase(
    manifest: CorpusManifest,
    readyState: CorpusInstallState,
  ): Promise<void> {
    await this.removeIfPresent(PREVIOUS_DATABASE_PATH);
    const hadActiveDatabase = await this.dependencies.operations.exists(ACTIVE_DATABASE_PATH);

    if (hadActiveDatabase) {
      await this.dependencies.operations.rename(ACTIVE_DATABASE_PATH, PREVIOUS_DATABASE_PATH);
    }

    try {
      await this.dependencies.operations.rename(STAGING_DATABASE_PATH, ACTIVE_DATABASE_PATH);
    } catch (error) {
      if (hadActiveDatabase && await this.dependencies.operations.exists(PREVIOUS_DATABASE_PATH)) {
        await this.dependencies.operations.rename(PREVIOUS_DATABASE_PATH, ACTIVE_DATABASE_PATH);
      }
      throw error;
    }

    const activeUri = await this.dependencies.operations.getUri(ACTIVE_DATABASE_PATH);
    try {
      await this.dependencies.validateDatabase(activeUri, manifest);
      await this.dependencies.operations.writeText(INSTALL_STATE_PATH, JSON.stringify(readyState));
    } catch (error) {
      await this.removeIfPresent(ACTIVE_DATABASE_PATH);
      if (hadActiveDatabase && await this.dependencies.operations.exists(PREVIOUS_DATABASE_PATH)) {
        await this.dependencies.operations.rename(PREVIOUS_DATABASE_PATH, ACTIVE_DATABASE_PATH);
      }
      throw error;
    }

    await this.removeIfPresent(PREVIOUS_DATABASE_PATH);
  }

  private async loadPersistedState(): Promise<void> {
    this.stateLoaded = true;
    const persistedState = await this.getPersistedState();
    if (persistedState?.phase === 'ready' && await this.dependencies.operations.exists(ACTIVE_DATABASE_PATH)) {
      this.state = persistedState;
    }
  }

  private async getPersistedState(): Promise<CorpusInstallState | undefined> {
    const rawState = await this.dependencies.operations.readText(INSTALL_STATE_PATH);
    if (!rawState) return undefined;

    try {
      const parsedState = JSON.parse(rawState) as CorpusInstallState;
      return parsedState.phase === 'ready' ? parsedState : undefined;
    } catch {
      return undefined;
    }
  }

  private async removeIfPresent(path: string): Promise<void> {
    if (await this.dependencies.operations.exists(path)) await this.dependencies.operations.remove(path);
  }

  private setState(state: CorpusInstallState): void {
    this.state = state;
    for (const listener of this.listeners) listener(cloneState(state));
  }
}

export const ACTIVE_CORPUS_DATABASE_PATH = ACTIVE_DATABASE_PATH;