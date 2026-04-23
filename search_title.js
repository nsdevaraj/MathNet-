async function searchTitle() {
  const res = await fetch('https://huggingface.co/api/datasets?search=Global+Multimodal+Benchmark+for+Mathematical+Reasoning&sort=downloads&direction=-1');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
searchTitle().catch(console.error);
