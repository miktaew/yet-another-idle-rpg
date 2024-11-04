"use strict";

import { current_game_time } from "./game_time.js";
import { item_templates, getItem, book_stats, setLootSoldCount, loot_sold_count, recoverItemPrices, rarity_multipliers, getArmorSlot} from "./items.js";
import { locations } from "./locations.js";
import { skills, weapon_type_to_skill, which_skills_affect_skill } from "./skills.js";
import { dialogues } from "./dialogues.js";
import { enemy_killcount } from "./enemies.js";
import { traders } from "./traders.js";
import { is_in_trade, start_trade, cancel_trade, accept_trade, exit_trade, add_to_trader_inventory,
         add_to_buying_list, remove_from_buying_list, add_to_selling_list, remove_from_selling_list} from "./trade.js";
import { character, 
         add_to_character_inventory, remove_from_character_inventory,
         equip_item_from_inventory, unequip_item, equip_item,
         update_character_stats,
         get_skill_xp_gain } from "./character.js";
import { activities } from "./activities.js";
import { end_activity_animation, 
         update_displayed_character_inventory, update_displayed_trader_inventory, sort_displayed_inventory, sort_displayed_skills,
         update_displayed_money, log_message,
         update_displayed_enemies, update_displayed_health_of_enemies,
         update_displayed_combat_location, update_displayed_normal_location,
         log_loot, update_displayed_equipment,
         update_displayed_health, update_displayed_stamina,
         format_money, update_displayed_stats,
         update_displayed_effects, update_displayed_effect_durations,
         update_displayed_time, update_displayed_character_xp, 
         update_displayed_dialogue, update_displayed_textline_answer,
         start_activity_display, start_sleeping_display,
         create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description,
         update_displayed_ongoing_activity, 
         update_enemy_attack_bar, update_character_attack_bar,
         update_displayed_location_choices,
         create_new_bestiary_entry,
         update_bestiary_entry,
         start_reading_display,
         update_displayed_xp_bonuses, 
         update_displayed_skill_xp_gain, update_all_displayed_skills_xp_gain, update_displayed_stance_list, update_displayed_stamina_efficiency, update_displayed_stance, update_displayed_faved_stances, update_stance_tooltip,
         update_gathering_tooltip,
         open_crafting_window,
         update_displayed_location_types,
         close_crafting_window,
         switch_crafting_recipes_page,
         switch_crafting_recipes_subpage,
         create_displayed_crafting_recipes,
         update_displayed_component_choice,
         update_displayed_material_choice,
         update_recipe_tooltip,
         update_displayed_crafting_recipes,
         update_item_recipe_visibility,
         update_item_recipe_tooltips,
         update_displayed_book,
         update_backup_load_button,
         update_other_save_load_button
        } from "./display.js";
import { compare_game_version, get_hit_chance } from "./misc.js";
import { stances } from "./combat_stances.js";
import { get_recipe_xp_value, recipes } from "./crafting_recipes.js";
import { game_version, get_game_version } from "./game_version.js";
import { ActiveEffect, effect_templates } from "./active_effects.js";
import { Verify_Game_Objects } from "./verifier.js";

const save_key = "save data";
const dev_save_key = "dev save data";
const backup_key = "backup save";
const dev_backup_key = "dev backup save";

const global_flags = {
    is_gathering_unlocked: false,
    is_crafting_unlocked: false,
    is_deep_forest_beaten: false,
};
const flag_unlock_texts = {
    is_gathering_unlocked: "You have gained the ability to gather new materials!",
    is_crafting_unlocked: "You have gained the ability to craft items and equipment!",
}

//in seconds
let total_playtime = 0;

let total_deaths = 0;
let total_crafting_attempts = 0;
let total_crafting_successes = 0;
let total_kills = 0;

//current enemy
let current_enemies = null;

const enemy_attack_loops = {};
let enemy_attack_cooldowns;
let enemy_timer_variance_accumulator = [];
let enemy_timer_adjustment = [];
let enemy_timers = [];
let character_attack_loop;

//current location
let current_location;

let current_activity;

//resting, true -> health regenerates
let is_resting = true;

//sleeping, true -> health regenerates, timer goes up faster
let is_sleeping = false;

let last_location_with_bed = null; //actually last location where player slept!
let last_combat_location = null;

//reading, either null or book name
let is_reading = null;

//ticks between saves, 60 = ~1 minute
let save_period = 60;
let save_counter = 0;

//ticks between saves, 60 = ~1 minute
let backup_period = 3600;
let backup_counter = 0;

//accumulates deviations
let time_variance_accumulator = 0;
//all 3 used for calculating and adjusting tick durations
let time_adjustment = 0;
let start_date;
let end_date;

let current_dialogue;
const active_effects = {};
//e.g. health regen from food

let selected_stance = "normal";
let current_stance = "normal";
const faved_stances = {};

const tickrate = 1;
//how many ticks per second
//1 is the default value; going too high might make the game unstable

//stuff from options panel
const options = {
    uniform_text_size_in_action: false,
    auto_return_to_bed: false,
    remember_message_log_filters: false,
    remember_sorting_options: false,
    combat_disable_autoswitch: false,
};

let message_log_filters = {
    unlocks: true,
    events: true,
    combat: true,
    loot: true,
    crafting: true,
    background: true,
};

//enemy crit stats
const enemy_crit_chance = 0.1;
const enemy_crit_damage = 2; //multiplier, not a flat bonus

//character name
const name_field = document.getElementById("character_name_field");
name_field.value = character.name;
name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

const time_field = document.getElementById("time_div");
time_field.innerHTML = current_game_time.toString();

(function setup(){
    Object.keys(skills).forEach(skill => {
        character.xp_bonuses.total_multiplier[skill] = 1;
    });
})();

function option_uniform_textsize(option) {
    //doesn't really force same textsize, just changes some variables so they match
    const checkbox = document.getElementById("options_textsize");
    if(checkbox.checked || option) {
        options.uniform_text_size_in_action = true;    
        document.documentElement.style.setProperty('--options_action_textsize', '20px');
    } else {
        options.uniform_text_size_in_action = false;
        document.documentElement.style.setProperty('--options_action_textsize', '16px');
    }

    if(option) {
        checkbox.checked = option;
    }
}

function option_bed_return(option) {
    const checkbox = document.getElementById("options_bed_return");
    if(checkbox.checked || option) {
        options.auto_return_to_bed = true;
    } else {
        options.auto_return_to_bed = false;
    }

    if(option) {
        checkbox.checked = option;
    }
}

function option_remember_filters(option) {
    const checkbox = document.getElementById("options_save_messagelog_settings");
    if(checkbox.checked || option) {
        options.remember_message_log_filters = true;
    } else {
        options.remember_message_log_filters = false;
    }

    if(option) {
        checkbox.checked = option;

        if(message_log_filters.unlocks){
            document.documentElement.style.setProperty('--message_unlocks_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_unlocks_display', 'none');
            document.getElementById("message_show_unlocks").classList.remove("active_selection_button");
        }

        if(message_log_filters.combat) {
            document.documentElement.style.setProperty('--message_combat_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_combat_display', 'none');
            document.getElementById("message_show_combat").classList.remove("active_selection_button");
        }

        if(message_log_filters.events) {
            document.documentElement.style.setProperty('--message_events_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_events_display', 'none');
            document.getElementById("message_show_events").classList.remove("active_selection_button");
        }

        if(message_log_filters.loot) {
            document.documentElement.style.setProperty('--message_loot_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_loot_display', 'none');
            document.getElementById("message_show_loot").classList.remove("active_selection_button");
        }

        if(message_log_filters.crafting) {
            document.documentElement.style.setProperty('--message_crafting_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_crafting_display', 'none');
            document.getElementById("message_show_crafting").classList.remove("active_selection_button");
        }

        if(message_log_filters.background) {
            document.documentElement.style.setProperty('--message_background_display', 'inline-block');
        } else {
            document.documentElement.style.setProperty('--message_background_display', 'none');
            document.getElementById("message_show_background").classList.remove("active_selection_button");
        }
    }
}

function option_combat_autoswitch(option) {
    const checkbox = document.getElementById("options_dont_autoswitch_to_combat");

    if(checkbox.checked || option) {
        options.disable_combat_autoswitch = true;
    } else {
        options.disable_combat_autoswitch = false;
    }

    if(option) {
        checkbox.checked = option;
    }
}

function change_location(location_name) {
    let location = locations[location_name];

    if(location_name !== current_location?.name && location.is_finished) {
        return;
    }

    clear_all_enemy_attack_loops();
    clear_character_attack_loop();
    clear_enemies();

    if(!location) {
        throw `No such location as "${location_name}"`;
    }

    if(typeof current_location !== "undefined" && current_location.name !== location.name ) { 
        //so it's not called when initializing the location on page load or on reloading current location (due to new unlocks)
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }

    if(location.crafting) {
        update_displayed_crafting_recipes();
    }
    
    current_location = location;

    update_character_stats();

    if("connected_locations" in current_location) { 
        // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        update_displayed_normal_location(current_location);
    } else { //so if entering combat zone
        update_displayed_combat_location(current_location);
        start_combat();

        if(!current_location.is_challenge) {
            last_combat_location = current_location.name;
        }
    }
}


/**
 * 
 * @param {String} location_name 
 * @returns {Boolean} if there's anything that can be unlocked by clearing it
 */
/*
function does_location_have_available_unlocks(location_name) {
    //include dialogue lines
    if(!locations[location_name]) {
        throw new Error(`No such location as "${location_name}"`);
    }
    let does = false;
    
    Object.keys(locations[location_name].repeatable_reward).forEach(reward_type_key => {
        if(does) {
            return;
        }
        if(reward_type_key === "textlines") {
            Object.keys(locations[location_name].repeatable_reward[reward_type_key]).forEach(textline_unlock => {
                if(does) {
                    return;
                }
                const {dialogue, lines} = locations[location_name].repeatable_reward[reward_type_key][textline_unlock];
                for(let i = 0; i < lines.length; i++) {
                    if(!dialogues[dialogue].textlines[lines[i]].is_unlocked) {
                        does = true;
                    }
                }
            });
        }

        if(reward_type_key === "locations") {
            Object.keys(locations[location_name].repeatable_reward[reward_type_key]).forEach(location_unlock => {
                if(does) {
                    return;
                }
                locations[location_name].repeatable_reward[reward_type_key][location_unlock];
                for(let i = 0; i < locations[location_name].repeatable_reward[reward_type_key][location_unlock].length; i++) {
                    const location_key = locations[location_name].repeatable_reward[reward_type_key][location_unlock][i].location;
                    if(!locations[location_key].is_unlocked) {
                        does = true;
                    }
                }
            });
        }

        if(reward_type_key === "activities") {
            //todo: additionally need to check if gathering is unlocked (if its a gathering activity) 
            Object.keys(locations[location_name].repeatable_reward[reward_type_key]).forEach(activity_unlock => {
                if(does) {
                    return;
                }

                for(let i = 0; i < locations[location_name].repeatable_reward[reward_type_key][activity_unlock].length; i++) {
                    const {location, activity} = locations[location_name].repeatable_reward[reward_type_key][activity_unlock][i];
                    if(!locations[location].activities[activity].is_unlocked) {
                        does = true;
                    }
                }
            });
        }

    });
}
*/
/**
 * 
 * @param {String} location_name 
 * @returns {Boolean} if there's something that can be unlocked by clearing it after additional conditions are met
 */
/*
function does_location_have_unavailable_unlocks(location_name) {

    if(!locations[location_name]) {
        throw new Error(`No such location as "${location_name}"`);
    }
    let does = false;
}
*/
/**
 * 
 * @param {Object} selected_activity - {id} of activity in Location's activities list??
 */
function start_activity(selected_activity) {
    current_activity = Object.assign({},current_location.activities[selected_activity]);
    current_activity.id = selected_activity;

    if(!activities[current_activity.activity_name]) {
        throw `No such activity as ${current_activity.activity_name} could be found`;
    }

    if(activities[current_activity.activity_name].type === "JOB") {
        if(!can_work(current_activity)) {
            current_activity = null;
            return;
        }

        current_activity.earnings = 0;
        current_activity.working_time = 0;

    } else if(activities[current_activity.activity_name].type === "TRAINING") {
        //
    } else if(activities[current_activity.activity_name].type === "GATHERING") { 
        //
    } else throw `"${activities[current_activity.activity_name].type}" is not a valid activity type!`;

    current_activity.gathering_time = 0;
    if(current_activity.gained_resources) {
        current_activity.gathering_time_needed = current_activity.getActivityEfficiency().gathering_time_needed;
    }

    start_activity_display(current_activity);
}

function end_activity() {
    
    log_message(`${character.name} finished ${current_activity.activity_name}`, "activity_finished");
    
    if(current_activity.earnings) {
        character.money += current_activity.earnings;
        log_message(`${character.name} earned ${format_money(current_activity.earnings)}`, "activity_money");
        update_displayed_money();
    }
    end_activity_animation(); //clears the "animation"
    current_activity = null;
    change_location(current_location.name);
}

