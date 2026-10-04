// node tools/inline-icons.mjs: tools/docs.src.css → assets/docs.css, with assets/icons/*.svg put in as data URIs.
// CSS masks do not load SVG files over file:// (CORS), so the icons travel inside the stylesheet.
import fs from 'node:fs';
const dir = new URL('..', import.meta.url).pathname;
const src = fs.readFileSync(dir + 'tools/docs.src.css', 'utf8');
const out = src.replace(/url\((icons\/[a-z0-9-]+\.svg)\)/g, function (_, file) {
    const svg = fs.readFileSync(dir + 'assets/' + file, 'utf8').trim().replace(/"/g, "'");
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%2C/g, ',') + '")';
});
fs.writeFileSync(dir + 'assets/docs.css', out);
console.log('assets/docs.css', out.length);
