import { parquetRead } from 'hyparquet';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { categorizeQuestion } from './categorizer.js';

const downloadFile = async (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const handleResponse = (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, handleResponse);
      } else if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status ${res.statusCode}`));
      } else {
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }
    };
    https.get(url, handleResponse).on('error', reject);
  });
};

const getTree = async (dataset, treePath) => {
  const res = await fetch(`https://huggingface.co/api/datasets/${dataset}/tree/main/${treePath}`);
  return await res.json();
};

async function main() {
  const CHUNK_SIZE = 2500; // Increased chunk size to reduce total number of files
  let currentChunk = [];
  let totalParsed = 0;
  let chunkIndex = 0;
  const chunkFiles = [];
  const counts = { subjects: {}, topics: {} };

  if (!fs.existsSync('./public')) fs.mkdirSync('./public');
  if (!fs.existsSync('./tmp_parquets')) fs.mkdirSync('./tmp_parquets');

  const flushChunk = () => {
    if (currentChunk.length === 0) return;
    const filename = `mathnet_${chunkIndex}.json`;
    fs.writeFileSync(path.join('./public', filename), JSON.stringify(currentChunk, null, 2));
    chunkFiles.push(filename);
    console.log(`=> Wrote ${filename} with ${currentChunk.length} questions. Total: ${totalParsed}`);
    chunkIndex++;
    currentChunk = [];
  };

  const addQuestion = (q, rawChapterString) => {
    if (!q.question || q.question.length < 5) return;
    totalParsed++;
    
    // Categorize
    const category = categorizeQuestion(q.question, q.subject, rawChapterString || '');
    q.topic = category.topic;
    q.subtopic = category.subtopic;

    if (!counts.subjects[q.subject]) counts.subjects[q.subject] = 0;
    counts.subjects[q.subject]++;
    
    if (!counts.topics[q.topic]) counts.topics[q.topic] = {};
    if (!counts.topics[q.topic][q.subtopic]) counts.topics[q.topic][q.subtopic] = 0;
    counts.topics[q.topic][q.subtopic]++;

    currentChunk.push({
      id: totalParsed,
      ...q
    });
    if (currentChunk.length >= CHUNK_SIZE) flushChunk();
  };

  // --- SOURCE 1: UtkarshM005 (JEE 11k) ---
  console.log("Processing UtkarshM005/grafite...");
  const gfUrl = 'https://huggingface.co/datasets/UtkarshM005/grafite-jee-mains-qna-no-img/resolve/main/data/train-00000-of-00001.parquet?download=true';
  const gfDest = './tmp_parquets/grafite.parquet';
  try {
      await downloadFile(gfUrl, gfDest);
      const buf = fs.readFileSync(gfDest);
      await new Promise((resolve) => {
          parquetRead({
              file: buf.buffer,
              rowFormat: 'object',
              onComplete: (data) => {
                  for (const row of data) {
                      let opts = [];
                      try {
                          const parsed = JSON.parse(row.options);
                          opts = parsed.map(o => ({ text: o.content }));
                      } catch (e) {}

                      let solution = row.explanation || "";
                      if (row.solution && row.solution !== "null") {
                          solution = `**Answer:** ${row.solution}\n\n${solution}`;
                      }

                      addQuestion({
                          subject: row.subject === 'mathematics' ? 'Mathematics' : (row.subject === 'physics' ? 'Physics' : (row.subject === 'chemistry' ? 'Chemistry' : 'General Science')),
                          question: row.question,
                          options: opts,
                          answer: row.solution || "Refer to Explanation",
                          solution: solution
                      }, row.chapter);
                  }
                  resolve();
              }
          });
      });
  } catch (e) {
      console.error("Error processing Grafite:", e);
  }

  // --- SOURCE 2: jordane95 (Olympiad 11k) ---
  console.log("Processing jordane95/mathnet...");
  const jdUrl = 'https://huggingface.co/datasets/jordane95/mathnet/resolve/main/mathnet_dataset.jsonl?download=true';
  try {
      const res = await fetch(jdUrl);
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      for (const line of lines) {
          try {
              const row = JSON.parse(line);
              addQuestion({
                subject: 'Mathematics (Olympiad)',
                question: row.prompt.replace("Solve this math problem: ", ""),
                options: [],
                answer: "See solution",
                solution: row.completion
              });
          } catch(e) {}
      }
  } catch (e) {
      console.error("Error processing Jordan dataset:", e);
  }

  // --- SOURCE 3: ShadenA (Original MathNet 200) ---
  console.log("Processing ShadenA/MathNet...");
  try {
      const dataRoot = await getTree('ShadenA/MathNet', 'data');
      for (const item of dataRoot) {
          if (item.type === 'directory') {
              const sub = await getTree('ShadenA/MathNet', item.path);
              for (const f of sub) {
                  if (f.path.endsWith('.parquet')) {
                      const url = `https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/${f.path}?download=true`;
                      const dest = `./tmp_parquets/shaden_${f.path.replace(/\//g, '_')}`;
                      await downloadFile(url, dest);
                      const buf = fs.readFileSync(dest);
                      await new Promise((resolve) => {
                          parquetRead({
                              file: buf.buffer,
                              rowFormat: 'object',
                              onComplete: (data) => {
                                  for (const row of data) {
                                      const problem = Array.isArray(row.problem_markdown) ? row.problem_markdown.join('\n') : (row.problem_markdown || "");
                                      const solution = Array.isArray(row.solutions_markdown) ? row.solutions_markdown.join('\n') : (row.solutions_markdown || "");
                                      addQuestion({
                                          subject: 'Mathematics (Multi-modal)',
                                          question: String(problem),
                                          options: [],
                                          answer: Array.isArray(row.final_answer) ? row.final_answer.join(', ') : String(row.final_answer || "Detailed solution"),
                                          solution: String(solution)
                                      });
                                  }
                                  resolve();
                              }
                          });
                      });
                      fs.unlinkSync(dest);
                  }
              }
          }
      }
  } catch (e) {
      console.error("Error processing ShadenA:", e);
  }

  flushChunk();

  console.log("Saving dataset index...");
  fs.writeFileSync('./public/mathnet_index.json', JSON.stringify({
     chunks: chunkFiles,
     counts: counts,
     total: totalParsed,
     lastUpdated: new Date().toISOString()
  }, null, 2));
  
  console.log(`Done! Exported ${totalParsed} total questions into ${chunkFiles.length} chunk files.`);
}

main().catch(console.error);
