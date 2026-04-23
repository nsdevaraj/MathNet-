async function listUserRepo() {
  const res = await fetch('https://api.github.com/repos/nsdevaraj/MathNet-/contents/');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listUserRepo().catch(console.error);
