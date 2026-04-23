async function searchJEE() {
  const res = await fetch('https://huggingface.co/api/datasets?search=JEE&sort=downloads&direction=-1');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
searchJEE().catch(console.error);
