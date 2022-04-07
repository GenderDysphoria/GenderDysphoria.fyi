const fs = require('fs');
const zlib = require('zlib');
const warc = require('node-warc');
const request = require('request-promise');
const util = require('util');
const parse5 = require('parse5');
const xpathhtml = require("xpath-html");


const port = process.env.PORT || 8000
const baseUrl = 'http://127.0.0.1:'+port

let concurrentRequests = 0;

const myRq = request.defaults({
	simple: false})

const rejectedURLs = {};

function shouldIncludeUrl(url, downloadedFiles) {
	if (url === undefined) {
		return false;
	}

	if (url.startsWith("/")) {
		return true;
	}
	if (url.startsWith(baseUrl)) {
		return true;
	}
	if (url.startsWith("https://fonts.googleapis.com/")) {
		return true;
	}
	if (url.startsWith("https://fonts.gstatic.com/")) {
		return true;
	}
	if (url.startsWith("https://cdnjs.cloudflare.com/")) {
		return true;
	}
	if (url.startsWith("https://genderdysphoria.fyi/favicon")) {
		return true;
	}
	if (!rejectedURLs[url]) {
		console.log("Reject download URL: "+url);
		rejectedURLs[url] = true;
	}
	return false;
}


function cleanURL(rawURL) {
	if (rawURL === undefined) {
		return undefined;
	}

	ans = rawURL.split("#")[0].trim();
	if (ans.startsWith("//")) {
		ans = "https:"+ans;
		return ans;
	}
	if (ans.startsWith("http://") || ans.startsWith("https://")) {
		return ans;
	}

	return baseUrl+ans;
}

function getPage(url, warcGen, downloadPromises, downloadedFiles) {
	downloadedFiles[url] = true;
	const promise = myRq(encodeURI(url), async function (error, response, body) {
		if (error !== null) {
			console.error('Failed to load '+url+':', error);
			return;
		}

		if (response.statusCode != 200) {
			console.error('Problem to load '+url+':', response.statusCode);
		}

		console.log('body len:', body.length);
		// Save page async
		const savePromise = warcGen.generateWarcEntry(response)

		// Parse and look for link
		let contentType = response.headers["content-type"] || "";
		contentType = contentType.split(";")[0].trim()

		if (contentType == "text/html") {
			const root = xpathhtml.fromPageSource(body)
			const links = root.findElements("//*[@href]")
			for (const link of links) {
				const linkUrl = cleanURL(link.getAttribute("href"));
				if (shouldIncludeUrl(linkUrl, downloadedFiles)) {
					getPage(linkUrl, warcGen, downloadPromises, downloadedFiles);
					// console.log(linkUrl)
				}
			}
		} else if (contentType !== "") {
			console.error('Unexpected content-type for '+url+':', contentType);
		} else {
			console.error('Unknown content-type for '+url+':', response.headers);
		}

		// Finish
		await savePromise;
	});
	downloadPromises.push(promise);
}

async function main() {
	// console.log(util.inspect(warc.WARCWriterBase, true, 10, true))
	// console.log(util.inspect(warc.RequestLibWARCWriter, true, 10, true))
	const warcGen = new warc.RequestLibWARCWriter({
		appending: false,
		gzip: false
	})
	const downloadPromises = [];
	const downloadedFiles = {};
	warcGen.initWARC("offline.warc")
	getPage(cleanURL("/pt"), warcGen, downloadPromises, downloadedFiles);
	Promise.all(downloadPromises);
}

if (require.main === module) {
    main();
}