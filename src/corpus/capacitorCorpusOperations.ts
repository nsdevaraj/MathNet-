import { Capacitor, registerPlugin } from '@capacitor/core';
import { FileTransfer } from '@capacitor/file-transfer';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { filePathFromUri, validateCorpusDatabase } from './capacitorSqlConnection';
import { NativeCorpusInstaller, type NativeCorpusOperations } from './nativeCorpusInstaller';

const directory = Directory.LibraryNoCloud;

interface CorpusChecksumPlugin {
  sha256(
    options: { path: string },
    callback: (result: { completedBytes?: number; sha256?: string } | null, error?: { message?: string }) => void,
  ): Promise<string>;
}

const CorpusChecksum = registerPlugin<CorpusChecksumPlugin>('CorpusChecksum');

const nativeSha256: NonNullable<NativeCorpusOperations['sha256']> = async (path, onProgress) => {
  const { uri } = await Filesystem.getUri({ path, directory });
  return new Promise<string>((resolve, reject) => {
    void CorpusChecksum.sha256({ path: filePathFromUri(uri) }, (result, error) => {
      if (error) {
        reject(new Error(error.message ?? 'Native corpus verification failed.'));
        return;
      }
      if (result?.sha256 !== undefined) {
        resolve(result.sha256);
      } else if (result?.completedBytes !== undefined) {
        onProgress(result.completedBytes);
      } else {
        reject(new Error('Native corpus verification returned an invalid result.'));
      }
    }).catch(reject);
  });
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await Filesystem.stat({ path, directory });
    return true;
  } catch {
    return false;
  }
};

export const capacitorCorpusOperations: NativeCorpusOperations = {
  sha256: Capacitor.getPlatform() === 'android' ? nativeSha256 : undefined,
  async ensureDirectory(path) {
    if (!await exists(path)) await Filesystem.mkdir({ path, directory, recursive: true });
  },
  exists,
  async remove(path) {
    await Filesystem.deleteFile({ path, directory });
  },
  async rename(from, to) {
    await Filesystem.rename({ from, to, directory, toDirectory: directory });
  },
  async getUri(path) {
    return (await Filesystem.getUri({ path, directory })).uri;
  },
  async stat(path) {
    return Filesystem.stat({ path, directory });
  },
  async readText(path) {
    if (!await exists(path)) return undefined;
    const result = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 });
    return typeof result.data === 'string' ? result.data : undefined;
  },
  async writeText(path, value) {
    await Filesystem.writeFile({ path, directory, encoding: Encoding.UTF8, data: value, recursive: true });
  },
  async readBase64Chunks(path, chunkSize, onChunk) {
    await new Promise<void>((resolve, reject) => {
      void Filesystem.readFileInChunks({ path, directory, chunkSize }, (result, error) => {
        if (error) {
          reject(error);
          return;
        }

        if (result === null || result.data === '') {
          resolve();
          return;
        }

        if (typeof result.data !== 'string') {
          reject(new Error('Native corpus chunks must be base64 strings.'));
          return;
        }

        onChunk(result.data);
      }).catch(reject);
    });
  },
  async download(url, destinationUri, onProgress) {
    const progressListener = await FileTransfer.addListener('progress', (progress) => {
      if (progress.url !== url) return;
      onProgress({
        completedBytes: progress.bytes,
        totalBytes: progress.lengthComputable ? progress.contentLength : undefined,
      });
    });

    try {
      await FileTransfer.downloadFile({
        url,
        path: destinationUri,
        progress: true,
        connectTimeout: 60_000,
        readTimeout: 60_000,
      });
    } finally {
      await progressListener.remove();
    }
  },
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Corpus manifest HTTP ${response.status}.`);
  return response.json();
};

export const createCapacitorCorpusInstaller = (baseUrl: string): NativeCorpusInstaller => (
  new NativeCorpusInstaller({
    baseUrl,
    operations: capacitorCorpusOperations,
    fetchJson,
    validateDatabase: (databaseUri, manifest) => validateCorpusDatabase(filePathFromUri(databaseUri), manifest),
  })
);