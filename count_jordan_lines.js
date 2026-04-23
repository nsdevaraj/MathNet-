async function countLines() {
  const url = 'https://huggingface.co/datasets/jordane95/mathnet/resolve/main/mathnet_dataset.jsonl?download=true';
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  console.log("Lines in jordane95/mathnet:", lines.length);
  if (lines.length > 0) {
    console.log("Sample line:", lines[0].substring(0, 500));
  }
}
countLines().catch(console.error);