/**
 * @description Unlocks an activity and adds a proper message to the message log. NOT called on loading a save.
 * @param {Object} activity_data {activity, location_name}
 */
 function unlock_activity(activity_data) {
    if(!activity_data.activity.is_unlocked){
        activity_data.activity.is_unlocked = true;
        
        let message = "";
        if(locations[activity_data.location].activities[activity_data.activity.activity_name].unlock_text) {
           message = locations[activity_data.location].activities[activity_data.activity.activity_name].unlock_text+":<br>";
        }
        log_message(message + `Unlocked activity "${activity_data.activity.activity_name}" in location "${activity_data.location}"`, "activity_unlocked");
    }
}

//single tick of resting
function do_resting() {
    if(character.stats.full.health < character.stats.full.max_health)
    {
        const resting_heal_ammount = Math.max(character.stats.full.max_health * 0.01,2); 
        //todo: scale it with skill, because why not?; maybe up to x2 bonus

        character.stats.full.health += (resting_heal_ammount);
        if(character.stats.full.health > character.stats.full.max_health) {
            character.stats.full.health = character.stats.full.max_health;
        } 
        update_displayed_health();
    }

    if(character.stats.full.stamina < character.stats.full.max_stamina)
    {
        const resting_stamina_ammount = Math.round(Math.max(character.stats.full.max_stamina/120, 2)); 
        //todo: scale it with skill as well

        character.stats.full.stamina += (resting_stamina_ammount);
        if(character.stats.full.stamina > character.stats.full.max_stamina) {
            character.stats.full.stamina = character.stats.full.max_stamina;
        } 
        
        update_displayed_stamina();
    }
}

function do_sleeping() {
    if(character.stats.full.health < character.stats.full.max_health)
    {
        const sleeping_heal_ammount = Math.round(Math.max(character.stats.full.max_health * 0.04, 5) * (1 + skills["Sleeping"].current_level/skills["Sleeping"].max_level));
        
        character.stats.full.health += (sleeping_heal_ammount);
        if(character.stats.full.health > character.stats.full.max_health) {
            character.stats.full.health = character.stats.full.max_health;
        } 
        update_displayed_health();
    }

    if(character.stats.full.stamina < character.stats.full.max_stamina)
    {
        const sleeping_stamina_ammount = Math.round(Math.max(character.stats.full.max_stamina/30, 5) * (1 + skills["Sleeping"].current_level/skills["Sleeping"].max_level)); 
        //todo: scale it with skill as well

        character.stats.full.stamina += (sleeping_stamina_ammount);
        if(character.stats.full.stamina > character.stats.full.max_stamina) {
            character.stats.full.stamina = character.stats.full.max_stamina;
        } 
        update_displayed_stamina();
    }
}

function start_sleeping() {
    start_sleeping_display();
    is_sleeping = true;

    last_location_with_bed = current_location.name;
}

function end_sleeping() {
    is_sleeping = false;
    change_location(current_location.name);
    end_activity_animation();
}

function start_reading(book_key) {
    const book_id = JSON.parse(book_key).id;
    if(locations[current_location]?.parent_location) {
        return; //no reading in combat areas
    }

    if(is_reading === book_id) {
        end_reading();
        return; 
        //reading the same one, cancel
    } else if(is_reading) {
        end_reading();
    }

    if(book_stats[book_id].is_finished) {
        return; //already read
    }

    if(is_sleeping) {
        end_sleeping();
    }
    if(current_activity) {
        end_activity();
    }


    is_reading = book_id;
    start_reading_display(book_id);

    update_displayed_book(is_reading);
}

function end_reading() {
    change_location(current_location.name);
    end_activity_animation();
    
    const book_id = is_reading;
    is_reading = null;

    update_displayed_book(book_id);
}

function do_reading() {
    item_templates[is_reading].addProgress();

    update_displayed_book(is_reading);

    add_xp_to_skill({skill: skills["Literacy"], xp_to_add: book_stats.literacy_xp_rate});
    if(book_stats[is_reading].is_finished) {
        log_message(`Finished the book "${is_reading}"`);
        end_reading();
        update_character_stats();
    }
}

function get_current_book() {
    return is_reading;
}

/**
 * 
 * @param {*} selected_job location job property
 * @returns if current time is within working hours
 */
function can_work(selected_job) {
    //if can start at all
    if(!selected_job.infinite) {
        if(selected_job.availability_time.end > selected_job.availability_time.start) {
            //ends on the same day
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.end*60
                ||  //too late
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                ) {  //too early
                
                return false;
            }
        } else {
            //ends on the next day (i.e. working through the night)        
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.start*60
                //too late
                ||
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.end*60
                //too early

            ) {  
                return false;
            }
        }
    }

    return true;
}

/**
 * 
 * @param {} selected_job location job property
 * @returns if there's enough time to earn anything
 */
function enough_time_for_earnings(selected_job) {

    if(!selected_job.infinite) {
        //if enough time for at least 1 working period
        if(selected_job.availability_time.end > selected_job.availability_time.start) {
            //ends on the same day
            if(current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period - selected_job.working_time%selected_job.working_period > selected_job.availability_time.end*60
                ||  //not enough time left for another work period
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                ) {  //too early to start (shouldn't be allowed to start and get here at all)
                return false;
            }
        } else {
            //ends on the next day (i.e. working through the night)        
            if(current_game_time.hour * 60 + current_game_time.minute > selected_job.availability_time.start*60
                //timer is past the starting hour, so it's the same day as job starts
                && 
                current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period  - selected_job.working_time%selected_job.working_period > selected_job.availability_time.end*60 + 24*60
                //time available on this day + time available on next day are less than time needed
                ||
                current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
                //timer is less than the starting hour, so it's the next day
                &&
                current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period  - selected_job.working_time%selected_job.working_period > selected_job.availability_time.end*60
                //time left on this day is not enough to finish
                ) {  
                return false;
            }
        }
    }

    return true;
}

/**
 * 
 * @param {String} dialogue_key 
 */
function start_dialogue(dialogue_key) {
    current_dialogue = dialogue_key;

    update_displayed_dialogue(dialogue_key);
}

function end_dialogue() {
    current_dialogue = null;
    reload_normal_location();
}
function reload_normal_location() {
    update_displayed_normal_location(current_location);
}

/**
 * 
 * @param {String} textline_key 
 */
function start_textline(textline_key){
    const dialogue = dialogues[current_dialogue];
    const textline = dialogue.textlines[textline_key];

    for(let i = 0; i < textline.unlocks.flags.length; i++) {
        const flag = global_flags[textline.unlocks.flags[i]];
        if(!flag) {
            global_flags[textline.unlocks.flags[i]] = true;
            log_message(`${flag_unlock_texts[textline.unlocks.flags[i]]}`, "activity_unlocked");
        }
    }

    for(let i = 0; i < textline.unlocks.items.length; i++) {
        log_message(`${character.name} obtained "${item_templates[textline.unlocks.items[i]].getName()}"`);
        add_to_character_inventory([{item: item_templates[textline.unlocks.items[i]]}]);
    }

    if(textline.unlocks.money && typeof textline.unlocks.money === "number") {
        character.money += textline.unlocks.money;
        log_message(`${character.name} earned ${format_money(textline.unlocks.money)}`);
        update_displayed_money();
    }

    for(let i = 0; i < textline.unlocks.dialogues.length; i++) { //unlocking dialogues
        const dialogue = dialogues[textline.unlocks.dialogues[i]];
        if(!dialogue.is_unlocked) {
            dialogue.is_unlocked = true;
            log_message(`You can now talk with ${dialogue.name}`, "activity_unlocked");
        }
    }

    for(let i = 0; i < textline.unlocks.traders.length; i++) { //unlocking traders
        const trader = traders[textline.unlocks.traders[i]];
        if(!trader.is_unlocked) {
            trader.is_unlocked = true;
            log_message(`You can now trade with ${trader.name}`, "activity_unlocked");
        }
    }

    for(let i = 0; i < textline.unlocks.textlines.length; i++) { //unlocking textlines
        const dialogue_name = textline.unlocks.textlines[i].dialogue;
        for(let j = 0; j < textline.unlocks.textlines[i].lines.length; j++) {
            dialogues[dialogue_name].textlines[textline.unlocks.textlines[i].lines[j]].is_unlocked = true;
        }
    }

    for(let i = 0; i < textline.unlocks.locations.length; i++) { //unlocking locations
        unlock_location(locations[textline.unlocks.locations[i]]);
    }

    for(let i = 0; i < textline.unlocks.stances.length; i++) { //unlocking locations
        unlock_combat_stance(textline.unlocks.stances[i]);
    }

    for(let i = 0; i < textline.locks_lines.length; i++) { //locking textlines
        dialogue.textlines[textline.locks_lines[i]].is_finished = true;
    }

    if(textline.unlocks.activities) { //unlocking activities
        for(let i = 0; i < textline.unlocks.activities.length; i++) { //unlock 
            unlock_activity({location: locations[textline.unlocks.activities[i].location].name, 
                             activity: locations[textline.unlocks.activities[i].location].activities[textline.unlocks.activities[i].activity]});
        }
    }
    if(textline.otherUnlocks) {
        textline.otherUnlocks();
    }

    start_dialogue(current_dialogue);
    update_displayed_textline_answer(textline.text);
}

function unlock_combat_stance(stance_id) {
    if(!stances[stance_id]) {
        console.warn(`Tried to unlock stance "${stance_id}", but no such stance exists!`);
        return;
    }

    stances[stance_id].is_unlocked = true;
    update_displayed_stance_list();
    log_message(`You have learned a new stance: "${stances[stance_id].name}"`, "location_unlocked") 
}

function change_stance(stance_id, is_temporary = false) {
    if(is_temporary) {
        if(!stances[stance_id]) {
            throw new Error(`No such stance as "${stance_id}"`);
        }
        if(!stances[stance_id].is_unlocked) {
            throw new Error(`Stance "${stance_id}" is not yet unlocked!`)
        }

    } else {
        selected_stance = stance_id;
        update_displayed_stance();
    }
    
    current_stance = stance_id;

    update_character_stats();
    reset_combat_loops();
}

/**
 * @description handle faving/unfaving of stances
 * @param {String} stance_id 
 */
function fav_stance(stance_id) {
    if(faved_stances[stance_id]) {
        delete faved_stances[stance_id];
    } else if(stances[stance_id].is_unlocked){
        faved_stances[stance_id] = true;
    } else {
        console.warn(`Tried to fav a stance '${stance_id}' despite it not being unlocked!`);
    }
    update_displayed_faved_stances();
}

/**
 * @description sets attack cooldowns and new enemies, either from provided list or from current location, called whenever a new enemy group starts
 * @param {List<Enemy>} enemies 
 */
function set_new_combat({enemies} = {}) {
    if(!current_location.get_next_enemies){
        clear_all_enemy_attack_loops();
        clear_character_attack_loop();
        return;
    }
    current_enemies = enemies || current_location.get_next_enemies();
    clear_all_enemy_attack_loops();

    let character_attack_cooldown = 1/(character.stats.full.attack_speed);
    enemy_attack_cooldowns = [...current_enemies.map(x => 1/x.stats.attack_speed)];

    let fastest_cooldown = [character_attack_cooldown, ...enemy_attack_cooldowns].sort((a,b) => a - b)[0];

    //scale all attacks to be not faster than 1 per second
    if(fastest_cooldown < 1) {
        const cooldown_multiplier = 1/fastest_cooldown;
        
        character_attack_cooldown *= cooldown_multiplier;
        for(let i = 0; i < current_enemies.length; i++) {
            enemy_attack_cooldowns[i] *= cooldown_multiplier;
            enemy_timer_variance_accumulator[i] = 0;
            enemy_timer_adjustment[i] = 0;
            enemy_timers[i] = [Date.now(), Date.now()];
        }
    } else {
        for(let i = 0; i < current_enemies.length; i++) {
            enemy_timer_variance_accumulator[i] = 0;
            enemy_timer_adjustment[i] = 0;
            enemy_timers[i] = [Date.now(), Date.now()];
        }
    }

    //attach loops
    for(let i = 0; i < current_enemies.length; i++) {
        do_enemy_attack_loop(i, 0, true);
    }

    set_character_attack_loop({base_cooldown: character_attack_cooldown});
    
    update_displayed_enemies();
    update_displayed_health_of_enemies();
}

/**
 * @description Recalculates attack speeds;
 * 
 * For enemies, modifies their existing cooldowns, for hero it restarts the attack bar with a new cooldown 
 */
function reset_combat_loops() {
    if(!current_enemies) { 
        return;
    }

    let character_attack_cooldown = 1/(character.stats.full.attack_speed);
    enemy_attack_cooldowns = [...current_enemies.map(x => 1/x.stats.attack_speed)];

    let fastest_cooldown = [character_attack_cooldown, ...enemy_attack_cooldowns].sort((a,b) => a - b)[0];

    //scale all attacks to be not faster than 1 per second
    if(fastest_cooldown < 1) {
        const cooldown_multiplier = 1/fastest_cooldown;
        character_attack_cooldown *= cooldown_multiplier;
        for(let i = 0; i < current_enemies.length; i++) {
            enemy_attack_cooldowns[i] *= cooldown_multiplier;
        }
    }

    set_character_attack_loop({base_cooldown: character_attack_cooldown});
}

