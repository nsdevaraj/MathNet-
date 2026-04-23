async function listDatasets() {
  const res = await fetch('https://huggingface.co/api/datasets?author=ShadenA');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listDatasets().catch(console.error);
