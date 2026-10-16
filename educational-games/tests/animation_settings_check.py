"""Check explicit animation preferences and versioned assets in the browser."""
import hashlib
import os
from pathlib import Path
import re
import socket
import subprocess
import time
from urllib.request import urlopen
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
server = subprocess.Popen(['php', '-d', 'xdebug.mode=off', '-S', f'127.0.0.1:{port}', '-t', str(root)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
base = f'http://127.0.0.1:{port}'
try:
    for attempt in range(50):
        try:
            urlopen(base + '/educational-games/index.html', timeout=1).close()
            break
        except OSError:
            time.sleep(.1)
    with sync_playwright() as p:
        edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
        browser = p.chromium.launch(executable_path=str(edge) if edge.is_file() else None, headless=True)
        page = browser.new_page(reduced_motion='reduce', viewport={'width': 390, 'height': 844})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/educational-games/index.html')
        page.locator('#start').wait_for(state='visible')
        switch = page.get_by_role('switch', name='Battle animation')
        assert switch.get_attribute('aria-checked') == 'false'
        assert 'device requests reduced motion' in page.locator('#animation-help').inner_text()
        # All three versioned entry asset URLs match the current file contents.
        urls = page.locator('script[src], link[rel="stylesheet"]').evaluate_all('(nodes) => nodes.map(n => n.src || n.href)')
        assert len(urls) == 3
        for url in urls:
            parsed = urlparse(url)
            digest = hashlib.sha256((root / parsed.path.lstrip('/')).read_bytes()).hexdigest()[:12]
            assert parse_qs(parsed.query)['v'] == [digest]
            assert page.request.get(url).status == 200
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.set_viewport_size({'width': 390, 'height': 844})
        switch.click()
        assert switch.get_attribute('aria-checked') == 'true'
        page.locator('#start').click()
        def submit_attack():
            page.locator('[data-move="attack"]').click()
            a,b = map(int, re.findall(r'\d+', page.locator('#question-expression').inner_text()))
            page.locator('#answer').fill(str(a+b))
            page.locator('#question-form button').click()
        submit_attack()
        page.wait_for_function('document.querySelector("#arena").dataset.combatPhase === "enemy-strike"')
        assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
        canvas = page.locator('#scene-view canvas')
        assert canvas.evaluate('el => !!el.getContext("webgl2")')
        frame_a = canvas.screenshot()
        page.wait_for_timeout(100)
        frame_b = canvas.screenshot()
        assert frame_a != frame_b, 'Explicit On must move the 3D models despite reduced motion'
        page.locator('#feedback').wait_for(state='visible')
        assert page.locator('#player-hp').inner_text() == '100 / 110 HP'
        page.locator('#continue').click()
        # An explicit choice survives OS preference changes during the visit.
        page.emulate_media(reduced_motion='no-preference')
        page.emulate_media(reduced_motion='reduce')
        assert switch.get_attribute('aria-checked') == 'true'
        submit_attack()
        switch.click()
        page.locator('#feedback').wait_for(state='visible')
        assert switch.get_attribute('aria-checked') == 'false'
        assert page.locator('.damage-3d').count() == 0
        assert not page.locator('#change-warrior').is_disabled()
        assert page.evaluate('document.getAnimations().length') == 0
        page.locator('#continue').click()
        submit_attack()
        page.locator('#feedback').wait_for(state='visible')
        assert page.locator('.damage-3d').count() == 0
        assert page.evaluate('document.getAnimations().length') == 0
        still_a = canvas.screenshot()
        page.wait_for_timeout(100)
        still_b = canvas.screenshot()
        # Browser screenshots can differ at the rounded/clipped canvas edge.
        # Compare interior pixels so this tests model motion, not edge rasterization.
        from io import BytesIO
        from PIL import Image, ImageChops
        first = Image.open(BytesIO(still_a)).convert('RGB')
        second = Image.open(BytesIO(still_b)).convert('RGB')
        assert first.size == second.size
        interior = (8, 8, first.width - 8, first.height - 8)
        assert ImageChops.difference(first.crop(interior), second.crop(interior)).getbbox() is None, 'Off must stop idle 3D motion too'
        # A new visit uses the device preference again.
        page.reload()
        page.locator('#start').wait_for(state='visible')
        assert switch.get_attribute('aria-checked') == 'false'
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_function('document.querySelector("#animation-toggle").getAttribute("aria-checked") === "true"')
        assert not errors, errors
        browser.close()
    print('PASS: device default, explicit On overriding reduced motion, visible guardian movement/effects, mid-turn Off, stable explicit choice, reload default, four responsive widths and content-hashed asset URLs.')
finally:
    server.terminate()
    server.wait(timeout=5)
