// A track on a page: a link to an MP3 standing alone in its paragraph becomes a player (play, the time, the waveform,
// the length, the volume), and the page's first track starts by itself where the browser allows it, else at the
// reader's first click or key on the page. Pause and volume are for every page: paused, no page starts its track
// until play is pressed again; the volume set on one player is every player's (localStorage docs_track, docs_volume).
// The waveform is the JSON beside the file (bin/world-music). Without this script the link stays a link to the file
// (docs.css, .track).
(function () {
    const links = [...document.querySelectorAll('.content p > a[href$=".mp3"]:only-child')];
    const stored = {track: null, volume: null};
    try {
        stored.track = localStorage.getItem('docs_track');
        stored.volume = localStorage.getItem('docs_volume');
    }
    catch {
    }
    const players = [];
    let volume = (stored.volume === null) ? 0.8 : Math.max(0, Math.min(1, Number(stored.volume) || 0));
    for (const [i, link] of links.entries()) {
        players.push(track_make(link, (stored.track !== 'off') && (i === 0)));
    }
    if (players.length) {
        new MutationObserver(function () {
            for (const player of players) {
                player.draw();
            }
        }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    }

    function track_make(link, start) {
        const audio = new Audio(link.href);
        audio.preload = 'metadata';
        audio.volume = volume;
        const box = document.createElement('div');
        box.className = 'track';
        box.dataset.state = 'paused';
        box.innerHTML = `<div class="track-title"><span class="track-name"></span><span class="track-note"></span></div>
<button type="button" class="track-play" aria-label="Play"><svg class="play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg><svg class="pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg></button>
<span class="track-at">0:00</span>
<div class="track-wave" role="slider" tabindex="0" aria-label="Position in the track" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><canvas></canvas></div>
<span class="track-length">–:––</span>
<button type="button" class="track-mute" aria-label="Mute"><svg class="on" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg></button>
<input type="range" class="track-volume" min="0" max="100" step="1" aria-label="Volume">`;
        box.querySelector('.track-name').textContent = link.textContent;
        const button = box.querySelector('.track-play');
        const at = box.querySelector('.track-at');
        const wave = box.querySelector('.track-wave');
        const canvas = wave.querySelector('canvas');
        const paint = canvas.getContext('2d');
        const note = box.querySelector('.track-note');
        const mute = box.querySelector('.track-mute');
        const slider = box.querySelector('.track-volume');
        let bars = [];
        let muted_from = 0.8;
        link.parentNode.replaceWith(box);
        volume_show();
        fetch(link.href.replace(/\.mp3$/, '.json')).then(v => v.json()).then(function (v) {
            bars = v.bars || [];
            draw();
        }).catch(draw);
        new ResizeObserver(draw).observe(wave);
        audio.addEventListener('loadedmetadata', function () {
            box.querySelector('.track-length').textContent = time_text(audio.duration);
        });
        audio.addEventListener('timeupdate', function () {
            at.textContent = time_text(audio.currentTime);
            wave.setAttribute('aria-valuenow', audio.duration ? Math.round(audio.currentTime/audio.duration*100) : 0);
            draw();
        });
        audio.addEventListener('play', function () {
            box.dataset.state = 'playing';
            button.setAttribute('aria-label', 'Pause');
            note.textContent = '';
        });
        audio.addEventListener('pause', function () {
            box.dataset.state = 'paused';
            button.setAttribute('aria-label', 'Play');
        });
        audio.addEventListener('error', function () {
            box.dataset.state = 'error';
            note.textContent = 'could not load the track';
        });
        button.addEventListener('click', function () {
            if (audio.paused) {
                audio.play().catch(function () {});
                remember('docs_track', 'on');
            }
            else {
                audio.pause();
                remember('docs_track', 'off');
            }
        });
        // the waveform: a press or a drag seeks; the keys step
        wave.addEventListener('pointerdown', function (event) {
            wave.setPointerCapture(event.pointerId);
            seek_to(event);
        });
        wave.addEventListener('pointermove', function (event) {
            if (event.buttons) {
                seek_to(event);
            }
        });
        wave.addEventListener('keydown', function (event) {
            const step = {ArrowLeft: -5, ArrowRight: 5, Home: -Infinity, End: Infinity}[event.key];
            if ((step !== undefined) && audio.duration) {
                audio.currentTime = Math.max(0, Math.min(audio.duration - 0.5, audio.currentTime + step));
                event.preventDefault();
            }
        });
        mute.addEventListener('click', function () {
            if (volume > 0) {
                muted_from = volume;
                volume_set(0);
            }
            else {
                volume_set(muted_from || 0.8);
            }
        });
        slider.addEventListener('input', function () {
            volume_set(slider.value/100);
        });
        if (start) {
            audio.play().catch(track_blocked);
        }
        return {draw, volume_show};

        function seek_to(event) {
            if (audio.duration) {
                const box_at = wave.getBoundingClientRect();
                audio.currentTime = Math.max(0, Math.min(1, (event.clientX - box_at.left)/box_at.width))*audio.duration;
                draw();
            }
        }

        // The bars, the played ones in the link colour, the rest in the page's quiet text colour
        function draw() {
            const width = wave.clientWidth;
            const height = wave.clientHeight;
            const dpr = devicePixelRatio || 1;
            if (!width || !height) {
                return;
            }
            canvas.width = Math.round(width*dpr);
            canvas.height = Math.round(height*dpr);
            paint.setTransform(dpr, 0, 0, dpr, 0, 0);
            paint.clearRect(0, 0, width, height);
            const style = getComputedStyle(box);
            const played = audio.duration ? audio.currentTime/audio.duration : 0;
            const n = bars.length || 120;
            const pitch = width/n;
            const bar = Math.max(1, pitch*0.55);
            for (let i = 0; i < n; ++i) {
                const h = Math.max(2, (bars[i] || 0.08)*(height - 4));
                paint.fillStyle = style.getPropertyValue((i/n < played) ? '--link' : '--text-3');
                paint.fillRect(i*pitch + (pitch - bar)/2, (height - h)/2, bar, h);
            }
        }

        function volume_show() {
            audio.volume = volume;
            slider.value = Math.round(volume*100);
            if (volume > 0) {
                delete box.dataset.muted;
                mute.setAttribute('aria-label', 'Mute');
            }
            else {
                box.dataset.muted = '';
                mute.setAttribute('aria-label', 'Unmute');
            }
        }

        // The browser allows no sound before the reader has touched the page: the first click or key starts it
        function track_blocked() {
            if (box.dataset.state === 'error') {
                return;
            }
            box.dataset.state = 'blocked';
            note.textContent = 'starts at your first click';
            function go() {
                document.removeEventListener('pointerdown', go);
                document.removeEventListener('keydown', go);
                if (audio.paused && (box.dataset.state === 'blocked')) {
                    audio.play().catch(function () {});
                }
            }
            document.addEventListener('pointerdown', go);
            document.addEventListener('keydown', go);
        }
    }

    // The volume is every player's, on this page and the next
    function volume_set(value) {
        volume = Math.max(0, Math.min(1, value));
        remember('docs_volume', String(volume));
        for (const player of players) {
            player.volume_show();
        }
    }

    function remember(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch {
        }
    }

    function time_text(seconds) {
        return `${Math.floor(seconds/60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    }
})();
