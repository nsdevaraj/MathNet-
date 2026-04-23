async function peek() {
  const url = 'https://raw.githubusercontent.com/nsdevaraj/MathNet-/main/temp_repo/public/mathnet.json';
  const res = await fetch(url);
  const text = await res.text();
  console.log(text);
}
peek().catch(console.error);
