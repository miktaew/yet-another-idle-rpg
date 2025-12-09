"use strict";

import { get_total_skill_coefficient } from "./character.js";

let enemy_templates = {};
let enemy_killcount = {};
//enemy templates; locations create new enemies based on them

const enemy_sizes = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large",
}

const droprate_modifier_skills_for_tags = {
    "beast": "Butchering",
}
const tags_for_droprate_modifier_skills = {};
Object.keys(droprate_modifier_skills_for_tags).forEach(tag => {
    tags_for_droprate_modifier_skills[droprate_modifier_skills_for_tags[tag]] = tag;
});

class Enemy {
    constructor({
        name, 
        id,
        description, 
        xp_value = 1, 
        stats, 
        rank,
        loot_list = [], 
        size = "small",
        add_to_bestiary = true,
        tags = [],
    }) {
                    
        this.name = name;
        this.id = id || name;
        this.rank = rank; //only for the bestiary order; higher rank => higher in display
        this.description = description; //try to keep it short
        this.xp_value = xp_value;
        this.stats = stats;
        //only magic & defense can be 0 in stats, other things will cause issues
        this.stats.max_health = stats.health;
        this.loot_list = loot_list;
        this.tags = {};
        for(let i = 0; i <tags.length; i++) {
            this.tags[tags[i]] = true;
        }
        this.tags[size] = true;

        this.add_to_bestiary = add_to_bestiary; //generally set it false only for SOME of challenges and keep true for everything else

        if(size !== enemy_sizes.SMALL && size !== enemy_sizes.MEDIUM && size !== enemy_sizes.LARGE) {
            throw new Error(`No such enemy size option as "${size}"!`);
        } else {
            this.size = size;
        }

    }
    get_loot({drop_chance_modifier = 1} = {}) {
        // goes through items and calculates drops
        // result is in form [{item: Item, count: item_count}, {...}, {...}]
        let loot = [];
        let item;
        
        for (let i = 0; i < this.loot_list.length; i++) {
            item = this.loot_list[i];
            if (item.chance * this.get_droprate_modifier(drop_chance_modifier) >= Math.random()) {
                // checks if it should drop
                let item_count = 1;
                if ("count" in item) {
                    item_count = Math.round(Math.random() * (item["count"]["max"] - item["count"]["min"]) + item["count"]["min"]);
                    // calculates how much drops (from range min-max, both inclusive)
                }
                loot.push({item_id: item.item_name, "count": item_count });
            }
        }

        return loot;
    }

    /**
     * does kinda nothing nowadays, used to be more important, but leaving it in case some more things impacting droprate are added
     * @param {*} drop_chance_modifier 
     * @returns 
     */
    get_droprate_modifier(drop_chance_modifier = 1) {
        let droprate_modifier = 1 * drop_chance_modifier;

        Object.keys(this.tags).forEach(tag => {
            if(droprate_modifier_skills_for_tags[tag]) {
                droprate_modifier *= get_total_skill_coefficient({ skill_id: droprate_modifier_skills_for_tags[tag], scaling_type: "multiplicative" });
            }
        });

        return droprate_modifier;
    }
}

