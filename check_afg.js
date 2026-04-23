import { parquetMetadata } from 'hyparquet';
import fs from 'fs';

async function downloadFile(url, dest) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

async function checkAfghanistan() {
  const url = 'https://huggingface.co/datasets/ShadenA/MathNet/resolve/refs%2Fconvert%2Fparquet/Afghanistan/train/0000.parquet?download=true';
  const dest = 'afg.parquet';
  console.log("Downloading Afg...");
  await downloadFile(url, dest);
  const fileBuffer = fs.readFileSync(dest);
  const metadata = parquetMetadata(fileBuffer.buffer);
  console.log("Num rows:", metadata.num_rows);
}

checkAfghanistan().catch(console.error);
