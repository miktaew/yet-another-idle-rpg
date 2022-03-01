import { item_templates, Item } from "./items.js";

var enemy_templates = {};
//enemy templates; locations then create new enemies based on them

function Enemy(enemy_data) {
    this.name = enemy_data.name;
    this.description = enemy_data.description; //try to keep it short
    this.xp_value = enemy_data.xp_value;
    this.stats = enemy_data.stats;
    //only magic & defense can be 0 in stats
    this.stats.max_health = enemy_data.stats.health;

    this.loot_list = enemy_data.loot_list;

    this.get_loot = function() {
        // goes through items and calculates drops
        // result is in form [{item: Item, count: item_count}, {...}, {...}]

        var loot = []
        var item;
        for (var i = 0; i < this.loot_list.length; i++) {
            item = this.loot_list[i];
            if(item["chance"] >= Math.random()) {
                // checks if it should drop
                var item_count = 1;
                if("count" in item) {
                    item_count = Math.round(Math.random() * (item["count"]["max"] - item["count"]["min"]) + item["count"]["min"]);
                    // calculates how much drops (from range min-max, both inclusive)
                } 

                loot.push({"item": new Item(item_templates[item.item_name]), "count": item_count});
            }
        }

        return loot;
    }
}

(function(){
    enemy_templates["Starving wolf rat"] = new Enemy({
        name: "Starving wolf rat", 
        description: "Rat with size of a dog, starved and weakened", 
        xp_value: 1, 
        stats: {health: 8, strength: 3, agility: 4, dexterity: 4, magic: 0, attack_speed: 0.8, defense: 0}, 
        loot_list: [
            {item_name: "Rat tail", chance: 0.1},
            {item_name: "Rat fang", chance: 0.1},
            {item_name: "Rat pelt", chance: 0.05}
        ]
    });

    enemy_templates["Wolf rat"] = new Enemy({
        name: "Wolf rat", 
        description: "Rat with size of a dog",
        xp_value: 1, 
        stats: {health: 12, strength: 4, agility: 5, dexterity: 4, magic: 0, attack_speed: 1, defense: 0}, 
        loot_list: [
            {item_name: "Rat tail", chance: 0.1},
            {item_name: "Rat fang", chance: 0.1},
            {item_name: "Rat pelt", chance: 0.05},
        ]
    });

    enemy_templates["Group of rats"] = new Enemy({
        name: "Group of rats", 
        description: "Maybe they are a family?", 
        xp_value: 3, 
        stats: {health: 40, strength: 8, agility: 6, dexterity: 12, magic: 0, attack_speed: 2, defense: 0}, 
        loot_list: [
            {item_name: "Rat tail", chance: 0.2},
            {item_name: "Rat fang", chance: 0.2},
            {item_name: "Rat pelt", chance: 0.1}
        ]
    });

    enemy_templates["Horde of rats"] = new Enemy({
        name: "Horde of rats", 
        description: "How many is there?",
        xp_value: 4, 
        stats: {health: 60, strength: 10, agility: 6, dexterity: 15, magic: 0, attack_speed: 2.5, defense: 0}, 
        loot_list: [
            {item_name: "Rat tail", chance: 0.2},
            {item_name: "Rat fang", chance: 0.2},
            {item_name: "Rat pelt", chance: 0.1},
        ]
    });

    enemy_templates["Starving wolf"] = new Enemy({
        name: "Starving wolf", description: "A large, wild and hungry canine", 
        xp_value: 7, 
        stats: {health: 60, strength: 13, agility: 15, dexterity: 15, magic: 0, attack_speed: 1, defense: 2}, 
        loot_list: [
            {item_name: "Wolf tooth", chance: 0.05, count: {min: 1, max: 2}},
            {item_name: "Wolf pelt", chance: 0.02}
        ]
    });

    enemy_templates["Young wolf"] = new Enemy({
        name: "Young wolf", 
        description: "A small, wild canine", 
        xp_value: 7, 
        stats: {health: 50, strength: 11, agility: 17, dexterity: 12, magic: 0, attack_speed: 1.2, defense: 0}, 
        loot_list: [
            {item_name: "Wolf tooth", chance: 0.02},
            {item_name: "Wolf pelt", chance: 0.01}
        ]
    });

    enemy_templates["Wolf"] = new Enemy({
        name: "Wolf", 
        description: "A large, wild canine", 
        xp_value: 10, 
        stats: {health: 70, strength: 16, agility: 17, dexterity: 20, magic: 0, attack_speed: 1.1, defense: 3}, 
        loot_list: [
            {item_name: "Wolf tooth", chance: 0.07, count: {min: 1, max: 3}},
            {item_name: "Wolf pelt", chance: 0.03}
        ]
    });
})();

export {Enemy, enemy_templates};