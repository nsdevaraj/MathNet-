async function checkParquetBranch() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/refs%2Fconvert%2Fparquet');
  const data = await res.json();
  console.log("Parquet branch root:", JSON.stringify(data, null, 2));
}
checkParquetBranch().catch(console.error);
