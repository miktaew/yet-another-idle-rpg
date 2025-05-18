import { effect_templates } from "./active_effects.js";
import { activities } from "./activities.js";
import { character } from "./character.js";
import { dialogues } from "./dialogues.js";
import { enemy_templates } from "./enemies.js";
import { item_templates } from "./items.js";
import { locations } from "./locations.js";
import { skills, skill_categories } from "./skills.js";
import { traders } from "./traders.js";
//import { quest_templates } from "./quests.js"; todo

function Verify_Game_Objects() {
    let results = [0,0];
    let overall_start_time = performance.now();
    let start_time = performance.now();
    let item_results = [0,0];
    console.log("Began verifying game objects.");
    console.log("Began verifying items.");
    for(const [key,item] of Object.entries(item_templates)){
        let has_issue = false;
        if(key !== item.id) {
            console.error(`Id mismatch: "${key}" - "${item.id}"`);
            has_issue = true;
        }
        if(item.tags.usable) {
            for(let i = 0; i < item.effects.length; i++) {
                if(!effect_templates[item.effects[i].effect]) {
                    console.error(`Effect "${item.effects[i].effect}" of item "${key}" is not defined in effect templates`);
                    has_issue = true;
                }
            }
        }
        /*
        UNNEEDED, check is already done in item creation
        if(item.components) {
            Object.values(item.components).forEach(component => {
                if(!item_templates[component]) {
                    console.error(`Component "${component}" of item "${key}" is not defined in item templates`);
                    has_issue = true;
                }
            })
        }*/

        if(item.stats) {
            Object.keys(item.stats).forEach(stat_key => {
                if(character.base_stats[stat_key] === undefined) {
                    console.error(`Item "${key}" has a non-existent stat "${stat_key}"`);
                    has_issue = true;
                } else {
                    Object.keys(item.stats[stat_key]).forEach(stat_type_key => {
                        if(stat_type_key !== "multiplier" && stat_type_key !== "flat") {
                            console.error(`Item "${key}" has a non-existent stat type "${stat_type_key}" (should be 'multiplier' or 'flat')`);
                            has_issue = true;
                        }
                    });
                }
            })
        }

        item_results[0]++;
        item_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    let end_time = performance.now();
    if(item_results[1] > 0) {
        console.log(`Finished verifying items in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nFound issue in ${item_results[1]} out of ${item_results[0]}`);
    } else {
        console.log(`Finished verifying items in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nNo issues were found.`);
    }

    start_time = performance.now();
    let skill_results = [0,0];
    console.log("Began verifying skills.");
    for(const [key,skill] of Object.entries(skills)){
        let has_issue = false;
        if(key !== skill.skill_id) {
            console.error(`Id mismatch: "${key}" - "${skill.skill_id}"`);
            has_issue = true;
        }

        if(skill.milestones) {
            Object.values(skill.milestones).forEach(milestone => {
                Object.keys(milestone).forEach(milestone_reward_type_key => {
                    if(milestone_reward_type_key !== "unlocks" && milestone_reward_type_key !== "stats" && milestone_reward_type_key !== "xp_multipliers") {
                        console.error(`Skill "${key}" has a milestone reward to a non-existent category of "${milestone_reward_type_key}"`);
                        has_issue = true;
                    } else {
                        if(milestone_reward_type_key === "unlocks"){
                            Object.keys(milestone[milestone_reward_type_key]).forEach(unlock_key => {
                                if(unlock_key !== "skills" && unlock_key !== "recipes") {
                                    console.error(`Skill "${key}" has a milestone reward in form of unlocking "${unlock_key}" which is not supported`);
                                    has_issue = true;
                                }
                            });
                        } else if(milestone_reward_type_key === "stats"){
                            Object.keys(milestone[milestone_reward_type_key]).forEach(stat_key => {
                                if(character.base_stats[stat_key] === undefined) {
                                    console.error(`Skill "${key}" has a milestone reward for a non-existent stat "${stat_key}"`);
                                    has_issue = true;
                                }
                                Object.keys(milestone[milestone_reward_type_key][stat_key]).forEach(stat_type=>{
                                    if(stat_type !== "flat" && stat_type !== "multiplier") {
                                        console.error(`Skill "${key}" has a milestone reward to stats of wrong type "${stat_type}". Should be "flat" or "multiplier"`);
                                        has_issue = true;
                                    }
                                });
                            });
                        } else { //xp_multipliers
                            Object.keys(milestone[milestone_reward_type_key]).forEach(skill_key => {
                                if(skill_key !== "all" && skill_key !== "all_skill" && skill_key !== "hero" && !skills[skill_key]) {
                                    if(skill_key.includes("category_")) {
                                        if(!skill_categories[skill_key.replace("category_","")]) {
                                            has_issue = true;
                                            console.error(`Skill "${key}" has a milestone reward for a non-existent skill "${skill_key}"`);
                                        }
                                    } else {
                                        has_issue = true;
                                        console.error(`Skill "${key}" has a milestone reward for a non-existent skill "${skill_key}"`);
                                    }
                                }
                            });
                        }
                    }
                });
                /*
                if(character.base_stats[stat_key] === undefined) {
                    console.error(`Item "${key}" has a non-existent stat "${stat_key}"`);
                    has_issue = true;
                } else {
                    Object.keys(skill.stats[stat_key]).forEach(stat_type_key => {
                        if(stat_type_key !== "multiplier" && stat_type_key !== "flat") {
                            console.error(`Item "${key}" has a non-existent stat type "${stat_type_key}" (should be 'multiplier' or 'flat')`);
                            has_issue = true;
                        }
                    });
                }*/
            });
        }

        skill_results[0]++;
        skill_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(skill_results[1] > 0) {
        console.log(`Finished verifying skills in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nFound issue in ${skill_results[1]} out of ${skill_results[0]}`);
    } else {
        console.log(`Finished verifying skills in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nNo issues were found.`);
    }


    start_time = performance.now();
    let location_results = [0,0];
    console.log("Began verifying locations.");
    for(const [key,location] of Object.entries(locations)){
        let has_issue = false;
        if(key !== location.id) {
            console.error(`Id mismatch: "${key}" - "${location.id}"`);
            has_issue = true;
        }
        if(location.tags["safe_zone"]) {
            for(let i = 0; i < location.dialogues.length; i++) {
                if(!dialogues[location.dialogues[i]]) {
                    console.error(`Location "${key}" refers to a non-existent dialogue "${dialogues[location.dialogues[i]]}"`);
                    has_issue = true;
                }
            }
            for(let i = 0; i < location.traders.length; i++) {
                if(!traders[location.traders[i]]) {
                    console.error(`Location "${key}" refers to a non-existent trader "${location.traders[i]}"`);
                    has_issue = true;
                }
            }
            for(let i = 0; i < location.connected_locations.length; i++) {
                if(!location.connected_locations[i].location) {
                    console.error(`Location "${key}" is connected to a non-existent location.`);
                    has_issue = true;
                }
            }
            Object.keys(location.activities).forEach(activity_key => {
                if(!activities[location.activities[activity_key].activity_name]) {
                    console.error(`Location "${key}" refers to a non-existent activity "${location.activities[activity_key].activity_name}"`);
                    has_issue = true;
                }
                for(let i = 0; i < location.activities[activity_key].gained_resources?.length; i++) {
                    if(!item_templates[location.activities[activity_key].gained_resources.resources[i].name]) {
                        console.error(`Activity "${activity_key}" in location "${key}" refers to a non-existent item "${location.activities[activity_key].gained_resources.resources[i].name}"`);
                        has_issue = true;
                    }
                }   
            });
        } else if(location.tags["Combat zone"]) {
            //todo: check enemies
        }

        location_results[0]++;
        location_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(location_results[1] > 0) {
        console.log(`Finished verifying locations in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nFound issue in ${location_results[1]} out of ${location_results[0]}`);
    } else {
        console.log(`Finished verifying locations in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nNo issues were found.`);
    }

    start_time = performance.now();
    let enemy_results = [0,0];
    console.log("Began verifying enemies.");
    for(const [key,enemy] of Object.entries(enemy_templates)){
        let has_issue = false;
        if(key !== enemy.id) {
            console.error(`Id mismatch: "${key}" - "${enemy.id}"`);
            has_issue = true;
        }

        for(let i = 0; i < enemy.loot_list.length; i++) {
            if(!item_templates[enemy.loot_list[i].item_name]) {
                console.error(`Enemy "${key}" refers to a non-existent item "${enemy.loot_list[i].item_name}"`);
                has_issue = true;
            }
        }

        enemy_results[0]++;
        enemy_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(location_results[1] > 0) {
        console.log(`Finished verifying enemies in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nFound issue in ${enemy_results[1]} out of ${enemy_results[0]}`);
    } else {
        console.log(`Finished verifying enemies in: ${Math.round(1000000*(end_time-start_time))/1000000}s\nNo issues were found.`);
    }


    let overall_end_time = performance.now();
    if(results[1] > 0) {
        console.log(`Finished verifying game objects in: ${Math.round(1000000*(overall_end_time-overall_start_time))/1000000}s\nFound issue in ${results[1]} out of ${results[0]}`);
    } else {
        console.log(`Finished verifying game objects in: ${Math.round(1000000*(overall_end_time-overall_start_time))/1000000}s\nNo issues were found.`);
    }
}

export {
    Verify_Game_Objects
}