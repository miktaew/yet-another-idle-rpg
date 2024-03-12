"use strict";

import { enemy_templates, Enemy } from "./enemies.js";
import { dialogues as dialoguesList} from "./dialogues.js";
import { skills } from "./skills.js";
const locations = {};
const location_types = {};
//contains all the created locations

class Location {
    constructor({
                name, 
                description, 
                connected_locations, 
                is_unlocked = true, 
                dialogues = [], 
                traders = [],
                types = [], //{type, xp per tick}
                sleeping = null, //{text to start, xp per tick},
                light_level = "normal",
            }) {
        /* always safe
    
        */
        this.name = name; //needs to be the same as key in locations
        this.description = description;
        this.connected_locations = connected_locations; //a list
        this.is_unlocked = is_unlocked;
        this.dialogues = dialogues;
        this.traders = traders;
        this.activities = {};
        this.types = types;
        this.sleeping = sleeping;
        for (let i = 0; i < this.dialogues.length; i++) {
            if (!dialoguesList[this.dialogues[i]]) {
                throw new Error(`No such dialogue as "${this.dialogues[i]}"!`);
            }
        }
        this.light_level = light_level; //not really used for this type
    }
}

class Combat_zone {
    constructor({name, 
                 description, 
                 is_unlocked = true, 
                 types = [], //{type, xp_gain}
                 enemy_groups_list = [],
                 enemies_list = [], 
                 enemy_group_size = [1,1],
                 enemy_count = 30,
                 enemy_stat_variation = 0,
                 parent_location, 
                 leave_text,
                 first_reward = {},
                 repeatable_reward = {}, 
                }) {

        this.name = name;
        this.description = description;
        this.is_unlocked = is_unlocked;
        this.types = types; //special properties of the location, e.g. "narrow" or "dark"
        this.enemy_groups_list = enemy_groups_list; //predefined enemy teams, names only
        this.enemies_list = enemies_list; //possible enemies (to be used if there's no enemy_groups_list), names only
        this.enemy_group_size = enemy_group_size; // [min, max], used only if enemy_groups_list is not provided
        if(!this.enemy_groups_list){
            if(this.enemy_group_size[0] < 1) {
                this.enemy_group_size[0] = 1;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[0] > 8) {
                this.enemy_group_size[0] = 8;
                console.error(`Minimum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[0]} and was corrected to highest value possible of 8`);
            }
            if(this.enemy_group_size[1] < 1) {
                this.enemy_group_size[1] = 1;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to lowest value possible of 1`);
            }
            if(this.enemy_group_size[1] > 8) {
                this.enemy_group_size[1] = 8;
                console.error(`Maximum enemy group size in zone "${this.name}" is set to unallowed value of ${this.enemy_group_size[1]} and was corrected to highest value possible of 8`);
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

        //skills and their xp gain on every tick, based on location types;
        this.gained_skills = this.types
            ?.map(type => {return {skill: skills[location_types[type.type].stages[type.stage || 1].related_skill], xp: type.xp_gain}})
            .filter(skill => skill.skill);
       
        const temp_types = this.types.map(type => type.type);
        if(temp_types.includes("bright")) {
            this.light_level = "bright";
        }
        else if(temp_types.includes("dark")) {
            this.light_level = "dark";
        } else {
            this.light_level = "normal";
        }
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

    //calculates total penalty with and without hero skills
    //launches on every combat action
    get_total_effect() {
        const effects = {multipliers: {}};
        const hero_effects = {multipliers: {}};
        
        //iterate over types of location
        for(let i = 0; i < this.types.length; i++) {
            const type = location_types[this.types[i].type].stages[this.types[i].stage];

            if(!type.related_skill || !type.effects) { 
                continue; 
            }

            
            const skill = skills[type.related_skill];

            //iterate over effects each type has 
            //(ok there's really just only 3 that make sense: attack points, evasion points, strength, though maybe also attack speed? mainly the first 2 anyway)
            //only AP and EP supported for now
            Object.keys(type.effects.multipliers).forEach((effect) => { 

                effects.multipliers[effect] = (effects.multipliers[effect] || 1) * type.effects.multipliers[effect];
                
                hero_effects.multipliers[effect] = (hero_effects.multipliers[effect] || 1) 
                        * (type.effects.multipliers[effect] + (1 - type.effects.multipliers[effect])*(skill.current_level/skill.max_level));
            })
        }

        

        return {base_penalty: effects, hero_penalty: hero_effects};
    }
}

class LocationActivity{
    constructor({activity, 
                 starting_text, 
                 get_payment = ()=>{return 1},
                 is_unlocked = true, 
                 working_period = 60,
                 infinite = false,
                 availability_time,
                 skill_xp_per_tick = 1,
                 }) 
    {
        this.activity = activity; //name of activity from activities.js
        this.starting_text = starting_text; //text displayed on button to start action

        this.get_payment = get_payment;
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

        }
}

class LocationType{
    constructor({name, related_skill, stages = {}}) {
        this.name = name;

        if(related_skill) {
            if(!skills[related_skill]) {
                throw new Error(`No such skill as "${related_skill}"`);
            }
            else { 
                this.related_skill = related_skill; //one per each; skill xp defined in location/combat_zone
            }
        }
        this.stages = stages; //up to 3
        /* 
        >number<: {
            description,
            related_skill,
            effects
        }

        */
    }
}

//create location types
(function(){
    
    location_types["bright"] = new LocationType({
        name: "bright",
        stages: {
            1: {
                description: "A place that's always lit, no matter the time of the day",
            },
            2: {
                description: "An extremely bright place, excessive light makes it hard to keep eyes open",
                related_skill: "Dazzle resistance",
                effects: {
                    multipliers: {
                        hit_chance: 0.5,
                        evasion: 0.5,
                    }
                }
            },
            3: {
                description: "A place with so much light that an average person would go blind in an instant",
                related_skill: "Dazzle resistance",
                effects: {
                    multipliers: {
                        hit_chance: 0.1,
                        evasion: 0.1,
                    }
                }
            }
        }
    });
    location_types["dark"] = new LocationType({
        name: "dark",
        stages: {
            1: {
                description: "A place where it's always as dark as during the night",
                related_skill: "Night vision",
                //no effects here, since in this case they are provided via the overall "night" penalty
            },
            2: {
                description: "An extremely dark place, darker than any night",
                //TODO: use some other skill for seeing in places with no light whatsoever
                related_skill: "Night vision",
                effects: {
                    multipliers: {
                        hit_chance: 0.5,
                        evasion: 0.5,
                    }
                }
            },
            3: {
                description: "Pure darkness with not even a tiniest flicker of light",
                //TODO: use some other skill for seeing in places with no light whatsoever
                related_skill: "Presence sensing",
                effects: {
                    multipliers: {
                        hit_chance: 0.1,
                        evasion: 0.1,
                    }
                }
            }
        }
    });
    location_types["narrow"] = new LocationType({
        name: "narrow",
        stages: {
            1: {
                description: "A very narrow and tight area where there's not much place for maneuvering",
                related_skill: "Tight maneuvers",
                effects: {
                    multipliers: {
                                evasion: 0.333,
                                }
                        }
                }
            }
    });
    location_types["open"] = new LocationType({
        name: "open",
        stages: {
            1: {
                description: "A completely open area where attack can come from any direction",
                related_skill: "Spatial awareness",
                effects: {
                    multipliers: {
                        evasion: 0.75,
                    }
                }
            }
        }
    });
    location_types["hot"] = new LocationType({
        name: "hot",
        stages: {
            1: {
                description: "High temperature makes it hard to breath",
                related_skill: "Heat resistance",
                effects: {
                    multipliers: {
                        hit_chance: 0.5,
                        evasion: 0.5,
                        stamina: 0.8,
                    }
                }
            },
            2: {
                description: "It's so hot that just being here is painful",
                related_skill: "Heat resistance",
                effects: {
                    multipliers: {
                        hit_chance: 0.3,
                        evasion: 0.3,
                        stamina: 0.5,
                    }
                }
            },
            3: {
                description: "Temperature so high that wood ignites by itself",
                related_skill: "Heat resistance",
                //TODO: environmental damage if resistance is too low
                effects: {
                    multipliers: {
                        hit_chance: 0.1,
                        evasion: 0.1,
                        stamina: 0.3,
                    }
                }
            }
        }
    });
    location_types["cold"] = new LocationType({
        name: "cold",
        stages: {
            1: {
                description: "Cold makes your energy seep out...",
                related_skill: "Cold resistance",
                effects: {
                    multipliers: {
                        stamina: 0.5,
                    }
                }
            },
            2: {
                description: "So cold...",
                related_skill: "Cold resistance",
                effects: {
                    multipliers: {
                        hit_chance: 0.7,
                        evasion: 0.7,
                        stamina: 0.2,
                    }
                }
            },
            3: {
                description: "This place is so cold, lesser beings would freeze in less than a minute...",
                related_skill: "Cold resistance",
                //TODO: environmental damage if resistance is too low (to both hp and stamina?)
                effects: {
                    multipliers: {
                        hit_chance: 0.5,
                        evasion: 0.5,
                        stamina: 0.1,
                    }
                }
            }
        }
    });
})();

//create locations and zones
(function(){ 
    locations["Village"] = new Location({ 
        connected_locations: [], 
        description: "Medium-sized village surrounded by many fields, some of them infested by rats. Other than that, there's nothing interesting around.", 
        dialogues: ["village elder", "village guard"],
        traders: ["village trader"],
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
        description: "Field infested with wolf rats. You can see the grain stalks move as these creatures scurry around.", 
        enemy_count: 15, 
        enemies_list: ["Starving wolf rat", "Wolf rat"],
        types: [{type: "open", stage: 1, xp_gain: 1}],
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
        description: "A big cave near the village, once used as a storeroom. Groups of fluorescent mushrooms cover the walls, providing a dim light. You can hear sounds of rats from.", 
        name: "Nearby cave",
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Nearby cave"]});
    //remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable

    locations["Cave room"] = new Combat_zone({
        description: "It's full of rats. At least the glowing mushrooms provide some light.", 
        enemy_count: 25, 
        types: [{type: "narrow", stage: 1,  xp_gain: 3}, {type: "bright", stage:1}],
        enemies_list: ["Wolf rat"],
        enemy_group_size: [2,3],
        enemy_stat_variation: 0.2,
        is_unlocked: true, 
        name: "Cave room", 
        leave_text: "Go back to entrance",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 20,
        },
        repeatable_reward: {
            locations: ["Cave depths"],
            xp: 10,
        }
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Cave room"]});

    locations["Cave depths"] = new Combat_zone({
        description: "It's dark. And full of rats.", 
        enemy_count: 50, 
        types: [{type: "narrow", stage: 1,  xp_gain: 3}, {type: "dark", stage: 1, xp_gain: 3}],
        enemies_list: ["Wolf rat"],
        enemy_group_size: [5,8],
        enemy_stat_variation: 0.2,
        is_unlocked: false, 
        name: "Cave depths", 
        leave_text: "Climb out",
        parent_location: locations["Nearby cave"],
        first_reward: {
            xp: 30,
        },
        repeatable_reward: {
            textlines: [{dialogue: "village elder", lines: ["cleared cave"]}],
            xp: 15,
        }
    });
    locations["Nearby cave"].connected_locations.push({location: locations["Cave depths"]});

    locations["Forest road"] = new Location({ 
        connected_locations: [{location: locations["Village"]}],
        description: "Shabby road leading through a dark forest, the only way to leave the village",
        name: "Forest road",
        is_unlocked: false,
    });
    locations["Village"].connected_locations.push({location: locations["Forest road"], custom_text: "Leave the village"});

    locations["Forest"] = new Combat_zone({
        description: "Forest surrounding the village, a dangerous place", 
        enemies_list: ["Starving wolf", "Young wolf"],
        enemy_count: 30, 
        name: "Forest", 
        parent_location: locations["Forest road"],
        first_reward: {
            xp: 40,
        },
        repeatable_reward: {
            xp: 20,
        }
    });
    locations["Forest road"].connected_locations.push({location: locations["Forest"], custom_text: "Leave the safe path"});

    locations["Deep forest"] = new Combat_zone({
        description: "Deeper part of the forest, a dangerous place", 
        enemies_list: ["Wolf", "Starving wolf", "Young wolf"],
        enemy_count: 50, 
        enemy_group_size: [2,3],
        is_unlocked: false,
        name: "Deep forest", 
        parent_location: locations["Forest road"],
        first_reward: {
            xp: 50,
        },
        repeatable_reward: {
            xp: 25,
        }
    });
    locations["Forest road"].connected_locations.push({location: locations["Deep forest"], custom_text: "Venture deeper into the woods"});
    locations["Forest"].repeatable_reward.locations = [locations["Deep forest"]];

    locations["Town outskirts"] = new Location({ 
        connected_locations: [{location: locations["Forest road"]}],
        description: "You can see a tall stone wall, surrounded by a green open field.",
        name: "Town outskirts",
        is_unlocked: true,
    });
    locations["Forest road"].connected_locations.push({location: locations["Town outskirts"], custom_text: "Leave the forest"});
})();

//add activities
(function(){
    locations["Village"].activities = {
        "plowing the fields": new LocationActivity({
            activity: "plowing the fields",
            starting_text: "Work on the fields",
            get_payment: () => {
                return 10 + Math.round(15 * skills["Farming"].current_level/skills["Farming"].max_level);
            },
            is_unlocked: false,
            working_period: 60*2,
            availability_time: {start: 6, end: 20},
            skill_xp_per_tick: 1, 
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
        }),
        "patrolling": new LocationActivity({
            activity: "patrolling",
            starting_text: "Go on a patrol around the village.",
            get_payment: () => {return 30},
            is_unlocked: false,
            infinite: true,
            working_period: 60*2,
            skill_xp_per_tick: 1
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


export {locations, location_types};

/*
TODO:
    some "quick travel" location that would connect all important ones? (e.g. some towns?)
*/