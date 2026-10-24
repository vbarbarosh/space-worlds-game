// The game's Scout on every page: it flies after the mouse cursor, and once there it circles it, unhurried. Far from
// the cursor it speeds up, its trail growing with its thrust, and it brakes as it arrives. Ship and trail are painted
// on one canvas over the window (docs.css, .cursor-ship), which never takes a click. Not on a touch screen (no cursor
// to follow) or with reduced motion asked for.
(function () {
    // its length on screen (px); the circle round the cursor: its radius (px) and the speed along it (px/s: a lap in
    // about 4.4 s); the chase: its top speed (px/s), how fast it gains speed and how hard it brakes (px/s²), its turn
    // (rad/s); the trail: how long it lasts behind the ship (s), at a standstill and at top speed
    const size = 40;
    const orbit = 56;
    const speed_orbit = 80;
    const speed_max = 1300;
    const thrust_gain = 2200;
    const brake = 1600;
    const turn_rate = 6;
    const trail_life = [0.12, 0.38];
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-ship';
    canvas.setAttribute('aria-hidden', 'true');
    const paint = canvas.getContext('2d');
    // the game's drawing, rasterised once at the screen's density (bitmap): a frame draws a bitmap, not an SVG
    const drawing = new Image();
    drawing.src = new URL('ship.svg', document.currentScript.src);
    let bitmap = null;
    const state = {x: 0, y: 0, angle: -Math.PI/4, speed: 0, thrust: 0, target: null, side: 1, last: 0, points: [], color: '#6cf8ec', frames: 0};
    document.addEventListener('mousemove', function (event) {
        if (!state.target) {
            ship_launch();
        }
        state.target = {x: event.clientX, y: event.clientY};
    }, {passive: true});
    addEventListener('resize', canvas_resize);
    drawing.addEventListener('load', bitmap_make);

    // The first move: the ship comes out of the page's logo, top left, and flies to the cursor
    function ship_launch() {
        const logo = document.querySelector('.brand-mark');
        const box = logo ? logo.getBoundingClientRect() : {left: 0, top: 0, width: 0, height: 0};
        state.x = box.left + box.width/2;
        state.y = box.top + box.height/2;
        canvas_resize();
        document.body.append(canvas);
        requestAnimationFrame(ship_frame);
    }

    function canvas_resize() {
        const dpr = devicePixelRatio || 1;
        canvas.width = Math.round(innerWidth*dpr);
        canvas.height = Math.round(innerHeight*dpr);
        paint.setTransform(dpr, 0, 0, dpr, 0, 0);
        bitmap_make();
    }

    // The drawing at twice the screen's density, so it stays sharp turned
    function bitmap_make() {
        if (!drawing.complete || !drawing.naturalWidth) {
            return;
        }
        const px = Math.ceil(size*2*(devicePixelRatio || 1));
        bitmap = document.createElement('canvas');
        bitmap.width = px;
        bitmap.height = px;
        bitmap.getContext('2d').drawImage(drawing, 0, 0, px, px);
    }

    function ship_frame(time) {
        // a hidden tab gets no frames: back, the ship goes on from where it was, not with one long step
        const dt = state.last ? Math.min(0.05, (time - state.last)/1000) : 0;
        state.last = time;
        ship_steer(dt);
        // where the ship is and how fast it flies, for a test to read
        canvas.dataset.ship = `${Math.round(state.x)},${Math.round(state.y)},${Math.round(state.speed)}`;
        scene_draw(time/1000);
        requestAnimationFrame(ship_frame);
    }

    // Far from the cursor it heads for it, as fast as its brakes still bring it down to the circle's speed by the time
    // it gets there; near, it heads along the circle, drawn back onto it as it drifts in or out, and keeps the way
    // round it came in by. Its thrust is what the trail shows: full while it gains speed, little while it brakes
    function ship_steer(dt) {
        const dx = state.target.x - state.x;
        const dy = state.target.y - state.y;
        const d = Math.hypot(dx, dy) || 1;
        let want = Math.atan2(dy, dx);
        if (d < orbit*2.2) {
            const ahead = Math.cos(state.angle)*dy - Math.sin(state.angle)*dx;
            if (d > orbit*2) {
                state.side = (ahead > 0) ? 1 : -1;
            }
            const pull = Math.max(-1, Math.min(1, (d - orbit)/orbit));
            want = Math.atan2(dy, dx) - state.side*(Math.PI/2)*(1 - pull);
        }
        const delta = Math.atan2(Math.sin(want - state.angle), Math.cos(want - state.angle));
        state.angle += Math.max(-turn_rate*dt, Math.min(turn_rate*dt, delta));
        const speed = Math.min(speed_max, Math.sqrt(speed_orbit*speed_orbit + 2*brake*Math.max(0, d - orbit)));
        let thrust = 0.3;
        if (speed > state.speed + 1) {
            state.speed = Math.min(speed, state.speed + thrust_gain*dt);
            thrust = 1;
        }
        else if (speed < state.speed - 1) {
            state.speed = Math.max(speed, state.speed - brake*dt);
            thrust = 0.08;
        }
        state.thrust += (thrust - state.thrust)*Math.min(1, dt*10);
        state.x += Math.cos(state.angle)*state.speed*dt;
        state.y += Math.sin(state.angle)*state.speed*dt;
    }

    // The trail from the nozzle back along where the ship has been, longer the faster it flies, brighter the harder
    // it thrusts, in the page's link colour with a white core at the nozzle; then the ship over it
    function scene_draw(now) {
        const life = trail_life[0] + (trail_life[1] - trail_life[0])*Math.min(1, state.speed/speed_max);
        const nozzle = {x: state.x - Math.cos(state.angle)*size*0.43, y: state.y - Math.sin(state.angle)*size*0.43, t: now};
        state.points.unshift(nozzle);
        while ((state.points.length > 2) && (now - state.points[state.points.length - 1].t > life)) {
            state.points.pop();
        }
        if (state.frames++ % 30 === 0) {
            state.color = getComputedStyle(document.documentElement).getPropertyValue('--link').trim() || state.color;
        }
        paint.clearRect(0, 0, innerWidth, innerHeight);
        paint.lineCap = 'butt';
        paint.strokeStyle = state.color;
        const glow = 0.2 + 0.8*state.thrust;
        const points = state.points;
        for (let i = 1, end = points.length; i < end; ++i) {
            const k = (now - points[i].t)/life;
            paint.globalAlpha = Math.max(0, 1 - k)*glow;
            paint.lineWidth = 1 + 6*Math.max(0, 1 - k);
            paint.beginPath();
            paint.moveTo(points[i - 1].x, points[i - 1].y);
            paint.lineTo(points[i].x, points[i].y);
            paint.stroke();
        }
        paint.globalAlpha = glow;
        paint.fillStyle = '#ffffff';
        paint.beginPath();
        paint.arc(nozzle.x, nozzle.y, 2.5, 0, Math.PI*2);
        paint.fill();
        paint.globalAlpha = 1;
        if (bitmap) {
            paint.save();
            paint.translate(state.x, state.y);
            paint.rotate(state.angle + Math.PI/2);
            paint.shadowColor = 'rgba(0, 0, 0, 0.35)';
            paint.shadowBlur = 3;
            paint.shadowOffsetY = 2;
            paint.drawImage(bitmap, -size/2, -size/2, size, size);
            paint.restore();
        }
    }
})();
