async function checkJordanMathNet() {
  const res = await fetch('https://huggingface.co/api/datasets/jordane95/mathnet/tree/main');
  const data = await res.json();
  console.log("jordane95/mathnet tree:", JSON.stringify(data, null, 2));
}
checkJordanMathNet().catch(console.error);
