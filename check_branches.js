async function checkBranches() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet');
  const data = await res.json();
  console.log("Branches:", JSON.stringify(data.siblings, null, 2));
}
checkBranches().catch(console.error);
