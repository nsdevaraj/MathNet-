async function checkUserMathNet() {
  const url = 'https://raw.githubusercontent.com/nsdevaraj/MathNet-/main/temp_repo/public/mathnet.json';
  const res = await fetch(url);
  const data = await res.json();
  console.log("Existing user mathnet.json length:", data.length);
  if (data.length > 0) {
    console.log("Sample question:", JSON.stringify(data[0], null, 2));
  }
}
checkUserMathNet().catch(console.error);
