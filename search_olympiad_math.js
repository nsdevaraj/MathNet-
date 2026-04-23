async function searchOlympiadMath() {
  const res = await fetch('https://huggingface.co/api/datasets?search=Olympiad%20Math&sort=downloads&direction=-1');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
searchOlympiadMath().catch(console.error);
