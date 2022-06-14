function fixTweetMentions() {
       document.querySelectorAll('div.tweet-text> p').forEach((p) => {
               for (const node of p.childNodes) {
                       if (node.nodeType == Node.ELEMENT_NODE && node.tagName == "A" && node.classList.contains("mention")) {
                               node.classList.add("initial-mention");
                       } else if (node.nodeType == Node.TEXT_NODE && node.textContent.trim() == '') {
                               // nothing to do
                       } else {
                               // we got to the main text of the tweet and must stop
                               return;
                       }
               }
       });
   };
document.addEventListener('DOMContentLoaded', fixTweetMentions, false);
