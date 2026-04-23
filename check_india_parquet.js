async function checkIndiaParquet() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/refs%2Fconvert%2Fparquet/India/train');
  const data = await res.json();
  console.log("India/train in parquet branch:", JSON.stringify(data, null, 2));
}
checkIndiaParquet().catch(console.error);
