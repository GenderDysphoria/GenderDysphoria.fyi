
module.exports = exports = ({ id, date }) => `---
id: "${id}"
date: "${date.toISOString()}"
tags:
  - Transgender
tweets:

---
{!{ <div class="gutter">{{import '~/tweet' ids=(array
  'TWEETGOESHERE'
) tweets=meta.tweets className="oneblock" }}</div> }!}

`;
