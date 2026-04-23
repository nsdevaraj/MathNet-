async function checkGrafiteData() {
  const res = await fetch('https://huggingface.co/api/datasets/UtkarshM005/grafite-jee-mains-qna-no-img/tree/main/data');
  const data = await res.json();
  console.log("UtkarshM005 data folder:", JSON.stringify(data, null, 2));
}
checkGrafiteData().catch(console.error);
