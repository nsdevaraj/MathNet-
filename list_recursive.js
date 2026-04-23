async function listRecursive() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/main?recursive=true');
  const data = await res.json();
  const parquets = data.filter(f => f.path.endsWith('.parquet'));
  console.log("Total parquets in main:", parquets.length);
  parquets.forEach(p => console.log(p.path));
}
listRecursive().catch(console.error);
