#!/usr/bin/env python3
"""Check the actual assembled Pages artifact, including its installable download."""
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import sys
from urllib.parse import unquote, urljoin, urlsplit
import zipfile

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attributes):
        for key, value in attributes:
            if value and ((key == 'src' and tag in ('script', 'img')) or (key == 'href' and tag in ('a', 'link'))):
                self.links.append(value)

def require(condition, message):
    if not condition:
        raise ValueError(message)

def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else 'pages-artifact')
    base = os.environ.get('BASE_PATH', '/inspekt')
    require(base in ('', '/inspekt'), 'Unexpected Pages base')
    for page in ('index.html', 'home/index.html'):
        html = (root / page).read_text()
        require('From the page' in html and 'id="install"' in html, f'{page}: incomplete homepage')
        require('inspekt-vite-0.2.3.zip' in html, f'{page}: missing real acquisition')
    count = 0
    for page in root.rglob('*.html'):
        parser = Links()
        parser.feed(page.read_text())
        relative = page.relative_to(root).as_posix()
        public = 'https://artifact.invalid' + base + '/' + relative
        for link in parser.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            path = unquote(urlsplit(urljoin(public, link)).path)
            require(not base or path == base or path.startswith(base + '/'), f'{relative}: escaped hosting prefix {link}')
            local = path[len(base):].lstrip('/')
            target = root / local
            candidates = (target, target / 'index.html', target.with_suffix('.html'))
            require(any(candidate.is_file() for candidate in candidates), f'{relative}: missing target {link} -> {local}')
            count += 1
    require('inspekt-agent-0.1.3.zip' in (root / 'home/index.html').read_text(), 'Missing agent acquisition')
    release = json.loads((root / 'downloads/release.json').read_text())
    bundle = root / 'downloads' / release['bundle']
    require(hashlib.sha256(bundle.read_bytes()).hexdigest() == release['sha256'], 'Bundle hash mismatch')
    with zipfile.ZipFile(bundle) as zip:
        require(set(zip.namelist()) == {package['file'] for package in release['packages']} | {'INSTALL.md', 'SHA256SUMS'}, 'Unexpected install bundle members')
        for package in release['packages']:
            data = zip.read(package['file'])
            require(hashlib.sha256(data).hexdigest() == package['sha256'], 'Embedded package mismatch')
            require(data == (root / 'downloads' / package['file']).read_bytes(), 'Direct download mismatch')
        guide = zip.read('INSTALL.md').decode()
        require(all('./' + package['file'] in guide for package in release['packages']), 'Install command does not consume full chain')
    agent = json.loads((root / 'downloads/agent-release.json').read_text())
    require(len(agent['packages']) == 5, 'Incomplete agent chain')
    require(hashlib.sha256((root / 'downloads' / agent['bundle']).read_bytes()).hexdigest() == agent['sha256'], 'Agent bundle hash mismatch')
    with zipfile.ZipFile(root / 'downloads' / agent['bundle']) as zip:
        require(set(zip.namelist()) == {package['file'] for package in agent['packages']} | {'INSTALL.md', 'SHA256SUMS'}, 'Unexpected agent bundle members')
        guide = zip.read('INSTALL.md').decode()
        require(all('./' + package['file'] in guide for package in agent['packages']), 'Agent command misses package')
        require('./node_modules/.bin/inspekt setup' in guide and 'npx' not in guide, 'Agent setup is not local')
        for package in agent['packages']:
            data = zip.read(package['file'])
            require(hashlib.sha256(data).hexdigest() == package['sha256'], 'Agent package mismatch')
            require(data == (root / 'downloads' / package['file']).read_bytes(), 'Agent direct download mismatch')
    print(json.dumps({'base': base, 'html_targets': count, 'bundle_sha256': release['sha256'], 'home': True}))

if __name__ == '__main__':
    main()
