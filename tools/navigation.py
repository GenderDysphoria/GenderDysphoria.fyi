#!/usr/bin/env python3
import glob
import os
import re
import sys
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


def create_intro_toc(pages, start, offset=2, file=sys.stdout):
  for num, page in enumerate(traverse_siblings(pages, start)):
    data = pages[page]
    title = most_appropriate_title(data)
    print(f"{num + offset}. [{title}]({page})\n", file=file)


def overwrite_info_toc(pages, start, offset=2):
  old_name = "gdb/index.md"
  new_name = "gdb/.index.new"
  with open(old_name) as orig:
    with open(new_name, 'w') as new:
      found = False
      for line in orig:
        if found and '</div' in line:
          found = False
          create_intro_toc(pages, start, offset=offset, file=new)
        if not found and f'{offset}. [' in line:
          found = True
        if not found:
          new.write(line)
  os.rename(new_name, old_name)


def create_navbar(pages, start, file=sys.stdout):
  longest_link = max(map(len, traverse_siblings(pages, start))) + 2

  for page in traverse_siblings(pages, start):
    data = pages[page]
    title = most_appropriate_title(data)
    linksq = f"'{page}'"
    linkdq = f'"{page}"'
    print(f'    <a href={linkdq:{longest_link}s} class="{{{{#is meta.url {linksq:{longest_link}s}}}}}active {{{{/is}}}}dropdown-item">{title}</a>', file=file)


def overwrite_navbar(pages, start):
  old_name = "_gdb-menu.hbs"
  new_name = ".gdb-menu.new"
  with open(old_name) as orig:
    with open(new_name, 'w') as new:
      found = False
      for line in orig:
        if found and '</div' in line:
          found = False
          create_navbar(pages, start, file=new)
        if not found:
          new.write(line)
        if '="/en/"' in line:
          found = True
  os.rename(new_name, old_name)


def check_nav_consistency(pages):
  for page in pages:
    siblings = pages[page]['siblings']
    for sibling in 'prev', 'next':
      sibling_data = pages.get(siblings.get(sibling))
      if sibling_data:
        sibling_title = most_appropriate_title(sibling_data)
        link_title = siblings[sibling + 'Caption']
        if sibling_title != link_title:
          print(f"{page}: caption mismatch for {sibling}: expected {sibling_title!r}, got {link_title!r}")


def overwrite_nav_meta(pages):
  for page in pages:
    siblings = pages[page]['siblings']
    old_name = page.lstrip("/") + '.md'
    new_name = ".new.md"
    with open(old_name) as orig:
      with open(new_name, "w") as new:
        for line in orig:
          match = None
          for sibling in 'prev', 'next':
            sibling_data = pages.get(siblings.get(sibling))
            if sibling_data:
              sibling_title = most_appropriate_title(sibling_data)
              match = re.match(f"( *{sibling}Caption: *).*", line)
              if match:
                new.write(match.group(1) + sibling_title + "\n")
                break
          if not match:
            new.write(line)

    os.rename(new_name, old_name)


def check_excluded_pages(pages, first):
  missing = set(pages.keys()) - set(traverse_siblings(pages, first))
  if missing:
    print(f"Unlinked pages (starting from {first}): {missing}")


def main():
  os.chdir("../public")
  pages = {fix_web_path(file): parse_page_data(file) for file in get_all_pages()}
  *_, first = traverse_siblings(pages, next(iter(pages)), sibling="prev")
  check_excluded_pages(pages, first)
  if '--write' in sys.argv:
    overwrite_info_toc(pages, first)
    overwrite_navbar(pages, first)
    overwrite_nav_meta(pages)
  else:
    create_intro_toc(pages, first)
    create_navbar(pages, first)
    check_nav_consistency(pages)


if __name__ == '__main__':
  main()
