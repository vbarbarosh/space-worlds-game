// The story chapters written as files (src/missions/, read by bin/build into mission_files) take their places in the
// story by number, ahead of the chapters still written in code; side missions are kept apart
for (const v of mission_files.filter(v => v.number !== null)) {
    story.splice(v.number - 1, 0, mission_chapter(v));
}
// side missions (side-name.md): offered as contracts in their world until done (js/operations.js offered_jobs)
const side_missions = mission_files.filter(v => v.number === null).map(mission_chapter);

// A mission file as a story chapter: its first stage is where the contract starts
function mission_chapter(file)
{
    const stages = file.stages.map(v => stage(v.type, v.world, v.target, v.title, (v.beacon !== undefined) ? {beacon: v.beacon} : v.commodity ? {commodity: v.commodity} : {}));
    return {
        title: file.title,
        type: stages[0].type,
        world: file.world,
        target: stages[0].target,
        reward: file.reward,
        description: `${file.description} A multi-stage operation: ${stages.map(v => v.title).join(' → ')}.`,
        story: file.story,
        file: file.file,
        stages,
    };
}
