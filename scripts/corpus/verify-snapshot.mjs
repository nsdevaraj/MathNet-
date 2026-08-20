import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const readArgument = (name, fallback) => {
  const argumentIndex = process.argv.indexOf(name);
  return argumentIndex === -1 ? fallback : process.argv[argumentIndex + 1];
};

const manifestPath = resolve(readArgument('--manifest', 'artifacts/corpus/manifest.json'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) {
  throw new Error('Manifest schemaVersion must be a positive integer.');
}
if (!Number.isInteger(manifest.totalQuestions) || manifest.totalQuestions < 1) {
  throw new Error('Manifest totalQuestions must be a positive integer.');
}
if (!manifest.database?.file || !manifest.database?.sha256 || !Number.isInteger(manifest.database?.bytes)) {
  throw new Error('Manifest database metadata is incomplete.');
}

const databasePath = join(dirname(manifestPath), manifest.database.file);
const actualBytes = statSync(databasePath).size;
const actualSha256 = createHash('sha256').update(readFileSync(databasePath)).digest('hex');

if (actualBytes !== manifest.database.bytes) {
  throw new Error(`Database size mismatch: expected=${manifest.database.bytes}, actual=${actualBytes}`);
}
if (actualSha256 !== manifest.database.sha256) {
  throw new Error(`Database hash mismatch: expected=${manifest.database.sha256}, actual=${actualSha256}`);
}

const database = new DatabaseSync(databasePath, { readOnly: true });
try {
  const integrityResult = database.prepare('PRAGMA integrity_check').get();
  const schemaVersion = Number(database.prepare('PRAGMA user_version').get().user_version);
  const questionCount = Number(database.prepare('SELECT COUNT(*) AS count FROM questions').get().count);
  const searchCount = Number(database.prepare('SELECT COUNT(*) AS count FROM question_search').get().count);
  const invalidOptionsCount = Number(database.prepare(`
    SELECT COUNT(*) AS count
    FROM questions
    WHERE NOT json_valid(options_json)
  `).get().count);
  const incompleteQuestionCount = Number(database.prepare(`
    SELECT COUNT(*) AS count
    FROM questions
    WHERE id = '' OR subject = '' OR question = ''
  `).get().count);
  const subjectCounts = database.prepare(`
    SELECT subject AS value, COUNT(*) AS count
    FROM questions
    GROUP BY subject
    ORDER BY subject
  `).all().map(({ value, count }) => ({ value, count: Number(count) }));

  if (integrityResult.integrity_check !== 'ok') throw new Error(`SQLite integrity check failed: ${integrityResult.integrity_check}`);
  if (schemaVersion !== manifest.schemaVersion) throw new Error(`Schema version mismatch: manifest=${manifest.schemaVersion}, database=${schemaVersion}`);
  if (questionCount !== manifest.totalQuestions) throw new Error(`Question count mismatch: manifest=${manifest.totalQuestions}, database=${questionCount}`);
  if (searchCount !== questionCount) throw new Error(`FTS coverage mismatch: questions=${questionCount}, indexed=${searchCount}`);
  if (invalidOptionsCount !== 0) throw new Error(`Found ${invalidOptionsCount} invalid options payloads.`);
  if (incompleteQuestionCount !== 0) throw new Error(`Found ${incompleteQuestionCount} incomplete questions.`);
  if (JSON.stringify(subjectCounts) !== JSON.stringify(manifest.facets?.subjects)) {
    throw new Error('Subject facet counts do not match the database.');
  }
} finally {
  database.close();
}

console.log(`Verified corpus ${manifest.corpusVersion}: ${manifest.totalQuestions} questions, sha256 ${actualSha256}`);