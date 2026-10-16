import os, socket, subprocess, time, re, json
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(ROOT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
try:
 for _ in range(50):
  try: urlopen(f'http://127.0.0.1:{port}/educational-games/api/index.php'); break
  except OSError: time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce'); errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  catalogue=json.loads((ROOT/'educational-games/api/catalogue.json').read_text())
  catalogue['stages'][0]['hp']=1000
  page.route('**/educational-games/api/index.php', lambda route: route.fulfill(json=catalogue))
  page.goto(f'http://127.0.0.1:{port}/educational-games/index.html')
  page.locator('#start').click()
  page.locator('#question-form').wait_for(state='visible')
  assert page.locator('#animation-toggle').count()==0
  assert page.locator('[data-move]').count()==0
  assert page.locator('html').get_attribute('data-battle-motion')=='on'
  canvas=page.locator('canvas'); first=canvas.screenshot(); page.wait_for_timeout(300); assert first!=canvas.screenshot()
  for width in (320,390,768,1024,1440):
   page.set_viewport_size({'width':width,'height':1000})
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  # Bear survives long enough in stage one to exercise all three skill questions.
  page.locator('#change-warrior').click(); page.locator('#confirm-leave').click()
  page.locator('[data-warrior="bear"]').click(); page.locator('#start').click()
  for turn in range(6):
   page.locator('#question-form').wait_for(state='visible',timeout=20000)
   label=page.locator('#move-label').inner_text()
   assert ('SKILL' in label)==(turn>=3), (turn,label)
   nums=list(map(int,re.findall(r'\d+',page.locator('#question-expression').inner_text())))
   page.locator('#answer').fill(str(999 if turn==4 else sum(nums)))
   page.locator('#question-form button').click()
   page.locator('#feedback').wait_for(state='visible',timeout=20000)
  page.locator('#question-form').wait_for(state='visible',timeout=20000)
  assert 'SOLVE TO ATTACK' in page.locator('#move-label').inner_text()
  assert '0 / 3' in page.locator('#energy').inner_text()
  page.locator('#answer').fill('999'); page.locator('#question-form button').click()
  page.locator('#feedback').wait_for(state='visible',timeout=20000)
  page.locator('#change-warrior').click(); page.locator('#confirm-leave').click()
  page.wait_for_timeout(5000)
  assert page.locator('#selection').is_visible()
  assert page.locator('#battle').is_hidden()
  assert not errors, errors
  browser.close()
 print('PASS always-on 3D, automatic questions, three-question skills, five widths, timer cancellation, no browser errors')
finally:
 server.terminate(); server.wait(timeout=10)