//regular enemies
(function(){
    /*
    lore note:
    wolf rats are semi-magical creatures that feed on natural magical energy; cave near the village, where they live, is filled up with it on lower levels, 
    providing them with a perfect environment;
    rats on the surface are ones that were kicked out (because space is limited and they were weak), half starving and trying to quench their hunger by eating plants and stuff
    

    */
    enemy_templates["Starving wolf rat"] = new Enemy({
        name: "Starving wolf rat",
        description: "Rat with size of a dog, starved and weakened",
        xp_value: 1,
        rank: 1,
        size: "small",
        tags: ["living", "beast", "wolf rat"],
        stats: {health: 20, attack: 4, agility: 5, dexterity: 4, magic: 0, intuition: 5, attack_speed: 0.8, defense: 1},
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.01}
        ]
    });

    enemy_templates["Wolf rat"] = new Enemy({
        name: "Wolf rat",
        description: "Rat with size of a dog",
        xp_value: 1,
        rank: 1,
        size: "small",
        tags: ["living", "beast", "wolf rat"],
        stats: {health: 30, attack: 6, agility: 6, dexterity: 5, intuition: 6, magic: 0, attack_speed: 1, defense: 2},
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.01},
        ]
    });
    enemy_templates["Elite wolf rat"] = new Enemy({
        name: "Elite wolf rat",
        description: "Rat with size of a dog, much more ferocious than its relatives",
        xp_value: 4,
        rank: 1,
        size: enemy_sizes.SMALL,
        tags: ["living", "beast", "wolf rat"],
        stats: {health: 80, attack: 32, agility: 30, dexterity: 24, intuition: 24, magic: 0, attack_speed: 1.5, defense: 8},
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.02},
        ]
    });
    enemy_templates["Elite wolf rat guardian"] = new Enemy({
        name: "Elite wolf rat guardian",
        description: "It's no longer dog-sized, but rather around the size of an average wolf, with thicker skin, longer claws and pure insanity in the eyes",
        xp_value: 15,
        rank: 4,
        size: enemy_sizes.MEDIUM,
        tags: ["living", "beast", "wolf rat", "monster"],
        stats: {health: 600, attack: 60, agility: 50, dexterity: 50, intuition: 50, magic: 0, attack_speed: 1.2, defense: 30},
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.02},
            {item_name: "Weak monster bone", chance: 0.005},
        ]
    });
    enemy_templates["Wall rat"] = new Enemy({
        name: "Wall rat",
        description: "They don't live in the walls, they ARE the walls. Insane writhing masses of teeth, fangs, and tails, that make no logical sense. An abomination that cannot exist, and yet it does",
        xp_value: 50,
        rank: 8,
        size: enemy_sizes.LARGE,
        tags: ["living", "beast", "wolf rat", "monster", "eldritch"],
        stats: {health: 4000, attack: 100, agility: 2, dexterity: 120, intuition: 200, magic: 0, attack_speed: 2, attack_count: 4, defense: 20},
        loot_list: [
            {item_name: "Rat tail", chance: 0.08},
            {item_name: "Rat fang", chance: 0.08},
        ]
    });

    enemy_templates["Starving wolf"] = new Enemy({
        name: "Starving wolf", description: "A big, wild and hungry canine", 
        xp_value: 3,
        rank: 2,
        tags: ["living", "beast"],
        stats: {health: 200, attack: 22, agility: 34, dexterity: 34, intuition: 32, magic: 0, attack_speed: 1, defense: 12},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.03},
            {item_name: "Wolf pelt", chance: 0.01},
        ],
        size: enemy_sizes.MEDIUM,
    });

    enemy_templates["Young wolf"] = new Enemy({
        name: "Young wolf",
        description: "A small, wild canine",
        xp_value: 3,
        rank: 2,
        tags: ["living", "beast"],
        stats: {health: 150, attack: 25, agility: 34, dexterity: 30, intuition: 24, magic: 0, attack_speed: 1.4, defense: 6},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.03},
            {item_name: "Wolf pelt", chance: 0.01},
        ],
        size: enemy_sizes.SMALL,
    });

    enemy_templates["Wolf"] = new Enemy({
        name: "Wolf",
        description: "A large, wild canine",
        xp_value: 6,
        rank: 3,
        tags: ["living", "beast"],
        stats: {health: 250, attack: 40, agility: 50, dexterity: 50, intuition: 40, magic: 0, attack_speed: 1.3, defense: 20},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.04},
            {item_name: "Wolf pelt", chance: 0.02},
            {item_name: "High quality wolf fang", chance: 0.0005}
        ],
        size: enemy_sizes.MEDIUM,
    });

    enemy_templates["Direwolf"] = new Enemy({
        name: "Direwolf",
        description: "A powerful wild wolf variant of unmatched ferocity",
        xp_value: 20,
        rank: 7,
        tags: ["living", "beast"],
        stats: {health: 1000, attack: 160, agility: 160, dexterity: 70, intuition: 70, magic: 0, attack_speed: 1.4, defense: 30},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.08},
            {item_name: "Wolf pelt", chance: 0.04},
            {item_name: "High quality wolf fang", chance: 0.001},
            {item_name: "Weak monster bone", chance: 0.02}
        ],
        size: enemy_sizes.MEDIUM,
    });

    enemy_templates["Direwolf hunter"] = new Enemy({
        name: "Direwolf hunter",
        description: "A powerful wild wolf variant of unmatched ferocity, the strongest and heaviest out of all direwolves",
        xp_value: 30,
        rank: 8,
        tags: ["living", "beast"],
        stats: {health: 2000, attack: 240, agility: 130, dexterity: 80, intuition: 90, magic: 0, attack_speed: 1.1, defense: 40},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.12},
            {item_name: "Wolf pelt", chance: 0.06},
            {item_name: "Weak monster bone", chance: 0.02},
            {item_name: "High quality wolf fang", chance: 0.0015}
        ],
        size: enemy_sizes.MEDIUM,
    });

    enemy_templates["Boar"] = new Enemy({
        name: "Boar",
        description: "A big wild creature, with thick skin and large tusks",
        xp_value: 10,
        rank: 4,
        tags: ["living", "beast"],
        stats: {health: 600, attack: 50, agility: 30, dexterity: 50, intuition: 60, magic: 0, attack_speed: 1, defense: 35},
        loot_list: [
            {item_name: "Boar hide", chance: 0.04},
            {item_name: "Boar meat", chance: 0.02},
            {item_name: "Boar tusk", chance: 0.02},
            {item_name: "High quality boar tusk", chance: 0.0005},
        ],
        size: enemy_sizes.MEDIUM,
    });

    enemy_templates["Angry mountain goat"] = new Enemy({
        name: "Angry mountain goat",
        description: "It's a mountain goat and it's angry",
        xp_value: 15,
        rank: 6,
        tags: ["living", "beast"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 600, attack: 120, agility: 100, dexterity: 60, magic: 0, intuition: 60, attack_speed: 0.5, defense: 50},
        loot_list: [
            {item_name: "Mountain goat hide", chance: 0.04},
            {item_name: "Goat meat", chance: 0.02},
            {item_name: "Mountain goat horn", chance: 0.02},
            {item_name: "Pristine mountain goat horn", chance: 0.0005},
        ],
    });

    enemy_templates["Forest bear"] = new Enemy({
        name: "Forest bear",
        description: "A mighty and dangerous predator with thick skin, sharp teeth, and dangerous claws",
        xp_value: 60,
        rank: 9,
        tags: ["living", "beast"],
        stats: {health: 6000, attack: 600, agility: 160, dexterity: 200, intuition: 200, magic: 0, attack_speed: 0.8, defense: 500},
        loot_list: [
            {item_name: "Bear hide", chance: 0.05},
            {item_name: "Bear claw", chance: 0.1},
            {item_name: "Sharp bear claw", chance: 0.002},
        ],
        size: enemy_sizes.LARGE,
    });

    enemy_templates["Red ant swarm"] = new Enemy({
        name: "Red ant swarm",
        description: "A swarm of angry red ants, each the size of a regular rat",
        xp_value: 20,
        rank: 7,
        tags: ["living", "insect"],
        stats: {health: 600, attack: 4, agility: 100, dexterity: 200, intuition: 100, magic: 0, attack_speed: 1.5, attack_count: 30, defense: 10},
        size: enemy_sizes.SMALL,
    });

    enemy_templates["Red ant queen"] = new Enemy({
        name: "Red ant queen",
        description: "A red ant queen, despite her decent size she's not much of a fighter",
        xp_value: 10,
        rank: 5,
        tags: ["living", "insect"],
        stats: {health: 200, attack: 20, agility: 50, dexterity: 200, intuition: 100, magic: 0, attack_speed: 0.5, defense: 20},
        size: enemy_sizes.SMALL,
    });

    enemy_templates["Slums thug"] = new Enemy({
        name: "Slums thug",
        description: "A nasty thug with shabby equipment",
        xp_value: 10,
        rank: 5,
        tags: ["living", "human"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 500, attack: 60, agility: 60, dexterity: 60, magic: 0, intuition: 60, attack_speed: 1.7, defense: 45},
    });
})();


