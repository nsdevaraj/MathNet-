import { parquetRead } from 'hyparquet';
import fs from 'fs';

async function peekGrafite() {
    const fileBuffer = fs.readFileSync('grafite.parquet'); // Already downloaded earlier
    await new Promise((resolve) => {
        parquetRead({
            file: fileBuffer.buffer,
            rowFormat: 'object',
            onComplete: (data) => {
                console.log("Grafite Sample 0:", JSON.stringify(data[0], (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
                resolve();
            }
        });
    });
}
peekGrafite().catch(console.error);
