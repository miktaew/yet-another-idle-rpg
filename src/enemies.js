"use strict";

let enemy_templates = {};
let enemy_killcount = {};
//enemy templates; locations create new enemies based on them

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

        if(size !== "small" && size !== "medium" && size !== "large") {
            throw new Error(`No such enemy size option as "${size}"!`);
        } else {
            this.size = size;
        }

    }
    get_loot() {
        // goes through items and calculates drops
        // result is in form [{item: Item, count: item_count}, {...}, {...}]
        let loot = [];
        let item;
        
        for (let i = 0; i < this.loot_list.length; i++) {
            item = this.loot_list[i];
            if (item.chance * this.get_droprate_modifier() >= Math.random()) {
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

    get_droprate_modifier() {
        let droprate_modifier = 1;
        /*
        if(enemy_killcount[this.name] >= 999) {
            droprate_modifier = 0.1;
        } else if(enemy_killcount[this.name]) {
            droprate_modifier = 111/(111+enemy_killcount[this.name]);
        }
        */
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
        size: "small",
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
        xp_value: 10,
        rank: 4,
        size: "medium",
        tags: ["living", "beast", "wolf rat", "monster"],
        stats: {health: 250, attack: 50, agility: 40, dexterity: 40, intuition: 50, magic: 0, attack_speed: 1.2, defense: 30},
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.02},
            {item_name: "Weak monster bone", chance: 0.005},
        ]
    });
    enemy_templates["Wall rat"] = new Enemy({
        name: "Wall rat",
        description: "They don't live in the walls, they ARE the walls. Insane writhing masses of teeth, fangs, and tails, that make no logical sense. An abomination that cannot exist, and yet it does.",
        xp_value: 20,
        rank: 6,
        size: "large",
        tags: ["living", "beast", "wolf rat", "monster", "eldritch"],
        stats: {health: 1000, attack: 70, agility: 20, dexterity: 90, intuition: 90, magic: 0, attack_speed: 2, attack_count: 3, defense: 20},
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
        stats: {health: 150, attack: 22, agility: 34, dexterity: 34, intuition: 32, magic: 0, attack_speed: 1, defense: 12},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.03},
            {item_name: "Wolf pelt", chance: 0.01},
        ],
        size: "medium",
    });

    enemy_templates["Young wolf"] = new Enemy({
        name: "Young wolf",
        description: "A small, wild canine",
        xp_value: 3,
        rank: 2,
        tags: ["living", "beast"],
        stats: {health: 120, attack: 25, agility: 34, dexterity: 30, intuition: 24, magic: 0, attack_speed: 1.4, defense: 6},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.03},
            {item_name: "Wolf pelt", chance: 0.01},
        ],
        size: "small",
    });

    enemy_templates["Wolf"] = new Enemy({
        name: "Wolf",
        description: "A large, wild canine",
        xp_value: 4,
        rank: 3,
        tags: ["living", "beast"],
        stats: {health: 200, attack: 32, agility: 42, dexterity: 42, intuition: 32, magic: 0, attack_speed: 1.3, defense: 20},
        loot_list: [
            {item_name: "Wolf fang", chance: 0.04},
            {item_name: "Wolf pelt", chance: 0.02},
            {item_name: "High quality wolf fang", chance: 0.0005}
        ],
        size: "medium"
    });

    enemy_templates["Boar"] = new Enemy({
        name: "Boar",
        description: "A big wild creature, with thick skin and large tusks",
        xp_value: 8,
        rank: 4,
        tags: ["living", "beast"],
        stats: {health: 300, attack: 50, agility: 30, dexterity: 40, intuition: 40, magic: 0, attack_speed: 1, defense: 25},
        loot_list: [
            {item_name: "Boar hide", chance: 0.04},
            {item_name: "Boar meat", chance: 0.02},
            {item_name: "Boar tusk", chance: 0.02},
            {item_name: "High quality boar tusk", chance: 0.0005},
        ],
        size: "medium"
    });

    enemy_templates["Angry mountain goat"] = new Enemy({
        name: "Angry mountain goat",
        description: "It's a mountain goat and it's angry",
        xp_value: 15,
        rank: 6,
        tags: ["living", "beast"],
        size: "medium",
        stats: {health: 600, attack: 120, agility: 100, dexterity: 60, magic: 0, intuition: 60, attack_speed: 0.5, defense: 30},
        loot_list: [
            {item_name: "Mountain goat hide", chance: 0.04},
            {item_name: "Goat meat", chance: 0.02},
            {item_name: "Mountain goat horn", chance: 0.02},
            {item_name: "Pristine mountain goat horn", chance: 0.0005},
        ],
    });

    enemy_templates["Slums thug"] = new Enemy({
        name: "Slums thug",
        description: "A nasty thug with shabby equipment",
        xp_value: 10,
        rank: 5,
        tags: ["living", "human"],
        size: "medium",
        stats: {health: 500, attack: 60, agility: 60, dexterity: 60, magic: 0, intuition: 60, attack_speed: 1.7, defense: 25},
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
        size: "medium",
        stats: {health: 300, attack: 50, agility: 20, dexterity: 80, magic: 0, intuition: 20, attack_speed: 0.2, defense: 30},
    });
    enemy_templates["Village guard (quick)"] = new Enemy({
        name: "Village guard (quick)", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 4,
        tags: ["living", "human"],
        size: "medium",
        stats: {health: 300, attack: 20, agility: 20, dexterity: 50, magic: 0, intuition: 20, attack_speed: 2, defense: 10},
    });
    enemy_templates["Suspicious wall"] = new Enemy({
        name: "Suspicious wall", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 1,
        tags: ["unanimate"],
        size: "large",
        stats: {health: 10000, attack: 0, agility: 0, dexterity: 0, magic: 0, intuition: 0, attack_speed: 0.000001, defense: 100},
    });

    enemy_templates["Suspicious man"] = new Enemy({
        name: "Suspicious man", 
        description: "", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 5,
        tags: ["living", "human"],
        size: "medium",
        stats: {health: 400, attack: 60, agility: 60, dexterity: 60, magic: 0, intuition: 60, attack_speed: 2, defense: 30},
    });

    enemy_templates["Angry-looking mountain goat"] = new Enemy({
        name: "Angry-looking mountain goat", 
        description: "It's a mountain goat and it's angry", 
        add_to_bestiary: false,
        xp_value: 1,
        rank: 6,
        tags: ["living", "beast"],
        size: "medium",
        stats: {health: 1200, attack: 150, agility: 100, dexterity: 70, magic: 0, intuition: 60, attack_speed: 0.5, defense: 30},
    });
})()

export {Enemy, enemy_templates, enemy_killcount};