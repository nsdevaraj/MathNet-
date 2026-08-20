import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import test from 'node:test';
import type { SqlConnection, SqlQueryResult } from './sqliteQuestionRepository';
import { SqliteQuestionRepository } from './sqliteQuestionRepository';

class MemorySqlConnection implements SqlConnection {
  readonly database = new DatabaseSync(':memory:');

  async open(): Promise<void> {}

  async query(statement: string, values: unknown[] = []): Promise<SqlQueryResult> {
    return { values: this.database.prepare(statement).all(...values as SQLInputValue[]) };
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

const createRepository = async (): Promise<SqliteQuestionRepository> => {
  const connection = new MemorySqlConnection();
  connection.database.exec(`
    CREATE TABLE questions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      subtopic TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      solution TEXT NOT NULL,
      options_json TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE question_search USING fts5(
      question,
      answer,
      solution,
      content = 'questions',
      content_rowid = 'rowid'
    );
  `);

  const insert = connection.database.prepare(`
    INSERT INTO questions (id, subject, topic, subtopic, question, answer, solution, options_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (let index = 1; index <= 60; index += 1) {
    insert.run(
      `question:${index}`,
      index <= 30 ? 'Mathematics' : 'Physics',
      index % 2 === 0 ? 'Algebra' : 'Geometry',
      index % 2 === 0 ? 'Equations' : 'Triangles',
      index === 2 ? 'Solve the quadratic equation' : `Question ${index}`,
      String(index),
      index === 2 ? 'Use the quadratic formula' : '',
      index === 2 ? JSON.stringify([{ text: 'First option' }]) : '[]',
    );
  }
  connection.database.exec("INSERT INTO question_search(question_search) VALUES ('rebuild')");

  const repository = new SqliteQuestionRepository(connection);
  await repository.open();
  return repository;
};

test('caps pages and supports indexed filters, facets, search, and lookup', async () => {
  const repository = await createRepository();

  try {
    const cappedPage = await repository.query({ offset: 0, limit: 500 });
    assert.equal(cappedPage.items.length, 50);
    assert.equal(cappedPage.total, 60);
    assert.equal(cappedPage.hasMore, true);

    const filteredPage = await repository.query({
      subject: 'Mathematics',
      topic: 'Algebra',
      offset: 0,
      limit: 10,
    });
    assert.equal(filteredPage.total, 15);
    assert.ok(filteredPage.items.every((question) => question.subject === 'Mathematics' && question.topic === 'Algebra'));

    const searchPage = await repository.query({ search: 'quadratic formula', offset: 0, limit: 10 });
    assert.equal(searchPage.total, 1);
    assert.equal(searchPage.items[0].id, 'question:2');
    assert.deepEqual(searchPage.items[0].options, [{ id: '0', text: 'First option' }]);

    const facets = await repository.facets({ subject: 'Mathematics' });
    assert.deepEqual(facets.subjects, [
      { value: 'Mathematics', count: 30 },
      { value: 'Physics', count: 30 },
    ]);
    assert.deepEqual(facets.topics, [
      { value: 'Algebra', count: 15 },
      { value: 'Geometry', count: 15 },
    ]);

    assert.equal((await repository.getById('question:2'))?.answer, '2');
    assert.equal(await repository.getById('missing'), undefined);

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      repository.query({ offset: 0, limit: 1 }, controller.signal),
      (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
    );
  } finally {
    await repository.close();
  }
});