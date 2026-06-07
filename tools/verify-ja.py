#!/usr/bin/env python3
"""Static verifier for the Japanese (ja) localization of The Gender Dysphoria Bible.

Checks each public/ja/*.md against its public/en/*.md counterpart WITHOUT needing the
full image/build toolchain:
  - file exists; YAML frontmatter parses; lang: ja; title/description/siblings present & correct
  - structural integrity: counts of {!{ , }!}, {{import '~/img', {{import '~/tweet',
    images.* refs, markdown links, and frontmatter tweet ids MATCH the English source
  - siblings prev/next match the canonical chapter order
  - no obvious untranslated English paragraphs (heuristic)
Exit code 0 if no ERRORs, else 1. Run: python3 tools/verify-ja.py
"""
import os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# canonical order: (en_file, ja_slug, title, prev_url, next_url)
CH = [
 ("index.md","index","性別違和バイブル","","/ja/ジェンダーとは"),
 ("what-is-gender.md","ジェンダーとは","ジェンダーとは？","/ja/","/ja/歴史"),
 ("history.md","歴史","性別違和の歴史","/ja/ジェンダーとは","/ja/性別高揚感"),
 ("euphoria.md","性別高揚感","性別高揚感（ジェンダー・ユーフォリア）","/ja/歴史","/ja/身体的違和"),
 ("physical-dysphoria.md","身体的違和","身体的違和","/ja/性別高揚感","/ja/生化学的違和"),
 ("biochemical-dysphoria.md","生化学的違和","生化学的違和","/ja/身体的違和","/ja/対人的違和"),
 ("social-dysphoria.md","対人的違和","対人的違和","/ja/生化学的違和","/ja/社会的違和"),
 ("societal-dysphoria.md","社会的違和","社会的違和","/ja/対人的違和","/ja/性的違和"),
 ("sexual-dysphoria.md","性的違和","性的違和","/ja/社会的違和","/ja/表現的違和"),
 ("presentational-dysphoria.md","表現的違和","表現的違和","/ja/性的違和","/ja/実存的違和"),
 ("existential-dysphoria.md","実存的違和","実存的違和","/ja/表現的違和","/ja/管理された違和"),
 ("managed-dysphoria.md","管理された違和","管理された違和","/ja/実存的違和","/ja/インポスター症候群"),
 ("impostor-syndrome.md","インポスター症候群","インポスター症候群","/ja/管理された違和","/ja/私はトランスジェンダーなの"),
 ("am-i-trans.md","私はトランスジェンダーなの","私はトランスジェンダーなの？","/ja/インポスター症候群","/ja/診断"),
 ("diagnoses.md","診断","臨床的診断","/ja/私はトランスジェンダーなの","/ja/治療"),
 ("treatment.md","治療","性別違和の治療","/ja/診断","/ja/原因"),
 ("causes.md","原因","性別違和の原因","/ja/治療","/ja/染色体"),
 ("chromosomes.md","染色体","染色体","/ja/原因","/ja/ホルモン"),
 ("hormones.md","ホルモン","ホルモンの仕組み","/ja/染色体","/ja/二度目の思春期-男性化"),
 ("second-puberty-masc.md","二度目の思春期-男性化","アンドロゲンによる二度目の思春期 入門","/ja/ホルモン","/ja/二度目の思春期-女性化"),
 ("second-puberty-fem.md","二度目の思春期-女性化","エストロゲンによる二度目の思春期 入門","/ja/二度目の思春期-男性化","/ja/結論"),
 ("conclusion.md","結論","結び","/ja/二度目の思春期-女性化",""),
]

errors, warns = [], []
def err(s): errors.append(s)
def warn(s): warns.append(s)

def split_fm(text):
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', text, re.S)
    if not m: return None, text
    return m.group(1), m.group(2)

