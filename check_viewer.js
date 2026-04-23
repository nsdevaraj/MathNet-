async function checkViewer() {
  const res = await fetch('https://datasets-server.huggingface.co/rows?dataset=ShadenA/MathNet&config=all&split=train&offset=150&limit=10');
  const data = await res.json();
  console.log("Viewer data for offset 150:", JSON.stringify(data, null, 2));
}
checkViewer().catch(console.error);
