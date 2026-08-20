import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  CLASSIFICATION_VERSION,
  normalizeQuestionClassification,
} from '../../src/corpus/classification.js';

const SCHEMA_VERSION = 1;

const readArgument = (name, fallback) => {
  const argumentIndex = process.argv.indexOf(name);
  return argumentIndex === -1 ? fallback : process.argv[argumentIndex + 1];
};

const sourceDirectory = resolve(readArgument('--source', 'public'));
const outputDirectory = resolve(readArgument('--output', 'artifacts/corpus'));
const requestedLimit = Number(readArgument('--limit', '0'));
const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : undefined;
const indexPath = join(sourceDirectory, 'mathnet_index.json');
const databasePath = join(outputDirectory, 'mathnet.sqlite3');
const manifestPath = join(outputDirectory, 'manifest.json');

const corpusVersionFor = (lastUpdated, sampleLimit) => {
  const sourceVersion = String(lastUpdated ?? 'unversioned');
  const classificationVersion = `classification-${CLASSIFICATION_VERSION}`;
  return sampleLimit === undefined
    ? `${sourceVersion}-${classificationVersion}`
    : `${sourceVersion}-${classificationVersion}-sample-${sampleLimit}`;
};

if (!existsSync(indexPath)) {
  throw new Error(`Corpus index not found: ${indexPath}`);
}

mkdirSync(outputDirectory, { recursive: true });
if (existsSync(databasePath)) unlinkSync(databasePath);
if (existsSync(manifestPath)) unlinkSync(manifestPath);

const sourceIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
if (!Array.isArray(sourceIndex.chunks) || sourceIndex.chunks.length === 0) {
  throw new Error('Corpus index must contain at least one chunk.');
}

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA temp_store = MEMORY;
  PRAGMA page_size = 4096;
  PRAGMA user_version = ${SCHEMA_VERSION};

  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    solution TEXT NOT NULL,
    options_json TEXT NOT NULL CHECK (json_valid(options_json))
  );

  CREATE INDEX questions_by_subject ON questions(subject, id);
  CREATE INDEX questions_by_topic ON questions(subject, topic, id);
  CREATE INDEX questions_by_subtopic ON questions(subject, topic, subtopic, id);

  CREATE VIRTUAL TABLE question_search USING fts5(
    question,
    answer,
    solution,
    content = 'questions',
    content_rowid = 'rowid',
    tokenize = 'unicode61 remove_diacritics 2'
  );
`);

const insertQuestion = database.prepare(`
  INSERT INTO questions (
    id,
    source,
    source_record_id,
    subject,
    topic,
    subtopic,
    question,
    answer,
    solution,
    options_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertMetadata = database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');

let acceptedCount = 0;
let excludedCount = 0;
let rejectedCount = 0;

database.exec('BEGIN IMMEDIATE');
try {
  for (const chunkName of sourceIndex.chunks) {
    const chunkPath = join(sourceDirectory, basename(chunkName));
    if (!existsSync(chunkPath)) throw new Error(`Corpus chunk not found: ${chunkPath}`);

    const rawChunk = JSON.parse(readFileSync(chunkPath, 'utf8'));
    const questions = Array.isArray(rawChunk?.questions) ? rawChunk.questions : rawChunk;
    if (!Array.isArray(questions)) throw new Error(`Corpus chunk is not an array: ${chunkPath}`);

    for (const rawQuestion of questions) {
      if (limit !== undefined && acceptedCount >= limit) break;
      if (!rawQuestion || typeof rawQuestion !== 'object' || typeof rawQuestion.question !== 'string' || rawQuestion.question.trim() === '') {
        rejectedCount += 1;
        continue;
      }

      const sourceRecordId = String(rawQuestion.id ?? rawQuestion.index ?? acceptedCount + 1);
      const stableId = rawQuestion.stableId ? String(rawQuestion.stableId) : `legacy:${sourceRecordId}`;
      const options = Array.isArray(rawQuestion.options) ? rawQuestion.options : [];
      const classification = normalizeQuestionClassification({
        subject: rawQuestion.subject,
        topic: rawQuestion.topic,
        subtopic: rawQuestion.subtopic,
      });
      if (!classification) {
        excludedCount += 1;
        continue;
      }

      insertQuestion.run(
        stableId,
        String(rawQuestion.source ?? 'legacy-generated'),
        sourceRecordId,
        classification.subject,
        classification.topic,
        classification.subtopic,
        rawQuestion.question,
        String(rawQuestion.answer ?? rawQuestion.gold ?? 'See Solution'),
        String(rawQuestion.solution ?? ''),
        JSON.stringify(options),
      );
      acceptedCount += 1;
    }

    if (limit !== undefined && acceptedCount >= limit) break;
  }

  const corpusVersion = corpusVersionFor(sourceIndex.lastUpdated, limit);

  insertMetadata.run('schema_version', String(SCHEMA_VERSION));
  insertMetadata.run('corpus_version', corpusVersion);
  insertMetadata.run('question_count', String(acceptedCount));
  database.exec(`
    INSERT INTO question_search(question_search) VALUES ('rebuild');
    INSERT INTO question_search(question_search) VALUES ('optimize');
    COMMIT;
    PRAGMA optimize;
    VACUUM;
  `);
} catch (error) {
  database.exec('ROLLBACK');
  database.close();
  throw error;
}

const integrityResult = database.prepare('PRAGMA integrity_check').get();
const storedQuestionCount = Number(database.prepare('SELECT COUNT(*) AS count FROM questions').get().count);
const indexedQuestionCount = Number(database.prepare('SELECT COUNT(*) AS count FROM question_search').get().count);
const subjectCounts = database.prepare(`
  SELECT subject AS value, COUNT(*) AS count
  FROM questions
  GROUP BY subject
  ORDER BY subject
`).all().map(({ value, count }) => ({ value, count: Number(count) }));

if (integrityResult.integrity_check !== 'ok') throw new Error(`SQLite integrity check failed: ${integrityResult.integrity_check}`);
if (storedQuestionCount !== acceptedCount || indexedQuestionCount !== acceptedCount) {
  throw new Error(`Snapshot count mismatch: inserted=${acceptedCount}, stored=${storedQuestionCount}, indexed=${indexedQuestionCount}`);
}

database.close();

const databaseBytes = statSync(databasePath).size;
const databaseSha256 = createHash('sha256').update(readFileSync(databasePath)).digest('hex');
const manifest = {
  schemaVersion: SCHEMA_VERSION,
  classificationVersion: CLASSIFICATION_VERSION,
  corpusVersion: corpusVersionFor(sourceIndex.lastUpdated, limit),
  totalQuestions: acceptedCount,
  excludedQuestions: excludedCount,
  rejectedQuestions: rejectedCount,
  database: {
    file: basename(databasePath),
    bytes: databaseBytes,
    sha256: databaseSha256,
  },
  facets: {
    subjects: subjectCounts,
  },
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${acceptedCount} questions at ${databasePath}`);
console.log(`Manifest: ${manifestPath}`);