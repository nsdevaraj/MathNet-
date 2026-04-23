async function listAllTrain() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/main/data/all/train');
  const data = await res.json();
  console.log("data/all/train contents:", JSON.stringify(data, null, 2));
}
listAllTrain().catch(console.error);
