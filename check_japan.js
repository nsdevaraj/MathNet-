async function checkJapan() {
  const res = await fetch('https://datasets-server.huggingface.co/rows?dataset=ShadenA/MathNet&config=Japan&split=train&offset=0&limit=100');
  const data = await res.json();
  console.log("Japan rows:", data.rows?.length);
  console.log("Japan total:", data.num_rows_total);
}
checkJapan().catch(console.error);
