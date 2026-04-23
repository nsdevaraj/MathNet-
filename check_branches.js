async function checkRepoBranches() {
  const res = await fetch('https://api.github.com/repos/nsdevaraj/MathNet-/branches');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkRepoBranches().catch(console.error);
