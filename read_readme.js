async function readReadme() {
  const res = await fetch('https://huggingface.co/datasets/ShadenA/MathNet/raw/main/README.md');
  const text = await res.text();
  console.log(text);
}
readReadme().catch(console.error);
