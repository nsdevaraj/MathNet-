async function listNavid() {
  const res = await fetch('https://huggingface.co/api/datasets?search=MathNet'); // Searching by ID again
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listNavid().catch(console.error);
