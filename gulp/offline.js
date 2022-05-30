const fs = require('fs');
const zlib = require('zlib');
const {WARCWriterBase} = require('node-warc');
const util = require('util');
const parse5 = require('parse5');
const xpathhtml = require("xpath-html");
const css = require('css');
const http = require('http');

class GDBWarc {
	#filename;
	#writer;
	#status;
	#hostMap;
	#domainsToInclude;
	// array or pairs (url, bool) or (str, bool) or (RegExp, bool) where the first element will be matched against the path part of the GDB URLs 
	#pagesInclusionRules
	#downloadedFiles;
	#pages;

	static user_agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36";
	static main_domain = 'genderdysphoria.fyi';
	static main_base_url = 'https://'+GDBWarc.main_domain;
	static urlCssRegexp = /url\((https?:\/\/[^)]+)\)/ig;

	constructor(filename, proxy_url) {
		this.#filename = filename;
		this.#writer = new WARCWriterBase({
			appending: false,
			gzip: false
		});
		this.#hostMap = {};
		if (proxy_url !== undefined && proxy_url !== '') {
			this.#hostMap[proxy_url] = GDBWarc.main_domain;
			this.#hostMap[GDBWarc.main_domain] = proxy_url;
		}
		this.#domainsToInclude = {
			'fonts.googleapis.com': true,
			'fonts.gstatic.com': true,
			'cdnjs.cloudflare.com': true,
			'twemoji.maxcdn.com': true
		};
		this.#domainsToInclude[GDBWarc.main_domain] = true;
		this.#pagesInclusionRules = [];
		this.#downloadedFiles = {};
		this.#pages = [];

		this.#status = 0;
	}

	addPageInclusionRule(pathToMatch, shouldInclude) {
		if (!(pathToMatch instanceof RegExp) && !(pathToMatch instanceof String) && !(pathToMatch instanceof URL)) {
			throw "Invalid argument type for pathToMatch";
		}
		if (!(shouldInclude instanceof Boolean) && (typeof shouldInclude !== 'boolean')) {
			throw "Invalid argument type for shouldInclude";
		}
		this.#pagesInclusionRules.push([pathToMatch, shouldInclude]);
	}

	async start() {
		if (this.#status != 0) {
			return;
		}
		this.#status = 1;
		this.#writer.initWARC(this.#filename);
		this.#writer.writeWarcInfoRecord({});
	}

	parseURL(url) {
		return new URL(url, GDBWarc.main_base_url);
	}

	async addPage(url, page_recursion, dep_recursion) {
		if (this.#status < 1) {
			this.start();
		}
		await this.#add_page(this.parseURL(url), page_recursion, dep_recursion);
	}

	should_add_page(url) {
		if (!(url instanceof URL)) {
			throw new Error('Only URL objects allowed');
		}

		if (url.host !== GDBWarc.main_domain) {
			return false;
		}
		const path = url.pathname;
		for (const entry of this.#pagesInclusionRules) {
			const pat = entry[0];
			const ans = entry[1];
			if (path === pat) {
				return ans;
			}
			if (pat instanceof RegExp) {
				var match = path.match(pat);
				if (match && path === match[0]) {
					return ans;
				}
			}
		}
		return false;
	}

	should_add_file(url) {
		if (!(url instanceof URL)) {
			throw new Error('Only URL objects allowed');
		}

		return this.#domainsToInclude[url.host];
	}

	get_real_url(url) {
		if (!(url instanceof URL)) {
			url = this.parseURL(url);
		}

		const real = this.#hostMap[url.host];
		if (real !== undefined) {
			const ans = new URL(url.toString());
			ans.protocol = 'http:';
			ans.host = real;
			return ans;
		}
		return url;
	}

	async get(url) {
		return await this.get_http(url);
	}

	get_http(url) {
		if (!(url instanceof URL)) {
			throw new Error('Only URL objects allowed');
		}

		const real_url = this.get_real_url(url);
		if (real_url.protocol === 'https:') {
			real_url.protocol = 'http:';
		}
		
		return new Promise((resolve, reject) => {
			var req = http.get(
				real_url.toString(),
				{
					headers: {
						'User-Agent': GDBWarc.user_agent
					}
				},
			 	(res) => {
				var response_headers = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}\r\n`;
				for (var i=0; i < res.rawHeaders.length; i++) {
					if (i%2 == 0) {
						response_headers += res.rawHeaders[i]+': ';
					} else {
						response_headers += res.rawHeaders[i]+'\r\n';
					}
				}

				const request_headers = res.req._header.replace(
					`Host: ${real_url.host}\r\n`,
					`Host: ${url.host}\r\n`).replace('\r\n\r\n', '\r\n');

				const full_content_type = (res.headers['content-type']||'');
				const content_type = full_content_type.split(';')[0];

				res.setEncoding('binary');
				let chunks = [];
				res.on('data', (chunk) => {
					chunks.push(Buffer.from(chunk, 'binary'));
				});
				res.on('end', (chunk) => {
					const data = Buffer.concat(chunks);
					var body = null;
					if (full_content_type.includes('charset=UTF-8') || full_content_type.includes('charset=utf-8')) {
						body = new TextDecoder().decode(data);
					}
					resolve({
						'status_code': res.statusCode,
						'content_type': content_type,
						'response_headers': res.headers,
						'response_headers_raw': response_headers,
						'request_headers_raw': request_headers,
						'data': data,
						'body': body
					})
				});
			});

			req.on('error', (e) => {
				console.error(`problem with request: ${e.message}`);
				reject(e);
			});
		});
	}

	async #add_page(url, page_recursion, dep_recursion) {
		url.hash = '';
		if (page_recursion === 0 || dep_recursion === 0 || this.#downloadedFiles[url.toString()]) {
			return;
		}
		this.#downloadedFiles[url.toString()] = true;

		const dependencies = {};
		const page_links = {};

		console.log("Downloading: "+url.toString());
		const req = await this.get(url);

		// Write data
		await this.#writer.writeRequestRecord(url, req.request_headers_raw);
		if (req.body) {
			// Remove srcset attributes as they mess everything up
			if (req.content_type === 'text/html') {
				const re = /srcset="[^"]*"/ig;
				req.body = req.body.replace(re, '');
			}

			await this.#writer.writeResponseRecord(url, req.response_headers_raw, req.body);
		} else {
			await this.#writer.writeResponseRecord(url, req.response_headers_raw, req.data);
		}
		if (req.content_type === 'text/html' && req.status_code === 200) {
			this.#pages.push(url.toString());
		}

		// Find dependencies
		if (req.content_type === 'text/html') {
			// Parse and look for links
			const root = xpathhtml.fromPageSource(req.body);
			
			const links = root.findElements("//*[@href]");
			for (const link of links) {
				// Don't download <link rel="preconnect">
				if (link.getAttribute("rel") == "preconnect") {
					continue;
				}

				const linkUrl = new URL(link.getAttribute("href"), url.toString());
				if (link.tagName === 'a') {
					page_links[linkUrl.toString()] = linkUrl;
				} else {
					dependencies[linkUrl.toString()] = linkUrl;
				}
			}

			const imgs = root.findElements("//img[@src]");
			for (const img of imgs) {
				const linkUrl = new URL(img.getAttribute("src"), url.toString());
				dependencies[linkUrl.toString()] = linkUrl;
			}

			const scripts = root.findElements("//script[@src]");
			for (const script of scripts) {
				const linkUrl = new URL(script.getAttribute("src"), url.toString());
				dependencies[linkUrl.toString()] = linkUrl;
			}
		} else if (req.content_type.startsWith("text/css")) {
			// Find url(...) on CSS
			const matches = [...req.body.matchAll(GDBWarc.urlCssRegexp)];
			for (const match of matches) {
				const linkUrl = new URL(match[1], url.toString());
				dependencies[linkUrl.toString()] = linkUrl;
			}
		} else if (req.content_type.startsWith("image/") || req.content_type.startsWith("font/") || req.content_type.startsWith("application/javascript")) {
			// Nothing to do
		} else if (req.content_type !== "") {
			console.error('Unexpected content-type for '+url+':', req.content_type);
		} else {
			console.error('Unknown content-type for '+url+':', req);
		}

		for (const dependency_url in dependencies) {
			const url = dependencies[dependency_url];
			if (!this.#downloadedFiles[url.toString()] && this.should_add_file(url)) {
				await this.#add_page(url, page_recursion, dep_recursion-1);
			}
		}

		for (const link_url in page_links) {
			const url = page_links[link_url];
			if (!this.#downloadedFiles[url.toString()] && this.should_add_page(url)) {
				await this.#add_page(url, page_recursion-1, dep_recursion);
			}
		}
	}

	async finish() {
		if (this.#status < 1) {
			return;
		}
		await this.#writer.writeWebrecorderBookmarksInfoRecord(this.#pages);
		await this.#writer.end();
		this.#status = -1;
	}
}

async function main() {
	const port = process.env.PORT || 8000;
	const proxy_url = '127.0.0.1:'+port;
	const langs = ['en', 'de', 'pl', 'hu', 'zh', 'fr', 'es'];
	for (const lang of langs) {
		const filename = 'gdb-'+lang+'.warc';
		console.log("[Making "+filename+"]");
		const gen = new GDBWarc(filename, proxy_url);
		await gen.start();
		let re = new RegExp('^\/'+lang+'(\/.*)?', 'i');
		gen.addPageInclusionRule(re, true);
		await gen.addPage('/'+lang, 200, 15);
		await gen.finish();
		console.log("[Finished "+filename+"]");
	}
}

if (require.main === module) {
	main()
}

exports.GDBWarc = GDBWarc;
exports.offlineTask = async function(callback) {
	await main();
	callback();
}