exports.handler = async (event) => {
  const { uri, querystring } = event?.Records?.[0]?.cf?.request || {};

  const url = new URL(uri, `https://genderdysphoria.fyi`);
  url.search = new URLSearchParams(querystring);

  const body = `
<!DOCTYPE html>
<html lang="en">
<head><title>Gender Dysphoria Bible</title></head>
<body bgcolor="white">
  <h1>Redirecting...</h1>
  <a href="${url}">Click here if you are not redirected.</a>
</body>
</html>
`;

  return {
    status: '301',
    statusDescription: `Redirecting to www domain`,
    headers: {
      location: [{
        key: 'Location',
        value: url.toString()
      }],
    },
    body
  };
};
