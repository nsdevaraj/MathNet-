async function probe() {
  const dataset = "ShadenA/MathNet";
  
  async function scan(path) {
    console.log(`Scanning ${path}...`);
    const res = await fetch(`https://huggingface.co/api/datasets/${dataset}/tree/main/${path}`);
    const items = await res.json();
    if (!Array.isArray(items)) return;
    
    for (const item of items) {
      if (item.type === 'directory') {
        await scan(item.path);
      } else if (item.path.endsWith('.parquet')) {
        console.log(`FOUND: ${item.path} (${item.size} bytes)`);
      }
    }
  }

  await scan('data');
}
probe().catch(console.error);
