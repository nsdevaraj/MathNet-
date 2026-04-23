async function checkOrg() {
  const res = await fetch('https://huggingface.co/api/organizations/MathNet');
  const data = await res.json();
  console.log("MathNet Org:", JSON.stringify(data, null, 2));
}
checkOrg().catch(console.error);
