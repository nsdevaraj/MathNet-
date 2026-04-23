import https from 'https';
https.get('https://res.cloudinary.com/dckxllbjy/image/upload/v1734265357/exam_images/cs2p08bqyx4s5tu0eulf.webp', (res) => {
  console.log(res.headers);
});
