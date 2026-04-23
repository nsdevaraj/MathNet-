import { parquetRead } from 'hyparquet';
import fs from 'fs';
const buf = fs.readFileSync('./tmp_parquets/grafite.parquet');
parquetRead({ file: buf.buffer, rowFormat: 'object', onComplete: (data) => {
  const subjects = [...new Set(data.map(r => r.subject))];
  console.log("SUBJECTS:", subjects);
}});
