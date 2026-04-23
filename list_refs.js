async function listRefs() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/refs');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listRefs().catch(console.error);
