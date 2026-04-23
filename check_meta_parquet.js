import { parquetMetadata } from 'hyparquet';
import fs from 'fs';

async function downloadFile(url, dest) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

async function checkMeta() {
  const url = 'https://huggingface.co/datasets/ShadenA/MathNet/resolve/refs%2Fconvert%2Fparquet/all/train/0000.parquet?download=true';
  const dest = 'parquet_branch_all.parquet';
  console.log("Downloading from parquet branch...");
  await downloadFile(url, dest);
  const fileBuffer = fs.readFileSync(dest);
  const metadata = parquetMetadata(fileBuffer.buffer);
  console.log("Num rows:", metadata.num_rows);
  console.log("Columns:", metadata.schema.map(s => s.name));
}

checkMeta().catch(console.error);
