// This is a solution for the problem with s3 websites and subfolders www.site.com/folder/ will not auto
//   redirect to www.site.com/folder/index.html like most other modern web servers
// This should be deployed as a Lambda@Edge connected to the CloudFront Distribution
// Only Node.js 10.x Runtime supports Lambda@Edge for right now, we have to wait for AWS to support 12x and beyond

exports.handler = async (event, context) => {
  /*
   * Expand S3 request to have index.html if it ends in /
   */
  const request = event.Records[0].cf.request;
  if ((request.uri !== '/') /* Not the root object, which redirects properly */
    && (request.uri.endsWith('/') /* Folder with slash */
      || (request.uri.lastIndexOf('.') < request.uri.lastIndexOf('/')) /* Most likely a folder, it has no extension (heuristic) */
    )) {
    if (request.uri.endsWith('/')) {
      request.uri = request.uri.concat('index.html');
    } else {
      request.uri = request.uri.concat('/index.html');
    }
  }
  return request;
};
