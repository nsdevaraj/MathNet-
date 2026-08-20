import type {
  CorpusFacets,
  FacetValue,
  QuestionFilters,
  QuestionPage,
  QuestionQuery,
  QuestionRepository,
} from './contracts';
import type { QuestionId, QuizOption, QuizQuestion } from '../types';

export interface SqlQueryResult {
  values?: unknown[];
}

export interface SqlConnection {
  open(): Promise<void>;
  query(statement: string, values?: unknown[]): Promise<SqlQueryResult>;
  close(): Promise<void>;
}

interface QuestionRow {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  question: string;
  answer: string;
  solution: string;
  options_json: string;
}

interface CountRow {
  count: number;
}

interface FacetRow extends CountRow {
  value: string;
}

const ensureActive = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new DOMException('The corpus query was aborted.', 'AbortError');
};

const rowsFrom = <Row>(result: SqlQueryResult): Row[] => (result.values ?? []) as Row[];

const ftsQueryFor = (search: string): string => {
  const terms = search
    .normalize('NFKC')
    .match(/[\p{L}\p{N}]+/gu)
    ?.map((term) => `"${term.replaceAll('"', '""')}"`);

  return terms?.join(' AND ') ?? '';
};

const whereClauseFor = (filters: QuestionFilters): { sql: string; values: unknown[] } => {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.subject) {
    clauses.push('q.subject = ?');
    values.push(filters.subject);
  }
  if (filters.topic) {
    clauses.push('q.topic = ?');
    values.push(filters.topic);
  }
  if (filters.subtopic) {
    clauses.push('q.subtopic = ?');
    values.push(filters.subtopic);
  }

  const ftsQuery = filters.search ? ftsQueryFor(filters.search) : '';
  if (ftsQuery) {
    clauses.push('q.rowid IN (SELECT rowid FROM question_search WHERE question_search MATCH ?)');
    values.push(ftsQuery);
  }

  return {
    sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const parseOptions = (value: string): QuizOption[] => {
  try {
    const options = JSON.parse(value);
    if (!Array.isArray(options)) return [];

    return options.flatMap((option, index) => {
      if (typeof option === 'string') return [{ id: String(index), text: option }];
      if (!option || typeof option !== 'object' || typeof option.text !== 'string') return [];

      return [{
        id: typeof option.id === 'string' ? option.id : String(index),
        text: option.text,
      }];
    });
  } catch {
    return [];
  }
};

const questionFromRow = (row: QuestionRow): QuizQuestion => ({
  id: row.id,
  subject: row.subject,
  topic: row.topic,
  subtopic: row.subtopic,
  question: row.question,
  answer: row.answer,
  solution: row.solution,
  options: parseOptions(row.options_json),
});

export class SqliteQuestionRepository implements QuestionRepository {
  constructor(private readonly connection: SqlConnection) {}

  open(): Promise<void> {
    return this.connection.open();
  }

  async query(query: QuestionQuery, signal?: AbortSignal): Promise<QuestionPage> {
    ensureActive(signal);

    const limit = Math.min(Math.max(Math.trunc(query.limit), 1), 50);
    const offset = Math.max(Math.trunc(query.offset), 0);
    const where = whereClauseFor(query);
    const [itemsResult, countResult] = await Promise.all([
      this.connection.query(`
        SELECT q.id, q.subject, q.topic, q.subtopic, q.question, q.answer, q.solution, q.options_json
        FROM questions q
        ${where.sql}
        ORDER BY q.rowid
        LIMIT ? OFFSET ?
      `, [...where.values, limit, offset]),
      this.connection.query(`SELECT COUNT(*) AS count FROM questions q${where.sql}`, where.values),
    ]);

    ensureActive(signal);
    const items = rowsFrom<QuestionRow>(itemsResult).map(questionFromRow);
    const total = Number(rowsFrom<CountRow>(countResult)[0]?.count ?? 0);

    return {
      items,
      offset,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async facets(filters: QuestionFilters, signal?: AbortSignal): Promise<CorpusFacets> {
    ensureActive(signal);

    const subjectWhere = whereClauseFor({ search: filters.search });
    const topicWhere = whereClauseFor({ subject: filters.subject, search: filters.search });
    const subtopicWhere = whereClauseFor({
      subject: filters.subject,
      topic: filters.topic,
      search: filters.search,
    });

    const [subjects, topics, subtopics] = await Promise.all([
      this.queryFacets('subject', subjectWhere),
      this.queryFacets('topic', topicWhere),
      this.queryFacets('subtopic', subtopicWhere),
    ]);

    ensureActive(signal);
    return { subjects, topics, subtopics };
  }

  async getById(id: QuestionId, signal?: AbortSignal): Promise<QuizQuestion | undefined> {
    ensureActive(signal);
    const result = await this.connection.query(`
      SELECT id, subject, topic, subtopic, question, answer, solution, options_json
      FROM questions
      WHERE id = ?
      LIMIT 1
    `, [id]);
    ensureActive(signal);

    const row = rowsFrom<QuestionRow>(result)[0];
    return row ? questionFromRow(row) : undefined;
  }

  close(): Promise<void> {
    return this.connection.close();
  }

  private async queryFacets(
    column: 'subject' | 'topic' | 'subtopic',
    where: { sql: string; values: unknown[] },
  ): Promise<FacetValue[]> {
    const result = await this.connection.query(`
      SELECT q.${column} AS value, COUNT(*) AS count
      FROM questions q
      ${where.sql}
      GROUP BY q.${column}
      ORDER BY q.${column}
    `, where.values);

    return rowsFrom<FacetRow>(result).map((row) => ({
      value: row.value,
      count: Number(row.count),
    }));
  }
}