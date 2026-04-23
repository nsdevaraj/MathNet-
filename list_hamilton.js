async function listHamilton() {
  const res = await fetch('https://huggingface.co/api/datasets?author=m-hamilton');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listHamilton().catch(console.error);
