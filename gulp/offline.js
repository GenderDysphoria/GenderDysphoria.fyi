const fs = require('fs');
const zlib = require('zlib');
const warc = require('node-warc');
const request = require('request-promise');
const util = require('util');
const parse5 = require('parse5');
const xpathhtml = require("xpath-html");
const css = require('css');

const Port = process.env.PORT || 8000
const FakeBaseHostName = 'genderdysphoria.fyi';
const BaseHostName = '127.0.0.1';
const BaseUrl = 'http://'+BaseHostName+':'+Port;
const UrlCssRegexp = /url\((https?:\/\/[^)]+)\)/ig;
const UserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36";

let concurrentRequests = 0;

const myRq = request.defaults({
	simple: false,
	headers: {
		'User-Agent': UserAgent
	},});

const rejectedDomains = {};

const domainsDownloadAction = {
	"fonts.googleapis.com": true,
	"fonts.gstatic.com": true,
	"cdnjs.cloudflare.com": true
}
domainsDownloadAction[BaseHostName] = true;

const pagesDownloaded = [];

function shouldIncludeUrl(rawURL, downloadedFiles) {
	if (rawURL === undefined) {
		return false;
	}

	const url = new URL(rawURL, BaseUrl);

	if (domainsDownloadAction[url.hostname]) {
		return true;
	}

	if (!rejectedDomains[url.hostname]) {
		// console.debug("Reject download URL: "+url.toString());
		rejectedDomains[url.hostname] = true;
	}
	return false;
}

function cleanURL(rawURL) {
	if (rawURL === undefined) {
		return undefined;
	}

	const url = new URL(rawURL, BaseUrl);
	url.hash = "";
	if (!url.protocol) {
		url.protocol = "https:";
	}

	return url.toString();
}

function getPage(url, warcGen, downloadPromises, downloadedFiles) {
	if (downloadedFiles[url]) {
		return;
	}

	downloadedFiles[url] = true;
	const promise = myRq(encodeURI(url), async function (error, response, body) {
		if (error !== null) {
			console.error('Failed to load '+url+':', error);
			return;
		}

		if (response.statusCode != 200) {
			console.error('Problem to load '+url+':', response.statusCode);
		}

		// Get content-type
		let contentType = response.headers["content-type"] || "";
		contentType = contentType.split(";")[0].trim()
		console.log('Got '+url+' '+contentType+' '+body.length+' bytes');

		// Save page async
		// TODO: replace with warcGen.writeRequestRecord and warcGen.writeResponseRecord
		response.request.protocol = "https:";
		response.request.uri.port = 80;
		response.request.uri.host = FakeBaseHostName;
		response.request.uri.hostname = FakeBaseHostName;
		response.request.uri.href = response.request.protocol + '//' + response.request.uri.host + response.request.uri.path;
		response.request._rp_options.uri = response.request.uri.href;
		response.request.host = response.request.uri.host;
		response.request.port = response.request.uri.port;
		response.request.href = response.request.uri.href;
		const savePromise = warcGen.generateWarcEntry(response);
		await savePromise;


		if (contentType == "text/html") {
			pagesDownloaded.push(url);
			// Parse and look for links
			const root = xpathhtml.fromPageSource(body);
			
			const links = root.findElements("//*[@href]");
			for (const link of links) {
				// Don't download <link rel="preconnect">
				if (link.getAttribute("rel") == "preconnect") {
					continue;
				}
				// Don't download <link rel="canonical">
				if (link.getAttribute("rel") == "canonical") {
					continue;
				}
				// Don't download links to other pages <a href="...">
				if (link.tagName == "a") {
					continue;
				}

				const linkUrl = cleanURL(link.getAttribute("href"));
				if (shouldIncludeUrl(linkUrl, downloadedFiles)) {
					getPage(linkUrl, warcGen, downloadPromises, downloadedFiles);
				}
			}

			const imgs = root.findElements("//img[@src]");
			for (const img of imgs) {
				const linkUrl = cleanURL(img.getAttribute("src"));
				if (shouldIncludeUrl(linkUrl, downloadedFiles)) {
					getPage(linkUrl, warcGen, downloadPromises, downloadedFiles);
				}
			}
		} else if (contentType.startsWith("text/css")) {
			// Find url(...) on CSS
			const matches = [...body.matchAll(UrlCssRegexp)];
			for (const match of matches) {
				const linkUrl = match[1];
				getPage(linkUrl, warcGen, downloadPromises, downloadedFiles);
			}
		} else if (contentType.startsWith("image/") || contentType.startsWith("font/")) {
			// Nothing to do
		} else if (contentType !== "") {
			console.error('Unexpected content-type for '+url+':', contentType);
		} else {
			console.error('Unknown content-type for '+url+':', response.headers);
		}

		// Finish
		await savePromise;
	});
	downloadPromises.push(promise);
	return promise;
}

async function main() {
	// console.log(util.inspect(warc.WARCWriterBase, true, 10, true))
	// console.log(util.inspect(warc.RequestLibWARCWriter, true, 10, true))
	const warcGen = new warc.RequestLibWARCWriter({
		appending: false,
		gzip: false
	})
	const filename = "offline3.warc";
	// await warcGen.writeWarcInfoRecord(filename, {"hi":123123123123123});
	warcGen.initWARC(filename);
	// console.log(warcGen.writeWarcInfoRecord);
	// return;
	const downloadPromises = [];
	const downloadedFiles = {};
	await getPage(cleanURL("/pt/imprimivel/"), warcGen, downloadPromises, downloadedFiles);
	await Promise.all(downloadPromises);
	console.log(">>>", pagesDownloaded)
}

if (require.main === module) {
    main();
}