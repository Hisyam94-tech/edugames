"""Refresh local asset hashes after editing game files; no build dependencies."""
import hashlib
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
# Dependencies first, so changes propagate to module imports and the HTML entry.
for name in ['js/models3d.js', 'js/arena3d.js', 'js/combat-animation.js', 'js/game.js']:
    path = root/name
    text = path.read_text(encoding='utf-8')
    def version_import(match):
        dependency = (path.parent/match.group(2)).resolve()
        if not dependency.is_relative_to(root):
            raise ValueError('Import outside game folder')
        digest = hashlib.sha256(dependency.read_bytes()).hexdigest()[:12]
        return match.group(1) + match.group(2) + '?v=' + digest + match.group(3)
    text = re.sub(r"(from\s+['\"])(\.[^'\"?]+)(?:\?v=[a-f0-9]+)?(['\"])", version_import, text)
    path.write_text(text, encoding='utf-8')
path = root/'index.html'
text = path.read_text(encoding='utf-8')
for asset in ['css/game.css', 'js/engine.js', 'js/game.js']:
    digest = hashlib.sha256((root/asset).read_bytes()).hexdigest()[:12]
    text = re.sub(re.escape(asset) + r'(?:\?v=[a-f0-9]+)?', asset + '?v=' + digest, text)
path.write_text(text, encoding='utf-8')
print('Updated content hashes for the 3D module graph and page assets.')
