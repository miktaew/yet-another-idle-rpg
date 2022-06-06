import {enemy_templates, Enemy} from "./enemies.js";
import { dialogues } from "./dialogues.js";
import { activities } from "./activities.js";
const locations = {};
//will contain all the locations

/*
TODO:
    - additional property, an object with all "properties" that the area has 
    (keys as "dark", "narrow", "cold" and their values simply as boolean)
    only for combat zones maybe?
    for some kind of nightvision skill, "dark" and "bright" would mean it's like that all the time, while lack of them both
    would indicate it follows the day-night cycle

*/

class Location {
    constructor(location_data) {
        /* always safe
    
        */
        this.name = location_data.name;
        this.description = location_data.description;
        this.connected_locations = location_data.connected_locations; //a list
        this.is_unlocked = typeof location_data.is_unlocked !== "undefined" ? location_data.is_unlocked : true;
        this.dialogues = location_data.dialogues || [];
        this.activities = [];
        this.sleeping = location_data.sleeping || null; // {text to start, xp per tick}
        for (let i = 0; i < this.dialogues.length; i++) {
            if (!dialogues[this.dialogues[i]]) {
                throw new Error(`No such dialogue as "${this.dialogues[i]}"!`);
            }
        }
    }
}

class Combat_zone {
    constructor({name, 
                 description, 
                 is_unlocked = true, 
                 enemies_list, 
                 enemy_count = 30,
                 parent_location, 
                 leave_text,
                 first_reward = {},
                 repeatable_reward = {}, 
                 required_skills = [],
                 gained_skills = [],
                }) {
        /*
        after clearing, maybe permanently unlock a single, harder zone (meaning also more xp/loot), from where the only way is back;
        */
        this.name = name;
        this.description = description;
        this.is_unlocked = is_unlocked;
        this.enemies_list = enemies_list;
        this.enemy_count = enemy_count;
        this.enemies_killed = 0;
        this.parent_location = parent_location;
        this.leave_text = leave_text; //text on option to leave
        this.first_reward = first_reward; //reward for first clear
        this.repeatable_reward = repeatable_reward; //reward for each clear, including first; all unlocks should be in this, just in case
        this.required_skills = required_skills;
        /*
        skills required to fight with full efficiency
        [{skill_name, skill_coefficient needed, item needed to prevent debuf, affected stats}]
        e.g.
        [{skill: nightvision, coefficient: 2, item_to_prevent: light_source, affected_stats: ["agility", "dexterity"]}]
        */
        this.gained_skills = gained_skills;
        /*
        skills that will raise by themselves when fighting in some locations
        e.g. due to environment, i.e. night vision skill in dark areas
        [{skill_name, xp gained}]
        */

        this.get_next_enemy = function () {
            const enemy = enemy_templates[this.enemies_list[Math.floor(Math.random() * this.enemies_list.length)]];
            return new Enemy({
                name: enemy.name, description: enemy.description, xp_value: enemy.xp_value,
                stats: {
                    health: Math.round(enemy.stats.health * (1.1 - Math.random() * 0.2)),
                    strength: Math.round(enemy.stats.strength * (1.1 - Math.random() * 0.2)),
                    agility: Math.round(enemy.stats.agility * (1.1 - Math.random() * 0.2)),
                    dexterity: Math.round(enemy.stats.dexterity * (1.1 - Math.random() * 0.2)),
                    magic: Math.round(enemy.stats.magic * (1.1 - Math.random() * 0.2)),
                    attack_speed: Math.round(enemy.stats.attack_speed * (1.1 - Math.random() * 0.2) * 100) / 100,
                    defense: Math.round(enemy.stats.defense * (1.1 - Math.random() * 0.2))
                },
                loot_list: enemy.loot_list
                //up to 10% deviation for each stat
                //attack speed is the only one allowed to not be an integer
            });;
            //creates and returns a new enemy based on template
            //maybe add some location-related loot?
        };
    }
}

