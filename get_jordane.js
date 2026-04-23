async function getJordaneDetails() {
  const res = await fetch('https://huggingface.co/api/datasets/jordane95/mathnet');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
getJordaneDetails().catch(console.error);
