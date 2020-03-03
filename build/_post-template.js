
module.exports = exports = ({ id, date }) => `---
id: "${id}"
date: "${date.toISOString()}"
tags:
  - Transgender
span: 2
tweets:

---
{!{ {{import '~/tweet' ids=(array
  'TWEETGOESHERE'
) tweets=meta.tweets className="" }} }!}

`;
