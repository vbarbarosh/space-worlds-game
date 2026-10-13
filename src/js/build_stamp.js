// The main menu's bottom right corner names the build: the version of package.json and when bin/build made the page
// (build_info), so a player can tell whether the page is the latest. Times are Chisinau time, as the saves' are.
const build_stamp = document.createElement('p');
build_stamp.className = 'build-stamp';
build_stamp.textContent = format_build_stamp(build_info);
build_stamp.title = `Built ${format_build_time(build_info.time, true) || 'at an unknown time'}, Chisinau time`;
document.getElementById('intro').append(build_stamp);

// "v0.1.0 · 13 Oct 23:30"; without a version "build · 13 Oct 23:30"; without a readable time the version alone
function format_build_stamp(info)
{
    const version = info.version ? `v${info.version}` : 'build';
    const time = format_build_time(info.time, false);
    return time ? `${version} · ${time}` : version;
}

// "13 Oct 23:30", with the year when it is not this year's (or always, with full); '' when the time cannot be read
function format_build_time(iso, full)
{
    const at = new Date(iso);
    if (!Number.isFinite(at.getTime())) {
        return '';
    }
    const zone = 'Europe/Chisinau';
    const year = full || (at.toLocaleString('en-GB', {timeZone: zone, year: 'numeric'}) !== new Date().toLocaleString('en-GB', {timeZone: zone, year: 'numeric'}));
    const text = at.toLocaleString('en-GB', {timeZone: zone, day: 'numeric', month: 'short', year: year ? 'numeric' : undefined, hour: '2-digit', minute: '2-digit'});
    return text.replace(',', '');
}
