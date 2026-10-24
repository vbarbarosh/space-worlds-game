// A track on a page: a link to an MP3 standing alone in its paragraph becomes a player (play, the title, the position,
// the time), and the page's first track starts by itself where the browser allows it, else at the reader's first click
// or key on the page. Paused by the reader, it stays off on the next page too (localStorage docs_track) until they
// press play again. Without this script the link stays a link to the file (docs.css, .track).
(function () {
    const links = [...document.querySelectorAll('.content p > a[href$=".mp3"]:only-child')];
    let wanted = true;
    try {
        wanted = localStorage.getItem('docs_track') !== 'off';
    }
    catch {
    }
    for (const [i, link] of links.entries()) {
        track_make(link, wanted && (i === 0));
    }

    function track_make(link, start) {
        const audio = new Audio(link.href);
        audio.preload = 'metadata';
        const box = document.createElement('div');
        box.className = 'track';
        box.dataset.state = 'paused';
        box.innerHTML = `<button type="button" class="track-play" aria-label="Play"><svg class="play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg><svg class="pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg></button>
<div class="track-body"><div class="track-title"><span class="track-name"></span><span class="track-note"></span></div><input type="range" class="track-seek" min="0" max="1000" step="1" value="0" aria-label="Position in the track"></div>
<div class="track-time"><span class="track-at">0:00</span> / <span class="track-length">–:––</span></div>`;
        box.querySelector('.track-name').textContent = link.textContent;
        const button = box.querySelector('.track-play');
        const note = box.querySelector('.track-note');
        const seek = box.querySelector('.track-seek');
        const at = box.querySelector('.track-at');
        link.parentNode.replaceWith(box);
        audio.addEventListener('loadedmetadata', function () {
            box.querySelector('.track-length').textContent = time_text(audio.duration);
        });
        audio.addEventListener('timeupdate', function () {
            at.textContent = time_text(audio.currentTime);
            if (audio.duration && !seek.matches(':active')) {
                seek.value = Math.round(audio.currentTime/audio.duration*1000);
            }
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
                remember('on');
            }
            else {
                audio.pause();
                remember('off');
            }
        });
        seek.addEventListener('input', function () {
            if (audio.duration) {
                audio.currentTime = seek.value/1000*audio.duration;
            }
        });
        if (start) {
            audio.play().catch(track_blocked);
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

    function remember(state) {
        try {
            localStorage.setItem('docs_track', state);
        }
        catch {
        }
    }

    function time_text(seconds) {
        return `${Math.floor(seconds/60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    }
})();
