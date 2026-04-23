import { parquetRead } from 'hyparquet';
import fs from 'fs';
import https from 'https';

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
        file.on("finish", () => { file.close(); resolve(); });
      }
    };
    https.get(url, handleResponse).on('error', reject);
  });
};

async function main() {
  const url = `https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/data/all/train-00000-of-00001.parquet?download=true`;
  const dest = './shaden_test.parquet';
  console.log("Downloading...");
  await downloadFile(url, dest);
  console.log("Downloaded, reading parquet...");
  const buf = fs.readFileSync(dest);
  parquetRead({
    file: buf.buffer,
    rowFormat: 'object',
    onComplete: (data) => {
      console.log('Columns:', Object.keys(data[0]));
      // Check image or visual columns
      const cols = Object.keys(data[0]);
      for (const k of cols) {
        if (/images/i.test(k) && Array.isArray(data[0][k]) && data[0][k].length > 0) {
          console.log(`Image 0 bytes type:`, typeof data[0][k][0].bytes, data[0][k][0].bytes instanceof Uint8Array);
        }
      }
    }
  });
}
main().catch(console.error);
