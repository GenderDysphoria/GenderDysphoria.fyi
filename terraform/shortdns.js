exports.handler = async () => {

  const body = `
<!DOCTYPE html>
<html lang="en">
<head><title>301 Moved Permanently</title></head>
<body bgcolor="white">
<center><h1>301 Moved Permanently</h1></center>
<hr><center>CloudFront Lambda@Edge</center>
</body>
</html>
`;

  return {
    status: '301',
    statusDescription: `Redirecting to www domain`,
    headers: {
      location: [ {
        key: 'Location',
        value: `https://genderdysphoria.fyi`,
      } ],
    },
    body,
  };
};
