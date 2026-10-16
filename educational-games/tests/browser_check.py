import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
server = subprocess.Popen(['php', '-d', 'xdebug.mode=off', '-S', f'127.0.0.1:{port}', '-t', str(ROOT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
base = f'http://127.0.0.1:{port}'
try:
    for attempt in range(50):
        try:
            with urlopen(base + '/educational-games/api/index.php', timeout=1) as response:
                assert response.status == 200
                assert response.headers['Content-Type'].startswith('application/json')
                catalogue = json.load(response)
                assert len(catalogue['warriors']) == 10 and len(catalogue['stages']) == 5
            break
        except OSError:
            time.sleep(.1)
    else:
        raise RuntimeError('PHP preview did not start')
    with urlopen(Request(base + '/educational-games/api/index.php', method='HEAD')) as response:
        assert response.read() == b''
    try:
        urlopen(Request(base + '/educational-games/api/index.php', method='POST', data=b''))
    except HTTPError as error:
        assert error.code == 405
    else:
        raise AssertionError('POST must be rejected')
    with sync_playwright() as p:
        edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
        browser = p.chromium.launch(executable_path=str(edge) if edge.is_file() else None, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/mathematics.html')
        page.get_by_role('link', name='Play Wildwood Warriors').click()
        page.locator('#warrior-grid button').first.wait_for()
        assert page.locator('#warrior-grid button').count() == 10
        for warrior in catalogue['warriors']:
            page.locator('[data-warrior="' + warrior['id'] + '"]').click()
            assert page.locator('#chosen-name').inner_text() == warrior['name']
            assert page.locator('#chosen-skill').inner_text() == warrior['skill']['name']
        page.locator('[data-warrior="lion"]').click()
        page.locator('#open-help').click()
        assert page.locator('#help').is_visible()
        page.keyboard.press('Escape')
        assert not page.locator('#help').is_visible()
        for width in (320, 390, 768, 1024, 1440):
            page.set_viewport_size({'width': width, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Selection overflow at ' + str(width)
        page.screenshot(path=str(Path(tempfile.gettempdir()) / 'edugames-warriors-desktop.png'), full_page=True)
        page.locator('#start').click()
        for width in (320, 390, 768, 1024, 1440):
            page.set_viewport_size({'width': width, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Battle overflow at ' + str(width)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(Path(tempfile.gettempdir()) / 'edugames-warriors-mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1024, 'height': 1000})
        # Cancel changing warriors without losing the active campaign.
        page.locator('#change-warrior').click()
        page.get_by_role('button', name='Keep playing', exact=True).click()
        assert page.locator('#battle').is_visible()
        page.locator('[data-move="attack"]').click()
        page.locator('#answer').fill('999')
        page.locator('#question-form button').click()
        assert 'did not activate' in page.locator('#feedback-action').inner_text()
        assert page.locator('#feedback-math').inner_text()
        page.locator('#continue').click()
        def answer_correctly():
            expression = page.locator('#question-expression').inner_text()
            a, b = map(int, re.findall(r'\d+', expression))
            answer = a + b if '+' in expression else a * b if '\u00d7' in expression else a - b
            page.locator('#answer').fill(str(answer))
            page.locator('#question-form button').click()
            assert page.locator('#feedback-title').inner_text() == 'Great thinking!'
            page.locator('#continue').click()
        page.locator('[data-move="defend"]').click()
        answer_correctly()
        # Complete all five stages through actual controls.
        for stage in range(1, 6):
            assert f'STAGE {stage} OF 5' in page.locator('#stage-label').inner_text()
            for turn in range(30):
                if page.locator('#result').is_visible():
                    break
                move = page.locator('#skill-button') if page.locator('#skill-button').is_enabled() else page.locator('[data-move="attack"]')
                move.click()
                answer_correctly()
            assert page.locator('#result').is_visible()
            assert page.locator('#result-title').inner_text() == ('Champion of the Wildwood!' if stage == 5 else 'Stage cleared!')
            if stage < 5:
                page.locator('#result-action').click()
        page.locator('#result-action').click()
        assert 'STAGE 1 OF 5' in page.locator('#stage-label').inner_text()
        # Lose, retry the stage, then restart with another warrior.
        for turn in range(20):
            if page.locator('#result').is_visible():
                break
            page.locator('[data-move="attack"]').click()
            page.locator('#answer').fill('999')
            page.locator('#question-form button').click()
            page.locator('#continue').click()
        assert page.locator('#result-title').inner_text() == 'A brave try, champion.'
        page.locator('#result-action').click()
        assert page.locator('#player-hp').inner_text() == '110 / 110 HP'
        page.locator('#change-warrior').click()
        page.locator('#confirm-leave').click()
        assert page.locator('#selection').is_visible()
        # Explicit API error state and retry, without substitute data.
        page.route('**/educational-games/api/index.php', lambda route: route.fulfill(status=503, body='Unavailable'))
        page.reload()
        page.locator('#load-error').wait_for(state='visible')
        page.unroute('**/educational-games/api/index.php')
        page.locator('#reload').click()
        page.locator('#selection').wait_for(state='visible')
        assert not errors, errors
        browser.close()
    print('PASS: API/HTTP checks; 10 selections; 5 responsive widths; complete campaign; wrong answers; defend/skill; defeat/retry; restart; API failure/retry; zero browser script errors.')
    print('Screenshots: ' + str(Path(tempfile.gettempdir()) / 'edugames-warriors-desktop.png'))
    print('Screenshots: ' + str(Path(tempfile.gettempdir()) / 'edugames-warriors-mobile.png'))
finally:
    server.terminate()
    server.wait(timeout=5)