//challenge enemies
(function(){
    enemy_templates["Village guard (heavy)"] = new Enemy({
        name: "Village guard (heavy)", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 4,
        tags: ["living", "human"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 300, attack: 50, agility: 20, dexterity: 80, magic: 0, intuition: 20, attack_speed: 0.2, defense: 30},
    });
    enemy_templates["Village guard (quick)"] = new Enemy({
        name: "Village guard (quick)", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 4,
        tags: ["living", "human"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 300, attack: 20, agility: 20, dexterity: 50, magic: 0, intuition: 20, attack_speed: 2, defense: 10},
    });
    enemy_templates["Suspicious wall"] = new Enemy({
        name: "Suspicious wall", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 1,
        tags: ["inanimate"],
        size: enemy_sizes.LARGE,
        stats: {health: 10000, attack: 0, agility: 0, dexterity: 0, magic: 0, intuition: 0, attack_speed: 0.000001, defense: 100},
    });

    enemy_templates["Suspicious man"] = new Enemy({
        name: "Suspicious man", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 5,
        tags: ["living", "human"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 400, attack: 60, agility: 60, dexterity: 60, magic: 0, intuition: 60, attack_speed: 2, defense: 30},
    });

    enemy_templates["Angry-looking mountain goat"] = new Enemy({
        name: "Angry-looking mountain goat", 
        description: "It's a mountain goat and it's angry", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 6,
        tags: ["living", "beast"],
        size: enemy_sizes.MEDIUM,
        stats: {health: 1200, attack: 150, agility: 100, dexterity: 70, magic: 0, intuition: 60, attack_speed: 0.5, defense: 60},
    });
})()

export {Enemy, enemy_templates, enemy_killcount, tags_for_droprate_modifier_skills};