async function listRepo() {
  const repo = 'nsdevaraj/MathNet-';
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`);
  const data = await res.json();
  if (data.tree) {
    const files = data.tree.filter(f => f.path.includes('mathnet') && f.path.endsWith('.json'));
    console.log("Found JSON files:", JSON.stringify(files, null, 2));
  } else {
    console.log("No tree found:", data);
  }
}
listRepo().catch(console.error);
