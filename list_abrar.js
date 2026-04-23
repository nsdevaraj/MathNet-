async function listAbrar() {
  const res = await fetch('https://huggingface.co/api/datasets?author=AbrarZainal'); // Guessing username
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listAbrar().catch(console.error);
