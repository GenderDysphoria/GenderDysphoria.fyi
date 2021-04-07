#!/usr/bin/env python3
import os
import glob
import yaml


def get_all_pages():
  return [file for file in glob.glob("gdb/*.md")
          if not file.endswith("/index.md")]


def fix_web_path(page):
  return '/' + page[:-3]


def parse_page_data(page):
  with open(page) as fd:
    return next(yaml.safe_load_all(fd))


def most_appropriate_title(data):
  return data.get("linkTitle") or data['title']


def traverse_siblings(pages, start, sibling='next'):
  page = start
  while page in pages:
    yield page
    page = pages[page]['siblings'].get(sibling)


def create_intro_toc(pages, start, offset=2):
  for num, page in enumerate(traverse_siblings(pages, start)):
    data = pages[page]
    title = most_appropriate_title(data)
    print(f"{num + offset}. [{title}]({page})\n")


def create_navbar(pages, start):
  longest_link = max(map(len, traverse_siblings(pages, start))) + 2

  for page in traverse_siblings(pages, start):
    data = pages[page]
    title = most_appropriate_title(data)
    linksq = f"'{page}'"
    linkdq = f'"{page}"'
    print(f'    <a href={linkdq:{longest_link}s} class="{{{{#is meta.url {linksq:{longest_link}s}}}}}active {{{{/is}}}}dropdown-item">{title}</a>')


def check_nav_consistency(pages, first):
  for page in traverse_siblings(pages, first):
    siblings = pages[page]['siblings']
    for sibling in 'prev', 'next':
      sibling_data = pages.get(siblings.get(sibling))
      if sibling_data:
        sibling_title = most_appropriate_title(sibling_data)
        link_title = siblings[sibling + 'Caption']
        if sibling_title != link_title:
          print(f"{page}: caption mismatch for {sibling}: expected {sibling_title!r}, got {link_title!r}")


def main():
  os.chdir("../public")
  pages = {fix_web_path(file): parse_page_data(file) for file in get_all_pages()}
  *_, first = traverse_siblings(pages, next(iter(pages)), sibling="prev")
  create_intro_toc(pages, first)
  create_navbar(pages, first)
  check_nav_consistency(pages, first)
  return 0


if __name__ == '__main__':
  main()
