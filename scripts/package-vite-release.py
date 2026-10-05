#!/usr/bin/env python3
"""Pack the real built Vite product and verify its installable dependency chain."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'landing/static/downloads'
LICENSE = (ROOT / 'LICENSE').read_bytes()

def require(condition, message):
    if not condition:
        raise ValueError(message)

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    releases = []
    with tempfile.TemporaryDirectory(prefix='inspekt-release-') as temporary:
        stage = Path(temporary)
        for short in ('core', 'cli', 'vite', 'daemon', 'mcp'):
            package = ROOT / 'packages' / short
            source = json.loads((package / 'package.json').read_text())
            subprocess.run(['bun', 'pm', 'pack', '--ignore-scripts', '--destination', str(stage)], cwd=package, check=True)
            archive = stage / f"aylith-inspekt-{short}-{source['version']}.tgz"
            with tarfile.open(archive) as tar:
                names = {member.name for member in tar.getmembers()}
                require(all(name.startswith('package/') and '..' not in Path(name).parts for name in names), 'Unsafe archive member')
                require('package/LICENSE' in names, f'{short}: missing original MIT notice')
                require(tar.extractfile('package/LICENSE').read() == LICENSE, f'{short}: license bytes differ')
                manifest = json.load(tar.extractfile('package/package.json'))
                require(manifest['name'] == source['name'] and manifest['version'] == source['version'], 'Package identity mismatch')
                def exports(value):
                    if isinstance(value, str):
                        require('package/' + value.removeprefix('./') in names, f'Missing exported entry: {value}')
                    elif isinstance(value, dict):
                        for item in value.values():
                            exports(item)
                exports(manifest['exports'])
                for value in manifest.get('bin', {}).values():
                    require('package/' + value.removeprefix('./') in names, f'Missing CLI: {value}')
            releases.append({'name': manifest['name'], 'version': manifest['version'], 'file': archive.name, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'dependencies': manifest.get('dependencies', {})})
        by_name = {release['name']: release for release in releases}
        for release in releases:
            for name, version in release['dependencies'].items():
                if name in by_name:
                    require(version == by_name[name]['version'], f'Inexact local dependency: {name}')
        agent_releases = releases
        releases = releases[:3]
        vite = releases[2]
        for dependency in releases[:2]:
            require(vite['dependencies'][dependency['name']] == dependency['version'], 'Vite dependency chain is not exact')
        sums = ''.join(f"{release['sha256']}  {release['file']}\n" for release in releases)
        command = 'npm install -D ' + ' '.join('./' + release['file'] for release in releases)
        guide = '# Inspekt Vite install\n\nRequires an existing Vite development project and its supported Node.js version. External package dependencies are downloaded by npm; this bundle is not an offline dependency mirror.\n\n1. Extract this download into your project.\n2. Check the three archives against SHA256SUMS (`sha256sum -c SHA256SUMS` on Linux).\n3. Install all three archives together:\n\n```sh\n' + command + '\n```\n\n4. Add `import { inspekt } from "@aylith/inspekt-vite"` to vite.config, and append `inspekt()` to your existing plugins.\n5. Start your existing development script. Ctrl+Alt+Click an instrumented element, expand Show source, and try Copy path. Escape returns to ordinary clicks. Editor opening requires the configured editor installed on your machine. The extension, daemon and agent integration are optional.\n\nThese are directly downloaded package versions, not instructions to fetch their versions from the npm registry.\n'
        (stage / 'SHA256SUMS').write_text(sums)
        (stage / 'INSTALL.md').write_text(guide)
        bundle = OUTPUT / f"inspekt-vite-{vite['version']}.zip"
        with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as zip:
            for release in releases:
                zip.write(stage / release['file'], release['file'])
            for name in ('SHA256SUMS', 'INSTALL.md'):
                zip.write(stage / name, name)
        agent_command = 'npm install -D ' + ' '.join('./' + release['file'] for release in agent_releases)
        agent_guide = '# Inspekt agent package install\n\nRequires Node.js, an existing Vite project and an MCP-capable agent. npm downloads external dependencies. Extract all five archives into your project and verify SHA256SUMS.\n\n```sh\n' + agent_command + '\n./node_modules/.bin/inspekt setup --agents claude-code,cursor\n```\n\nSetup registers the installed MCP executable and creates a private token and queue in your home directory. It preserves unrelated agent configuration. Use --config-home /absolute/profile for another configuration profile. Restart your agent to load its MCP configuration. Tools include grab_latest, list_grabs, get_grab and mark_grab_processed.\n\nThe MCP server reads the same locked queue as the daemon. Run ./node_modules/.bin/inspekt-daemon for the default profile. A custom profile requires INSPEKT_TOKEN and INSPEKT_QUEUE_PATH from its private config; keep the token private. Browser capture is a separate installation; these packages alone do not add a browser capture control. The Vite inspect/editor workflow works independently.\n\nThese downloaded versions are not registry installation commands.\n'
        agent_sums = ''.join(f"{release['sha256']}  {release['file']}\n" for release in agent_releases)
        (stage / 'SHA256SUMS').write_text(agent_sums)
        (stage / 'INSTALL.md').write_text(agent_guide)
        agent_bundle = OUTPUT / f"inspekt-agent-{agent_releases[4]['version']}.zip"
        with zipfile.ZipFile(agent_bundle, 'w', zipfile.ZIP_DEFLATED) as zip:
            for release in agent_releases:
                zip.write(stage / release['file'], release['file'])
            for name in ('SHA256SUMS', 'INSTALL.md'):
                zip.write(stage / name, name)
        (OUTPUT / 'agent-release.json').write_text(json.dumps({'packages': agent_releases, 'bundle': agent_bundle.name, 'sha256': hashlib.sha256(agent_bundle.read_bytes()).hexdigest()}, indent=2) + '\n')
        for release in agent_releases:
            (OUTPUT / release['file']).write_bytes((stage / release['file']).read_bytes())
        (OUTPUT / 'SHA256SUMS').write_text(agent_sums + f"{hashlib.sha256(agent_bundle.read_bytes()).hexdigest()}  {agent_bundle.name}\n" + f"{hashlib.sha256(bundle.read_bytes()).hexdigest()}  {bundle.name}\n")
        (OUTPUT / 'release.json').write_text(json.dumps({'packages': releases, 'bundle': bundle.name, 'sha256': hashlib.sha256(bundle.read_bytes()).hexdigest()}, indent=2) + '\n')
        print(json.dumps({'bundle': str(bundle), 'packages': releases}))

if __name__ == '__main__':
    main()
