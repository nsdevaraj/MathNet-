async function searchAuthors() {
  const authors = ['AbrarZ', 'MarkHamilton', 'navidsafaei', 'KevinWen'];
  for (const author of authors) {
    const res = await fetch(`https://huggingface.co/api/datasets?author=${author}`);
    const data = await res.json();
    console.log(`Datasets by ${author}:`, data.length);
    data.forEach(d => console.log(`  - ${d.id}`));
  }
}
searchAuthors().catch(console.error);
