const ship_cruiser = {
    ship: {
        id: 'cruiser',
        name: 'Aurora Cruiser',
        role: 'Expedition flagship',
        price: 5600,
        rank: 5,
        opens: 5,
        hull: 340,
        shield: 130,
        speed: 0.78,
        handling: 0.65,
        cargo: 120,
        radius: 25,
        damage: 1,
        // the arcade's reactor: the power its module levels may draw, one more a world cleared (src/js/arcade_power.js)
        power: 8,
        mounts: ['medium', 'medium', 'heavy', 'heavy'],
        color: '#e8c4ff',
        shape: 5,
        description: 'A slow flagship with immense shields and four guns, two of them heavy. Prepare for elite expeditions.',
    },
    hull_profile: {radiation: 0.75, traction: 1.9, braking: 1.6, cooling: 0.6, turbo: 1.1, endurance: 7},
};
