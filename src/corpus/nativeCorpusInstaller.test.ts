import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import type { CorpusInstallPhase } from './contracts';
import { parseCorpusManifest, resolveCorpusUrl, type CorpusManifest } from './manifest';
import {
  NativeCorpusInstaller,
  type NativeCorpusOperations,
} from './nativeCorpusInstaller';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class MemoryOperations implements NativeCorpusOperations {
  readonly files = new Map<string, Uint8Array>();
  downloadCount = 0;
  onDownload?: () => Promise<void>;

  constructor(private readonly payload: Uint8Array) {}

  async ensureDirectory(): Promise<void> {}

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  async rename(from: string, to: string): Promise<void> {
    const value = this.files.get(from);
    if (!value) throw new Error(`Missing file: ${from}`);
    this.files.set(to, value);
    this.files.delete(from);
  }

  async getUri(path: string): Promise<string> {
    return path;
  }

  async stat(path: string): Promise<{ size: number }> {
    const value = this.files.get(path);
    if (!value) throw new Error(`Missing file: ${path}`);
    return { size: value.byteLength };
  }

  async readText(path: string): Promise<string | undefined> {
    const value = this.files.get(path);
    return value ? decoder.decode(value) : undefined;
  }

  async writeText(path: string, value: string): Promise<void> {
    this.files.set(path, encoder.encode(value));
  }

  async readBase64Chunks(path: string, chunkSize: number, onChunk: (chunk: string) => void): Promise<void> {
    const value = this.files.get(path);
    if (!value) throw new Error(`Missing file: ${path}`);

    for (let offset = 0; offset < value.length; offset += chunkSize) {
      onChunk(Buffer.from(value.subarray(offset, offset + chunkSize)).toString('base64'));
    }
  }

  async download(
    _url: string,
    destinationUri: string,
    onProgress: (progress: { completedBytes: number; totalBytes?: number }) => void,
  ): Promise<void> {
    this.downloadCount += 1;
    onProgress({ completedBytes: this.payload.byteLength, totalBytes: this.payload.byteLength });
    this.files.set(destinationUri, this.payload);
    await this.onDownload?.();
  }
}

const manifestFor = (payload: Uint8Array): CorpusManifest => ({
  schemaVersion: 1,
  corpusVersion: 'fixture-v1',
  totalQuestions: 2,
  rejectedQuestions: 0,
  database: {
    file: 'mathnet.sqlite3',
    bytes: payload.byteLength,
    sha256: createHash('sha256').update(payload).digest('hex'),
  },
});

const installerFor = (
  operations: MemoryOperations,
  manifest: CorpusManifest,
  validateDatabase: (path: string) => Promise<void> = async () => {},
): NativeCorpusInstaller => new NativeCorpusInstaller({
  baseUrl: 'https://example.test/corpus/',
  operations,
  fetchJson: async () => manifest,
  validateDatabase: (path) => validateDatabase(path),
});

test('validates manifest paths and transport URLs', () => {
  const payload = encoder.encode('fixture');
  assert.deepEqual(parseCorpusManifest(manifestFor(payload)), manifestFor(payload));
  assert.throws(
    () => parseCorpusManifest({ ...manifestFor(payload), database: { ...manifestFor(payload).database, file: '../escape.sqlite3' } }),
    /invalid|traverse/,
  );
  assert.throws(() => resolveCorpusUrl('http://example.test/', 'manifest.json'), /HTTPS/);
  assert.equal(resolveCorpusUrl('http://localhost:3000/', 'manifest.json'), 'http://localhost:3000/manifest.json');
});

test('rejects unsupported schemas before downloading', async () => {
  const payload = encoder.encode('new database');
  const operations = new MemoryOperations(payload);
  const manifest = manifestFor(payload);
  manifest.schemaVersion = 2;
  const installer = installerFor(operations, manifest);

  await assert.rejects(installer.install(), /incompatible/);

  assert.equal(operations.downloadCount, 0);
  assert.equal((await installer.getState()).error?.code, 'incompatibleSchema');
});

test('installs, verifies, and commits a corpus atomically', async () => {
  const payload = encoder.encode('new database');
  const operations = new MemoryOperations(payload);
  operations.files.set('corpus/current.sqlite3', encoder.encode('old database'));
  const installer = installerFor(operations, manifestFor(payload));
  const phases: CorpusInstallPhase[] = [];
  installer.subscribe((state) => phases.push(state.phase));

  await installer.install();

  const transitions = phases.filter((phase, index) => index === 0 || phase !== phases[index - 1]);
  assert.deepEqual(transitions.slice(-5), ['checking', 'downloading', 'verifying', 'installing', 'ready']);
  assert.deepEqual(operations.files.get('corpus/current.sqlite3'), payload);
  assert.equal(operations.files.has('corpus/previous.sqlite3'), false);
  assert.equal((await installer.getState()).phase, 'ready');
});

test('rejects a bad hash without replacing the active corpus', async () => {
  const payload = encoder.encode('new database');
  const operations = new MemoryOperations(payload);
  const oldDatabase = encoder.encode('old database');
  operations.files.set('corpus/current.sqlite3', oldDatabase);
  const manifest = manifestFor(payload);
  manifest.database.sha256 = '0'.repeat(64);
  const installer = installerFor(operations, manifest);

  await assert.rejects(installer.install(), /hash mismatch/);

  assert.deepEqual(operations.files.get('corpus/current.sqlite3'), oldDatabase);
  assert.equal((await installer.getState()).error?.code, 'integrity');
});

test('rolls back when the activated database fails validation', async () => {
  const payload = encoder.encode('new database');
  const operations = new MemoryOperations(payload);
  const oldDatabase = encoder.encode('old database');
  operations.files.set('corpus/current.sqlite3', oldDatabase);
  const installer = installerFor(operations, manifestFor(payload), async (path) => {
    if (path === 'corpus/current.sqlite3') throw new Error('integrity failure after activation');
  });

  await assert.rejects(installer.install(), /integrity failure/);

  assert.deepEqual(operations.files.get('corpus/current.sqlite3'), oldDatabase);
  assert.equal(operations.files.has('corpus/previous.sqlite3'), false);
});

test('resumes a completed paused download without downloading it twice', async () => {
  const payload = encoder.encode('new database');
  const operations = new MemoryOperations(payload);
  let releaseDownload: (() => void) | undefined;
  operations.onDownload = () => new Promise<void>((resolve) => {
    releaseDownload = resolve;
  });
  const installer = installerFor(operations, manifestFor(payload));
  const installPromise = installer.install();

  while (!releaseDownload) await Promise.resolve();
  await installer.pause();
  releaseDownload();
  await installPromise;
  assert.equal((await installer.getState()).phase, 'paused');

  operations.onDownload = undefined;
  await installer.retry();

  assert.equal((await installer.getState()).phase, 'ready');
  assert.equal(operations.downloadCount, 1);
});