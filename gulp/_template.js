
const format = require('date-fns/format');

module.exports = exports = ({ id, date }) => `---
id: "${id}"
date: "${date.toISOString()}"
title: ""
description: "Outfit of the Day for ${format(date, 'MMM do, yyyy')}"
tags:
  - OOTD
---
`;
