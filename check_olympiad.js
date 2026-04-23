async function checkOlympiadBench() {
  const res = await fetch('https://huggingface.co/api/datasets/OlympiadBench/OlympiadBench');
  const data = await res.json();
  console.log("OlympiadBench metadata:", JSON.stringify(data, null, 2));
}
checkOlympiadBench().catch(console.error);
