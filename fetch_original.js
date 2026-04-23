async function fetchOriginal() {
  const url = 'https://raw.githubusercontent.com/nsdevaraj/JEE-Flash-Cards/main/parse.js';
  const res = await fetch(url);
  const text = await res.text();
  console.log("--- ORIGINAL PARSE.JS ---");
  console.log(text);
}
fetchOriginal().catch(console.error);
