"use strict";

import {item_templates, getItem} from "./items.js";

let enemy_templates = {};
let enemy_killcount = {};
//enemy templates; locations create new enemies based on them

class Enemy {
    constructor({name, 
                 description, 
                 xp_value = 1, 
                 stats, 
                 rank,
                 loot_list = [], 
                 size = "small"
                }) {
                    
        this.name = name;
        this.rank = rank; //only for the bestiary order; higher rank => higher in display
        this.description = description; //try to keep it short
        this.xp_value = xp_value;
        this.stats = stats;
        //only magic & defense can be 0 in stats, other things will cause issues
        this.stats.max_health = stats.health;
        this.loot_list = loot_list;

        if(size !== "small" && size !== "medium" && size !== "large") {
            throw new Error(`No such enemy size option as "size"!`);
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

                loot.push({ "item": getItem(item_templates[item.item_name]), "count": item_count });
            }
        }

        return loot;
    };

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
        stats: {health: 20, attack: 5, agility: 6, dexterity: 4, magic: 0, intuition: 6, attack_speed: 0.8, defense: 1}, 
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
        stats: {health: 30, attack: 7, agility: 8, dexterity: 6, intuition: 7, magic: 0, attack_speed: 1, defense: 2}, 
        loot_list: [
            {item_name: "Rat tail", chance: 0.04},
            {item_name: "Rat fang", chance: 0.04},
            {item_name: "Rat pelt", chance: 0.01},
        ]
    });

    enemy_templates["Starving wolf"] = new Enemy({
        name: "Starving wolf", description: "A large, wild and hungry canine", 
        xp_value: 4, 
        rank: 2,
        stats: {health: 150, attack: 24, agility: 34, dexterity: 34, intuition: 32, magic: 0, attack_speed: 1, defense: 8}, 
        loot_list: [
            /* //those items were removed, so let's keep it in comment for a while
            {item_name: "Wolf tooth", chance: 0.02, count: {min: 1, max: 2}},
            {item_name: "Wolf pelt", chance: 0.01}
            */
        ]
    });

    enemy_templates["Young wolf"] = new Enemy({
        name: "Young wolf", 
        description: "A small, wild canine", 
        xp_value: 4, 
        rank: 2,
        stats: {health: 120, attack: 24, agility: 34, dexterity: 30, intuition: 24, magic: 0, attack_speed: 1.4, defense: 4}, 
        loot_list: [
            /*
            {item_name: "Wolf tooth", chance: 0.02},
            {item_name: "Wolf pelt", chance: 0.01}
            */
        ],
        size: "small",
    });

    enemy_templates["Wolf"] = new Enemy({
        name: "Wolf", 
        description: "A large, wild canine", 
        xp_value: 6, 
        rank: 3,
        stats: {health: 200, attack: 40, agility: 42, dexterity: 42, intuition: 32, magic: 0, attack_speed: 1.3, defense: 20}, 
        loot_list: [
            /*
            {item_name: "Wolf tooth", chance: 0.02, count: {min: 1, max: 3}},
            {item_name: "Wolf pelt", chance: 0.01}
            */
        ],
        size: "medium"
    });
})();

export {Enemy, enemy_templates, enemy_killcount};