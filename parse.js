import { parquetRead } from 'hyparquet';
import fs from 'fs';
import https from 'https';
import path from 'path';

const getTree = async (treePath) => {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/refs%2Fconvert%2Fparquet/' + treePath);
  return await res.json();
};

const downloadFile = async (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const handleResponse = (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, handleResponse);
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

async function main() {
  console.log("Discovering parquet files...");
  const root = await getTree('');
  const parquetUrls = [];
  
  for (const item of root) {
    if (item.type === 'directory') {
      if (item.path === 'all') continue; 

      const sub = await getTree(item.path + '/train');
      for (const f of sub) {
        if (f.path.endsWith('.parquet')) {
          parquetUrls.push({
            name: f.path.split('/').pop() + '_' + item.path + '.parquet',
            url: `https://huggingface.co/datasets/ShadenA/MathNet/resolve/refs%2Fconvert%2Fparquet/${f.path}?download=true`
          });
        }
      }
    }
  }

  if (!fs.existsSync('./tmp_parquets')) fs.mkdirSync('./tmp_parquets');

  const counts = { 'Algebra': 0, 'Geometry': 0, 'Discrete Mathematics': 0, 'Number Theory': 0 };
  
  // CHUNKING CONFIGURATION
  const CHUNK_SIZE = 5000;
  let currentChunk = [];
  let totalParsed = 0;
  let chunkIndex = 0;
  const chunkFiles = [];

  const flushChunk = () => {
    if (currentChunk.length === 0) return;
    const filename = `mathnet_${chunkIndex}.json`;
    fs.writeFileSync(path.join('./public', filename), JSON.stringify(currentChunk, null, 2));
    chunkFiles.push(filename);
    console.log(`=> Wrote ${filename} with ${currentChunk.length} questions.`);
    chunkIndex++;
    currentChunk = [];
  };

  for (let i = 0; i < parquetUrls.length; i++) {
    const p = parquetUrls[i];
    const dest = path.join('./tmp_parquets', p.name);
    console.log(`Downloading ${i+1}/${parquetUrls.length}: ${p.name}`);
    try {
      await downloadFile(p.url, dest);
      
      const fileBuffer = fs.readFileSync(dest);
      
      await parquetRead({
        file: fileBuffer.buffer,
        rowFormat: 'object',
        parsers: {
            stringFromBytes: (bytes) => {
                if (!bytes) return null;
                // Basic check for image headers
                if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "{IMAGE_PLACEHOLDER}";
                try {
                  return new TextDecoder().decode(bytes);
                } catch(e) {
                  return "";
                }
            }
        },
        onComplete: (data) => {
          for (let j = 0; j < data.length; j++) {
             let row = data[j];
             const rawTopics = row.topics || row.topics_flat || [];
             const topics = Array.isArray(rawTopics) ? rawTopics : [rawTopics];
             let problem = Array.isArray(row.problem_markdown) ? row.problem_markdown.join('\n') : String(row.problem_markdown || row.original_problem_markdown || '');
             let answerList = row.final_answer || [];
             let answer = Array.isArray(answerList) ? answerList.join('\n') : String(answerList);
             if (!answer || answer.length < 2 || answer === "undefined" || answer === "null") answer = "Detailed Solution Provided";
             let solution = Array.isArray(row.solutions_markdown) ? row.solutions_markdown.join('\n') : String(row.solutions_markdown || '');
             
             if (!problem || problem.length < 10) continue;

             let subject = "Other";
             const ts = JSON.stringify(topics).toLowerCase();
             if (ts.includes('algebra')) subject = "Algebra";
             else if (ts.includes('geometry')) subject = "Geometry";
             else if (ts.includes('discrete')) subject = "Discrete Mathematics";
             else if (ts.includes('number theory')) subject = "Number Theory";
             if (subject === "Other") subject = "Algebra";

             if (!counts[subject]) counts[subject] = 0;
             counts[subject]++;
             totalParsed++;

             currentChunk.push({
                 id: totalParsed,
                 subject: subject,
                 question: problem,
                 options: [],
                 answer: answer,
                 solution: solution
             });

             if (currentChunk.length >= CHUNK_SIZE) flushChunk();
          }
        }
      });
    } catch (err) {
      console.error(`Error processing ${p.name}:`, err);
    } finally {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
    }
    
    // For now, let's limit it to first few chunks for the preview to be fast
    if (chunkIndex >= 2) break; 
  }

  flushChunk(); // Final flush

  console.log("Saving dataset index...");
  fs.writeFileSync('./public/mathnet_index.json', JSON.stringify({
     chunks: chunkFiles,
     counts: counts,
     total: totalParsed
  }, null, 2));
  
  console.log(`Done! Exported ${totalParsed} total questions into ${chunkFiles.length} chunk files.`);
}

main().catch(console.error);
