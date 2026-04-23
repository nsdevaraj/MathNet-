async function checkSplits() {
  const res = await fetch('https://datasets-server.huggingface.co/splits?dataset=ShadenA/MathNet');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkSplits().catch(console.error);
