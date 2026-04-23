async function searchLargeMathNet() {
  const res = await fetch('https://huggingface.co/api/datasets?search=MathNet&sort=lastModified&direction=-1');
  const data = await res.json();
  data.forEach(d => {
    console.log(`${d.id} - Downloads: ${d.downloads} - Tags: ${d.tags.join(',')}`);
  });
}
searchLargeMathNet().catch(console.error);
