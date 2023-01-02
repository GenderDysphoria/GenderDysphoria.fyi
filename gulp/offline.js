// This script requires NVM 14 because of github.com/sass/node-sass

const fs = require('fs');
const zlib = require('zlib');
const {WARCWriterBase} = require('node-warc');
const util = require('util');
const parse5 = require('parse5');
const xpathhtml = require("xpath-html");
const css = require('css');
const http = require('http');
const path = require('path')
const { siteInfo }  = require(path.resolve('./package.json'));
const chalk = require('chalk');
const log = require('fancy-log');

class GDBWarc {
	#filename;
	#writer;
	#status;
	#hostMap;
	// array or pairs (url, bool) or (str, bool) or (RegExp, bool) where the first element will be matched against the path part of the GDB URLs 
	#pageInclusionRules;
	#fileInclusionRules;
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
			log("Requests to "+chalk.cyan(GDBWarc.main_domain)+" will be automatically sent to "+chalk.cyan(proxy_url));
			this.#hostMap[proxy_url] = GDBWarc.main_domain;
			this.#hostMap[GDBWarc.main_domain] = proxy_url;
		}
		const regexp_warc = new RegExp('^'+GDBWarc.main_domain.replace(/\\./g, '\\.')+'\/.*\\.warc', 'i');
		const regexp_pdf = new RegExp('^'+GDBWarc.main_domain.replace(/\\./g, '\\.')+'\/gdb-[a-z]{2}\\.pdf', 'i');

		this.#pageInclusionRules = [
			[regexp_warc, false],
			[regexp_pdf, false],
		];
		this.#fileInclusionRules = [
			[/^fonts.googleapis.com(\/.*)?$/i, true],
			[/^fonts.gstatic.com(\/.*)?$/i, true],
			[/^cdnjs.cloudflare.com(\/.*)?$/i, true],
			[/^twemoji.maxcdn.com(\/.*)?$/i, true],
			[regexp_warc, false],
			[regexp_pdf, false],
			[new RegExp('^'+GDBWarc.main_domain.replace(/\\./g, '\\.')+'\/.*', 'i'), true],
		];
		this.#downloadedFiles = {};
		this.#pages = [];

		this.#status = 0;
	}

	#addInclusionRule(pathToMatch, shouldInclude, destination) {
		if (!(pathToMatch instanceof RegExp) && !(pathToMatch instanceof String) && !(pathToMatch instanceof URL)) {
			throw "Invalid argument type for pathToMatch";
		}
		if (!(shouldInclude instanceof Boolean) && (typeof shouldInclude !== 'boolean')) {
			throw "Invalid argument type for shouldInclude";
		}
		destination.push([pathToMatch, shouldInclude]);
	}

	addPageInclusionRule(pathToMatch, shouldInclude) {
		this.#addInclusionRule(pathToMatch, shouldInclude, this.#pageInclusionRules);
	}

	addFileInclusionRule(pathToMatch, shouldInclude) {
		this.#addInclusionRule(pathToMatch, shouldInclude, this.#fileInclusionRules);
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

	url2query_format(url) {
		if (!(url instanceof URL)) {
			throw new Error('Only URL objects allowed');
		}

		return url.host + url.pathname;
	}

	query_inclusion_rule(url, ruleList) {
		if (!(url instanceof URL)) {
			throw new Error('Only URL objects allowed');
		}

		const clean_url = this.url2query_format(url);
		for (const entry of ruleList) {
			const pat = entry[0];
			const ans = entry[1];
			if (clean_url === pat) {
				return ans;
			}
			if (pat instanceof RegExp) {
				var match = clean_url.match(pat);
				if (match && clean_url === match[0]) {
					return ans;
				}
			}
		}
		return false;
	}

	should_add_page(url) {
		const ans = this.query_inclusion_rule(url, this.#pageInclusionRules);
		if (!ans) {
			// log.warn(chalk.yellow("Rejected page '"+chalk.magenta(url.href)+"'"));
		}
		return ans;
	}

	should_add_file(url) {
		if (url.host === 'www.googletagmanager.com') {
			return false;
		}

		const ans = this.query_inclusion_rule(url, this.#fileInclusionRules);
		if (!ans) {
			// log.warn(chalk.yellow("Rejected file '"+chalk.magenta(url.href)+"'"));
		}
		return ans;
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
		}).catch((err) => {log.error(chalk.red("Failed to download "+chalk.magenta(real_url.toString())+": ")+err); return undefined});
	}

	async #add_page(url, page_recursion, dep_recursion) {
		url.hash = '';
		if (page_recursion === 0 || dep_recursion === 0 || this.#downloadedFiles[url.toString()]) {
			return;
		}
		this.#downloadedFiles[url.toString()] = true;

		const dependencies = {};
		const page_links = {};

		log(chalk.gray("Downloading: "+url.toString()));
		await new Promise(resolve => setTimeout(resolve, 50));
		let req = await this.get(url);
		// for (let i=0; i < 5 && req === undefined; i++) {
		// 	req = await this.get(url);
		// 	await new Promise(resolve => setTimeout(resolve, 500));
		// }
		if (req == undefined) {
			return false;
		}

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

		return true;
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
	const langs = siteInfo.allLangs;
	langs.push('all');

	// Add each language
	for (const lang of ['en']) {
		var filename = 'dist/gdb-'+lang+'.warc';
		if (lang ===  "all") {
			filename = 'dist/gdb.warc';
		}
		log.info(chalk.bold("Making ")+chalk.cyan(filename));
		
		const gen = new GDBWarc(filename, proxy_url);
		await gen.start();
		
		// Allow only the pages in this language
		if (lang !== "all") {
			let re1 = new RegExp('^'+GDBWarc.main_domain+'\/'+lang+'(\/.*)?$', 'i');
			gen.addPageInclusionRule(re1, true);
		} else {
			let re1 = new RegExp('^'+GDBWarc.main_domain+'\/(.*)?$', 'i');
			gen.addPageInclusionRule(re1, true);
		}
		
		// Run!
		if (lang !==  "all") {
			await gen.addPage('/'+lang, 200, 15);
		} else {
			await gen.addPage('/', 200, 25);
		}
		await gen.finish();
		log.info(chalk.bold("Finished ")+chalk.cyan(filename));
	}
}

if (require.main === module) {
	main()
}

exports.GDBWarc = GDBWarc;
exports.offlineTask = async function(callback) {
	await main();
	if (callback !== undefined) {
		callback();
	}
}