/**
 * @description Creates an Interval responsible for performing the attack loop of enemy and updating their attack_bar progress
 * @param {*} enemy_id 
 * @param {*} cooldown 
 */
function do_enemy_attack_loop(enemy_id, count, is_new = false) {
    count = count || 0;
    update_enemy_attack_bar(enemy_id, count);

    if(is_new) {
        enemy_timer_variance_accumulator[enemy_id] = 0;
        enemy_timer_adjustment[enemy_id] = 0;
    }

    clearTimeout(enemy_attack_loops[enemy_id]);
    enemy_attack_loops[enemy_id] = setTimeout(() => {
        enemy_timers[enemy_id][0] = Date.now(); 
        enemy_timer_variance_accumulator[enemy_id] += ((enemy_timers[enemy_id][0] - enemy_timers[enemy_id][1]) - enemy_attack_cooldowns[enemy_id]*1000/(40*tickrate));

        enemy_timers[enemy_id][1] = Date.now();
        update_enemy_attack_bar(enemy_id, count);
        count++;
        if(count >= 40) {
            count = 0;
            do_enemy_combat_action(enemy_id);
        }
        do_enemy_attack_loop(enemy_id, count);

        if(enemy_timer_variance_accumulator[enemy_id] <= 5/tickrate && enemy_timer_variance_accumulator[enemy_id] >= -5/tickrate) {
            enemy_timer_adjustment[enemy_id] = time_variance_accumulator;
        }
        else {
            if(enemy_timer_variance_accumulator[enemy_id] > 5/tickrate) {
                enemy_timer_adjustment[enemy_id] = 5/tickrate;
            }
            else {
                if(enemy_timer_variance_accumulator[enemy_id] < -5/tickrate) {
                    enemy_timer_adjustment[enemy_id] = -5/tickrate;
                }
            }
        } //limits the maximum correction to +/- 5ms, just to be safe

    }, enemy_attack_cooldowns[enemy_id]*1000/(40*tickrate) - enemy_timer_adjustment[enemy_id]);
}

function clear_enemy_attack_loop(enemy_id) {
    clearTimeout(enemy_attack_loops[enemy_id]);
}

/**
 * 
 * @param {Number} base_cooldown basic cooldown based on attack speeds of enemies and character (ignoring stamina penalty) 
 * @param {String} attack_type type of attack, not yet implemented
 */
function set_character_attack_loop({base_cooldown}) {
    clear_character_attack_loop();

    //little safety, as this function would occasionally throw an error due to not having any enemies left 
    //(can happen on forced leave after first win)
    if(!current_enemies) {
        return;
    }

    //tries to switch stance back to the one that was actually selected if there's enough stamina, otherwise tries to switch stance to "normal" if not enough stamina
    if(character.stats.full.stamina >= (stances[selected_stance].stamina_cost / character.stats.full.stamina_efficiency)){ 
        if(selected_stance !== current_stance) {
            change_stance(selected_stance);
            return;
        }
    } else if(current_stance !== "normal") {
        change_stance("normal", true);
        return;
    }

    let target_count = stances[current_stance].target_count;
    if(target_count > 1 && stances[current_stance].related_skill) {
        target_count = target_count + Math.round(target_count * skills[stances[current_stance].related_skill].current_level/skills[stances[current_stance].related_skill].max_level);
    }

    if(stances[current_stance].randomize_target_count) {
        target_count = Math.floor(Math.random()*target_count) || 1;
    }

    let targets=[];
    const alive_targets = current_enemies.filter(enemy => enemy.is_alive).slice(-target_count);

    while(alive_targets.length>0) {
        targets.push(alive_targets.pop());
    }

    use_stamina(stances[current_stance].stamina_cost);
    let actual_cooldown = base_cooldown / character.get_stamina_multiplier();

    let attack_power = character.get_attack_power();
    do_character_attack_loop({base_cooldown, actual_cooldown, attack_power, targets});
}

/**
 * @description updates character's attack bar, performs combat action when it reaches full
 * @param {Number} base_cooldown 
 * @param {Number} actual_cooldown 
 * @param {String} attack_power 
 * @param {String} attack_type 
 */
function do_character_attack_loop({base_cooldown, actual_cooldown, attack_power, targets}) {
    let count = 0;
    clear_character_attack_loop();
    character_attack_loop = setInterval(() => {
        update_character_attack_bar(count);
        count++;
        if(count >= 40) {
            count = 0;
            let leveled = false;

            for(let i = 0; i < targets.length; i++) {
                do_character_combat_action({target: targets[i], attack_power});
            }

            if(stances[current_stance].related_skill) {
                leveled = add_xp_to_skill({skill: skills[stances[current_stance].related_skill], xp_to_add: targets.reduce((sum,enemy)=>sum+enemy.xp_value,0)/targets.length});
                
                if(leveled) {
                    update_stance_tooltip(current_stance);
                    update_character_stats();
                }
            }

            if(current_enemies.filter(enemy => enemy.is_alive).length != 0) { //set next loop if there's still an enemy left;
                set_character_attack_loop({base_cooldown});
            } else { //all enemies defeated, do relevant things and set new combat

                current_location.enemy_groups_killed += 1;
                if(current_location.enemy_groups_killed > 0 && current_location.enemy_groups_killed % current_location.enemy_count == 0) {
                    get_location_rewards(current_location);
                }
                document.getElementById("enemy_count_div").children[0].children[1].innerHTML = current_location.enemy_count - current_location.enemy_groups_killed % current_location.enemy_count;
        
                set_new_combat();
            }
        }
    }, actual_cooldown*1000/(40*tickrate));
}

function clear_character_attack_loop() {
    clearInterval(character_attack_loop);
}

function clear_all_enemy_attack_loops() {
    Object.keys(enemy_attack_loops).forEach((key) => {
        clearInterval(enemy_attack_loops[key]);
    })
}

function start_combat() {
    if(current_enemies == null) {
        set_new_combat();
    }
}

/**
 * performs a single combat action (that is attack, as there isn't really any other kind for now),
 * called when attack cooldown finishes
 * 
 * @param {String} attacker id of enemy
*/ 
function do_enemy_combat_action(enemy_id) {
    
    /*
    tiny workaround, as character being defeated while facing multiple enemies,
    sometimes results in enemy attack animation still finishing before character retreats,
    launching this function and causing an error
    */
    if(!current_enemies) { 
        return;
    }
    
    const attacker = current_enemies[enemy_id];

    let evasion_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/3); //down to .5 if there's full 8 enemies (multiple attackers make it harder to evade attacks)
    if(attacker.size === "small") {
        add_xp_to_skill({skill: skills["Pest killer"], xp_to_add: attacker.xp_value});
    } else if(attacker.size === "large") {
        add_xp_to_skill({skill: skills["Giant slayer"], xp_to_add: attacker.xp_value});
        evasion_chance_modifier *= skills["Giant slayer"].get_coefficient("multiplicative");
    }

    const enemy_base_damage = attacker.stats.attack;

    let damage_dealt;

    let critted = false;

    let partially_blocked = false; //only used for combat info in message log

    damage_dealt = enemy_base_damage * (1.2 - Math.random() * 0.4); //basic 20% deviation for damage
    
    if(character.equipment["off-hand"]?.offhand_type === "shield") { //HAS SHIELD
        if(character.stats.full.block_chance > Math.random()) {//BLOCKED THE ATTACK
            add_xp_to_skill({skill: skills["Shield blocking"], xp_to_add: attacker.xp_value});
            if(character.stats.total_multiplier.block_strength * character.equipment["off-hand"].getShieldStrength() >= damage_dealt) {
                log_message(character.name + " blocked an attack", "hero_blocked");
                return; //damage fully blocked, nothing more can happen 
            } else {
                damage_dealt -= character.stats.total_multiplier.block_strength * character.equipment["off-hand"].getShieldStrength();
                partially_blocked = true;
            }
         } else {
            add_xp_to_skill({skill: skills["Shield blocking"], xp_to_add: attacker.xp_value/2});
         }
    } else { // HAS NO SHIELD
        const hit_chance = get_hit_chance(attacker.stats.dexterity * Math.sqrt(attacker.stats.intuition ?? 1), character.stats.full.evasion_points)/evasion_chance_modifier;

        if(hit_chance < Math.random()) { //EVADED ATTACK
            const xp_to_add = character.wears_armor() ? attacker.xp_value : attacker.xp_value * 1.5; 
            //50% more evasion xp if going without armor
            add_xp_to_skill({skill: skills["Evasion"], xp_to_add});
            log_message(character.name + " evaded an attack", "enemy_missed");
            return; //damage fully evaded, nothing more can happen
        } else {
            add_xp_to_skill({skill: skills["Evasion"], xp_to_add: attacker.xp_value/2});
        }
    }

    if(enemy_crit_chance > Math.random())
    {
        damage_dealt *= enemy_crit_damage;
        critted = true;
    }
    /*
    head: null, torso: null, 
        arms: null, ring: null, 
        weapon: null, "off-hand": null,
        legs: null, feet: null, 
        amulet: null
    */
    if(!character.wears_armor())
    {
        add_xp_to_skill({skill: skills["Iron skin"], xp_to_add: attacker.xp_value});
    } else {
        add_xp_to_skill({skill: skills["Iron skin"], xp_to_add: Math.sqrt(attacker.xp_value)/2});
    }

    let {damage_taken, fainted} = character.take_damage({damage_value: damage_dealt});

    if(critted)
    {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, was critically hit for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked_critically");
        } 
        else {
            log_message(character.name + " was critically hit for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked_critically");
        }
    } else {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, was hit for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked");
        }
        else {
            log_message(character.name + " was hit for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked");
        }
    }

    if(fainted) {
        total_deaths++;
        log_message(character.name + " has lost consciousness", "hero_defeat");

        update_displayed_health();
        if(options.auto_return_to_bed && last_location_with_bed) {
            change_location(last_location_with_bed);
            start_sleeping();
        } else {
            change_location(current_location.parent_location.name);
        }
        return;
    }

    update_displayed_health();
}

function do_character_combat_action({target, attack_power}) {

    const hero_base_damage = attack_power;

    let damage_dealt;
    
    let critted = false;
    
    let hit_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/4); // down to ~ 60% if there's full 8 enemies
    
    add_xp_to_skill({skill: skills["Combat"], xp_to_add: target.xp_value});

    if(target.size === "small") {
        add_xp_to_skill({skill: skills["Pest killer"], xp_to_add: target.xp_value});
        hit_chance_modifier *= skills["Pest killer"].get_coefficient("multiplicative");
    } else if(target.size === "large") {
        add_xp_to_skill({skill: skills["Giant slayer"], xp_to_add: target.xp_value});
    }

    const hit_chance = get_hit_chance(character.stats.full.attack_points, target.stats.agility * Math.sqrt(target.stats.intuition ?? 1)) * hit_chance_modifier;

    if(hit_chance > Math.random()) {//hero's attack hits

        if(character.equipment.weapon != null) {
            damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) )/10;

            add_xp_to_skill({skill: skills[weapon_type_to_skill[character.equipment.weapon.weapon_type]], xp_to_add: target.xp_value}); 

        } else {
            damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) )/10;
            add_xp_to_skill({skill: skills['Unarmed'], xp_to_add: target.xp_value});
        }
        //small randomization by up to 20%, then bonus from skill
        
        if(character.stats.full.crit_rate > Math.random()) {
            damage_dealt = Math.round(10*damage_dealt * character.stats.full.crit_multiplier)/10;
            critted = true;
        }
        else {
            critted = false;
        }
        
        damage_dealt = Math.ceil(10*Math.max(damage_dealt - target.stats.defense, damage_dealt*0.1, 1))/10;

        target.stats.health -= damage_dealt;
        if(critted) {
            log_message(target.name + " was critically hit for " + damage_dealt + " dmg", "enemy_attacked_critically");
        }
        else {
            log_message(target.name + " was hit for " + damage_dealt + " dmg", "enemy_attacked");
        }

        if(target.stats.health <= 0) {
            total_kills++;
            target.stats.health = 0; //to not go negative on displayed value

            log_message(target.name + " was defeated", "enemy_defeated");

            //gained xp multiplied ny TOTAL size of enemy group raised to 1/3
            let xp_reward = target.xp_value * (current_enemies.length**0.3334);
            add_xp_to_character(xp_reward, true);
            

            var loot = target.get_loot();
            if(loot.length > 0) {
                log_loot(loot);
                add_to_character_inventory(loot);
            }
            
            kill_enemy(target);
        }

        update_displayed_health_of_enemies();
    } else {
        log_message(character.name + " has missed", "hero_missed");
    }
}

/**
 * sets enemy to dead, disabled their attack, checks if that was the last enemy in group
 * @param {Enemy} enemy 
 * @return {Boolean} if that was the last of an enemy group
 */
