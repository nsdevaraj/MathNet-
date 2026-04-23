async function searchOlympiad() {
  const res = await fetch('https://huggingface.co/api/datasets?tags=mathematics&sort=downloads&direction=-1&limit=50');
  const data = await res.json();
  console.log(JSON.stringify(data.filter(d => d.id.toLowerCase().includes('math')), null, 2));
}
searchOlympiad().catch(console.error);
