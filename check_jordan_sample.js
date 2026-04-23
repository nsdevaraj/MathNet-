async function checkJordanSample() {
  const url = 'https://huggingface.co/datasets/jordane95/mathnet/resolve/main/mathnet_dataset.jsonl?download=true';
  const res = await fetch(url);
  const text = await res.text();
  const firstLine = text.split('\n')[0];
  console.log("jordane95 sample:", firstLine);
}
checkJordanSample().catch(console.error);
