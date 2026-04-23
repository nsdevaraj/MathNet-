import { parquetRead } from 'hyparquet';
import fs from 'fs';
import path from 'path';

const getTree = async (treePath) => {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/main/' + treePath);
  return await res.json();
};

async function downloadFile(url, dest) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buf));
}

async function verifyAll() {
  const dataRoot = await getTree('data');
  let grandTotal = 0;
  for (const item of dataRoot) {
    if (item.type === 'directory') {
      const sub = await getTree(item.path);
      for (const f of sub) {
        if (f.path.endsWith('.parquet')) {
            const url = `https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/${f.path}?download=true`;
            const dest = 'verify.parquet';
            await downloadFile(url, dest);
            const fileBuffer = fs.readFileSync(dest);
            await new Promise((resolve) => {
                parquetRead({
                    file: fileBuffer.buffer,
                    onComplete: (data) => {
                        grandTotal += data.length;
                        resolve();
                    }
                });
            });
            fs.unlinkSync(dest);
        }
      }
    }
  }
  console.log("Grand Total in ShadenA/MathNet:", grandTotal);
}

verifyAll().catch(console.error);
