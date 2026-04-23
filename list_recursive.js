async function listRecursive() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/main?recursive=true');
  const items = await res.json();
  const parquets = items.filter(i => i.path.endsWith('.parquet')).map(i => i.path);
  console.log("Found parquets:", parquets.length);
  console.log(parquets);
}
listRecursive().catch(console.error);