function kill_enemy(target) {
    target.is_alive = false;
    if(target.add_to_bestiary) {
        if(enemy_killcount[target.name]) {
            enemy_killcount[target.name] += 1;
            update_bestiary_entry(target.name);
        } else {
            enemy_killcount[target.name] = 1;
            create_new_bestiary_entry(target.name);
        }
    }
    const enemy_id = current_enemies.findIndex(enemy => enemy===target);
    clear_enemy_attack_loop(enemy_id);
}

function use_stamina(num = 1, use_efficiency = true) {
    
    character.stats.full.stamina -= num/(use_efficiency * character.stats.full.stamina_efficiency || 1);

    if(character.stats.full.stamina < 0)  {
        character.stats.full.stamina = 0;
    }

    if(character.stats.full.stamina < 1) {
        add_xp_to_skill({skill: skills["Persistence"], xp_to_add: num});
        update_displayed_stats();
    }

    update_displayed_stamina();
}

/**
 * adds xp to skills, handles their levelups and tooltips
 * @param skill - skill object 
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 */
function add_xp_to_skill({skill, xp_to_add = 1, should_info = true, use_bonus = true, add_to_parent = true})
{
    let leveled = false;
    if(xp_to_add == 0) {
        return leveled;
    } else if(xp_to_add < 0) {
        console.error(`Tried to add negative xp to skill ${skill.skill_id}`);
        return leveled;
    }

    if(use_bonus) {
        xp_to_add = xp_to_add * get_skill_xp_gain(skill.skill_id);

        if(skill.parent_skill) {
            xp_to_add *= skill.get_parent_xp_multiplier();
        }
    }
    
    const prev_name = skill.name();
    const was_hidden = skill.visibility_treshold > skill.total_xp;
    
    const {message, gains, unlocks} = skill.add_xp({xp_to_add: xp_to_add});
    const new_name = skill.name();
    if(skill.parent_skill && add_to_parent) {
        if(skill.total_xp > skills[skill.parent_skill].total_xp) {
            /*
                add xp to parent if skill would now have more than the parent
                calc xp ammount so that it's no more than the difference between child and parent
            */
            let xp_for_parent = Math.min(skill.total_xp - skills[skill.parent_skill].total_xp, xp_to_add);
            add_xp_to_skill({skill: skills[skill.parent_skill], xp_to_add: xp_for_parent, should_info, use_bonus: false, add_to_parent});
        }
    }

    const is_visible = skill.visibility_treshold <= skill.total_xp;

    if(was_hidden && is_visible) 
    {
        create_new_skill_bar(skill);
        update_displayed_skill_bar(skill, false);
        
        if(typeof should_info === "undefined" || should_info) {
            log_message(`Unlocked new skill: ${skill.name()}`, "skill_raised");
        }
    } 

    if(gains) { 
        character.stats.add_skill_milestone_bonus(gains);
        if(skill.skill_id === "Unarmed") {
            character.stats.add_all_equipment_bonus();
        }
    }
    
    if(is_visible) 
    {
        if(typeof message !== "undefined"){ 
        //not undefined => levelup happened and levelup message was returned
            leveled = true;

            update_displayed_skill_bar(skill, true);

            if(typeof should_info === "undefined" || should_info)
            {
                log_message(message, "skill_raised");
                update_character_stats();
            }

            if(typeof skill.get_effect_description !== "undefined")
            {
                update_displayed_skill_description(skill);
            }

            if(skill.is_parent) {
                update_all_displayed_skills_xp_gain();
            }
            else {
                update_displayed_skill_xp_gain(skill);
            }

            //no point doing any checks for optimization
            update_displayed_stamina_efficiency();

            for(let i = 0; i < unlocks?.skills?.length; i++) {
                const unlocked_skill = skills[unlocks.skills[i]];
                
                if(which_skills_affect_skill[unlocks.skills[i]]) {
                    if(!which_skills_affect_skill[unlocks.skills[i]].includes(skill.skill_id)) {
                        which_skills_affect_skill[unlocks.skills[i]].push(skill.skill_id);
                    }
                } else {
                    which_skills_affect_skill[unlocks.skills[i]] = [skill.skill_id];
                }

                if(unlocked_skill.is_unlocked) {
                    continue;
                }
                
                unlocked_skill.is_unlocked = true;
        
                create_new_skill_bar(unlocked_skill);
                update_displayed_skill_bar(unlocked_skill, false);
                
                if(typeof should_info === "undefined" || should_info) {
                    log_message(`Unlocked new skill: ${unlocked_skill.name()}`, "skill_raised");
                }
            }

            if(prev_name !== new_name) {
                if(which_skills_affect_skill[skill.skill_id]) {
                    for(let i = 0; i < which_skills_affect_skill[skill.skill_id].length; i++) {
                        update_displayed_skill_bar(skills[which_skills_affect_skill[skill.skill_id][i]], false);
                    }
                }

                if(!was_hidden && (typeof should_info === "undefined" || should_info)) {
                    log_message(`Skill ${prev_name} upgraded to ${new_name}`, "skill_raised");
                }

                if(current_location?.connected_locations) {
                    for(let i = 0; i < current_location.activities.length; i++) {
                        if(activities[current_location.activities[i].activity_name].base_skills_names.includes(skill.skill_id)) {
                            update_gathering_tooltip(current_location.activities[i]);
                        }
                    }
                }
            }

        } else {
            update_displayed_skill_bar(skill, false);
        }
    } else {
        //
    }

    return leveled;
}

/**
 * adds xp to character, handles levelups
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 */
function add_xp_to_character(xp_to_add, should_info = true, use_bonus) {
    const level_up = character.add_xp({xp_to_add, use_bonus});
    
    if(level_up) {
        if(should_info) {
            log_message(level_up, "level_up");
        }
        
        character.stats.full.health = character.stats.full.max_health; //free healing on level up, because it's a nice thing to have
        update_character_stats();
    }

    update_displayed_character_xp(level_up);
}

/**
 * @param {Location} location game Location object
 * @description handles all the rewards for clearing location (both first and subsequent clears), adding xp and unlocking stuff
 */
function get_location_rewards(location) {

    let should_return = false;
    if(location.enemy_groups_killed == location.enemy_count) { //first clear

        if(location.is_challenge) {
            location.is_finished = true;
        }
        should_return = true;
        

        if(location.first_reward.xp && typeof location.first_reward.xp === "number") {
            log_message(`Obtained ${location.first_reward.xp}xp for clearing ${location.name} for the first time`, "location_reward");
            add_xp_to_character(location.first_reward.xp);
        }
    } else if(location.repeatable_reward.xp && typeof location.repeatable_reward.xp === "number") {
        log_message(`Obtained additional ${location.repeatable_reward.xp}xp for clearing ${location.name}`, "location_reward");
        add_xp_to_character(location.repeatable_reward.xp);
    }



    //all below: on each clear, so that if something gets added after location was cleared, it will still be unlockable

    location.otherUnlocks();

    for(let i = 0; i < location.repeatable_reward.locations?.length; i++) { //unlock locations

        if(!location.repeatable_reward.locations[i].required_clears || location.enemy_groups_killed/location.enemy_count >= location.repeatable_reward.locations[i].required_clears){
            unlock_location(locations[location.repeatable_reward.locations[i].location]);
        }
    }
    
    for(let i = 0; i < location.repeatable_reward.flags?.length; i++) {
        global_flags[location.repeatable_reward.flags[i]] = true;
    }

    for(let i = 0; i < location.repeatable_reward.textlines?.length; i++) { //unlock textlines
        var any_unlocked = false;
        for(let j = 0; j < location.repeatable_reward.textlines[i].lines.length; j++) {
            if(dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked == false) {
                any_unlocked = true;
                dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked = true;
            }
        }
        if(any_unlocked) {
            log_message(`You should talk to ${location.repeatable_reward.textlines[i].dialogue}`, "dialogue_unlocked");
            //maybe do this only when there's just 1 dialogue with changes?
        }
    }

    for(let i = 0; i < location.repeatable_reward.dialogues?.length; i++) { //unlocking dialogues
        const dialogue = dialogues[location.repeatable_reward.dialogues[i]]
        if(!dialogue.is_unlocked) {
            dialogue.is_unlocked = true;
            log_message(`You can now talk with ${dialogue.name}`, "activity_unlocked");
        }
    }

    //activities
    for(let i = 0; i < location.repeatable_reward.activities?.length; i++) {
        if(locations[location.repeatable_reward.activities[i].location].activities[location.repeatable_reward.activities[i].activity].tags?.gathering 
            && !global_flags.is_gathering_unlocked) {
                return;
            }

        unlock_activity({location: locations[location.repeatable_reward.activities[i].location].name, 
                            activity: locations[location.repeatable_reward.activities[i].location].activities[location.repeatable_reward.activities[i].activity]});
    }

    if(should_return) {
        change_location(current_location.parent_location.name); //go back to parent location, only on first clear
    }
}

/**
 * 
 * @param location game location object 
 */
function unlock_location(location) {
    if(!location.is_unlocked){
        location.is_unlocked = true;
        const message = location.unlock_text || `Unlocked location ${location.name}`;
        log_message(message, "location_unlocked") 

        //reloads the location (assumption is that a new one was unlocked by clearing a zone)
        if(!current_dialogue) {
            change_location(current_location.name);
        }
    }
}

function clear_enemies() {
    current_enemies = null;
}

function use_recipe(target) {

    const category = target.parentNode.parentNode.dataset.crafting_category;
    const subcategory = target.parentNode.parentNode.dataset.crafting_subcategory;
    const recipe_id = target.parentNode.dataset.recipe_id;
    const station_tier = current_location.crafting.tiers[category];

    if(!category || !subcategory || !recipe_id) {
        //shouldn't be possible to reach this
        throw new Error(`Tried to use a recipe but either category, subcategory, or recipe id was not passed: ${category} - ${subcategory} - ${recipe_id}`);
    } else if(!recipes[category][subcategory][recipe_id]) {
        //shouldn't be possible to reach this
        throw new Error(`Tried to use a recipe that doesn't exist: ${category} -> ${subcategory} -> ${recipe_id}`);
    } else {
        const selected_recipe = recipes[category][subcategory][recipe_id];
        const recipe_div = document.querySelector(`[data-crafting_category="${category}"] [data-crafting_subcategory="${subcategory}"] [data-recipe_id="${recipe_id}"]`);
        let leveled = false;
        let result;
        if(subcategory === "items") {
            if(selected_recipe.get_availability()) {
                total_crafting_attempts++;
                const success_chance = selected_recipe.get_success_chance(station_tier);
                result = selected_recipe.getResult();
                const {result_id, count} = result;
                
                for(let i = 0; i < selected_recipe.materials.length; i++) {
                    const key = item_templates[selected_recipe.materials[i].material_id].getInventoryKey();
                    remove_from_character_inventory([{item_key: key, item_count: selected_recipe.materials[i].count}]);
                } 
                const exp_value = get_recipe_xp_value({category, subcategory, recipe_id});
                if(Math.random() < success_chance) {
                    total_crafting_successes++;
                    add_to_character_inventory([{item: item_templates[result_id], count: count}]);
                    
                    log_message(`Created ${item_templates[result_id].getName()} x${count}`, "crafting");

                    leveled = add_xp_to_skill({skill: skills[selected_recipe.recipe_skill], xp_to_add: exp_value});
                } else {
                    log_message(`Failed to create ${item_templates[result_id].getName()}!`, "crafting");

                    leveled = add_xp_to_skill({skill: skills[selected_recipe.recipe_skill], xp_to_add: exp_value/2});
                }

                update_item_recipe_visibility();
                update_item_recipe_tooltips();
                //do those two wheter success or fail since materials get used either way

                if(leveled) {
                    //todo: reload all recipe tooltips of matching category
                }
            } else {
                console.warn(`Tried to use an unavailable recipe!`);
            }
            
        } else if(subcategory === "components" || selected_recipe.recipe_type === "component" ) {
            //read the selected material, pass it as param

            const material_div = recipe_div.children[1].querySelector(".selected_material");
            if(!material_div) {
                return;
            } else {
                const material_1_key = material_div.dataset.item_key;
                const {id} = JSON.parse(material_1_key);
                const recipe_material = selected_recipe.materials.filter(x=> x.material_id===id)[0];

                if(recipe_material.count <= character.inventory[material_1_key]?.count) {
                    total_crafting_attempts++;
                    total_crafting_successes++;
                    result = selected_recipe.getResult(character.inventory[material_1_key].item, station_tier);
                    add_to_character_inventory([{item: result, count: 1}]);
                    remove_from_character_inventory([{item_key: material_1_key, item_count: recipe_material.count}]);
                    log_message(`Created ${result.getName()} [${result.quality}% quality]`, "crafting");
                    
                    const exp_value = get_recipe_xp_value({category, subcategory, recipe_id, material_count: recipe_material.count, rarity_multiplier: rarity_multipliers[result.getRarity()], result_tier: result.component_tier});
                    
                    leveled = add_xp_to_skill({skill: skills[selected_recipe.recipe_skill], xp_to_add: exp_value});
                    material_div.classList.remove("selected_material");
                    if(character.inventory[material_1_key]) { 
                        //if item is still present in inventory + if there's not enough of it = change recipe color
                        if(recipe_material.count > character.inventory[material_1_key].count) { 
                            material_div.classList.add("recipe_unavailable");
                        }
                    } else {
                        material_div.remove();
                    }
                    update_displayed_material_choice({category, subcategory, recipe_id, refreshing: true});
                    //update_displayed_crafting_recipes();
                } else {
                    console.log("Tried to create an item without having necessary materials");
                }
            }
            
        } else if(subcategory === "equipment") {
            //read the selected components, pass them as params
            
            const component_1_key = recipe_div.children[1].children[0].children[1].querySelector(".selected_component")?.dataset.item_key;
            
            const component_2_key = recipe_div.children[1].children[1].children[1].querySelector(".selected_component")?.dataset.item_key;

            if(!component_1_key || !component_2_key) {
                return;
            } else {
                if(!character.inventory[component_1_key] || !character.inventory[component_2_key]) {
                    throw new Error(`Tried to create item with components that are not present in the inventory!`);
                } else {
                    total_crafting_attempts++;
                    total_crafting_successes++;
                    result = selected_recipe.getResult(character.inventory[component_1_key].item, character.inventory[component_2_key].item, station_tier);
                    remove_from_character_inventory([{item_key: component_1_key}, {item_key: component_2_key}]);
                    add_to_character_inventory([{item: result}]);

                    log_message(`Created ${result.getName()} [${result.quality}% quality]`, "crafting");

                    const id_1 = JSON.parse(component_1_key).id;
                    const id_2 = JSON.parse(component_2_key).id;

                    const exp_value = get_recipe_xp_value({category, subcategory, recipe_id, selected_components: [item_templates[id_1], item_templates[id_2]], rarity_multiplier: rarity_multipliers[result.getRarity()]})
                    
                    leveled = add_xp_to_skill({skill: skills[selected_recipe.recipe_skill], xp_to_add: exp_value});
                    
                    const component_keys = {};
                    component_keys[component_1_key] = true;
                    component_keys[component_2_key] = true;
                    update_displayed_component_choice({category, recipe_id, component_keys});
                }
            }
            //update_displayed_crafting_recipes();
        }  
    }
}

