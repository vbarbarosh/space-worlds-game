// The story chapters written as files (src/missions/, read by bin/build into mission_files) take their places in the
// story by number, ahead of the chapters still written in code; side missions are kept apart
for (const v of mission_files.filter(vv => vv.number !== null)) {
    story.splice(v.number - 1, 0, mission_chapter(v));
}
// side missions (side-name.md): offered as contracts in their world until done (js/operations.js offered_jobs)
const side_missions = mission_files.filter(v => (v.number === null) && !v.career).map(mission_chapter);
// the career lines' chapters (career-line-n-name.md), each with its line and its place in it (js/careers.js)
const career_chapters = mission_files.filter(v => v.career).map(v => ({...mission_chapter(v), career: v.career.line, step: v.career.step}));

// What a file's stage row adds to its kind, world and amount: a beacon, a commodity, or a convoy's leg (via)
function mission_stage_extra(v)
{
    if (v.beacon !== undefined) {
        return {beacon: v.beacon};
    }
    if (v.commodity) {
        return {commodity: v.commodity};
    }
    if (v.ace) {
        return {ace: v.ace};
    }
    return v.via ? {via: v.via} : {};
}

// A mission file as a story chapter: its first stage is where the contract starts
function mission_chapter(file)
{
    const stages = file.stages.map(v => stage(v.type, v.world, v.target, v.title, mission_stage_extra(v)));
    return {
        title: file.title,
        type: stages[0].type,
        world: file.world,
        target: stages[0].target,
        reward: file.reward,
        description: `${file.description} ${stages.map(v => v.title).join(' → ')}.`,
        story: file.story,
        file: file.file,
        stages,
    };
}
