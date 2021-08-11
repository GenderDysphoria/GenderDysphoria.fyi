---
title: "How to contribute to the Gender Dysphoria Bible"
linkTitle: "Contributing"
description: ""
classes:
  - gdb
---

# Contributing to the GDB

The Gender Dysphoria Bible is a constant work in progress. As the understanding of gender and gender dysphoria develops, this site is constantly in need of further improvement. This site code and the page contents are available open source via the GitHub social programming site. The content of the site is licensed Creative Commons Non-Commercial Attribution ShareAlike, which means that its text cannot be reproduced for commercial purposes, must be credited back to this site if it is redistributed, and if a distribution alters the text, then it must also be released under the same license.

99% of the content on this site was written by the site maintainer, Jocelyn Badgley (aka [Curvy and Trans](http://www.curvyandtrans.com)). The site is a labor of love, and honestly there are sometimes weeks or months between updates because I just don't always have the [spoons](https://en.wikipedia.org/wiki/Spoon_theory) to work on this *and* my day job while taking care of my family.

## Ways You Can Help

- **Contributing new essay content.** There are so many topics related to the trans experience which are not yet documented on this site. [A project board of planned updates](https://github.com/orgs/GenderDysphoria/projects/2) and wanted content extensions is maintained on the GDB's GitHub organization page.

- **Translating to other languages.** New translations are absolutely always welcomed, and existing translations are constantly in need of updates to keep them matching the english text.

- **Copy editing / correction**. Typos and bad sentences make it past me constantly, so spotting them and letting 

- **Programming Code**. If you are of a coding nature, there are features I would love to implement on this site which I have yet to get around to. See the project board linked above. Instructions on how to get the site up and running are in the README file on the git repository.

## How to Contribute Content

The best way to add completely new content to the site is to reach out to me directly via social media, by email, or through opening an issue on the Github repository.

- [GitHub Repository](https://github.com/GenderDysphoria/GenderDysphoria.fyi)
- Email Address: [gdb@curvyandtrans.com](mailto:gdb@curvyandtrans.com)
- Twitter: [TwippingVanilla](http://twitter.com/twippingvanilla)
- Instagram: [CurvyAndTrans](http://instagram/curvyandtrans)
- Facebook: [Curvy and Trans](http://facebook.com/curvyandtrans)
- [Patreon](https://patreon.com/curvyandtrans)

## How to Contribute a Translation

Downloading [this zip file](/gdb.zip) to fetch a recent copy of the english text. This file extracts into all the raw data that is used to construct the english version of the GDB site content.

The files ending in `.md` are [Markdown formatted](https://www.markdownguide.org/) text files, and can be opened in any raw text editor. At the top of each file is a block of metadata that tells the website important things about the file, such as the page title, the description used when linked on social media, and the links to navigate to the previous and next pages. The text to the left of the colons must remain untouched, but to the right is fair game. If you rename the files, the sibling links will need to be updated.

Any text surrounded with bang brackets ({!{<code>&#123;!&#123; like this &#125;!&#125;</code>}!}) will be evaluated as a Handlebars template. There are numerous helper functions available for automating things within these templates, most importantly the tweet and image embedding code. Images must be placed in the `_images` folder. They are then referenced on the site via the image's name. Tweets are reference by the tweet id, which must also be included in the page metadata in order for the content of the tweet to be available on the page (the site automatically downloads and caches any tweets that are used).

`_disclaimer.hbs` is a Handlebars template which is rendered at the top of the page.

`_menu.hbs` contains the code that makes up the dropdown menu for navigating the site.

`_strings.js` is a JavaScript file containing the translation strings for the site header and footer.

When you are done translating all of this text, reach out to me via the above methods. If you are familiar with GitHub, the fastest way to get this contributed is to open a pull request. Place your new files inside a folder inside the `public` directory named with the [localization code](https://en.wikipedia.org/wiki/Language_localisation#Language_tags_and_codes) for the language (just the first two letters, please). So, for example, a German translation of the Euphoria page would go at `public/de/euphoria.md`.

If you do not know how to use GitHub, just compress all the files into a zip and send it to me, I can take care of releasing it.

## How Can I Help You Financially?

One time donations to the project can be made [using Ko-Fi](https://ko-fi.com/curvyandtrans), or via [Venmo](https://venmo.com/code?user_id=2654767276883968966).

If you would like to support this site continually, I also have [a Patreon](https://patreon.com/curvyandtrans).

Either way, your support is extremely appreciated.