function character_equip_item(item_key) {
    equip_item_from_inventory(item_key);
    if(current_enemies) {
        reset_combat_loops();
    }
}
function character_unequip_item(item_slot) {
    unequip_item(item_slot);
    if(current_enemies) {
        reset_combat_loops();
        //set_new_combat({enemies: current_enemies});
    }
}

function use_item(item_key) { 
    const {id} = JSON.parse(item_key);
    const item_effects = item_templates[id].effects;

    let used = false;
    for(let i = 0; i < item_effects.length; i++) {
        const duration = item_templates[id].effects[i].duration;
        if(!active_effects[item_effects[i].effect] || active_effects[item_effects[i].effect].duration < duration) {

            active_effects[item_effects[i].effect] = new ActiveEffect({...effect_templates[item_effects[i].effect], duration});
            used = true;
        }
    }
    if(used) {
        update_displayed_effects();
        character.stats.add_active_effect_bonus();
        update_character_stats();
    }
    remove_from_character_inventory([{item_key}]);
}

function get_date() {
    const date = new Date();
    const year = date.getFullYear();
    const month_num = date.getMonth()+1;
    const month = month_num > 9 ? month_num.toString() : "0" + month_num.toString();
    const day = date.getDate() > 9 ? date.getDate().toString() : "0" + date.getDate().toString();
    const hour = date.getHours() > 9 ? date.getHours().toString() : "0" + date.getHours().toString();
    const minute = date.getMinutes() > 9 ? date.getMinutes().toString() : "0" + date.getMinutes().toString();
    const second = date.getSeconds() > 9 ? date.getSeconds().toString() : "0" + date.getSeconds().toString();
    return `${year}-${month}-${day} ${hour}_${minute}_${second}`;
}

function is_on_dev() {
    return window.location.href.endsWith("-dev/");
}

