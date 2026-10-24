// The game's Scout on every page: it flies after the mouse cursor, and once there it circles it. Not on a touch
// screen (no cursor to follow) or with reduced motion asked for; it never takes a click (docs.css, .cursor-ship).
(function () {
    // its length on screen (px), the circle's radius round the cursor (px), its speeds (px/s) and its turn (rad/s)
    const size = 40;
    const orbit = 54;
    const speed_cruise = 620;
    const speed_orbit = 230;
    const turn_rate = 7;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    const ship = document.createElement('div');
    ship.className = 'cursor-ship';
    ship.setAttribute('aria-hidden', 'true');
    ship.innerHTML = `<span class="cursor-ship-flame"></span><img src="${new URL('ship.svg', document.currentScript.src)}" alt="" width="${size}" height="${size}">`;
    const flame = ship.firstChild;
    const state = {x: 0, y: 0, angle: -Math.PI/4, speed: 0, target: null, side: 1, last: 0};
    document.addEventListener('mousemove', function (event) {
        if (!state.target) {
            ship_launch();
        }
        state.target = {x: event.clientX, y: event.clientY};
    }, {passive: true});

    // The first move: the ship comes in from the page's logo, top left, and flies to the cursor
    function ship_launch() {
        const logo = document.querySelector('.brand-mark');
        const box = logo ? logo.getBoundingClientRect() : {left: 0, top: 0, width: 0, height: 0};
        state.x = box.left + box.width/2;
        state.y = box.top + box.height/2;
        document.body.append(ship);
        requestAnimationFrame(ship_frame);
    }

    function ship_frame(time) {
        // a hidden tab gets no frames: back, the ship goes on from where it was, not with one long step
        const dt = state.last ? Math.min(0.05, (time - state.last)/1000) : 0;
        state.last = time;
        ship_steer(dt);
        ship.style.transform = `translate(${state.x - size/2}px, ${state.y - size/2}px) rotate(${state.angle + Math.PI/2}rad)`;
        flame.style.opacity = Math.min(1, state.speed/speed_cruise + 0.35).toFixed(2);
        flame.style.transform = `translateX(-50%) scaleY(${(0.6 + state.speed/speed_cruise).toFixed(2)})`;
        requestAnimationFrame(ship_frame);
    }

    // Far from the cursor it heads for it; near, it heads along the circle round it, drawn back onto the circle as it
    // drifts in or out, and keeps the way round it came in by
    function ship_steer(dt) {
        const dx = state.target.x - state.x;
        const dy = state.target.y - state.y;
        const d = Math.hypot(dx, dy) || 1;
        let want = Math.atan2(dy, dx);
        let speed = speed_cruise;
        if (d < orbit*2.2) {
            const ahead = Math.cos(state.angle)*dy - Math.sin(state.angle)*dx;
            if (d > orbit*2) {
                state.side = (ahead > 0) ? 1 : -1;
            }
            const pull = Math.max(-1, Math.min(1, (d - orbit)/orbit));
            want = Math.atan2(dy, dx) - state.side*(Math.PI/2)*(1 - pull);
            speed = speed_orbit + (speed_cruise - speed_orbit)*Math.max(0, pull);
        }
        const delta = Math.atan2(Math.sin(want - state.angle), Math.cos(want - state.angle));
        state.angle += Math.max(-turn_rate*dt, Math.min(turn_rate*dt, delta));
        state.speed += (speed - state.speed)*Math.min(1, dt*3);
        state.x += Math.cos(state.angle)*state.speed*dt;
        state.y += Math.sin(state.angle)*state.speed*dt;
    }
})();
