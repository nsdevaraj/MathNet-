import { parquetMetadata } from 'hyparquet';
import fs from 'fs';

async function downloadFile(url, dest) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(arrayBuffer));
}

async function checkGrafiteMeta() {
  const url = 'https://huggingface.co/datasets/UtkarshM005/grafite-jee-mains-qna-no-img/resolve/main/data/train-00000-of-00001.parquet?download=true';
  const dest = 'grafite.parquet';
  console.log("Downloading grafite...");
  await downloadFile(url, dest);
  const fileBuffer = fs.readFileSync(dest);
  const metadata = parquetMetadata(fileBuffer.buffer);
  console.log("Num rows:", metadata.num_rows);
  console.log("Columns:", metadata.schema.map(s => s.name));
}

checkGrafiteMeta().catch(console.error);
