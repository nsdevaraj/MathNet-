async function checkGrafite() {
  const res = await fetch('https://huggingface.co/api/datasets/UtkarshM005/grafite-jee-mains-qna-no-img/tree/main');
  const data = await res.json();
  console.log("UtkarshM005 repo tree:", JSON.stringify(data, null, 2));
}
checkGrafite().catch(console.error);
