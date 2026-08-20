import { loadEnv } from 'vite';

const environment = loadEnv('production', process.cwd(), '');
const configuredBaseUrl = process.env.VITE_CORPUS_BASE_URL ?? environment.VITE_CORPUS_BASE_URL;

if (!configuredBaseUrl?.trim()) {
  throw new Error(
    'VITE_CORPUS_BASE_URL is missing. Publish the corpus, then add its HTTPS directory to .env.local.',
  );
}

const baseUrl = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`;
const manifestUrl = new URL('manifest.json', baseUrl);

if (
  manifestUrl.protocol !== 'https:'
  && !(manifestUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(manifestUrl.hostname))
) {
  throw new Error('The corpus endpoint must use HTTPS outside local development.');
}

const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
if (!manifestResponse.ok) {
  throw new Error(`Corpus manifest check failed: ${manifestResponse.status} ${manifestUrl}`);
}

const manifest = await manifestResponse.json();
if (
  !Number.isInteger(manifest.schemaVersion)
  || !Number.isInteger(manifest.totalQuestions)
  || !manifest.database?.file
  || !Number.isInteger(manifest.database?.bytes)
  || !/^[a-f0-9]{64}$/i.test(manifest.database?.sha256 ?? '')
) {
  throw new Error('The remote corpus manifest is malformed.');
}

const databaseUrl = new URL(manifest.database.file, baseUrl);
const databaseResponse = await fetch(databaseUrl, { method: 'HEAD', cache: 'no-store' });
if (!databaseResponse.ok) {
  throw new Error(`Corpus database check failed: ${databaseResponse.status} ${databaseUrl}`);
}

const contentLength = Number(databaseResponse.headers.get('content-length'));
if (Number.isFinite(contentLength) && contentLength > 0 && contentLength !== manifest.database.bytes) {
  throw new Error(
    `Remote corpus size mismatch: manifest=${manifest.database.bytes}, response=${contentLength}.`,
  );
}

console.log(
  `Verified remote corpus ${manifest.corpusVersion}: ${manifest.totalQuestions} questions at ${baseUrl}`,
);