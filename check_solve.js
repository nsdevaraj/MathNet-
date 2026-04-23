async function checkSolve() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet-Solve', { method: 'HEAD' });
  console.log("MathNet-Solve status:", res.status);
}
checkSolve().catch(console.error);