function is_JSON(str) {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

/**
 * puts all important stuff into a string
 * @returns string with save data
 */
function create_save() {
    try{
        const save_data = {};
        save_data["game version"] = game_version;
        save_data["current time"] = current_game_time;
        save_data.saved_at = get_date();
        save_data.total_playtime = total_playtime;
        save_data.total_deaths = total_deaths;
        save_data.total_crafting_attempts = total_crafting_attempts;
        save_data.total_crafting_successes = total_crafting_successes;
        save_data.total_kills = total_kills;
        save_data.global_flags = global_flags;
        save_data["character"] = {
                                name: character.name, titles: character.titles, 
                                inventory: {}, equipment: character.equipment,
                                money: character.money, 
                                xp: {
                                total_xp: character.xp.total_xp,
                                },
                                hp_to_full: character.stats.full.max_health - character.stats.full.health,
                                stamina_to_full: character.stats.full.max_stamina - character.stats.full.stamina
                            };
        //no need to save all stats; on loading, base stats will be taken from code and then additional stuff will be calculated again (in case anything changed)
        Object.keys(character.inventory).forEach(key =>{
            save_data["character"].inventory[key] = {count: character.inventory[key].count};
        });
       
        //Object.keys(character.equipment).forEach(key =>{
            //save_data["character"].equipment[key] = true;
            //todo: need to rewrite equipment loading first
        //});

        save_data["skills"] = {};
        Object.keys(skills).forEach(function(key) {
            if(!skills[key].is_parent)
            {
                save_data["skills"][skills[key].skill_id] = {total_xp: skills[key].total_xp}; 
                //a bit redundant, but keep it in case key in skills is different than skill_id
            }
        }); //only save total xp of each skill, again in case of any changes
        
        save_data["current location"] = current_location.name;

        save_data["locations"] = {};
        Object.keys(locations).forEach(function(key) { 
            save_data["locations"][key] = {};
            if(locations[key].is_unlocked) {      
                save_data["locations"][key].is_unlocked = true;
            }
            if(locations[key].is_finished) {      
                save_data["locations"][key].is_finished = true;
            }

            if("parent_location" in locations[key]) { //combat zone
                save_data["locations"][key]["enemy_groups_killed"] = locations[key].enemy_groups_killed;
            }

            if(locations[key].activities) {
                save_data["locations"][key]["unlocked_activities"] = []
                Object.keys(locations[key].activities).forEach(activity_key => {
                    if(locations[key].activities[activity_key].is_unlocked) {
                        save_data["locations"][key]["unlocked_activities"].push(activity_key);
                    }
                });
            }
        }); //save locations' (and their activities') unlocked status and their killcounts

        save_data["activities"] = {};
        Object.keys(activities).forEach(function(activity) {
            if(activities[activity].is_unlocked) {
                save_data["activities"][activity] = {is_unlocked: true};
            }
        }); //save activities' unlocked status (this is separate from unlock status in location)

        if(current_activity) {
            save_data["current_activity"] = {activity_id: current_activity.id, 
                                             working_time: current_activity.working_time, 
                                             earnings: current_activity.earnings,
                                             gathering_time: current_activity.gathering_time,
                                            };
        }
        
        save_data["dialogues"] = {};
        Object.keys(dialogues).forEach(function(dialogue) {
            save_data["dialogues"][dialogue] = {is_unlocked: dialogues[dialogue].is_unlocked, is_finished: dialogues[dialogue].is_finished, textlines: {}};
            if(dialogues[dialogue].textlines) {
                Object.keys(dialogues[dialogue].textlines).forEach(function(textline) {
                    save_data["dialogues"][dialogue].textlines[textline] = {is_unlocked: dialogues[dialogue].textlines[textline].is_unlocked,
                                                                is_finished: dialogues[dialogue].textlines[textline].is_finished};
                });
            }
        }); //save dialogues' and their textlines' unlocked/finished statuses

        save_data["traders"] = {};
        Object.keys(traders).forEach(function(trader) {
            if(traders[trader].is_unlocked) {
                if(traders[trader].last_refresh == -1 || traders[trader].can_refresh()) {
                    //no need to save inventory, as trader would be anyway refreshed on any visit
                    save_data["traders"][trader] = {last_refresh: -1,
                                                    is_unlocked: traders[trader].is_unlocked};
                } else {
                    const t_inventory = {};
                    Object.keys(traders[trader].inventory).forEach(key =>{
                        t_inventory[key] = {count: traders[trader].inventory[key].count};
                    });
                    save_data["traders"][trader] = {inventory: t_inventory, 
                                                    last_refresh: traders[trader].last_refresh, 
                                                    is_unlocked: traders[trader].is_unlocked
                                                };
                }
            }
        });

        save_data["books"] = {};
        Object.keys(book_stats).forEach(book => {
            if(book_stats[book].accumulated_time > 0 || book_stats[book].is_finished) {
                //check both conditions, on loading set as finished if either 'is_finished' or has enough time accumulated
                save_data["books"][book] = {
                    accumulated_time: book_stats[book].accumulated_time,
                    is_finished: book_stats[book].is_finished
                };
            }
        });

        save_data["is_reading"] = is_reading;

        save_data["is_sleeping"] = is_sleeping;

        save_data["active_effects"] = active_effects;

        save_data["enemy_killcount"] = enemy_killcount;

        save_data["loot_sold_count"] = loot_sold_count;

        save_data["last_combat_location"] = last_combat_location;
        save_data["last_location_with_bed"] = last_location_with_bed;

        save_data["options"] = options;

        save_data["stances"] = {};
        Object.keys(stances).forEach(stance => {
            if(stances[stance].is_unlocked) {
                save_data["stances"][stance] = true;
            }
        }) 
        save_data["current_stance"] = current_stance;
        save_data["selected_stance"] = selected_stance;
        save_data["faved_stances"] = faved_stances;

        save_data["message_filters"] = {
            unlocks: document.documentElement.style.getPropertyValue('--message_unlocks_display') !== "none",
            events: document.documentElement.style.getPropertyValue('--message_events_display') !== "none",
            combat: document.documentElement.style.getPropertyValue('--message_combat_display') !== "none",
            loot: document.documentElement.style.getPropertyValue('--message_loot_display') !== "none",
            background: document.documentElement.style.getPropertyValue('--message_background_display') !== "none",
            crafting: document.documentElement.style.getPropertyValue('--message_crafting_display') !== "none",
        };

        return JSON.stringify(save_data);
    } catch(error) {
        console.error("Something went wrong on saving the game!");
        console.error(error);
        log_message("FAILED TO CREATE A SAVE FILE, PLEASE CHECK CONSOLE FOR ERRORS AND REPORT IT", "message_critical");
    }
} 

/**
 * called from index.html
 * @returns save string encoded to base64
 */
function save_to_file() {
    return btoa(create_save());
}

/**
 * saves game state to localStorage, on manual saves also logs message about it being done
 * @param {Boolean} is_manual 
 */
function save_to_localStorage({key, is_manual}) {
    const save = create_save();
    if(save) {
        localStorage.setItem(key, save);
    }
    
    if(is_manual) {
        log_message("Saved the game manually");
        save_counter = 0;
    }

    return JSON.parse(save).saved_at;
}

function save_progress() {
    if(is_on_dev()) {
        save_to_localStorage({key: dev_save_key, is_manual: true});
    } else {
        save_to_localStorage({key: save_key, is_manual: true});
    }
}

function load(save_data) {
    //single loading method
    
    //current enemies are not saved

    current_game_time.load_time(save_data["current time"]);
    time_field.innerHTML = current_game_time.toString();
    //set game time

    Object.keys(save_data.global_flags||{}).forEach(flag => {
        global_flags[flag] = save_data.global_flags[flag];
    });

    total_playtime = save_data.total_playtime || 0;
    total_deaths = save_data.total_deaths || 0;
    total_crafting_attempts = save_data.total_crafting_attempts || 0;
    total_crafting_successes = save_data.total_crafting_successes || 0;
    total_deaths = save_data.total_deaths || 0;

    name_field.value = save_data.character.name;
    character.name = save_data.character.name;

    last_location_with_bed = save_data.last_location_with_bed;
    last_combat_location = save_data.last_combat_location;

    options.uniform_text_size_in_action = save_data.options?.uniform_text_size_in_action;
    option_uniform_textsize(options.uniform_text_size_in_action);

    options.auto_return_to_bed = save_data.options?.auto_return_to_bed;
    option_bed_return(options.auto_return_to_bed);

    options.disable_combat_autoswitch = save_data.options?.disable_combat_autoswitch;
    option_combat_autoswitch(options.disable_combat_autoswitch);

    options.remember_message_log_filters = save_data.options?.remember_message_log_filters;
    if(save_data.message_filters) {
        Object.keys(message_log_filters).forEach(filter => {
            message_log_filters[filter] = save_data.message_filters[filter] ?? true;
        })
    }
    option_remember_filters(options.remember_message_log_filters);

    //this can be removed at some point
    const is_from_before_eco_rework = compare_game_version("v0.3.5", save_data["game version"]) == 1;
    setLootSoldCount(save_data.loot_sold_count || {});

    character.money = (save_data.character.money || 0) * ((is_from_before_eco_rework == 1)*10 || 1);
    update_displayed_money();

    add_xp_to_character(save_data.character.xp.total_xp, false);

    Object.keys(save_data.skills).forEach(function(key){ 
        if(key === "Literacy") {
            return; //done separately, for compatibility with older saves (can be eventually remove)
        }
        if(skills[key] && !skills[key].is_parent){
            if(save_data.skills[key].total_xp > 0) {
                add_xp_to_skill({skill: skills[key], xp_to_add: save_data.skills[key].total_xp, 
                                    should_info: false, add_to_parent: true, use_bonus: false
                                });
            }
        } else if(save_data.skills[key].total_xp > 0) {
                console.warn(`Skill "${key}" couldn't be found!`);
        }
    }); //add xp to skills

    if(save_data.books) {
        let total_book_xp = 0;
        const literacy_xp = save_data.skills["Literacy"].total_xp;
        Object.keys(save_data.books).forEach(book=>{
            if(!item_templates[book]) {
                console.warn(`Book ${book} couldn't be found and was skipped!`);
            }

            if(save_data.books[book].accumulated_time > 0) {
                if(save_data.books[book].is_finished) {
                    item_templates[book].setAsFinished();
                    total_book_xp += book_stats[book].required_time * book_stats[book].literacy_xp_rate;
                } else {
                    item_templates[book].addProgress(save_data.books[book].accumulated_time);
                    total_book_xp += book_stats[book].accumulated_time * book_stats[book].literacy_xp_rate;
                }
            }
        });
        if(total_book_xp > literacy_xp) {
            add_xp_to_skill({skill: skills["Literacy"], should_info: false, xp_to_add: total_book_xp, use_bonus: false});
            console.warn(`Saved XP for "Literacy skill" was less than it should be based on progress with books (${literacy_xp} vs ${total_book_xp}), so it was adjusted to match it!`);
        } else {
            add_xp_to_skill({skill: skills["Literacy"], should_info: false, xp_to_add: literacy_xp, use_bonus: false});
        }
    }

    if(save_data["stances"]) {
        Object.keys(save_data["stances"]).forEach(stance => {
            if(save_data["stances"]) {
                stances[stance].is_unlocked = true;
            } 
        });
    }
    update_displayed_stance_list();
    if(save_data.current_stance) {
        current_stance = save_data.current_stance;
        selected_stance = save_data.selected_stance;
        change_stance(selected_stance);
    }
    
    if(save_data.faved_stances) {
        Object.keys(save_data.faved_stances).forEach(stance_id=> {
            if(stances[stance_id] && stances[stance_id].is_unlocked) {
                fav_stance(stance_id);
            }
        });
    }

    Object.keys(save_data.character.equipment).forEach(function(key){
        if(save_data.character.equipment[key] != null) {
            const quality_mult = compare_game_version("v0.4.4", save_data["game version"]) == 1?100:1; //x100 if its from before quality rework
            try{
                if(key === "weapon") {
                    const {quality, equip_slot} = save_data.character.equipment[key];
                    let components;
                    if(save_data.character.equipment[key].components) {
                        components = save_data.character.equipment[key].components
                    } else {
                        const {head, handle} = save_data.character.equipment[key];
                        components = {head, handle};
                    }

                    if(!item_templates[components.head]){
                        console.warn(`Skipped item: weapon head component "${components.head}" couldn't be found!`);
                    } else if(!item_templates[components.handle]) {
                        console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                    } else {
                        const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                        equip_item(item);
                    }
                } else if(key === "off-hand") {
                    const {quality, equip_slot} = save_data.character.equipment[key];
                    let components;
                    if(save_data.character.equipment[key].components) {
                        components = save_data.character.equipment[key].components
                    } else {
                        const {shield_base, handle} = save_data.character.equipment[key];
                        components = {shield_base, handle};
                    }

                    if(!item_templates[components.shield_base]){
                        console.warn(`Skipped item: shield base component "${components.shield_base}" couldn't be found!`);
                    } else if(!item_templates[components.handle]) {
                        console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                    } else {
                        const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                        equip_item(item);
                    }
                } else if(save_data.character.equipment[key].equip_slot === "arti'fact" || save_data.character.equipment[key].tags?.tool) {
                    equip_item(getItem(save_data.character.equipment[key]));
                } else { //armor
                    
                    const {quality, equip_slot} = save_data.character.equipment[key];
                    
                    if(save_data.character.equipment[key].components && save_data.character.equipment[key].components.internal.includes(" [component]")) {
                        //compatibility for armors from before v0.4.3
                        const item = getItem({...item_templates[save_data.character.equipment[key].components.internal.replace(" [component]","")], quality:quality*quality_mult});
                        equip_item(item);
                    }
                    else if(save_data.character.equipment[key].components) {
                        let components = save_data.character.equipment[key].components;
                        if(!item_templates[components.internal]){
                            console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                        } else if(components.external && !item_templates[components.external]) {
                            console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                        } else {
                            const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    } else {
                        const item = getItem({...item_templates[save_data.character.equipment[key].name], quality:quality*quality_mult});
                        equip_item(item);
                    }

                }
            } catch (error) {
                console.error(error);
            }
        }
    }); //equip proper items

    if(character.equipment.weapon === null) {
        equip_item(null);
    }

    const item_list = [];

    Object.keys(save_data.character.inventory).forEach(function(key){
        if(is_JSON(key)) {
            //case where this is False is left as compatibility for saves before v0.4.4
            let {id, components, quality} = JSON.parse(key);
            if(id && !quality) { 
                //id is just a key of item_templates
                //if it's present, item is "simple" (no components)
                //and if it has no quality, it's something non-equippable
                if(item_templates[id]) {
                    item_list.push({item: getItem(item_templates[id]), count: save_data.character.inventory[key].count});
                    
                } else {
                    console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]} couldn't be found!`);
                    return;
                }
            } else if(components) {
                const {head, handle, shield_base, internal, external} = components;
                if(head) { //weapon
                    if(!item_templates[head]){
                        console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                        return;
                    } else if(!item_templates[handle]) {
                        console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                        return;
                    } else {
                        const item = getItem({components, quality, equip_slot: "weapon", item_type: "EQUIPPABLE"});
                        item_list.push({item, count: 1});
                    }
                } else if(shield_base){ //shield
                    if(!item_templates[shield_base]){
                        console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                        return;
                    } else if(!item_templates[handle]) {
                        console.warn(`Skipped item: shield handle component "${handle}" couldn't be found!`);
                        return;
                    } else {
                        const item = getItem({components, quality, equip_slot: "off-hand", item_type: "EQUIPPABLE"});
                        item_list.push({item, count: 1});
                    }
                } else if(internal) { //armor
                    if(!item_templates[internal]){
                        console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                        return;
                    } else if(!item_templates[external]) {
                        console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                        return;
                    } else {
                        let equip_slot = getArmorSlot(internal);
                        if(!equip_slot) {
                            return;
                        }
                        const item = getItem({components, quality, equip_slot, item_type: "EQUIPPABLE"});
                        item_list.push({item, count: 1});
                    }
                } else {
                    console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} seems to refer to non-existing item type!`);
                }
            } else if(quality) { //no comps but quality (clothing / artifact?)
                const item = getItem({...item_templates[id], quality});
                item_list.push({item, count: save_data.character.inventory[key].count});
            } else {
                console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} is incorrect!`);
            }
            
        } else {
            if(Array.isArray(save_data.character.inventory[key])) { //is a list of unstackable items (equippables or books), needs to be added 1 by 1
                for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                    try{
                        if(save_data.character.inventory[key][i].item_type === "EQUIPPABLE" )
                        {
                            if(save_data.character.inventory[key][i].equip_slot === "weapon") {
                                
                                const {quality, equip_slot} = save_data.character.inventory[key][i];
                                let components;
                                if(save_data.character.inventory[key][i].components) {
                                    components = save_data.character.inventory[key][i].components
                                } else {
                                    const {head, handle} = save_data.character.inventory[key][i];
                                    components = {head, handle};
                                }
    
                                if(!item_templates[components.head]){
                                    console.warn(`Skipped item: weapon head component "${components.head}" couldn't be found!`);
                                } else if(!item_templates[components.handle]) {
                                    console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                                } else {
                                    const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                    item_list.push({item, count: 1});
                                }
                            } else if(save_data.character.inventory[key][i].equip_slot === "off-hand") {
                                const {quality, equip_slot} = save_data.character.inventory[key][i];
                                let components;
                                if(save_data.character.inventory[key][i].components) {
                                    components = save_data.character.inventory[key][i].components
                                } else {
                                    const {shield_base, handle} = save_data.character.inventory[key][i];
                                    components = {shield_base, handle};
                                }
    
                                if(!item_templates[components.shield_base]){
                                    console.warn(`Skipped item: shield base component "${components.shield_base}" couldn't be found!`);
                                } else if(!item_templates[components.handle]) {
                                    console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                                } else {
                                    const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                    item_list.push({item, count: 1});
                                }
                            } else if(save_data.character.inventory[key][i].equip_slot === "artifact") {
                                item_list.push({item: getItem(save_data.character.inventory[key][i]), count: 1});
                            } else { //armor
                                const {quality, equip_slot} = save_data.character.inventory[key][i];
    
                                if(save_data.character.inventory[key][i].components && save_data.character.inventory[key][i].components.internal.includes(" [component]")) {
                                    //compatibility for armors from before v0.4.3
                                    const item = getItem({...item_templates[save_data.character.inventory[key][i].components.internal.replace(" [component]","")], quality: quality});
                                    item_list.push({item, count: 1});
                                }
                                else if(save_data.character.inventory[key][i].components) {
                                    let components = save_data.character.inventory[key][i].components;
                                    if(!item_templates[components.internal]){
                                        console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                                    } else if(components.external && !item_templates[components.external]) {
                                        console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                                    } else {
                                        const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                        item_list.push({item, count: 1});
                                    }
                                } else {
                                    const item = getItem({...item_templates[save_data.character.inventory[key][i].id], quality: quality*100});
                                    item_list.push({item, count: 1});
                                }
                            }
                        } else {
                            item_list.push({item: getItem({...item_templates[save_data.character.inventory[key][i].id], quality: save_data.character.inventory[key][i].quality*100}), count: 1});
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            else { //is stackable 
                if(item_templates[key]) {
                    item_list.push({item: getItem(item_templates[save_data.character.inventory[key].item.name]), count: save_data.character.inventory[key].count});
                } else {
                    console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]}" couldn't be found!`);
                    return;
                }
            }
        }
    }); //add all loaded items to list
    add_to_character_inventory(item_list); // and then to inventory

    Object.keys(save_data.dialogues).forEach(function(dialogue) {
        if(dialogues[dialogue]) {
            dialogues[dialogue].is_unlocked = save_data.dialogues[dialogue].is_unlocked;
            dialogues[dialogue].is_finished = save_data.dialogues[dialogue].is_finished;
        } else {
            console.warn(`Dialogue "${dialogue}" couldn't be found!`);
            return;
        }
        if(save_data.dialogues[dialogue].textlines) {  
            Object.keys(save_data.dialogues[dialogue].textlines).forEach(function(textline){
                if(dialogues[dialogue].textlines[textline]) {
                    dialogues[dialogue].textlines[textline].is_unlocked = save_data.dialogues[dialogue].textlines[textline].is_unlocked;
                    dialogues[dialogue].textlines[textline].is_finished = save_data.dialogues[dialogue].textlines[textline].is_finished;
                } else {
                    console.warn(`Textline "${textline}" in dialogue "${dialogue}" couldn't be found!`);
                    return;
                }
            }); 
        }
    }); //load for dialogues and their textlines their unlocked/finished status

    Object.keys(save_data.traders).forEach(function(trader) { 
        let trader_item_list = [];
        if(traders[trader]){

            //set as unlocked (it must have been unlocked to be saved, so no need to check the actual value)
            traders[trader].is_unlocked = true;

            if(save_data.traders[trader].inventory) {
                Object.keys(save_data.traders[trader].inventory).forEach(function(key){
                    if(is_JSON(key)) {
                        //case where this is False is left as compatibility for saves before v0.4.4
                        let {id, components, quality} = JSON.parse(key);
                        if(id && !quality) { 
                            //id is just a key of item_templates
                            //if it's present, item is "simple" (no components)
                            //and if it has no quality, it's something non-equippable
                            if(item_templates[id]) {
                                trader_item_list.push({item: getItem(item_templates[id]), count: save_data.traders[trader].inventory[key].count});
                            } else {
                                console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]} couldn't be found!`);
                                return;
                            }
                        } else if(components) {
                            const {head, handle, shield_base, internal, external} = components;
                            if(head) { //weapon
                                if(!item_templates[head]){
                                    console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                                    return;
                                } else if(!item_templates[handle]) {
                                    console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                                    return;
                                } else {
                                    const item = getItem({components, quality, equip_slot: "weapon", item_type: "EQUIPPABLE"});
                                    trader_item_list.push({item, count: 1});
                                }
                            } else if(shield_base){ //shield
                                if(!item_templates[shield_base]){
                                    console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                                    return;
                                } else if(!item_templates[handle]) {
                                    console.warn(`Skipped item: shield handle component "${handle}" couldn't be found!`);
                                    return;
                                } else {
                                    const item = getItem({components, quality, equip_slot: "off-hand", item_type: "EQUIPPABLE"});
                                    trader_item_list.push({item, count: 1});
                                }
                            } else if(internal) { //armor
                                if(!item_templates[internal]){
                                    console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                                    return;
                                } else if(!item_templates[external]) {
                                    console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                                    return;
                                } else {
                                    let equip_slot = getArmorSlot(internal);
                                    if(!equip_slot) {
                                        return;
                                    }
                                    const item = getItem({components, quality, equip_slot, item_type: "EQUIPPABLE"});
                                    trader_item_list.push({item, count: 1});
                                }
                            } else {
                                console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} seems to refer to non-existing item type!`);
                            }
                        } else if(quality) { //no comps but quality (clothing / artifact?)
                            const item = getItem({...item_templates[id], quality});
                            trader_item_list.push({item, count: save_data.traders[trader].inventory[key].count});
                        } else {
                            console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} is incorrect!`);
                        }
                        
                    } else {
                        if(Array.isArray(save_data.traders[trader].inventory[key])) { //is a list of unstackable (equippable or book) item, needs to be added 1 by 1
                            for(let i = 0; i < save_data.traders[trader].inventory[key].length; i++) {
                                try{
                                    if(save_data.traders[trader].inventory[key][i].item_type === "EQUIPPABLE"){
                                        if(save_data.traders[trader].inventory[key][i].equip_slot === "weapon") {
                                            const {quality, equip_slot} = save_data.traders[trader].inventory[key][i];
                                            let components;
                                            if(save_data.traders[trader].inventory[key][i].components) {
                                                components = save_data.traders[trader].inventory[key][i].components
                                            } else {
                                                const {head, handle} = save_data.traders[trader].inventory[key][i];
                                                components = {head, handle};
                                            }
    
                                            if(!item_templates[components.head]){
                                                console.warn(`Skipped item: weapon head component "${components.head}" couldn't be found!`);
                                            } else if(!item_templates[components.handle]) {
                                                console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                                            } else {
                                                const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                                trader_item_list.push({item, count: 1});
                                            }
                                        } else if(save_data.traders[trader].inventory[key][i].equip_slot === "off-hand") {
                                            
                                            const {quality, equip_slot} = save_data.traders[trader].inventory[key][i];
                                            let components;
                                            if(save_data.traders[trader].inventory[key][i].components) {
                                                components = save_data.traders[trader].inventory[key][i].components
                                            } else {
                                                const {shield_base, handle} = save_data.traders[trader].inventory[key][i];
                                                components = {shield_base, handle};
                                            }
    
                                            if(!item_templates[components.shield_base]){
                                                console.warn(`Skipped item: shield base component "${components.shield_base}" couldn't be found!`);
                                            } else if(!item_templates[components.handle]) {
                                                console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                                            } else {
                                                const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                                trader_item_list.push({item, count: 1});
                                            }
                                        } else { //armor
    
                                            const {quality, equip_slot} = save_data.traders[trader].inventory[key][i];
                                            if(save_data.traders[trader].inventory[key][i].components && save_data.traders[trader].inventory[key][i].components.internal.includes(" [component]")) {
                                                //compatibility for armors from before v0.4.3
                                                const item = getItem({...item_templates[save_data.traders[trader].inventory[key][i].components.internal.replace(" [component]","")], quality: quality*100});
                                                trader_item_list.push({item, count: 1});
                                            } else if(save_data.traders[trader].inventory[key][i].components) {
                                                let components = save_data.traders[trader].inventory[key][i].components;
                                                if(!item_templates[components.internal]){
                                                    console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                                                } else if(components.external && !item_templates[components.external]) {
                                                    console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                                                } else {
                                                    const item = getItem({components, quality: quality*100, equip_slot, item_type: "EQUIPPABLE"});
                                                    trader_item_list.push({item, count: 1});
                                                }
                                            } else {
                                                const item = getItem({...item_templates[save_data.traders[trader].inventory[key][i].name], quality: quality*100});
                                                trader_item_list.push({item, count: 1});
                                            }
                                        }
                                    } else {
                                        console.warn(`Skipped item, no such item type as "${0}" could be found`)
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                        else {
                            save_data.traders[trader].inventory[key].item.value = item_templates[key].value;
                            if(item_templates[key].item_type === "EQUIPPABLE") {
                                save_data.traders[trader].inventory[key].item.equip_effect = item_templates[key].equip_effect;
                            } else if(item_templates[key].item_type === "USABLE") {
                                save_data.traders[trader].inventory[key].item.use_effect = item_templates[key].use_effect;
                            }
                            trader_item_list.push({item: getItem(item_templates[save_data.traders[trader].inventory[key].item.name]), count: save_data.traders[trader].inventory[key].count});
                        }
                    }
                });
                
            }
            traders[trader].refresh(); 
            traders[trader].inventory = {};
            add_to_trader_inventory(trader, trader_item_list);

            traders[trader].last_refresh = save_data.traders[trader].last_refresh; 
        }
        else {
            console.warn(`Trader "${trader} couldn't be found!`);
            return;
        }
    }); //load trader inventories

    Object.keys(save_data.locations).forEach(function(key) {
        if(locations[key]) {
            if(save_data.locations[key].is_unlocked) {
                locations[key].is_unlocked = true;
            }
            if(save_data.locations[key].is_finished) {
                locations[key].is_finished = true;
            }
            if("parent_location" in locations[key]) { // if combat zone
                locations[key].enemy_groups_killed = save_data.locations[key].enemy_groups_killed || 0;   
            }

            //unlock activities
            if(save_data.locations[key].unlocked_activities) {
                for(let i = 0; i < save_data.locations[key].unlocked_activities.length; i++) {
                    if(!locations[key].activities[save_data.locations[key].unlocked_activities[i]]) {
                        continue;
                    }
                    if(save_data.locations[key].unlocked_activities[i] === "plowing the fields") {
                        locations[key].activities["fieldwork"].is_unlocked = true;
                    } else {
                        locations[key].activities[save_data.locations[key].unlocked_activities[i]].is_unlocked = true;
                    }
                }
            }
        } else {
            console.warn(`Location "${key}" couldn't be found!`);
            return;
        }
    }); //load for locations their unlocked status and their killcounts

    Object.keys(save_data.activities).forEach(function(activity) {
        if(activities[activity]) {
            activities[activity].is_unlocked = save_data.activities[activity].is_unlocked || false;
        } else if(activity === "plowing the fields") {
            activities["fieldwork"].is_unlocked = save_data.activities[activity].is_unlocked || false;
        } else {
            console.warn(`Activity "${activity}" couldn't be found!`);
        }
    });

    setLootSoldCount(save_data.loot_sold_count || {});

    //load active effects if save is not from before their rework
    if(compare_game_version(save_data["game version"], "v0.4.4") >= 0){
        Object.keys(save_data.active_effects).forEach(function(effect) {
            active_effects[effect] = save_data.active_effects[effect];
        });
    }
    if(save_data.character.hp_to_full == null || save_data.character.hp_to_full >= character.stats.full.max_health) {
        character.stats.full.health = 1;
    } else {
        character.stats.full.health = character.stats.full.max_health - save_data.character.hp_to_full;
    }
    //if missing hp is null (save got corrupted) or its more than max_health, set health to minimum allowed (which is 1)
    //otherwise just do simple substraction
    //then same with stamina below
    if(save_data.character.stamina_to_full == null || save_data.character.stamina_to_full >= character.stats.full.max_stamina) {
        character.stats.full.stamina = 0;
    } else {
        character.stats.full.stamina = character.stats.full.max_stamina - save_data.character.stamina_to_full;
    }

    if(save_data["enemy_killcount"]) {
        Object.keys(save_data["enemy_killcount"]).forEach(enemy_name => {
            enemy_killcount[enemy_name] = save_data["enemy_killcount"][enemy_name];
            create_new_bestiary_entry(enemy_name);
        });
    }

    update_character_stats();
    update_displayed_character_inventory();

    update_displayed_health();
    //load current health
    
    update_displayed_effects();
    
    create_displayed_crafting_recipes();
    change_location(save_data["current location"]);

    //set activity if any saved
    if(save_data.current_activity) {
        //search for it in location from save_data
        const activity_id = save_data.current_activity.activity_id;
        if(typeof activity_id !== "undefined" && current_location.activities[activity_id] && activities[activity_id]) {
            
            start_activity(activity_id);
            if(activities[activity_id].type === "JOB") {
                current_activity.working_time = save_data.current_activity.working_time;
                current_activity.earnings = save_data.current_activity.earnings * ((is_from_before_eco_rework == 1)*10 || 1);
                document.getElementById("action_end_earnings").innerHTML = `(earnings: ${format_money(current_activity.earnings)})`;
            }

            current_activity.gathering_time = save_data.current_activity.gathering_time;
            
        } else {
            console.warn("Couldn't find saved activity! It might have been removed");
        }
    }

    if(save_data.is_sleeping) {
        start_sleeping();
    }
    if(save_data.is_reading) {
        start_reading(save_data.is_reading);
    }

    update_displayed_time();
} //core function for loading

/**
 * called from index.html
 * loads game from file by resetting everything that needs to be reset and then calling main loading method with same parameter
 * @param {String} save_string 
 */
function load_from_file(save_string) {
    try{
        if(is_on_dev()) {
            localStorage.setItem(dev_save_key, atob(save_string));
        } else {
            localStorage.setItem(save_key, atob(save_string));
        }        
        window.location.reload(false);
    } catch (error) {
        console.error("Something went wrong on preparing to load from file!");
        console.error(error);
    }
} //called on loading from file, clears everything

/**
 * loads the game from localStorage
 * it's called when page is refreshed, so there's no need for it to reset anything
 */
function load_from_localstorage() {
    try{
        if(is_on_dev()) {
            if(localStorage.getItem(dev_save_key)){
                load(JSON.parse(localStorage.getItem(dev_save_key)));
                log_message("Loaded dev save. If you want to use save from live version, import it through options panel or manually");
            } else {
                load(JSON.parse(localStorage.getItem(save_key)));
                log_message("Dev save was not found. Loaded live version save.");
            }
        } else {
            load(JSON.parse(localStorage.getItem(save_key)));
        }
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
}

function load_backup() {
    try{
        if(is_on_dev()) {
            if(localStorage.getItem(dev_backup_key)){
                localStorage.setItem(dev_save_key, localStorage.getItem(dev_backup_key));
                window.location.reload(false);
            } else {
                console.log("Can't load backup as there is none yet.");
                log_message("Can't load backup as there is none yet.");
            }
        } else {
            if(localStorage.getItem(backup_key)){
                localStorage.setItem(save_key, localStorage.getItem(backup_key));
                window.location.reload(false);
            } else {
                console.log("Can't load backup as there is none yet.")
                log_message("Can't load backup as there is none yet.");
            }
        }
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
}

function load_other_release_save() {
    try{
        if(is_on_dev()) {
            if(localStorage.getItem(save_key)){
                localStorage.setItem(dev_save_key, localStorage.getItem(save_key));
                window.location.reload(false);
            } else {
                console.log("There are no saves on the other release.")
                log_message("There are no saves on the other release.");
            }
        } else {
            if(localStorage.getItem(dev_save_key)){
                localStorage.setItem(save_key, localStorage.getItem(dev_save_key));
                window.location.reload(false);
            } else {
                console.log("There are no saves on the other release.");
                log_message("There are no saves on the other release.");
            }
        }
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
}

//update game time
function update_timer() {
    current_game_time.go_up(is_sleeping ? 6 : 1);
    update_character_stats(); //done every second, mostly because of daynight cycle; gotta optimize it at some point
    update_displayed_time();
}

function update() {
    setTimeout(function()
    {
        end_date = Date.now(); 
        //basically when previous tick ends

        time_variance_accumulator += ((end_date - start_date) - 1000/tickrate);
        //duration of previous tick, minus time it was supposed to take
        //important to keep it between setting end_date and start_date, so they are 2 completely separate values

        start_date = Date.now();
        /*
        basically when current tick starts
        so before this assignment, start_date is when previous tick started
        and end_date is when previous_tick ended
        */

        const prev_day = current_game_time.day;
        update_timer();

        const curr_day = current_game_time.day;
        if(curr_day > prev_day) {
            recoverItemPrices();
            update_displayed_character_inventory();
        }

        if("parent_location" in current_location){ //if it's a combat_zone
            //nothing here i guess?
        } else { //everything other than combat
            if(is_sleeping) {
                do_sleeping();
                add_xp_to_skill({skill: skills["Sleeping"], xp_to_add: current_location.sleeping?.xp});
            }
            else {
                if(is_resting) {
                    do_resting();
                }
                if(is_reading) {
                    do_reading();
                }
            } 

            if(selected_stance !== current_stance) {
                change_stance(selected_stance);
            }

            if(current_activity) { //in activity

                //add xp to all related skills
                if(activities[current_activity.activity_name].type !== "GATHERING"){
                    for(let i = 0; i < activities[current_activity.activity_name].base_skills_names?.length; i++) {
                        add_xp_to_skill({skill: skills[activities[current_activity.activity_name].base_skills_names[i]], xp_to_add: current_activity.skill_xp_per_tick});
                    }
                }

                current_activity.gathering_time += 1;
                if(current_activity.gained_resources)
                {
                    if(current_activity.gathering_time >= current_activity.gathering_time_needed) { 
                        const {gathering_time_needed, gained_resources} = current_activity.getActivityEfficiency();

                        current_activity.gathering_time_needed = gathering_time_needed;

                        const items = [];

                        for(let i = 0; i < gained_resources.length; i++) {
                            if(Math.random() > (1-gained_resources[i].chance)) {
                                const count = Math.floor(Math.random()*(gained_resources[i].count[1]-gained_resources[i].count[0]+1))+gained_resources[i].count[0];
                                items.push({item: item_templates[gained_resources[i].name], count: count});
                            }
                        }

                        if(items.length > 0) {
                            log_loot(items, false);
                            add_to_character_inventory(items);
                        }

                        let leveled = false;
                        if(activities[current_activity.activity_name].type === "GATHERING"){
                            for(let i = 0; i < activities[current_activity.activity_name].base_skills_names?.length; i++) {
                                leveled = add_xp_to_skill({skill: skills[activities[current_activity.activity_name].base_skills_names[i]], xp_to_add: current_activity.skill_xp_per_tick}) || leveled;
                            }
                            
                            //if(leveled) {
                                update_gathering_tooltip(current_activity);
                            //}
                        }

                        current_activity.gathering_time = 0;
                    }
                }

                //if job: payment
                if(activities[current_activity.activity_name].type === "JOB") {
                    current_activity.working_time += 1;

                    if(current_activity.working_time % current_activity.working_period == 0) { 
                        //finished working period, add money
                        current_activity.earnings += current_activity.get_payment();
                    }
                    update_displayed_ongoing_activity(current_activity, true);
                    
                    if(!can_work(current_activity)) {
                        end_activity();
                    }
                } else {
                    update_displayed_ongoing_activity(current_activity, false);
                }

                //if gathering: add drops to inventory

            } else {
                const divs = document.getElementsByClassName("activity_div");
                for(let i = 0; i < divs.length; i++) {
                    const activity = current_location.activities[divs[i].getAttribute("data-activity")];

                    if(activities[activity.activity_name].type === "JOB") {
                        if(can_work(activity)) {
                            divs[i].classList.remove("activity_unavailable");
                            divs[i].classList.add("start_activity");
                        } else {
                            divs[i].classList.remove("start_activity");
                            divs[i].classList.add("activity_unavailable");
                        }
                        
                    }
                }
            }

            const sounds = current_location.getBackgroundNoises();
            if(sounds.length > 0){
                if(Math.random() < 1/600) {
                    log_message(`"${sounds[Math.floor(Math.random()*sounds.length)]}"`, "background");
                }
            }
        }

        Object.keys(active_effects).forEach(key => {
            active_effects[key].duration--;
            if(active_effects[key].duration <= 0) {
                delete active_effects[key];
                character.stats.add_active_effect_bonus();
                update_character_stats();
            }
        });
        update_displayed_effect_durations();
        update_displayed_effects();

        //health regen
        if(character.stats.full.health_regeneration_flat) {
            character.stats.full.health += character.stats.full.health_regeneration_flat;
        }
        if(character.stats.full.health_regeneration_percent) {
            character.stats.full.health += character.stats.full.max_health * character.stats.full.health_regeneration_percent/100;
        }
        //stamina regen
        if(character.stats.full.stamina_regeneration_flat) {
            character.stats.full.stamina += character.stats.full.stamina_regeneration_flat;
        }
        if(character.stats.full.stamina_regeneration_percent) {
            character.stats.full.stamina += character.stats.full.max_stamina * character.stats.full.stamina_regeneration_percent/100;
        }
        //mana regen
        if(character.stats.full.mana_regeneration_flat) {
            character.stats.full.mana += character.stats.full.mana_regeneration_flat
        }
        if(character.stats.full.mana_regeneration_percent) {
            character.stats.full.mana += character.stats.full.max_mana * character.stats.full.mana_regeneration_percent/100;
        }

        if(character.stats.full.health > character.stats.full.max_health) {
            character.stats.full.health = character.stats.full.max_health
        }

        if(character.stats.full.stamina > character.stats.full.max_stamina) {
            character.stats.full.stamina = character.stats.full.max_stamina
        }

        if(character.stats.full.health_regeneration_flat || character.stats.full.health_regeneration_percent) {
            update_displayed_health();
        }
        if(character.stats.full.stamina_regeneration_flat || character.stats.full.stamina_regeneration_percent) {
            update_displayed_stamina();
        }
        
        save_counter += 1;
        if(save_counter >= save_period*tickrate) {
            save_counter = 0;
            if(is_on_dev()) {
                save_to_localStorage({key: dev_save_key});
            } else {
                save_to_localStorage({key: save_key});
            }
            console.log("Auto-saved the game!");
        } //save in regular intervals, irl time independent from tickrate

        backup_counter += 1;
        if(backup_counter >= backup_period*tickrate) {
            backup_counter = 0;
            let saved_at;
            if(is_on_dev()) {
                saved_at = save_to_localStorage({key: dev_backup_key});
            } else {
                saved_at = save_to_localStorage({key: backup_key});
            }

            if(saved_at) {
                update_backup_load_button(saved_at);
            }
            console.log("Created an automatic backup!");
        }

        if(!is_sleeping && current_location && current_location.light_level === "normal" && (current_game_time.hour >= 20 || current_game_time.hour <= 4)) 
        {
            add_xp_to_skill({skill: skills["Night vision"], xp_to_add: 1});
        }

        //add xp to proper skills based on location types
        if(current_location) {
            const skills = current_location.gained_skills;
            let leveled = false;
            for(let i = 0; i < skills?.length; i++) {
                leveled = add_xp_to_skill({skill: current_location.gained_skills[i].skill, xp_to_add: current_location.gained_skills[i].xp}) || leveled;
            }
            if(leveled){
                update_displayed_location_types(current_location);
            }
        }

        //limiting maximum adjustment, to avoid any absurd results;
        if(time_variance_accumulator <= 100/tickrate && time_variance_accumulator >= -100/tickrate) {
            time_adjustment = time_variance_accumulator;
        }
        else {
            if(time_variance_accumulator > 100/tickrate) {
                time_adjustment = 100/tickrate;
            }
            else {
                if(time_variance_accumulator < -100/tickrate) {
                    time_adjustment = -100/tickrate;
                }
            }
        }

        total_playtime += 1/tickrate;
        update();
    }, 1000/tickrate - time_adjustment);
    //uses time_adjustment based on time_variance_accumulator for more precise overall stabilization
    //(instead of only stabilizing relative to previous tick, it stabilizes relative to sum of deviations)
    //probably completely unnecessary lol, but hey, it sounds cool
}

function run() {
    if(typeof current_location === "undefined") {
        change_location("Village");
    } 
    
    update_displayed_health();
        
    start_date = Date.now();
    update();   
}

window.equip_item = character_equip_item;
window.unequip_item = character_unequip_item;

window.change_location = change_location;
window.reload_normal_location = reload_normal_location;

window.start_dialogue = start_dialogue;
window.end_dialogue = end_dialogue;
window.start_textline = start_textline;

window.update_displayed_location_choices = update_displayed_location_choices;

window.start_activity = start_activity;
window.end_activity = end_activity;

window.start_sleeping = start_sleeping;
window.end_sleeping = end_sleeping;

window.start_reading = start_reading;
window.end_reading = end_reading;

window.start_trade = start_trade;
window.exit_trade = exit_trade;
window.add_to_buying_list = add_to_buying_list;
window.remove_from_buying_list = remove_from_buying_list;
window.add_to_selling_list = add_to_selling_list;
window.remove_from_selling_list = remove_from_selling_list;
window.cancel_trade = cancel_trade;
window.accept_trade = accept_trade;
window.is_in_trade = is_in_trade;

window.format_money = format_money;
window.get_character_money = character.get_character_money;

window.use_item = use_item;

window.do_enemy_combat_action = do_enemy_combat_action;

window.sort_displayed_inventory = sort_displayed_inventory;
window.update_displayed_character_inventory = update_displayed_character_inventory;
window.update_displayed_trader_inventory = update_displayed_trader_inventory;

window.sort_displayed_skills = sort_displayed_skills;

window.change_stance = change_stance;
window.fav_stance = fav_stance;

window.openCraftingWindow = open_crafting_window;
window.closeCraftingWindow = close_crafting_window;
window.switchCraftingRecipesPage = switch_crafting_recipes_page;
window.switchCraftingRecipesSubpage = switch_crafting_recipes_subpage;
window.useRecipe = use_recipe;
window.updateDisplayedComponentChoice = update_displayed_component_choice;
window.updateDisplayedMaterialChoice = update_displayed_material_choice;
window.updateRecipeTooltip = update_recipe_tooltip;

window.option_uniform_textsize = option_uniform_textsize;
window.option_bed_return = option_bed_return;
window.option_combat_autoswitch = option_combat_autoswitch;
window.option_remember_filters = option_remember_filters;

window.getDate = get_date;

window.saveProgress = save_progress;
window.save_to_file = save_to_file;
window.load_progress = load_from_file;
window.loadBackup = load_backup;
window.importOtherReleaseSave = load_other_release_save;
window.get_game_version = get_game_version;

if(save_key in localStorage || (is_on_dev() && dev_save_key in localStorage)) {
    load_from_localstorage();
    update_character_stats();
    update_displayed_xp_bonuses();
}
else {
    add_to_character_inventory([{item: getItem({...item_templates["Cheap iron sword"], quality: 40})}, 
                                {item: getItem({...item_templates["Cheap leather pants"], quality: 40})},
                                {item: getItem(item_templates["Stale bread"]), count: 5},
                                //{item: getItem(item_templates["Rat fang"]), count: 1000},
                            ]);

    equip_item_from_inventory({item_name: "Cheap iron sword", item_id: 0});
    equip_item_from_inventory({item_name: "Cheap leather pants", item_id: 0});
    add_xp_to_character(0);
    character.money = 102;
    update_displayed_money();
    update_character_stats();

    update_displayed_stance_list();
    change_stance("normal");
    create_displayed_crafting_recipes();
    change_location("Village");
} //checks if there's an existing save file, otherwise just sets up some initial equipment

document.getElementById("loading_screen").style.visibility = "hidden";


function add_stuff_for_testing() {
    add_to_character_inventory([
        {item: getItem({...item_templates["Iron spear"], quality: 1}), count: 100},
        {item: getItem({...item_templates["Iron spear"], quality: 2}), count: 100},
        {item: getItem({...item_templates["Iron spear"], quality: 1}), count: 1},
    ]);
}

function add_all_stuff_to_inventory(){
    Object.keys(item_templates).forEach(item => {
        add_to_character_inventory([
            {item: getItem({...item_templates[item]}), count: 5},
        ]);
    })
}

//add_to_character_inventory([{item: getItem(item_templates["ABC for kids"]), count: 10}]);
//add_stuff_for_testing();
//add_all_stuff_to_inventory();

update_displayed_equipment();
sort_displayed_inventory({sort_by: "name", target: "character"});

run();

//Verify_Game_Objects();
window.Verify_Game_Objects = Verify_Game_Objects;

if(is_on_dev()) {
    log_message("It looks like you are playing on the dev release. It is recommended to keep the developer console open (in Chrome/Firefox/Edge it's at F12 => 'Console' tab) in case of any errors/warnings appearing in there.", "notification");

    if(localStorage[dev_backup_key]) {
        update_backup_load_button(JSON.parse(localStorage[dev_backup_key]).saved_at);
    } else {
        update_backup_load_button();
    }

    if(localStorage[save_key]) {
        update_other_save_load_button(JSON.parse(localStorage[save_key]).saved_at || "", true);
    } else {
        update_other_save_load_button(null, true);
    }
} else {
    if(localStorage[backup_key]) {
        update_backup_load_button(JSON.parse(localStorage[backup_key]).saved_at);
    } else {
        update_backup_load_button();
    }

    if(localStorage[dev_save_key]) {
        update_other_save_load_button(JSON.parse(localStorage[dev_save_key]).saved_at || "");
    } else {
        update_other_save_load_button();
    }
}

export { current_enemies, can_work, 
        current_location, active_effects, 
        enough_time_for_earnings, add_xp_to_skill, 
        get_current_book, 
        last_location_with_bed, 
        last_combat_location, 
        current_stance, selected_stance,
        faved_stances, options,
        global_flags,
        character_equip_item };