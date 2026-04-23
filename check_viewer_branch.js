async function checkViewerBranch() {
  const res = await fetch('https://huggingface.co/api/datasets/ShadenA/MathNet/tree/refs%2Fconvert%2Fparquet/all/train');
  const data = await res.json();
  console.log("Viewer branch files:", JSON.stringify(data, null, 2));
}
checkViewerBranch().catch(console.error);
