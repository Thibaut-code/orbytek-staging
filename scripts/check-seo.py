"""Check the public static site without fetching or submitting external forms."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://orbytek.be/'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = []
        self.title = ''
        self.title_open = False
        self.ld_open = False
        self.ld_buffer = ''
        self.graphs = []
        self.feed(path.read_text(encoding='utf-8-sig'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'title':
            self.title_open = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.ld_open = True
            self.ld_buffer = ''

    def handle_data(self, text):
        if self.title_open:
            self.title += text
        if self.ld_open:
            self.ld_buffer += text

    def handle_endtag(self, tag):
        if tag == 'title':
            self.title_open = False
        if tag == 'script' and self.ld_open:
            self.graphs.append(json.loads(self.ld_buffer))
            self.ld_open = False

    def meta(self, name):
        return [attrs.get('content', '') for tag, attrs in self.tags if tag == 'meta' and attrs.get('name') == name]

errors = []
def check(condition, message):
    if not condition:
        errors.append(message)

tree = ET.parse(ROOT / 'sitemap.xml')
urls = [node.text for node in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
check(len(urls) == len(set(urls)), 'Duplicate sitemap URLs')
pages = {}
titles, descriptions = [], []
for url in urls:
    check(url.startswith(BASE), f'Unexpected sitemap origin: {url}')
    name = url.removeprefix(BASE) or 'index.html'
    path = ROOT / name
    if not path.is_file():
        errors.append(f'Missing sitemap page: {name}')
        continue
    page = Page(path)
    pages[name] = page
    title_tags = sum(tag == 'title' for tag, _ in page.tags)
    check(title_tags == 1 and 0 < len(page.title) <= 60, f'{name}: title count/length ({len(page.title)})')
    descriptions.extend(page.meta('description'))
    titles.append(page.title)
    check(len(page.meta('description')) == 1 and 0 < len(page.meta('description')[0]) <= 155, f'{name}: meta description count/length')
    check(sum(tag == 'h1' for tag, _ in page.tags) == 1, f'{name}: must have exactly one H1')
    check(len(page.ids) == len(set(page.ids)), f'{name}: duplicate IDs')
    canonicals = [attrs.get('href') for tag, attrs in page.tags if tag == 'link' and attrs.get('rel') == 'canonical']
    check(canonicals == [url], f'{name}: canonical does not match sitemap')
    check(not any('noindex' in value for value in page.meta('robots')), f'{name}: sitemap contains noindex page')
    check(bool(page.graphs), f'{name}: missing JSON-LD')
    check(any(tag == 'meta' and attrs.get('property') == 'og:url' and attrs.get('content') == url for tag, attrs in page.tags), f'{name}: incorrect Open Graph URL')
    print(f'{name}: title {len(page.title)}/60, description {len(page.meta("description")[0])}/155, H1, canonical, JSON-LD OK')

check(len(titles) == len(set(titles)), 'Duplicate titles')
check(len(descriptions) == len(set(descriptions)), 'Duplicate descriptions')
cache = dict(pages)
references = 0
for name, page in pages.items():
    for tag, attrs in page.tags:
        attr = 'href' if tag in ('a','link') else 'src' if tag in ('img','script','iframe') else None
        if attr is None or attr not in attrs:
            continue
        url = urlsplit(attrs[attr])
        if url.scheme or url.netloc:
            continue
        references += 1
        target = (ROOT / name).parent / unquote(url.path) if url.path else ROOT / name
        if url.path.startswith('/'):
            target = ROOT / unquote(url.path.lstrip('/'))
        if target.is_dir():
            target = target / 'index.html'
        check(target.is_file(), f'{name}: missing {attrs[attr]}')
        if target.is_file() and url.fragment and target.suffix == '.html':
            key = target.relative_to(ROOT).as_posix()
            if key not in cache:
                cache[key] = Page(target)
            check(unquote(url.fragment) in cache[key].ids, f'{name}: missing fragment {attrs[attr]}')
    for tag, attrs in page.tags:
        if tag == 'img':
            check('alt' in attrs, f'{name}: image without alt')
            check('width' in attrs and 'height' in attrs, f'{name}: image without dimensions')

for path in [ROOT/'merci.html', *ROOT.glob('creation-preview-*.html')]:
    check(any('noindex' in value for value in Page(path).meta('robots')), f'{path.name}: expected noindex')
check('Sitemap: '+BASE+'sitemap.xml' in (ROOT/'robots.txt').read_text(), 'Incorrect robots sitemap')
print(f'{len(pages)} public pages; {references} local links and assets checked.')
if errors:
    raise SystemExit('\n'.join(errors))
print('SEO static checks passed. External delivery, hosting and Google indexing are not tested.')
