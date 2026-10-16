# EduGames

HTML pages, page-specific JavaScript and CSS, and a PHP backend. Requires PHP 8+.

## Local preview

From the EduGames directory, run:

    php -S localhost:8000

Open http://localhost:8000/index.html. Serve the entire project root so that the pages can access /api/. Opening the HTML files directly does not run PHP. The PHP development server is for local preview only; deploy to PHP-capable hosting.

## Structure

    index.html
    mathematics.html
    science.html
    js/index.js
    js/mathematics.js
    js/science.js
    css/index.css
    css/mathematics.css
    css/science.css
    api/index.php
    api/mathematics.php

index.css supplies the shared theme and main-page layout. Each subject page also loads its own stylesheet and script. Math and Science cards open their pages; the other cards show planned-topic dialogs.

GET /api/index.php returns the subject catalogue. GET /api/mathematics.php returns Math details. Both support HEAD, reject other methods, and advertise a five-minute public cache. The catalogue is held in PHP code; no database or sessions are used. JavaScript reports API failures explicitly without substitute data.

## Screen sizes

Main page: five subject columns on desktop, three at 800px and below, two at 540px and below. Spacing also adapts at 1100px and 1450px. Subject topic lists use three columns on desktop, two on tablet and one on phone.

Keyboard-accessible dialogs and reduced-motion preferences are supported. Google Fonts provides Manrope and DM Sans. Mathematics includes the playable Wildwood Warriors game; Science and Assessment remain previews.

## Wildwood Warriors

Open /educational-games/index.html, or select Educational Games on the Mathematics page.

- Ten selectable animal warriors, each with a distinct skill and health/attack values.
- Five sequential stages: addition to 10, addition to 20, subtraction within 20, 2/5/10 times tables, and a mixed final boss (addition/subtraction within 50 and basic multiplication).
- Questions appear automatically. Correct answers attack; wrong answers show an explanation while the guardian attacks. Feedback advances after 1.4 seconds for correct answers and 4.5 seconds for incorrect answers.
- Three correct regular answers activate the warrior skill for the next three questions. Incorrect answers also consume a skill question. After all three, charge resets to zero. Healing and blocking are supplied by individual skills.
- Health refills and charge resets to zero at stage transitions and retries. Results show correct answers across the current adventure, including retries.
- No timer, accounts, database, analytics or per-turn server requests. Progress is held in memory and resets on refresh.
- Battles use real, jointed 3D mesh models in a locally hosted Three.js arena. The selection cards retain lightweight SVG portraits. No external model or texture downloads are required.

The PHP endpoint educational-games/api/index.php serves catalogue.json with a five-minute public cache. Game state is local practice state, not a trusted competitive score. The engine is separate from rendering and can be tested using:

    node educational-games/tests/automatic.test.js

### Fighting animations

Combat plays in two steps: the 3D warrior acts, then the surviving guardian attacks. Health bars change on impact. Jointed limbs animate walking lunges, sword swings, blocking, jumping, hits and defeat. The ten skills use distinct 3D spell meshes and effects, including Tiger's two hits, Rabbit's dodge, healing and shields. Each stage has its own arena theme. Drag across the arena or use the camera buttons to rotate the view.

Controls are locked during combat. 3D animations are always enabled, including when the device requests reduced motion. Idle motion continues while waiting for an answer. Asset URLs use content hashes so changed scripts and styles bypass old cached versions. All animation runs in the browser with no per-turn backend requests.

Browser verification (requires Python Playwright and a supported Chromium browser):

    python educational-games/tests/automatic_browser_check.py

The older engine/browser/animation checks describe the superseded manual-move interface; use the automatic-flow checks above for the current interface.

### 3D implementation

- `js/models3d.js`: ten animal rigs, five guardian variants, shared geometry and materials.
- `js/arena3d.js`: WebGL scene, stage environments, lights, shadows, camera and mesh effects.
- `js/combat-animation.js`: turn sequence, joint poses and impact-time health updates.
- `vendor/`: locally hosted Three.js 0.180.0 and its MIT license.

The scene uses one reusable WebGL 2 context. Rendering pauses when the arena is hidden or outside the viewport. Pixel ratio is capped at 1.25 on phones and 1.5 on larger screens, with a 30/60 FPS rendering cap respectively. This is a frame-rate cap, not a guarantee of performance on every device. Geometry and materials are shared across character/stage changes, and temporary spell meshes are disposed after each turn. No database access or per-turn backend requests are involved.

WebGL 2 is required. Unsupported graphics or a lost context display an explicit error; there is no substitute 2D battle mode.

After editing authored game scripts or CSS, refresh the module/page cache hashes:

    python educational-games/tools/version_assets.py

Three.js documentation: https://threejs.org/docs/pages/WebGLRenderer.html
