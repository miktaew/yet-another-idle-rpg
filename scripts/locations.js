import { enemy_templates, Enemy } from "./enemies.js";
import { dialogues } from "./dialogues.js";
const locations = {};
//contains all the created locations

/*
TODO:
    - additional property, an object with all "properties" that the area has 
    (stuff like "dark", "narrow", "cold")
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
        this.activities = {};
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
                 enemy_groups_list = [],
                 enemies_list = [], 
                 enemy_group_size = [1,1],
                 enemy_count = 30,
                 enemy_stat_variation = 0,
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
        this.enemy_groups_list = enemy_groups_list; //predefined enemy teams, names only
        this.enemies_list = enemies_list; //possible enemies (to be used if there's no enemy_groups_list), names only
        this.enemy_group_size = enemy_group_size; // [min, max], used only if enemy_groups_list is not provided
        if(!this.enemy_groups_list){
            if(this.enemy_group_size[0] < 1) {
                this.enemy_group_size[0] = 1;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[0] > 6) {
                this.enemy_group_size[0] = 6;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to highest value possible of 6`);
            }
            if(this.enemy_group_size[1] < 1) {
                this.enemy_group_size[1] = 1;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[1] < 1) {
                this.enemy_group_size[1] = 1;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to highest value possible of 6`);
            }
        }
        this.enemy_count = enemy_count; //how many enemy groups need to be killed for the clearing reward

        if(this.enemy_groups_list.length == 0 && this.enemies_list.length == 0 ) {
            throw new Error(`No enemies provided for zone "${this.name}"`);
        }

        this.enemy_groups_killed = 0; //killcount for clearing

        this.enemy_stat_variation = enemy_stat_variation; // e.g. 0.1 means each stat can go 10% up/down from base value; random for each enemy in group
        if(this.enemy_stat_variation < 0) {
            this.enemy_stat_variation = 0;
            console.error(`Stat variation for enemies in zone "${this.name}" is set to unallowed value and was corrected to a default 0`);
        }

        this.parent_location = parent_location;
        if(!locations[this.parent_location.name]) {
            throw new Error(`Couldn't add parent location "${this.parent_location.name}" to zone "${this.name}"`)
        }

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
    }

    get_next_enemies() {

        const enemies = [];
        let enemy_group = [];

        if(this.enemy_groups_list.length > 0) { // PREDEFINED GROUPS EXIST

            const index = Math.floor(Math.random() * this.enemy_groups_list.length);
            enemy_group = this.enemy_groups_list[index]; //names

        } else {  // PREDEFINED GROUPS DON'T EXIST

            const group_size = this.enemy_group_size[0] + Math.floor(Math.random() * (this.enemy_group_size[1] - this.enemy_group_size[0]));
            for(let i = 0; i < group_size; i++) {
                enemy_group.push(this.enemies_list[Math.floor(Math.random() * this.enemies_list.length)]);
            }
        }
 
        for(let i = 0; i < enemy_group.length; i++) {
            const enemy = enemy_templates[enemy_group[i]];
            let newEnemy;
            if(this.enemy_stat_variation != 0) {

                const variation = Math.random() * this.enemy_stat_variation;

                const base = 1 + variation;
                const vary = 2 * variation;
                newEnemy = new Enemy({name: enemy.name, description: enemy.description, xp_value: enemy.xp_value,
                                            stats: {
                                                health: Math.round(enemy.stats.health * (base - Math.random() * vary)),
                                                attack: Math.round(enemy.stats.attack * (base - Math.random() * vary)),
                                                agility: Math.round(enemy.stats.agility * (base - Math.random() * vary)),
                                                dexterity: Math.round(enemy.stats.dexterity * (base - Math.random() * vary)),
                                                magic: Math.round(enemy.stats.magic * (base - Math.random() * vary)),
                                                intuition: Math.round(enemy.stats.intuition * (base - Math.random() * vary)),
                                                attack_speed: Math.round(enemy.stats.attack_speed * (base - Math.random() * vary) * 100) / 100,
                                                defense: Math.round(enemy.stats.defense * (base - Math.random() * vary))
                                            },
                                            loot_list: enemy.loot_list,
                                        });

            } else {
                newEnemy = new Enemy({name: enemy.name, description: enemy.description, xp_value: enemy.xp_value,
                    stats: {
                        health: enemy.stats.health,
                        attack: enemy.stats.attack,
                        agility: enemy.stats.agility,
                        dexterity: enemy.stats.dexterity,
                        magic: enemy.stats.magic,
                        intuition: enemy.stats.intuition,
                        attack_speed: enemy.stats.attack_speed,
                        defense: enemy.stats.defense
                    },
                    loot_list: enemy.loot_list,
                });
            }
            newEnemy.is_alive = true;
            enemies.push(newEnemy); 
        }
        return enemies;
    }
}

class LocationActivity{
    constructor({activity, 
                 starting_text, 
                 payment = {min: 1, max: 1}, 
                 is_unlocked = true, 
                 working_period = 60,
                 infinite = false,
                 availability_time,
                 skill_xp_per_tick = 1,
                 skill_affects = "PAYMENT"
                 }) 
    {
        this.activity = activity; //name of activity from activities.js
        this.starting_text = starting_text; //text displayed on button to start action

        if(payment?.min < 0) {
            this.payment.min = 0;
            console.error("Minimum job payment cannot be less than 0 and was corrected to 0");
        }
        if(this.payment?.max <= 0) {
            this.payment.max = 1;
            console.error("Maximum job payment needs to be more than 0 and was corrected to 1")
        }
        this.payment = payment; // if exists -> min and max possible payment
        this.is_unlocked = is_unlocked;
        this.working_period = working_period; //if exists -> time that needs to be worked to earn anything; only for jobs
        this.infinite = infinite; //if true -> can be done 24/7, otherwise requires availability time
        if(this.infinite && availability_time) {
            console.error("Activity is set to be available all the time, so availability_time value will be ignored!");
        }
        if(!this.infinite && !availability_time) {
            throw new Error("LocationActivities that are not infinitely available, require a specified time of availability!");
        }
        this.availability_time = availability_time; //if not infinite -> hours between which it's available
        
        this.skill_xp_per_tick = skill_xp_per_tick; //skill xp gained per game tick (default -> 1 in-game minute)

        //skill_affects => what's affected by related skill; currently only earnings
        if(skill_affects && skill_affects !== "PAYMENT")
        {
            console.error(`LocationActivity cannot currently have skill affect the "${skill_affects}"!`);
        } else {
            this.skill_affects = skill_affects; 
        }
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
        enemy_stat_variation: 0.1,
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
        enemies_list: ["Starving wolf rat", "Wolf rat"],
        enemy_group_size: [5,8],
        enemy_stat_variation: 0.2,
        is_unlocked: true, 
        name: "Cave depths", 
        leave_text: "Climb out",
        parent_location: locations["Nearby cave"],
        repeatable_reward: {
            textlines: [{dialogue: "village elder", lines: ["cleared cave"]}],
            xp: 20,
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
    locations["Village"].activities = {
        "plowing the fields": new LocationActivity({
            activity: "plowing the fields",
            starting_text: "Work on the fields",
            payment: {min: 1, max: 3},
            is_unlocked: false,
            working_period: 60*2,
            availability_time: {start: 6, end: 20},
            skill_xp_per_tick: 1, 
            skill_affects: "PAYMENT",
        }),
        "running": new LocationActivity({
            activity: "running",
            infinite: true,
            starting_text: "Go for a run around the village",
            skill_xp_per_tick: 1,
            is_unlocked: false,
        }),
        "weightlifting": new LocationActivity({
            activity: "weightlifting",
            infinite: true,
            starting_text: "Try to carry some bags of grain",
            skill_xp_per_tick: 1,
            is_unlocked: false,
        })
    };
    locations["Forest road"].activities = {
        "running": new LocationActivity({
            activity: "running",
            infinite: true,
            starting_text: "Go for a run through the forest",
            skill_xp_per_tick: 3,
        }),
    }
})();


export {locations};

/*
TODO:
    some "quick travel" location that would connect all important ones? (e.g. some towns?)
*/