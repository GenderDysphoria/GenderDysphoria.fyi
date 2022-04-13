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
	#pagesToInclude;
	#pages;

	static user_agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36";
	static main_domain = 'genderdysphoria.fyi';
	static main_base_url = 'https://'+GDBWarc.main_domain;

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
			'cdnjs.cloudflare.com': true
		};
		this.#domainsToInclude[GDBWarc.main_domain] = true;
		this.#pagesToInclude = ['/', '/pt', /^\/pt\/.*/i];
		this.#pages = [];

		this.#status = 0;
	}

	async start() {
		if (this.#status != 0) {
			return;
		}
		this.#status = 1;
		this.#writer.initWARC(this.#filename);
		this.#writer.writeWarcInfoRecord({});
	}

	async addPage(url, recursive) {
		if (this.#status < 1) {
			this.start();
		}
		await this.#add_page(new URL(url, GDBWarc.main_base_url), recursive);
	}

	should_add_page(url) {
		if (url.host !== GDBWarc.main_domain) {
			return false;
		}
		const path = url.pathname;
		for (const pat of this.#pagesToInclude) {
			if (path === pat) {
				return true;
			}
			if (pat instanceof RegExp) {
				var match = path.match(pat);
				if (match && path === match[0]) {
					return true;
				}
			}
		}
		return false;
	}

	should_add_file(url) {
		return this.#domainsToInclude[url.host];		
	}

	get_real_url(url) {
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
		return new Promise((resolve, reject) => {
			const real_url = this.get_real_url(url);
			var req = http.get(real_url.toString(), (res) => {
				var response_headers = '';
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

				let rawData = '';
				res.on('data', (chunk) => { rawData += chunk; });
				res.on('end', (chunk) => {
					resolve({
						'response_headers': res.headers,
						'response_headers_raw': response_headers,
						'request_headers_raw': request_headers,
						'data': rawData
					})
				});
			});

			req.on('error', (e) => {
				console.error(`problem with request: ${e.message}`);
				reject(e);
			});
		});
	}

	async #add_page(url, recursive) {
		const dependencies = [];
		const page_links = [];

		const req = await this.get(url);

		await this.#writer.writeRequestRecord(url, req.request_headers_raw);
		await this.#writer.writeResponseRecord(url, req.response_headers_raw, req.data);

		this.#pages.push(url.toString());
	}

	async finish() {
		if (this.#status < 1) {
			return;
		}
		await this.#writer.writeWebrecorderBookmarksInfoRecord(this.#pages);
		await this.#writer.end();
		this.#status = -1;
	}

	// async #get_result
}

async function main() {
	const port = process.env.PORT || 8000;
	const proxy_url = '127.0.0.1:'+port;
	const gen = new GDBWarc('offline5.warc', proxy_url);
	await gen.start();
	await gen.addPage('/pt/');
	await gen.finish();
}

if (require.main === module) {
	main()
}




function makeHttpRequest(url) {
	return new Promise((resolve, reject) => {
		var req = http.get(url,
			// {
			// 	lookup: (hostname, options, callback) => {
			// 		console.log(hostname)
			// 		console.log(options)
			// 		console.log(callback)
			// 		console.log(dns.lookup(hostname, options, (err, address, family) => {
			// 			console.log(err);
			// 			console.log('address: %j family: IPv%s', address, family);
			// 		}))
			// 		callback(null, '127.0.0.1', 4)
			// 	}
			// },
			(res) => {
			var response_headers = '';
			for (var i=0; i < res.rawHeaders.length; i++) {
				if (i%2 == 0) {
					response_headers += res.rawHeaders[i]+': ';
				} else {
					response_headers += res.rawHeaders[i]+'\r\n';
				}
			}

			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', (chunk) => {
				// console.log(rawData);
				resolve({
					'response_headers': res.headers,
					'response_headers_raw': response_headers,
					'request_headers_raw': res.req._header,
					'data': rawData
				})
			});
		});

		req.on('error', (e) => {
		  console.error(`problem with request: ${e.message}`);
		  reject(e);
		});
	});
}
