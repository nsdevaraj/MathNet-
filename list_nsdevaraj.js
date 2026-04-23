async function listUserDatasets() {
  const res = await fetch('https://huggingface.co/api/datasets?author=nsdevaraj');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listUserDatasets().catch(console.error);
