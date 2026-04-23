async function getBranches() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/refs');
  const data = await res.json();
  console.log("Refs:", JSON.stringify(data, null, 2));
}
getBranches().catch(console.error);
