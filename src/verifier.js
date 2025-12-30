import { effect_templates } from "./active_effects.js";
import { activities } from "./activities.js";
import { character } from "./character.js";
import { dialogues } from "./dialogues.js";
import { enemy_templates } from "./enemies.js";
import { item_templates } from "./items.js";
import { locations } from "./locations.js";
import { skills, skill_categories } from "./skills.js";
import { traders } from "./traders.js";
import { quests } from "./quests.js";
import { market_region_mapping } from "./market_saturation.js";
import { translations } from "./translation.js";

const trc = 1000000; //time rounding precision

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
        console.log(`Finished verifying items in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${item_results[1]} out of ${item_results[0]}`);
    } else {
        console.log(`Finished verifying ${item_results[0]} items in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
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
                                if(unlock_key !== "skills" && unlock_key !== "recipes" && unlock_key !== "quests") {
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
        console.log(`Finished verifying skills in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${skill_results[1]} out of ${skill_results[0]}`);
    } else {
        console.log(`Finished verifying ${skill_results[0]} skills in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
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
            if(location.traders?.length > 0) {
                if(!location.market_region) {
                    console.error(`Location "${key}" has at least one trader but no trade region assigned!`);
                    has_issue = true;
                } else {
                    if(!market_region_mapping[location.market_region]) {
                        console.error(`Location "${key}" has market region "${location.market_region}" assigned, but no such region is present in region mapping!`);
                        has_issue = true;
                    }
                }
                for(let i = 0; i < location.traders.length; i++) {
                    if(!traders[location.traders[i]]) {
                        console.error(`Location "${key}" refers to a non-existent trader "${location.traders[i]}"`);
                        has_issue = true;
                    }
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

            for(let i = 0; i < location.enemies_list?.length; i++) {
                if(!enemy_templates[location.enemies_list[i]]) {
                    console.error(`Location "${key}" refers to a non-existent enemy "${location.enemies_list[i]}"`);
                    has_issue = true;
                }
            }

            for(let i = 0; i < location.enemy_groups_list?.length; i++) {
                for(let j = 0; j < location.enemy_groups_list[i].enemies.length; j++) {
                    if(!enemy_templates[location.enemy_groups_list[i].enemies[j]]) {
                        console.error(`Location "${key}" refers to a non-existent enemy "${location.enemy_groups_list[i].enemies[j]}"`);
                        has_issue = true;
                    }
                }
            }

            if(location.first_reward) {
                if(!verify_rewards(location.first_reward, "location", key)){
                    //has_issue = true;
                }
            }
            if(location.repeatable_reward) {
                if(!verify_rewards(location.repeatable_reward, "location", key)){
                    has_issue = true;
                }
            }
            if(location.rewards_with_clear_requirement) {
                for(let i = 0; i < location.rewards_with_clear_requirement.length; i++) {
                    if(!verify_rewards(location.rewards_with_clear_requirement[i], "location", key)){
                        has_issue = true;
                    }
                }
            }
        }

        location_results[0]++;
        location_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(location_results[1] > 0) {
        console.log(`Finished verifying locations in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${location_results[1]} out of ${location_results[0]}`);
    } else {
        console.log(`Finished verifying ${location_results[0]} locations in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
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
    if(enemy_results[1] > 0) {
        console.log(`Finished verifying enemies in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${enemy_results[1]} out of ${enemy_results[0]}`);
    } else {
        console.log(`Finished verifying ${enemy_results[0]} in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
    }

    start_time = performance.now();
    let market_region_results = [0,0];
    console.log("Began verifying market regions.");
    for(const [key, ] of Object.entries(market_region_mapping)) {
        let has_issue = false;

        let is_present = false;
        Object.values(locations).forEach(location => {
            if(location.market_region === key) {
                is_present = true;
            }
        });

        if(!is_present) {
            has_issue = true;
            console.error(`Market region "${key}" is not used for any location despite being defined in region connections!`);
        }
        market_region_results[0]++;
        market_region_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(market_region_results[1] > 0) {
        console.log(`Finished verifying market regions in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${market_region_results[1]} out of ${market_region_results[0]}`);
    } else {
        console.log(`Finished verifying ${market_region_results[0]} market regions in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
    }

    start_time = performance.now();
    let dialogue_results = [0,0];
    console.log("Began verifying dialogues.");
    for(const [key, value] of Object.entries(dialogues)) {
        let has_issue = false;

        for(const [textline_key, textline] of Object.entries(value.textlines)) {
            if(!translations["english"][textline.name]) {
                has_issue = true;
                console.error(`Textline "${textline_key}" in "${key}" has no translation provided for starting text`);
            }
            if(!translations["english"][textline.getText()]) {
                //might miss something if there are multiple options provided
                has_issue = true;
                console.error(`Textline "${textline_key}" in "${key}" has no translation provided for answer text`);
            }
            if(textline.rewards) {
                if(!verify_rewards(textline.rewards, "textline", key, textline_key)) {
                    has_issue = true;
                }
            }
        }

        for(const [action_key, action] of Object.entries(value.actions)) {
            if(!translations["english"][action.starting_text]) {
                has_issue = true;
                console.error(`Action "${action_key}" in "${key}" has no translation provided for starting text`);
            }
            if(!translations["english"][action.success_text]) {
                //might miss something if there are multiple options provided
                has_issue = true;
                console.error(`Textline "${action_key}" in "${key}" has no translation provided for success text`);
            }
        }

        dialogue_results[0]++;
        dialogue_results[1]+=has_issue;
        results[0]++;
        results[1]+=has_issue;
    }
    end_time = performance.now();
    if(dialogue_results[1] > 0) {
        console.log(`Finished verifying dialogues in: ${Math.round(trc*(end_time-start_time))/trc}s\nFound issue in ${dialogue_results[1]} out of ${dialogue_results[0]}`);
    } else {
        console.log(`Finished verifying ${dialogue_results[0]} dialogues in: ${Math.round(trc*(end_time-start_time))/trc}s\nNo issues were found.`);
    }

    let overall_end_time = performance.now();
    let result_message;
    if(results[1] > 0) {
        result_message = `Finished verifying game objects in: ${Math.round(trc*(overall_end_time-overall_start_time))/trc}s\nFound issue in ${results[1]} out of ${results[0]}`;
    } else {
        result_message = `Finished verifying ${results[0]} game objects in: ${Math.round(trc*(overall_end_time-overall_start_time))/trc}s\nNo issues were found.`;
    }

    console.log(result_message);
    return results[1] == 0;
}

function verify_rewards(rewards, source_type, source_key, subsource_key) {
    //todo
    //doesn't yet cover: actions, activities, global activities, locking, quest unlocks, traders, money, reputation, items, flags
    let is_correct = true;

    Object.keys(rewards).forEach(reward_type => {
        if(reward_type === "xp" && typeof rewards[reward_type] !== 'number') {
            console.error(create_reward_error_message(source_type, source_key, subsource_key) + "wrong kind of reward of 'xp' type, should be Number but found '"+typeof rewards[reward_type]+"'");
            is_correct = false;
        } else if(reward_type === "skill_xp") {
            Object.keys(rewards[reward_type]).forEach(skill_id =>{
                if(!skills[skill_id]) {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + "wrong skill id for 'skill_xp', no such skill as '"+skill_id+"'");
                    is_correct = false;
                }
                if(typeof rewards[reward_type][skill_id] !== 'number') {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + "wrong kind of reward of 'skill xp' type for '" +skill_id+"', should be Number but found '"+typeof rewards[reward_type][skill_id]+"'");
                    is_correct = false;
                }
            });
        } else if(reward_type === "locations") {
            for(let i = 0; i < rewards[reward_type].length; i++) {
                if(!locations[rewards[reward_type][i].location]) {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + `non-existent location '${rewards[reward_type][i].location}' listed for unlocks`);
                    is_correct = false;
                }
            }
        } else if(reward_type === "textlines") {
            for(let i = 0; i < rewards[reward_type].length; i++) {
                if(!dialogues[rewards[reward_type][i].dialogue]) {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + `non-existent dialogue '${rewards[reward_type][i].dialogue}' listed for textline unlocks`);
                    is_correct = false;
                }
                for(let j = 0; j < rewards[reward_type][i].lines.length; j++) {
                    if(!dialogues[rewards[reward_type][i].dialogue].textlines[rewards[reward_type][i].lines[j]]) {
                        console.error(create_reward_error_message(source_type, source_key, subsource_key) + `non-existent textline '${rewards[reward_type][i].lines[j]}' listed for unlocks in dialogue '${rewards[reward_type][i].dialogue}'`);
                        is_correct = false;
                    }
                }
            }
        } else if(reward_type === "move_to") {
            if(!locations[rewards[reward_type].location]) {
                console.error(create_reward_error_message(source_type, source_key, subsource_key) + `non-existent location '${rewards[reward_type].location}' listed for moving to`);
                is_correct = false;
            }
        } else if(reward_type === "quest_progress") {
            for(let i = 0; i < rewards[reward_type].length; i++) {
                if(!quests[rewards[reward_type][i].quest_id]) {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + `non-existent quest '${rewards[reward_type][i].quest_id}' listed for progressing`);
                    is_correct = false;
                }
                if(quests[rewards[reward_type][i].quest_id].quest_tasks.length < rewards[reward_type][i].task_index) {
                    console.error(create_reward_error_message(source_type, source_key, subsource_key) + `too high task index for progressing quest '${rewards[reward_type][i].quest_id}'`);
                    is_correct = false;
                }
            }
        }
    });

    return is_correct;
}

function create_reward_error_message(source_type, source_key, subsource_key) {
    if(source_type === "location") {
        return `Location "${source_key}" has a `;
    } else if(source_type === "textline") {
        return `Textline "${subsource_key}" in dialogue "${source_key}" has a `;
    }
}

export {
    Verify_Game_Objects
}