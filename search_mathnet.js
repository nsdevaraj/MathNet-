async function searchMathNet() {
  const res = await fetch('https://huggingface.co/api/datasets?search=MathNet');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
searchMathNet().catch(console.error);
