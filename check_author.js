async function checkShadenA() {
  const res = await fetch('https://huggingface.co/api/users/ShadenA');
  // This might not work easily via API, let's try searching for sets by this author
  const res2 = await fetch('https://huggingface.co/api/datasets?author=ShadenA');
  const data = await res2.json();
  console.log(JSON.stringify(data, null, 2));
}
checkShadenA().catch(console.error);
