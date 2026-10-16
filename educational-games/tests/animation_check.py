"""Exercise real WebGL models, 3D battle sequences and explicit graphics errors."""
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
from urllib.request import urlopen
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
            urlopen(base + '/educational-games/api/index.php', timeout=1).close()
            break
        except OSError:
            time.sleep(.1)
    with sync_playwright() as p:
        edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
        browser = p.chromium.launch(executable_path=str(edge) if edge.is_file() else None, headless=True)
        page = browser.new_page(viewport={'width': 1100, 'height': 950}, reduced_motion='reduce')
        errors, catalogue_requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: catalogue_requests.append(request.url) if request.url.endswith('/educational-games/api/index.php') else None)
        page.goto(base + '/educational-games/index.html')
        page.locator('#start').click()
        canvas = page.locator('#scene-view canvas')
        assert canvas.count() == 1
        assert canvas.evaluate('el => el.getContext("webgl2") instanceof WebGL2RenderingContext')
        assert page.locator('#arena svg').count() == 0, 'The battle must use meshes, not flat sprites'
        baseline = canvas.screenshot()
        page.locator('#camera-right').click()
        rotated = canvas.screenshot()
        assert baseline != rotated, 'Camera rotation must change the rendered 3D view'
        page.locator('#camera-reset').click()
        for width in [320, 390, 768, 1100, 1440]:
            page.set_viewport_size({'width': width, 'height': 950})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.set_viewport_size({'width': 1100, 'height': 950})
        page.locator('#animation-toggle').click()
        idle_a = canvas.screenshot()
        page.wait_for_timeout(250)
        idle_b = canvas.screenshot()
        assert idle_a != idle_b, '3D idle poses must animate'
        page.evaluate('''() => {
          window.turnFrames = [];
          new MutationObserver(() => {
            const phase = document.querySelector('#arena').dataset.combatPhase;
            if (phase) window.turnFrames.push({phase, player: document.querySelector('#player-health').value, enemy: document.querySelector('#enemy-health').value});
          }).observe(document.querySelector('#arena'), {attributes: true, attributeFilter: ['data-combat-phase']});
        }''')
        def begin(move, correct=True):
            page.evaluate('window.turnFrames = []')
            page.locator('[data-move="' + move + '"]').click()
            a,b = map(int, re.findall(r'\d+', page.locator('#question-expression').inner_text()))
            expression = page.locator('#question-expression').inner_text()
            answer = a+b if '+' in expression else a*b if '\u00d7' in expression else a-b
            page.locator('#answer').fill(str(answer) if correct else '999')
            page.locator('#question-form button').click()
        def finish():
            page.locator('#feedback').wait_for(state='visible', timeout=20000)
            assert page.locator('.damage-3d').count() == 0
            assert not page.locator('#change-warrior').is_disabled()
            return page.evaluate('window.turnFrames')
        def again(): page.locator('#continue').click()
        def roster(warrior):
            page.locator('#change-warrior').click()
            page.locator('#confirm-leave').click()
            page.locator('[data-warrior="' + warrior + '"]').click()
            page.locator('#start').click()
            assert page.locator('#scene-view').get_attribute('data-scene') == warrior + '-1'
        begin('attack')
        assert page.locator('#change-warrior').is_disabled()
        page.evaluate('''() => {
          document.querySelector('#continue').dispatchEvent(new Event('click'));
          document.querySelector('#question-form').dispatchEvent(new Event('submit', {cancelable:true}));
        }''')
        page.wait_for_function('document.querySelector("#arena").dataset.combatPhase === "enemy-strike"')
        page.screenshot(path=str(Path(tempfile.gettempdir()) / 'edugames-3d-opponent.png'), full_page=True)
        frames = finish()
        phases = [f['phase'] for f in frames]
        assert phases.index('player-impact') < phases.index('enemy-windup') < phases.index('enemy-impact')
        assert next(f for f in frames if f['phase'] == 'player-impact')['enemy'] == 43
        assert next(f for f in frames if f['phase'] == 'enemy-impact')['player'] == 100
        assert page.locator('#score').inner_text() == 'Correct answers: 1 / 1'
        again()
        begin('skill')
        phases = [f['phase'] for f in finish()]
        assert 'enemy-defeated' in phases and 'enemy-windup' not in phases
        again()
        page.locator('#result-action').click()
        assert page.locator('#scene-view').get_attribute('data-scene') == 'lion-2'
        print('PASS: WebGL, idle/camera movement, five widths, impact timing, input locks and lethal hit.', flush=True)
        for warrior in ['lion','tiger','wolf','bear','fox','eagle','panther','rhino','crocodile','rabbit']:
            roster(warrior)
            begin('attack', False)
            phases = [f['phase'] for f in finish()]
            assert 'enemy-impact' in phases and 'player-impact' not in phases
            again()
            begin('skill')
            phases = [f['phase'] for f in finish()]
            assert 'player-impact' in phases and 'enemy-impact' in phases, warrior
            if warrior == 'tiger': assert phases.count('player-impact') == 2
            if warrior in ['wolf','rabbit']: assert 'The guardian dealt' not in page.locator('#feedback-action').inner_text()
            again()
            assert not errors, errors
            print('PASS: ' + warrior + ' 3D skill and guardian retaliation.', flush=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        begin('defend')
        phases = [f['phase'] for f in finish()]
        assert 'player-guard' in phases and 'enemy-strike' in phases
        assert 'blocked 8 damage' in page.locator('#feedback-action').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        again()
        # Turning movement off resolves the same turn without blocking controls.
        begin('attack')
        page.locator('#animation-toggle').click()
        finish(); again()
        assert page.locator('#animation-toggle').get_attribute('aria-checked') == 'false'
        roster('lion')
        # All five stage models/environments and the complete campaign, motion off.
        for stage in range(1,6):
            assert page.locator('#scene-view').get_attribute('data-scene') == 'lion-' + str(stage)
            if stage == 5:
                page.screenshot(path=str(Path(tempfile.gettempdir()) / 'edugames-3d-boss-mobile.png'), full_page=True)
            for turn in range(30):
                if page.locator('#result').is_visible(): break
                begin('skill' if page.locator('#skill-button').is_enabled() else 'attack')
                finish(); again()
            assert page.locator('#result-title').inner_text() == ('Champion of the Wildwood!' if stage == 5 else 'Stage cleared!')
            if stage < 5: page.locator('#result-action').click()
        page.locator('#result-action').click()
        for turn in range(11):
            begin('attack', False); finish(); again()
        assert page.locator('#result-title').inner_text() == 'A brave try, champion.'
        page.locator('#result-action').click()
        assert page.locator('#player-hp').inner_text() == '110 / 110 HP'
        assert len(catalogue_requests) == 1
        assert not errors, errors
        # Context loss must produce a clear error, never a silent 2D replacement.
        canvas.evaluate('el => el.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
        page.locator('#render-error').wait_for(state='visible')
        assert page.locator('[data-move="attack"]').is_disabled()
        blocked = browser.new_page()
        blocked.add_init_script('''() => {}''')
        blocked.add_init_script('''const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { if(type === 'webgl2') return null; return original.call(this, type, ...args); };''')
        blocked.goto(base + '/educational-games/index.html')
        blocked.locator('#load-error').wait_for(state='visible')
        assert 'WebGL 2' in blocked.locator('#load-error').inner_text()
        assert not blocked.locator('#selection').is_visible()
        browser.close()
    print('PASS: all ten 3D warriors, five environments, full campaign, defence, wrong answers, retry, explicit motion control, context-loss and unsupported-WebGL errors; one catalogue request.')
finally:
    server.terminate()
    server.wait(timeout=5)