def counts(body):
    return {
        'open': body.count('{!{'),
        'close': body.count('}!}'),
        'img': len(re.findall(r"\{\{import\s+'~/img'", body)),
        'tweet': len(re.findall(r"\{\{import\s+'~/tweet'", body)),
        'imgref': len(re.findall(r"images\.[A-Za-z0-9_]+", body)),
        'mdlink': len(re.findall(r"\]\(https?://", body)),
        'h2': len(re.findall(r"(?m)^##\s", body)),
    }

def fm_tweet_ids(fm):
    ids = re.findall(r"^\s*-\s*'?(\d{5,})'?", fm, re.M)
    return sorted(ids)

for en_file, slug, title, prev_url, next_url in CH:
    ja_path = os.path.join(ROOT, 'public/ja', slug + '.md')
    en_path = os.path.join(ROOT, 'public/en', en_file)
    if not os.path.exists(ja_path):
        err(f"[{slug}] MISSING file {ja_path}")
        continue
    ja = open(ja_path, encoding='utf-8').read()
    en = open(en_path, encoding='utf-8').read()
    jfm, jbody = split_fm(ja)
    efm, ebody = split_fm(en)
    if jfm is None:
        err(f"[{slug}] no/invalid frontmatter"); continue
    # frontmatter field checks
    if not re.search(r"(?m)^lang:\s*ja\s*$", jfm): err(f"[{slug}] frontmatter missing 'lang: ja'")
    if title not in jfm: err(f"[{slug}] title mismatch (expected {title!r})")
    if not re.search(r"(?m)^description:\s*\S", jfm): err(f"[{slug}] missing description")
    if 'siblings:' not in jfm: err(f"[{slug}] missing siblings block")
    if prev_url and (f"prev: {prev_url}" not in jfm): err(f"[{slug}] siblings.prev != {prev_url}")
    if next_url and (f"next: {next_url}" not in jfm): err(f"[{slug}] siblings.next != {next_url}")
    if not prev_url and re.search(r"(?m)^\s*prev:", jfm): warn(f"[{slug}] has prev but should be first page")
    if not next_url and re.search(r"(?m)^\s*next:", jfm): warn(f"[{slug}] has next but should be last page")
    # date preserved
    e_date = re.search(r"(?m)^date:\s*(.+)$", efm)
    if e_date and (f"date: {e_date.group(1).strip()}" not in jfm): warn(f"[{slug}] date may differ from EN")
    # structural integrity vs EN
    jc, ec = counts(jbody), counts(ebody)
    if jc['open'] != jc['close']: err(f"[{slug}] unbalanced {{!{{ ({jc['open']}) vs }}!}} ({jc['close']})")
    for k, lbl in [('open','{!{ blocks'),('img','img imports'),('tweet','tweet imports'),('imgref','images.* refs')]:
        if jc[k] != ec[k]: err(f"[{slug}] {lbl} count {jc[k]} != EN {ec[k]}")
    if jc['mdlink'] != ec['mdlink']: warn(f"[{slug}] markdown-link count {jc['mdlink']} != EN {ec['mdlink']}")
    # frontmatter tweet ids preserved
    if fm_tweet_ids(jfm) != fm_tweet_ids(efm): err(f"[{slug}] frontmatter tweet ids differ from EN")
    # untranslated-English heuristic: a paragraph line with many ASCII words and almost no CJK
    for line in jbody.splitlines():
        s = line.strip()
        if len(s) < 60 or s.startswith(('{','<','|','#','-','>','![','[')) or '{{' in s or '}!}' in s:
            continue
        ascii_letters = len(re.findall(r"[A-Za-z]", s))
        cjk = len(re.findall(r"[぀-ヿ㐀-鿿]", s))
        if ascii_letters > 40 and cjk == 0:
            warn(f"[{slug}] possible untranslated line: {s[:70]}…")
            break

print("="*70)
print(f"Verified {len(CH)} chapters.  ERRORS={len(errors)}  WARNINGS={len(warns)}")
print("="*70)
for e in errors: print("ERROR  ", e)
for w in warns: print("WARN   ", w)
sys.exit(1 if errors else 0)
