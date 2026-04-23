import { marked } from 'marked';

const text = "During dehydration occurs. \n<br><br><img class=\"question-image\" src=\"https://res.cloudinary.com/dckxllbjy/image/upload/v1734265357/exam_images/cs2p08bqyx4s5tu0eulf.webp\" loading=\"lazy\" alt=\"Alt\">";
const protectedText = text;

marked.setOptions({
    gfm: true,
    breaks: true, 
});

let rawHtml = marked.parse(protectedText);
console.log("Raw from marked:", rawHtml);
rawHtml = rawHtml.replace(/<img /gi, '<img referrerpolicy="no-referrer" ');
console.log("After regex:", rawHtml);
