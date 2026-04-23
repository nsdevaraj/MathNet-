async function checkPart2() {
  const res = await fetch('https://huggingface.co/datasets/ShadenA/MathNet/resolve/refs%2Fconvert%2Fparquet/all/train/0001.parquet?download=true', { method: 'HEAD' });
  console.log("0001.parquet status:", res.status);
  
  const res2 = await fetch('https://huggingface.co/datasets/ShadenA/MathNet/resolve/main/data/all/train-00001-of-00001.parquet?download=true', { method: 'HEAD' });
  console.log("main part 1 status:", res2.status);
}
checkPart2().catch(console.error);
