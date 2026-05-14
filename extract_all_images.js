import { parquetRead } from 'hyparquet';
import fs from 'fs';
import https from 'https';
import path from 'path';

const downloadFile = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  const handle = (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      https.get(res.headers.location, handle);
    } else if (res.statusCode !== 200) {
      reject(new Error(`Failed ${url}: ${res.statusCode}`));
    } else {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }
  };
  https.get(url, handle).on('error', reject);
});

const getTree = async (dataset, treePath) => {
  const res = await fetch(`https://huggingface.co/api/datasets/${dataset}/tree/main/${treePath}`);
  return await res.json();
};

async function main() {
  if (!fs.existsSync('./public/images')) fs.mkdirSync('./public/images', { recursive: true });
  if (!fs.existsSync('./tmp_parquets')) fs.mkdirSync('./tmp_parquets');

  let totalWritten = 0;
  let totalSkipped = 0;
  const seen = new Set();

  const dataRoot = await getTree('ShadenA/MathNet', 'data');
  for (const item of dataRoot) {
    if (item.type !== 'directory') continue;
    const sub = await getTree('ShadenA/MathNet', item.path);
    for (const f of sub) {
      if (!f.path.endsWith('.parquet')) continue;
      const url = `https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/${f.path}?download=true`;
      const dest = `./tmp_parquets/img_${f.path.replace(/\//g, '_')}`;
      try {
        console.log(`Downloading ${f.path}...`);
        await downloadFile(url, dest);
        const buf = fs.readFileSync(dest);
        await new Promise((resolve) => {
          parquetRead({
            file: buf.buffer,
            rowFormat: 'object',
            utf8: false,
            onComplete: (data) => {
              for (const row of data) {
                if (!Array.isArray(row.images)) continue;
                for (const img of row.images) {
                  if (!img || !img.bytes || !img.path) continue;
                  const pathStr = typeof img.path === 'string' ? img.path : Buffer.from(img.path).toString('utf8');
                  const imgName = pathStr.split('/').pop();
                  if (seen.has(imgName)) { totalSkipped++; continue; }
                  seen.add(imgName);
                  try {
                    const bytes = img.bytes instanceof Uint8Array ? img.bytes : Buffer.from(img.bytes);
                    fs.writeFileSync(`./public/images/${imgName}`, bytes);
                    totalWritten++;
                  } catch (e) {
                    console.error(`Write fail ${imgName}:`, e.message);
                  }
                }
              }
              resolve();
            }
          });
        });
      } catch (e) {
        console.error(`Error ${f.path}:`, e.message);
      } finally {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
      }
      console.log(`  total written so far: ${totalWritten}, dedup-skipped: ${totalSkipped}`);
    }
  }

  console.log(`\nDone. Wrote ${totalWritten} unique images. Skipped ${totalSkipped} duplicates.`);
}

main().catch(console.error);
