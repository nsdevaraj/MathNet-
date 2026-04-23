import { parquetMetadata } from 'hyparquet';
import fs from 'fs';
import https from 'https';

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

async function checkMetadata() {
  const url = 'https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/data/all/train-00000-of-00001.parquet?download=true';
  const dest = 'all.parquet';
  console.log("Downloading...");
  await downloadFile(url, dest);
  const buffer = fs.readFileSync(dest);
  const metadata = parquetMetadata(buffer.buffer);
  console.log("Num rows:", metadata.num_rows);
  fs.unlinkSync(dest);
}
checkMetadata().catch(console.error);
