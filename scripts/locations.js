import {enemy_templates, Enemy} from "./enemies.js";
import { dialogues } from "./dialogues.js";
var locations = {};
//will contain all the locations


function Location(location_data) {
    /* always safe,

    */
        this.name = location_data.name;
        this.description = location_data.description;
        this.connected_locations = location_data.connected_locations; //a list
        this.is_unlocked = typeof location_data.is_unlocked !== "undefined"? location_data.is_unlocked : true;
        this.dialogues = typeof location_data.dialogues !== "undefined"? location_data.dialogues : [];
        // Activities, maybe make a special object type for actions (passive_activities ?), like sleeping/training/learning 
        // => or make it only one action per "location_action", similarly to combat_zone (except no child zones)?,
        // or "location_actions" (a list/dict)
        // either way, leaving the location should automatically stop it

        // is_unlocked; //quests and combat_zones and stuff can have something like "unlocks: Location"
        //or maybe "rewards: {"locations": X, "stats": X, "items": X, "quests"}}" or something like that?"
        // something for conversations
}

function Combat_zone(location_data) {
    /* 
    after clearing, maybe permanently unlock a single, harder zone (meaning also more xp/loot), from where the only way is back;
    */
    this.name = location_data.name;
    this.description = location_data.description;
    this.is_unlocked = typeof location_data.is_unlocked !== "undefined"? location_data.is_unlocked : true;
    this.enemies_list = location_data.enemies_list;
    this.enemy_count = typeof location_data.enemy_count !== "undefined"? location_data.enemy_count : 30;
    this.enemies_killed = 0;
    /*
    TODO: increase after each kill, upon reaching enemy_count (and it's multiples if repeatable_rewards) 
    give the rewards and possibly unlock some new zone
    */
    this.repeatable_rewards = typeof location_data.repeatable_rewards !== "undefined"? location_data.repeatable_rewards : true; //if rewards can be obtained on subsequent clearings
    this.parent_location = location_data.parent_location;
    if(typeof location_data.rewards !== "undefined") { 
        this.rewards = location_data.rewards;
        this.rewards.dialogues = typeof location_data.rewards.dialogues !== "undefined"? location_data.rewards.dialogues : [];
        this.rewards.textlines = typeof location_data.rewards.textlines !== "undefined"? location_data.rewards.textlines : [];
        this.rewards.locations = typeof location_data.rewards.locations !== "undefined"? location_data.rewards.locations : [];
    }
    else {
        this.rewards = {dialogues: [], textlines: [], locations: []};
    }

    this.get_next_enemy = function() {
        var enemy = this.enemies_list[Math.floor(Math.random() * this.enemies_list.length)];
        return new Enemy({
            name: enemy.name, description: enemy.description, xp_value: enemy.xp_value, 
            stats: {health: Math.round(enemy.stats.health * (1.1 - Math.random() * 0.2)),
                    strength: Math.round(enemy.stats.strength * (1.1 - Math.random() * 0.2)), agility: Math.round(enemy.stats.agility * (1.1 - Math.random() * 0.2)),
                    magic: Math.round(enemy.stats.magic * (1.1 - Math.random() * 0.2)), attack_speed: Math.round(enemy.stats.attack_speed * (1.1 - Math.random() * 0.2)*100)/100,
                    defense: Math.round(enemy.stats.defense * (1.1 - Math.random() * 0.2))}, 
            loot_list: enemy.loot_list
            //up to 10% deviation for each stat
            //attack speed is the only one allowed to not be an integer
        });;
        //creates and returns a new enemy based on template
        //maybe add some location-related loot?
    }
}

locations["Village"] = new Location({ 
    connected_locations: [], 
    description: "Medium-sized village surrounded by many fields, some of them infested by rats. Other than that, there's nothing interesting around.", 
    dialogues: ["village elder"],
    name: "Village", 
});

locations["Infested field"] = new Combat_zone({
    description: "Field infested with rats.", 
    enemy_count: 30, 
    enemies_list: [enemy_templates["Starving wolf rat"], enemy_templates["Wolf rat"]],
    is_unlocked: false, 
    name: "Infested field", 
    parent_location: locations["Village"],
    rewards: {
        textlines: [{dialogue: "village elder", lines: ["cleared"]}],
    }
});
locations["Village"].connected_locations.push({location: locations["Infested field"]});
//remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

locations["Forest road"] = new Location({ 
    connected_locations: [{location: locations["Village"]}],
    description: "Shabby road leading through a dark forest, the only way to leave your village",
    name: "Forest road",
    is_unlocked: false,
});
locations["Village"].connected_locations.push({location: locations["Forest road"], custom_text: "Leave the village"});

locations["Forest"] = new Combat_zone({
    description: "Forest surrounding your village, a dangerous place", 
    enemies_list: [enemy_templates["Starving wolf"], enemy_templates["Young wolf"]],
    enemy_count: 30, 
    name: "Forest", 
    parent_location: locations["Forest road"],
    rewards: {},
});
locations["Forest road"].connected_locations.push({location: locations["Forest"], custom_text: "Leave the safe path"});

locations["Deep forest"] = new Combat_zone({
    description: "Deeper part of the forest, a dangerous place", 
    enemies_list: [enemy_templates["Wolf"], enemy_templates["Starving wolf"], enemy_templates["Young wolf"]],
    enemy_count: 50, 
    is_unlocked: false,
    name: "Deep forest", 
    parent_location: locations["Forest road"],
    rewards: {},
    
});
locations["Forest road"].connected_locations.push({location: locations["Deep forest"], custom_text: "Venture deeper into the woods"});
locations["Forest"].rewards.locations = [locations["Deep forest"]];

export {locations};


/*
TODO:
    instead add connected locations as {location, custom_text, etc}
    some "quick travel" location that would connect all important ones? (e.g. some towns?)
*/