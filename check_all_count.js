async function checkAllCount() {
  const res = await fetch('https://datasets-server.huggingface.co/size?dataset=ShadenA/MathNet');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkAllCount().catch(console.error);