//create locations and zones
(function(){ 
    locations["Village"] = new Location({ 
        connected_locations: [], 
        description: "Medium-sized village surrounded by many fields, some of them infested by rats. Other than that, there's nothing interesting around.", 
        dialogues: ["village elder", "village trader"],
        name: "Village", 
    });

    locations["Shack"] = new Location({
        connected_locations: [{location: locations["Village"], custom_text: "Go outside"}],
        description: "This small shack was the only spare building in the village. It's surprisingly tidy.",
        name: "Shack",
        is_unlocked: false,
        sleeping: {
            text: "Take a nap",
            xp: 1},
    })

    locations["Village"].connected_locations.push({location: locations["Shack"]});
    //remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

    locations["Infested field"] = new Combat_zone({
        description: "Field infested with rats.", 
        enemy_count: 15, 
        enemies_list: ["Starving wolf rat", "Wolf rat"],
        is_unlocked: false, 
        name: "Infested field", 
        parent_location: locations["Village"],
        first_reward: {
            xp: 10,
        },
        repeatable_reward: {
            textlines: [{dialogue: "village elder", lines: ["cleared field"]}],
            xp: 5,
        }
    });
    locations["Village"].connected_locations.push({location: locations["Infested field"]});
    

    locations["Nearby cave"] = new Location({ 
        connected_locations: [{location: locations["Village"], custom_text: "Go outside and to the village"}], 
        description: "Cave near the village. You can hear sounds of rats somewhere deeper...", 
        name: "Nearby cave",
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Nearby cave"]});
    //remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

    locations["Cave depths"] = new Combat_zone({
        description: "It's dark. And full of rats.", 
        enemy_count: 30, 
        enemies_list: ["Group of rats", "Horde of rats"],
        is_unlocked: true, 
        name: "Cave depths", 
        leave_text: "Climb out",
        parent_location: locations["Nearby cave"],
        repeatable_reward: {
            textlines: [{dialogue: "village elder", lines: ["cleared cave"]}],
        }
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Cave depths"]});

    locations["Forest road"] = new Location({ 
        connected_locations: [{location: locations["Village"]}],
        description: "Shabby road leading through a dark forest, the only way to leave your village",
        name: "Forest road",
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Forest road"], custom_text: "Leave the village"});

    locations["Forest"] = new Combat_zone({
        description: "Forest surrounding your village, a dangerous place", 
        enemies_list: ["Starving wolf", "Young wolf"],
        enemy_count: 30, 
        name: "Forest", 
        parent_location: locations["Forest road"],
        repeatable_reward: {},
    });
    locations["Forest road"].connected_locations.push({location: locations["Forest"], custom_text: "Leave the safe path"});

    locations["Deep forest"] = new Combat_zone({
        description: "Deeper part of the forest, a dangerous place", 
        enemies_list: ["Wolf", "Starving wolf", "Young wolf"],
        enemy_count: 50, 
        is_unlocked: false,
        name: "Deep forest", 
        parent_location: locations["Forest road"],
        repeatable_reward: {},
        
    });
    locations["Forest road"].connected_locations.push({location: locations["Deep forest"], custom_text: "Venture deeper into the woods"});
    locations["Forest"].repeatable_reward.locations = [locations["Deep forest"]];
})();

//add activities
(function(){
    locations["Village"].activities = [
        {
            activity: "plowing the fields",
            starting_text: "Work on the fields",
            payment: 1, 
            is_unlocked: false,
            working_period: 60*2,
            max_working_time: 60*12, //both are ticks, so 2 and 12 in-game hours
            //with both the same, getting money requires working full time
            //otherwise, money will be accumulated per each finished period
            //at least in theory, as it's not really in use yet (other than for some description stuff)
            //so, TODO
            availability_time: {start: 6, end: 20}, //in-game hours of when job is available
            skill_xp_per_tick: 1, 
            skill_affects: "PAYMENT",
        },
        {
            activity: "running",
            starting_text: "Go for a run around the village",
            skill_xp_per_tick: 1,
            is_unlocked: true,
        }
    ];
})();


export {locations};


/*
TODO:
    some "quick travel" location that would connect all important ones? (e.g. some towns?)
*/