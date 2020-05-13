
module.exports = exports = ({ id, date }) => `---
id: "${id}"
date: "${date.toISOString()}"
title:
description:
tags:
  - Transgender
author:
tweets:

---
{!{
  {{import '~/tweet' ids=[
    'TWEETIDGOESHERE'
  ] tweets=meta.tweets className="" }}
}!}

`;
