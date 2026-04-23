async function searchJEE() {
  const res = await fetch('https://huggingface.co/api/datasets?search=JEE&sort=downloads&direction=-1');
  const data = await res.json();
  data.slice(0, 10).forEach(d => {
    console.log(`${d.id} - Downloads: ${d.downloads} - Tags: ${d.tags.join(',')}`);
  });
}
searchJEE().catch(console.error);
