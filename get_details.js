async function getDatasetDetails() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
getDatasetDetails().catch(console.error);
