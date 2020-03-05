
module.exports = exports = ({ id, date }) => `---
id: "${id}"
date: "${date.toISOString()}"
tags:
  - Transgender
tweets:

---
{!{
  {{import '~/tweet' ids=(array
    'TWEETIDGOESHERE'
  ) tweets=meta.tweets className="" }}
}!}

`;
