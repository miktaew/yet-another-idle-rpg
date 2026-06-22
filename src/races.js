"use strict";

class Race {
    /**
     * 
     * @param {Object} param0
     * @param {String} name
     * @param {String} alternative_name
     * @param {String} description
     * @param {String} gameplay_description description for race selection screen
     * @param {Object} tags for some more game conditions?
     * @param {Object} bonuses {multipliers, xp_multipliers} 
     */
    constructor({name, alternative_name, description, gameplay_description, tags, stats = {}, xp_multipliers = {}}) {
        this.name = name;
        this.alternative_name = alternative_name;
        this.gameplay_description = gameplay_description; //for actually describing strengths and weaknesses, in case racial bonuses are uncommented
        this.description = description;
        this.tags = tags.reduce( (prev,cur) => ({...prev,[cur]:true}), {});
        this.stats = stats;
        this.xp_multipliers = xp_multipliers;
    }
}

const race_tags = {
    COMMON: "common",
    RARE: "rare",
    KEMONOMIMI: "kemonomimi",
    DEFAULT: "default", //only use it for one race
}



/*

    RACES ARE CURRENTLY COSMETIC ONLY, BUT BONUSES ARE FUNCTIONAL IF UNCOMMENTED
    JUST REMEMBER TO REMOVE THE NOTE ON HERO CREATION PANEL ABOUT HOW NOTHING THERE IMPACTS GAMEPLAY

*/

const playable_races = {
    "human": new Race({
        name: "human name",
        description: "human desc",
        //gameplay_description: "human gameplay desc",
        tags: [race_tags.COMMON, race_tags.DEFAULT],
    }),
    "nekomimi": new Race({
        name: "cat name",
        alternative_name: "cat alt name",
        description: "cat desc",
        //gameplay_description: "cat gameplay desc",
        tags: [race_tags.COMMON, race_tags.KEMONOMIMI],
        /*
        stats: {
            agility: {multiplier: 1.2},
            dexterity: {multiplier: 1.2},
            strength: {multiplier: 0.7},
            max_health: {multiplier: 0.7},
        },
        xp_multipliers: {
            Evasion: 1.5,
            Equilibrium: 1.5,
            Climbing: 1.5,
            Swimming: 0.7,
            "Shield blocking": 0.5,
        }*/
    }),
    "inumimi": new Race({
        name: "dog name",
        alternative_name: "dog alt name",
        description: "dog desc",
        //gameplay_description: "dog gameplay desc",
        tags: [race_tags.COMMON, race_tags.KEMONOMIMI],
        /*
        stats: {
            agility: {multiplier: 1.1},
            max_health: {multiplier: 0.9},
            stamina_efficiency: {multiplier: 1.1},
            magic: {multiplier: 0.8},
            max_mana: {multiplier: 0.7},
        },
        xp_multipliers: {
            Evasion: 1.2,
            Combat: 1.2,
            Climbing: 0.8,
            Meditation: 0.8,
            Swimming: 1.2,
            Running: 1.5,
        }*/
    }),
    "kitsunemimi": new Race({
        name: "fox name",
        alternative_name: "fox alt name",
        description: "fox desc",
        //gameplay_description: "fox gameplay desc",
        tags: [race_tags.COMMON, race_tags.KEMONOMIMI],
        /*
        stats: {
            agility: {multiplier: 1.1},
            dexterity: {multiplier: 1.1},
            strength: {multiplier: 0.8},
            max_health: {multiplier: 0.8},
            magic: {multiplier: 1.1},
            max_mana: {multiplier: 1.1},
        },
        xp_multipliers: {
            Evasion: 1.2,
            Equilibrium: 1.2,
            Climbing: 1.2,
            Swimming: 0.7,
            "Shield blocking": 0.7,
        }*/
    }),
    "elf": new Race({
        name: "elf name",
        description: "elf desc",
        //gameplay_description: "elf gameplay desc",
        tags: [race_tags.RARE],
        /*
        stats: {
            agility: {multiplier: 1.1},
            dexterity: {multiplier: 1.1},
            strength: {multiplier: 0.9},
            max_health: {multiplier: 0.7},
            magic: {multiplier: 1.1},
            max_mana: {multiplier: 1.1},
        },
        xp_multipliers: {
            Evasion: 1.2,
            Combat: 1.2,
            Equilibrium: 1.5,
            Climbing: 1.2,
            "Shield blocking": 0.5,
            Haggling: 0.7,
        }*/
    }),
    "half-elf": new Race({
        name: "half-elf name",
        description: "half-elf desc",
        //gameplay_description: "half-elf gameplay desc",
        tags: [race_tags.RARE],
        /*
        stats: {
            agility: {multiplier: 1.1},
            max_health: {multiplier: 0.8},
            max_mana: {multiplier: 1.1},
        },
        xp_multipliers: {
            Evasion: 1.2,
            Combat: 1.2,
            Equilibrium: 1.2,
            Climbing: 1.2,
            "Shield blocking": 0.8,
            Haggling: 0.8,
        }*/
    }),
    "dwarf": new Race({
        name: "dwarf name",
        description: "dwarf desc",
        //gameplay_description: "dwarf gameplay desc",
        tags: [race_tags.RARE],
        /*
        stats: {
            dexterity: {multiplier: 1.1},
            agility: {multiplier: 0.7},
            max_health: {multiplier: 1.1},
            strength: {multiplier: 1.1},
            magic: {multiplier: 0.7},
            max_mana: {multiplier: 0.7},
        },
        xp_multipliers: {
            Evasion: 0.5,
            Combat: 1.2,
            Climbing: 1.2,
            "Shield blocking": 1.5,
        }*/
    }),
    "half-dwarf": new Race({
        name: "half-dwarf name",
        description: "half-dwarf desc",
        //gameplay_description: "half-dwarf gameplay desc",
        tags: [race_tags.RARE],
        /*
        stats: {
            agility: {multiplier: 0.8},
            max_health: {multiplier: 1.1},
        },
        xp_multipliers: {
            Evasion: 0.7,
            Combat: 1.1,
            Climbing: 1.1,
            "Shield blocking": 1.2,
        }*/
    }),
}

Object.keys(playable_races).forEach(race_key => {
    playable_races[race_key].race_id = race_key;
})


export { playable_races };