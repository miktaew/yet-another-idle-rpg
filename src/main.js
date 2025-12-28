"use strict";

import { current_game_time, is_night } from "./game_time.js";
import { item_templates, getItem, book_stats, rarity_multipliers, getArmorSlot, getItemFromKey, getItemRarity} from "./items.js";
import { loot_sold_count, market_region_mapping, recover_item_prices, trickle_market_saturations, set_loot_sold_count, capped_at } from "./market_saturation.js";
import { locations, favourite_locations } from "./locations.js";
import { crafting_skill_xp_gains_cap, skill_categories, skill_xp_gains_cap, skills, weapon_type_to_skill, which_skills_affect_skill } from "./skills.js";
import { dialogues } from "./dialogues.js";
import { enemy_killcount, enemy_templates, tags_for_droprate_modifier_skills } from "./enemies.js";
import { traders } from "./traders.js";
import { is_in_trade, start_trade, cancel_trade, accept_trade, exit_trade, add_to_trader_inventory,
         add_to_buying_list, remove_from_buying_list, add_to_selling_list, remove_from_selling_list} from "./trade.js";
import { character, 
         add_to_character_inventory, remove_from_character_inventory,
         equip_item_from_inventory, unequip_item, equip_item,
         update_character_stats,
         get_skill_xp_gain, 
         get_total_skill_coefficient,
         get_total_skill_level,
         time_until_wet,
         cold_status_temperatures,
         time_until_cold,
         time_until_cold_when_wet,
         cold_status_effects,
         get_character_cold_tolerance,
         is_rat} from "./character.js";
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
         start_sleeping_display,
         create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description,
         update_displayed_ongoing_activity, 
         update_enemy_attack_bar, update_character_attack_bar,
         remove_fast_travel_choice,
         create_new_bestiary_entry,
         start_reading_display,
         update_displayed_xp_bonuses, 
         update_displayed_skill_xp_gain, update_all_displayed_skills_xp_gain, update_displayed_stance_list, 
         update_displayed_stamina_efficiency, update_displayed_stance, update_displayed_faved_stances, update_stance_tooltip,
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
         update_other_save_load_button,
         set_game_action_finish_text,
         update_game_action_progress_bar,
         update_game_action_finish_button,
         update_displayed_storage_inventory,
         update_location_icon,
         skill_list,
         update_booklist_entry,
         update_displayed_temperature,
         update_displayed_quest,
         start_rain_animation,
         start_snow_animation,
         stop_background_animation,
         skill_category_order,
         update_displayed_total_price,
         start_stars_animation,
         update_export_button_tooltip,
         update_displayed_reputation,
         hide_loading_screen,
         set_loading_screen_versions,
         set_loading_screen_errors_warning,
         set_loading_screen_progress,
         hide_loading_text,
         show_play_button,
         set_loading_screen_warnings_warning,
         fill_action_box,
         update_bestiary_entry_killcount,
         update_bestiary_entry_tooltip,
         set_play_button_text,
         do_enemy_onhit_animation,
         remove_enemy_onhit_animation,
         create_floating_effect,
         booklist_entry_divs,
         do_enemy_onstart_animation
        } from "./display.js";
import { compare_game_version, crafting_tags_to_skills, get_hit_chance, is_a_older_than_b, skill_consumable_tags } from "./misc.js";
import { stances } from "./combat_stances.js";
import { get_recipe_xp_value, recipes } from "./crafting_recipes.js";
import { game_version, get_game_version } from "./game_version.js";
import { ActiveEffect, effect_templates } from "./active_effects.js";
import { open_storage, close_storage, move_item_to_storage, remove_item_from_storage, player_storage, is_storage_open } from "./storage.js";
import { Verify_Game_Objects } from "./verifier.js";
import { ReputationManager } from "./reputation.js";
import { quests, questManager, active_quests } from "./quests.js";
import { get_current_temperature_smoothed, is_raining } from "./weather.js";
import { Pathfinder, speed_modifiers_from_skills } from "./pathfinding.js";

const save_key = "save data";
const dev_save_key = "dev save data";
const backup_key = "backup save";
const dev_backup_key = "dev backup save";

const global_flags = {
    is_gathering_unlocked: false,
    is_crafting_unlocked: false,
    is_strength_proved: false, //this role could be fulfilled by a quest, but it was originally added before that mechanic; besides, flags are cool and elegant
    is_mofu_mofu_enabled: true,
};
const flag_unlock_texts = {
    is_gathering_unlocked: "You have gained the ability to gather new materials! Remember to equip your tools first <br>[Note: equipped tools do not appear in inventory as you will be swapping them very rarely]",
    is_crafting_unlocked: "You have gained the ability to craft items and equipment!",
}

const play_button = document.getElementById("loading_screen_play_button");

const languages = {
    english: "english",
    mofu_english: "mofu_english",
};
let language = languages.mofu_english;

let is_loading_error = false;

//in seconds
let total_playtime = 0;

//some random stats to keep count of in case they ever become relevant
let total_deaths = 0;
let total_crafting_attempts = 0;
let total_crafting_successes = 0;
let total_kills = 0; 
let total_crits_done = 0;
let total_crits_taken = 0;
let total_hits_done = 0;
let total_hits_taken = 0;
let strongest_hit = 0;
let gathered_materials = {};

//
const trade_price_recovery_flat = 5;//
const trade_price_recovery_ratio = 1/360; //
//larger of two (sold count * ratio or flat value)
const market_saturation_trickle_rate = 0.2;

//keeping the time to use it for export bonus
let last_rewarded_export = 0;
const time_between_export_rewards = 1000*60*60*20; //1000 miliseconds -> 1s, x60 -> 1m, x60 -> 1h, x20 -> 20h

//temperature
let current_temperature = 20;

let rain_counter = 0;
const cold_status_counters = [0,0,0,0];

let was_raining = false;
let was_starry = false;

//current enemy
let current_enemies = null;

const enemy_attack_loops = {};
let enemy_attack_cooldowns;
let enemy_timer_variance_accumulator = [];
let enemy_timer_adjustment = [];
let enemy_timers = [];
let character_attack_loop;

let character_timer_variance_accumulator = 0;
let character_timer_adjustment = 0;
let character_timers = [];

const maximum_time_correction = 10;
//maximum time correction for combat, in miliseconds

//current location
let current_location;

let current_activity;

let game_action_interval;
let current_game_action;

//time needed to travel from A to B
let travel_times = {};
let pathfinder;

//locations for fast travel
let unlocked_beds = {};

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

let selected_stance = stances["normal"];
let current_stance = stances["normal"];
const faved_stances = {};

const favourite_consumables = {};
//consumables that are to be used automatically if their effect runs out

const tickrate = 1;
//how many ticks per second
//1 is the default value; going too high might make the game unstable

const global_xp_multiplier = 1;

//stuff from options panel
const options = {
    uniform_text_size_in_action: false,
    auto_return_to_bed: true,
    remember_message_log_filters: false,
    remember_sorting_options: false,
    combat_disable_autoswitch: false,
    log_every_gathering_period: true,
    log_total_gathering_gain: true,
    auto_use_when_longest_runs_out: true,
    use_uncivilised_temperature_scale: false, //true -> swap Celsius for Fahrenheit
    do_background_animations: false,
    skip_play_button: false, //not really skips, just automatically clicks it right after loading
    mofu_mofu_mode: true,
    do_enemy_onhit_animations: true,
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

//holds the stack of dialogues/textlines and actions/activities
const content_stack = [];
const content_stack_removal_options = {TOP: "top", ALL: "all"};

//character name
const name_field = document.getElementById("character_name_field");
name_field.value = character.name;
name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

const time_field = document.getElementById("time_div");
time_field.innerHTML = current_game_time.toString();

(function setup(){
    Object.keys(skills).forEach(skill => {
        character.xp_bonuses.total_multiplier[skill] = 1;
        character.bonus_skill_levels.full[skill] = 0;
    });
    
    Object.keys(skill_categories).forEach(category => {
        character.xp_bonuses.total_multiplier["category_"+category] = 1;
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

    if(option !== undefined) {
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

    if(option !== undefined) {
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

    if(option !== undefined) {
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

    if(option !== undefined) {
        checkbox.checked = option;
    }
}

function option_log_all_gathering(option) {
    const checkbox = document.getElementById("options_log_all_gathering");

    if(checkbox.checked || option) {
        options.log_every_gathering_period = true;
    } else {
        options.log_every_gathering_period = false;
    }

    if(option !== undefined) {
        checkbox.checked = option;
    }
}

function option_log_gathering_result(option) {
    const checkbox = document.getElementById("options_log_gathering_result");

    if(checkbox.checked || option) {
        options.log_total_gathering_gain = true;
    } else {
        options.log_total_gathering_gain = false;
    }

    if(option !== undefined) {
        checkbox.checked = option;
    }
}

function option_use_uncivilised_temperature_scale(option) {
    const checkbox = document.getElementById("options_use_uncivilised_temperature_scale");
    if(checkbox.checked || option) {
        options.use_uncivilised_temperature_scale = true;
    } else {
        options.use_uncivilised_temperature_scale = false;
    }

    if(option !== undefined) {
        checkbox.checked = option;
    }

    update_displayed_temperature();
}

function option_do_background_animations(option) {
    const checkbox = document.getElementById("options_do_background_animations");
    if(checkbox.checked || option) {
        options.do_background_animations = true;
    } else {
        options.do_background_animations = false;
        stop_background_animation();
        
        window.removeEventListener("resize", start_snow_animation);
        window.removeEventListener("resize", start_rain_animation);
        window.removeEventListener("resize", start_stars_animation);
    }

    if(option !== undefined) {
        checkbox.checked = option;
    }
}

function option_skip_play_button(option) {
    const checkbox = document.getElementById("options_skip_play_button");
    if(checkbox.checked || option) {
        options.skip_play_button = true;
    } else {
        options.skip_play_button = false;
    }
    
    if(option !== undefined) {
        checkbox.checked = option;
    }
}

function option_mofu_mofu_mode(option) {
    const checkbox = document.getElementById("options_mofu_mofu_mode");

    if(option !== undefined) {
        checkbox.checked = option;
    }

    if(checkbox.checked) {
        options.mofu_mofu_mode = true;
        global_flags.is_mofu_mofu_enabled = true;
        language = languages.mofu_english;
    } else {
        options.mofu_mofu_mode = false;
        global_flags.is_mofu_mofu_enabled = false;
        language = languages.english;
    }
}

function option_do_enemy_onhit_animations(option) {
    const checkbox = document.getElementById("options_do_enemy_onhit_animations");
    if(checkbox.checked || option) {
        options.do_enemy_onhit_animations = true;
    } else {
        options.do_enemy_onhit_animations = false;
    }
    
    if(option !== undefined) {
        checkbox.checked = option;
    }
}

/**
 * 
 * @param {Object} params
 * @param {Event} params.event
 * @param {Boolean} params.skip_combat used to not call start_combat function, used in loading as it's only called after 'PLAY' button is clicked
 */
function change_location({location_id, event, skip_travel_time = false, do_quest_events = true, skip_combat = false}) {
    if(event?.target.classList.contains("fast_travel_removal_button")) {
        return;
    }

    const previous_location = current_location;
    let location = locations[location_id] || current_location;

    if(location_id !== current_location?.name && location.is_finished) {
        //refuse to change location if it's finished and it's not the current one
        return;
    }

    clear_all_enemy_attack_loops();
    clear_character_attack_loop();
    clear_enemies();

    if(!location) {
        throw `No such location as "${location_id}"`;
    }

    if(do_quest_events) {
        do_quest_event({
            quest_event_type: "enter_location",
            quest_event_target: location.id,
            quest_event_count: 1,
        });
    } 

    if(typeof current_location !== "undefined" && current_location.id !== location.id){
        //so it's not called when initializing the location on page load or on reloading current location due to new unlocks
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }

    if(location.crafting) {
        update_displayed_crafting_recipes();
    }
    
    current_location = location;

    if(!pathfinder) {
        pathfinder = new Pathfinder();
        pathfinder.fill_connections(locations);
    }

    if(!travel_times[current_location.id]) {
        travel_times[current_location.id] = pathfinder.find_shortest_paths(current_location.id);
    }

    if(previous_location && !skip_travel_time) {
        progress_time({value: travel_times[previous_location.id][current_location.id], source: "travel"});
    }

    update_displayed_temperature();
    update_character_stats();

    if("connected_locations" in current_location) { 
        // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        update_displayed_normal_location(current_location);
    } else { //so if entering combat zone
        update_displayed_combat_location(current_location);
        if(!skip_combat) {
            start_combat();
        }

        if(!current_location.is_challenge) {
            last_combat_location = current_location.id;
        }
    }

    process_rewards({rewards: current_location.entrance_rewards});
}

function handle_location_icon_click() {
    if(current_location.housing && current_location.housing.is_unlocked) {
        return;
        //nothing
    } else if(favourite_locations[current_location.id]) {
        remove_location_from_favourites({location_id: current_location.id, update_choices: false});
    } else {
        add_location_to_favourites({location_id: current_location.id});
    }
}

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
        if(!can_work(current_activity)) {
            current_activity = null;
            return;
        }
        //
    } else if(activities[current_activity.activity_name].type === "GATHERING") { 
        
        let has_proper_tool = !activities[current_activity.activity_name].required_tool_type || character.equipment[activities[current_activity.activity_name].required_tool_type];
        //just check if slot is not empty

        if(!has_proper_tool) {
            log_message("You need to equip a proper tool to do that!");
            current_activity = null;
            return;
        }
        current_activity.gathered_materials = {};
    } else throw `"${activities[current_activity.activity_name].type}" is not a valid activity type!`;

    current_activity.gathering_time = 0;
    if(current_activity.gained_resources) {
        current_activity.gathering_time_needed = current_activity.getActivityEfficiency().gathering_time_needed;
    }

    add_to_content_stack({content_type: "activity", data: {activity: current_activity}});

    //start_activity_display(current_activity);
}

function end_activity() {
    
    log_message(`${character.name} finished ${current_activity.activity_name}`, "activity_finished");
    
    if(current_activity.earnings) {
        log_message(`${character.name} earned ${format_money(current_activity.earnings)}`, "activity_money");
        add_money_to_character(current_activity.earnings);
    }

    if(current_activity.gathered_materials && options.log_total_gathering_gain) {
        const loot = []; 
        Object.keys(current_activity.gathered_materials).forEach(mat_key => {
            loot.push({item_key: mat_key, count: current_activity.gathered_materials[mat_key]});
        });

        log_loot({loot_list: loot, is_a_summary: true});
    }
    end_activity_animation(); //clears the "animation"
    current_activity = null;
    remove_from_content_stack(content_stack_removal_options.TOP);
}

/**
 * Starts selected action, checks conditions if applicable, launches action animations
 * @param {String} action_key
 * @param {String} source either "location" or "dialogue"
 * @returns 
 */
function start_game_action(action_key, event) {
    current_game_action = action_key;
    let game_action;
    if(current_dialogue) {
        game_action = dialogues[current_dialogue].actions[action_key];
    } else{
        game_action = current_location.actions[action_key];
    }
    let conditions_status; //[0,...,1]

    add_to_content_stack({content_type:"action", data: {dialogue_key: current_dialogue, action_key: action_key}});
    //start_game_action_display(selected_action);

    if(!game_action.can_be_started(character)) {
        finish_game_action({action_key, conditions_status: -1, dialogue_key: current_dialogue});
        return;
    }
    
    if(!game_action.check_conditions_on_finish) {
        conditions_status = game_action.get_conditions_status(character);

        if(conditions_status == 0) {
            finish_game_action({action_key, conditions_status: 0, dialogue_key: current_dialogue});
            return;
        }
    }

    if(event && game_action.floating_click_effects) {
        const random_effect = game_action.floating_click_effects[Math.floor(Math.random()*game_action.floating_click_effects.length)];
        create_floating_effect(random_effect, {x: event.pageX, y: event.pageY});
    }

    if(game_action.attempt_duration > 0) {
        let current_iterations = 0;
        const total_iterations = game_action.attempt_duration/0.1;

        game_action_interval = setInterval(()=>{
            if(current_iterations >= total_iterations - 1) {
                clearInterval(game_action_interval);
                finish_game_action({action_key, conditions_status, dialogue_key: current_dialogue});
            }

            current_iterations++;
            update_game_action_progress_bar(current_iterations/total_iterations);
        }, 1000*0.1/tickrate);
    } else {
        update_game_action_progress_bar(1);
        finish_game_action({action_key, conditions_status,dialogue_key: current_dialogue});
    }
}

/**
 * Handles the finish, successful or not, of a game action. Not to be mistaken for end_game_action
 * @param {String} action_key 
 * @param {Number} conditions_status
 * @param {String} dialogue_key optional, only passed if action is from dialogue instead of from location
 */
function finish_game_action({action_key, conditions_status, dialogue_key}){
    end_activity_animation(true);

    let action;
    if(dialogue_key) {
        action = dialogues[dialogue_key].actions[action_key];
    } else {
        action = current_location.actions[action_key];
    }

    if(typeof conditions_status === 'undefined') {
        if(dialogue_key) {
            conditions_status = dialogues[dialogue_key].actions[action_key].get_conditions_status(character);
        } else {
            conditions_status = current_location.actions[action_key].get_conditions_status(character);
        }
    }
    
    let result_message = 'If you see this, Miktaew screwed something up. Whoops!';

    if(conditions_status == -1) {
        //not meeting requirements to begin
        result_message = action.failure_texts.unable_to_begin[Math.floor(action.failure_texts.unable_to_begin.length * Math.random())];
    } else if(conditions_status == 0) {
        //lost by failing to meet conditions, nothing to check, deal with it
        result_message = action.failure_texts.conditional_loss[Math.floor(action.failure_texts.conditional_loss.length * Math.random())];
    } else {
        const action_result = get_game_action_result({action_key, conditions_status, dialogue_key});
        let is_won = false;
        if(action_result > Math.random()) {
            //win

            result_message = action.success_text;
            if(!action.repeatable) {
                lock_action({dialogue_key, location_key: current_location.id, action_key});
            }
            process_rewards({rewards: action.rewards, source_type: "action"});
            is_won = true;
        } else {
            //random loss

            result_message = action.failure_texts.random_loss[Math.floor(action.failure_texts.random_loss.length * Math.random())];
        }

        Object.keys(action.conditions[0]?.items_by_id || {}).forEach(item_id => {
            //no need to check if they are in inventory, as without them action would have been conditionally failed before reaching here
            if(action.conditions[0].items_by_id[item_id].remove) {
                remove_from_character_inventory([{item_key: item_templates[item_id].getInventoryKey(), item_count: action.conditions[0].items_by_id[item_id].count}]);
            }
        });
        Object.keys(action.required.items_by_id || {}).forEach(item_id => {
            //again no need to check
            if(action.required.items_by_id[item_id].remove_on_success && is_won || action.required.items_by_id[item_id].remove_on_fail && !is_won) {
                remove_from_character_inventory([{item_key: item_templates[item_id].getInventoryKey(), item_count: action.required.items_by_id[item_id].count}]);
            }
        });
    }

    update_game_action_finish_button();

    if(!dialogue_key) {
        set_game_action_finish_text(result_message);
    } else {
        pass_data_down_the_content_stack({data: {upstack_result_message: result_message}});

        if(action.attempt_duration == 0) { //if action is instant, just jump back to dialogue without bothering with display of results, leave that stuff to dialogue answer
            remove_from_content_stack(content_stack_removal_options.TOP);
        }
    }
}

/**
 * Handles quitting a game action, no matter the results. Not to be mistaken for finish_game_action which deals with what happens on timer finish (and with the results)
 */
function end_game_action() {
    end_activity_animation();
    clearInterval(game_action_interval);
    current_game_action = null;
    remove_from_content_stack(content_stack_removal_options.TOP);
}

/**
 * 
 * @param {String} action_key 
 * @param {Number} conditions_status assumed to be more than 0
 * @param {String} dialogue_key
 * @returns {Boolean} did_succeed
 */
function get_game_action_result({action_key, conditions_status, dialogue_key}) {
    let action;
    if(dialogue_key) {
        action = dialogues[dialogue_key].actions[action_key];
    } else {
        action = current_location.actions[action_key];
    }
    if(action.success_chances.length == 1) {
        return action.success_chances[0];
    } else if(conditions_status == 1 && action.success_chances[1]) {
        return action.success_chances[1];
    } else {
        return action.success_chances[0] + (action.success_chances[1]-action.success_chances[0]) * conditions_status;
    }
}

/**
 * @description Globally unlocks an activity and adds a proper message to the message log, local children might still need to be unlocked separately. NOT called on loading a save.
 * @param {String} activity_id
 */
function unlock_global_activity({activity_id}) {
    if(!activities[activity_id].is_unlocked){
        activities[activity_id].is_unlocked = true;
        
        let message = "";
        if(activities[activity_id].unlock_text) {
           message = activities[activity_id].unlock_text+":<br>";
        }
        log_message(message + `Gained the ability of "${activities[activity_id].name}"`, "activity_unlocked");
    }
}

/**
 * @description Unlocks an activity and adds a proper message to the message log. NOT called on loading a save.
 * @param {Object} activity_data {activity, location_name}
 */
function unlock_activity(activity_data) {
    if(!activity_data.activity.is_unlocked){
        activity_data.activity.is_unlocked = true;
        
        if(!activity_data.skip_message) {
            let message = "";
            if(locations[activity_data.location].activities[activity_data.activity.activity_id].unlock_text) {
                message = locations[activity_data.location].activities[activity_data.activity.activity_id].unlock_text+":<br>";
            }
            if(activities[activity_data.activity.activity_name].type !== "GATHERING" || global_flags.is_gathering_unlocked) {
                log_message(message + `Unlocked activity "${activity_data.activity.activity_name}" in location "${activity_data.location}"`, "activity_unlocked");
            }
        }
        
    }
}

function unlock_action(action_data) {
    if(!action_data.action.is_unlocked) {
        action_data.action.is_unlocked = true;
        
        if(!action_data.skip_message) {
            let message = "";
            if(action_data.location) {
                if(locations[action_data.location].actions[action_data.action.action_id].unlock_text) {
                    message = locations[action_data.location].actions[action_data.action.action_id].unlock_text+":<br>";
                    log_message(message + `Unlocked action "${action_data.action.action_name}" in location "${action_data.location}"`, "activity_unlocked");
                }
            } else if(action_data.dialogue) {
                if(dialogues[action_data.dialogue].actions[action_data.action.action_id].unlock_text) {
                    message = dialogues[action_data.dialogue].actions[action_data.action.action_id].unlock_text+":<br>";
                    log_message(message + `Unlocked action "${action_data.action.action_name}" wit "${action_data.dialogue}"`, "activity_unlocked");
                }
            }
        }
    }
}

function lock_action({location_key, dialogue_key, action_key}) {
    if(dialogue_key) {
        dialogues[dialogue_key].actions[action_key].is_finished = true;
    } else  {
        locations[location_key].actions[action_key].is_finished = true;
    }
}

function add_money_to_character(money_num) {
    character.money += money_num;
    update_displayed_money();
}

/**
 * @description Handles health change from beneficial and harmful sources
 * @param {Object} params
 * @param {Number} params.ammount 
 * @param {Boolean} params.add_xp 
 * @param {Number} params.xp_to_add skippable
 * @returns 
 */
function update_health({ammount_to_restore = 0, ammount_to_loose = 0, add_xp = true} = {}) {
    if(!ammount_to_restore && !ammount_to_loose) {
        //no change, nothing to do
        return;
    }

    //actual change: smaller between missing and balance of lose/restoration
    const actual_health_change = Math.min(character.stats.full.max_health - character.stats.full.health, ammount_to_restore-ammount_to_loose);
    //actual healing: smaller between missing+lose and restoration
    const actual_healing_done = Math.min(character.stats.full.max_health - character.stats.full.health + ammount_to_loose, ammount_to_restore);

    //anything changed - update health and display
    if(actual_health_change) {
        character.stats.full.health += actual_health_change;

        update_displayed_health();
    }

    //anything actually healed - add xp
    if(actual_healing_done && add_xp && actual_healing_done > 0) {
        add_xp_to_skill({skill: skills["Regeneration"], xp_to_add: actual_healing_done});
    }

    //out of hp - set hp to 0, kill
    if(character.stats.full.health <= 0) {
        character.stats.full.health = 0;
        kill_player({is_combat: "parent_location" in current_location});
    }
}

//single tick of resting
function do_resting() {
    if(character.stats.full.health < character.stats.full.max_health) {
        const resting_heal_ammount =  Math.round(Math.max(character.stats.full.max_health * 0.01, 2) * (1 + 3*get_total_skill_level("Regeneration")/skills["Regeneration"].max_level));

        update_health({ammount_to_restore: resting_heal_ammount});
    }

    if(character.stats.full.stamina < character.stats.full.max_stamina) {
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
    if(character.stats.full.health < character.stats.full.max_health) {
        const sleeping_heal_ammount = Math.round(Math.max(character.stats.full.max_health * 0.04, 5) * (1 + get_total_skill_level("Sleeping")/skills["Sleeping"].max_level) * (1 + 3*get_total_skill_level("Regeneration")/skills["Regeneration"].max_level));
        
        update_health({ammount_to_restore: sleeping_heal_ammount});
    }

    if(character.stats.full.stamina < character.stats.full.max_stamina) {
        const sleeping_stamina_ammount = Math.round(Math.max(character.stats.full.max_stamina/30, 5) * (1 + get_total_skill_level("Sleeping")/skills["Sleeping"].max_level)); 

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

    last_location_with_bed = current_location.id;
}

function end_sleeping() {
    is_sleeping = false;
    change_location({location_id: current_location.id, skip_travel_time: true});
    end_activity_animation();
}

function start_reading(book_key) {
    
    const book_id = is_JSON(book_key)?JSON.parse(book_key).id:book_key;
    if(current_location?.parent_location) {
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
    change_location({location_id: current_location.id, skip_travel_time: true});
    end_activity_animation();
    
    const book_id = is_reading;
    is_reading = null;

    update_displayed_book(book_id);
}

function do_reading() {
    item_templates[is_reading].addProgress();

    update_displayed_book(is_reading);

    add_xp_to_skill({skill: skills["Literacy"], xp_to_add: book_stats.literacy_xp_rate});
    const book = book_stats[is_reading];
    if(book_stats[is_reading].is_finished) {
        log_message(`Finished the book "${is_reading}"`);
        update_booklist_entry(is_reading, true);
        end_reading();

        character.stats.add_book_bonus(book.bonuses);
        update_character_stats();
        process_rewards({rewards: book.rewards});
    }
}

function get_current_book() {
    return is_reading;
}

/**
 * 
 * @param {*} selected_activity location activity property (job or training)
 * @returns if current time is within working hours
 */
function can_work(selected_activity) {
    //if can start at all
    if(!selected_activity.infinite) {
        if(selected_activity.availability_time){
            if(selected_activity.availability_time.end > selected_activity.availability_time.start) {
                //ends on the same day
                if(current_game_time.hour * 60 + current_game_time.minute > selected_activity.availability_time.end*60
                    ||  //too late
                    current_game_time.hour * 60 + current_game_time.minute < selected_activity.availability_time.start*60
                    ) {  //too early
                    
                    return false;
                }
                if(!selected_activity.availability_seasons?.includes(current_game_time.getSeason())) {
                    //can't be done in current season
                    return false;
                }  
            } else { //ends on the next day (i.e. working through the night)
                if(!selected_activity.availability_seasons?.includes(current_game_time.getSeason(1))) {
                    //ends on new season during which it's not available
                    return false;
                }  

                if(current_game_time.hour * 60 + current_game_time.minute > selected_activity.availability_time.start*60
                    //too late
                    ||
                    current_game_time.hour * 60 + current_game_time.minute < selected_activity.availability_time.end*60
                    //too early

                ) {  
                    return false;
                }
            }
        } else {
            if(!selected_activity.availability_seasons?.includes(current_game_time.getSeason())) {
                //can't be done in current season
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
  
            if(!selected_job.availability_time.includes(current_game_time.getSeason(1))) {
                //ends on new season during which it's not available
                return false;
            } 

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
    add_to_content_stack({content_type: "dialogue", data: {dialogue_key: dialogue_key}});
}

function end_dialogue() {
    current_dialogue = null;
    remove_from_content_stack(content_stack_removal_options.TOP);
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

    process_rewards({rewards: textline.rewards, source_type: "textline", inform_textline: false})

    if(textline.otherUnlocks) {
        textline.otherUnlocks();
    }

    
    //start_dialogue(current_dialogue);
    let text = get_textline_answer(textline);

    //a very stupid easter egg that totally won't be annoying - 1% chance to have a random word in dialogue replaced with "rat" if your hero's name contains that word
    if(is_rat()) {
        if(Math.random() <= 0.01) {
            const words = text.split(" ");
            const index = Math.floor(words.length * Math.random());
            words[index] = "rat";
            text = words.join(" ");
        }
    }

    if(textline.branches_into?.length) {
        fill_action_box({content_type: "dialogue_branch", data: {text: text, dialogue_key: current_dialogue, textlines: textline.branches_into}});
    } else {
        fill_action_box({content_type: "dialogue_answer", data: {text: text, dialogue_key: current_dialogue}});
    }
}

/**
 * Attaches some context to textline's .getText()
 * @param {Textline} textline 
 * @returns textline answer
 */
function get_textline_answer(textline) {
    return textline.getText({
            season: current_game_time.getSeason(),
            //to be expanded with more stuff when needed
        });
}

function unlock_combat_stance(stance_id) {
    if(!stances[stance_id]) {
        console.warn(`Tried to unlock stance "${stance_id}", but no such stance exists!`);
        return;
    }

    if(!stances[stance_id].is_unlocked) {
        log_message(`You have learned a new stance: "${stances[stance_id].name}"`, "location_unlocked");
    }
    stances[stance_id].is_unlocked = true;
    update_displayed_stance_list(stances, current_stance, faved_stances);
}

function change_stance({stance_id, is_temporary = false}) {
    if(is_temporary) {
        if(!stances[stance_id]) {
            throw new Error(`No such stance as "${stance_id}"`);
        }
        if(!stances[stance_id].is_unlocked) {
            throw new Error(`Stance "${stance_id}" is not yet unlocked!`);
        }

    } else {
        selected_stance = stances[stance_id];
        update_displayed_stance(selected_stance);
    }
    
    current_stance = stances[stance_id];

    update_character_stats();
    reset_combat_loops(true); //param will be used to award 'Persistence' xp only when change was due to low stamina and not to a player click
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
    update_displayed_faved_stances(stances);
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

    //remove animations
    for(let i = 0; i < current_enemies?.length; i++) {
        remove_enemy_onhit_animation(i);
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
    character_timer_variance_accumulator = 0;
    character_timer_adjustment = 0;
    character_timers = [Date.now(), Date.now()];

    //attach loops and animations
    for(let i = 0; i < current_enemies.length; i++) {
        if(options.do_enemy_onhit_animations) {
            do_enemy_onstart_animation(i);
        }
        
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
function reset_combat_loops(skip_persistence_xp_for_stance_change) {
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

    set_character_attack_loop({base_cooldown: character_attack_cooldown, skip_persistence_xp_for_stance_change});
}

/**
 * @description Creates an Interval responsible for performing the attack loop of enemy and updating their attack_bar progress
 * @param {*} enemy_id 
 * @param {*} cooldown 
 */
function do_enemy_attack_loop(enemy_id, count, is_new = false) {
    count = count || 0;
    update_enemy_attack_bar(enemy_id, count/60);

    if(is_new) {
        enemy_timer_variance_accumulator[enemy_id] = 0;
        enemy_timer_adjustment[enemy_id] = 0;
    }

    clearTimeout(enemy_attack_loops[enemy_id]);
    enemy_attack_loops[enemy_id] = setTimeout(() => {
        enemy_timers[enemy_id][0] = Date.now(); 
        enemy_timer_variance_accumulator[enemy_id] += ((enemy_timers[enemy_id][0] - enemy_timers[enemy_id][1]) - enemy_attack_cooldowns[enemy_id]*1000/(60*tickrate));

        enemy_timers[enemy_id][1] = Date.now();
        update_enemy_attack_bar(enemy_id, count/60);
        count++;
        if(count >= 60) {
            count = 0;
            do_enemy_combat_action(enemy_id);
        }
        do_enemy_attack_loop(enemy_id, count);

        if(enemy_timer_variance_accumulator[enemy_id] <= maximum_time_correction/tickrate && enemy_timer_variance_accumulator[enemy_id] >= -maximum_time_correction/tickrate) {
            enemy_timer_adjustment[enemy_id] = enemy_timer_variance_accumulator[enemy_id];
        } else {
            if(enemy_timer_variance_accumulator[enemy_id] > maximum_time_correction/tickrate) {
                enemy_timer_adjustment[enemy_id] = maximum_time_correction/tickrate;
            }
            else {
                if(enemy_timer_variance_accumulator[enemy_id] < -maximum_time_correction/tickrate) {
                    enemy_timer_adjustment[enemy_id] = -maximum_time_correction/tickrate;
                }
            }
        } //limits the maximum correction, just to be safe

    }, enemy_attack_cooldowns[enemy_id]*1000/(60*tickrate) - enemy_timer_adjustment[enemy_id]);
}

function clear_enemy_attack_loop(enemy_id) {
    clearTimeout(enemy_attack_loops[enemy_id]);
}

/**
 * 
 * @param {Number} base_cooldown basic cooldown based on attack speeds of enemies and character (ignoring stamina penalty) 
 * @param {String} attack_type type of attack, not yet implemented
 */
function set_character_attack_loop({base_cooldown, skip_persistence_xp_for_stance_change}) {
    clear_character_attack_loop();

    //little safety, as this function would occasionally throw an error due to not having any enemies left 
    //(can happen on forced leave after first win)
    if(!current_enemies) {
        return;
    }

    //tries to switch stance back to the one that was actually selected if there's enough stamina, otherwise tries to switch stance to "normal" if not enough stamina
    if(character.stats.full.stamina >= (selected_stance.stamina_cost / character.stats.full.stamina_efficiency)){ 
        if(selected_stance.id !== current_stance.id) {
            change_stance({stance_id: selected_stance.id});
            return;
        }
    } else if(current_stance.id !== "normal") {
        change_stance({stance_id: "normal", is_temporary: true});
        return;
    }

    let target_count = current_stance.target_count;
    if(target_count > 1 && current_stance.related_skill) {
        target_count = target_count + Math.round(target_count * get_total_skill_level(current_stance.related_skill)/skills[current_stance.related_skill].max_level);
    }

    if(current_stance.randomize_target_count) {
        target_count = Math.floor(Math.random()*target_count) || 1;
    }

    let targets = [];
    const alive_targets = current_enemies.filter(enemy => enemy.is_alive).slice(-target_count);

    while(alive_targets.length>0) {
        targets.push(alive_targets.pop());
    }

    use_stamina({stamina_to_use: current_stance.stamina_cost, skip_persistence_xp_for_stance_change});
    let actual_cooldown = base_cooldown / character.get_stamina_multiplier();

    let attack_power = character.get_attack_power();
    do_character_attack_loop({base_cooldown, actual_cooldown, attack_power, targets, target_count});
}

/**
 * @description updates character's attack bar, performs combat action when it reaches full
 * @param {Number} base_cooldown 
 * @param {Number} actual_cooldown 
 * @param {String} attack_power 
 * @param {String} attack_type 
 */
function do_character_attack_loop({base_cooldown, actual_cooldown, attack_power, targets, count = 0, is_new = true, target_count = 1, do_quest_events = true}) {
    update_character_attack_bar(count/60);

    if(is_new) {
        character_timer_variance_accumulator = 0;
        character_timer_adjustment = 0;
    }

    clear_character_attack_loop();
    character_attack_loop = setTimeout(() => {
        character_timers[0] = Date.now(); 
        character_timer_variance_accumulator += ((character_timers[0] - character_timers[1]) - actual_cooldown*1000/(60*tickrate));

        character_timers[1] = Date.now();
        update_character_attack_bar(count/60);
        count++;
        if(count >= 60) {
            count = 0;
            let leveled = false;

            for(let i = 0; i < targets.length; i++) {
                do_character_combat_action({target: targets[i], attack_power, target_count: targets.length});
            }

            if(current_stance.related_skill) {
                leveled = add_xp_to_skill({skill: skills[current_stance.related_skill], xp_to_add: targets.reduce((sum,enemy)=>sum+enemy.xp_value,0)/targets.length});
                
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

                    if(do_quest_events) {
                        do_quest_event({
                            quest_event_type: "clear",
                            quest_event_target: current_location.id,
                            quest_event_count: 1,
                        });
                    }
                }
                document.getElementById("enemy_count_div").children[0].children[1].innerHTML = current_location.enemy_count - current_location.enemy_groups_killed % current_location.enemy_count;
        
                set_new_combat();
            }
        } else {
            do_character_attack_loop({base_cooldown, actual_cooldown, attack_power, targets, target_count, count, is_new: false});
        }

        if(character_timer_variance_accumulator <= maximum_time_correction/tickrate && character_timer_variance_accumulator >= -maximum_time_correction/tickrate) {
            character_timer_adjustment = character_timer_variance_accumulator;
        } else {
            if(character_timer_variance_accumulator > maximum_time_correction/tickrate) {
                character_timer_adjustment = maximum_time_correction/tickrate;
            }
            else {
                if(character_timer_variance_accumulator < -maximum_time_correction/tickrate) {
                    character_timer_adjustment = -maximum_time_correction/tickrate;
                }
            }
        } //limits the maximum correction, just to be safe
    }, actual_cooldown*1000/(60*tickrate) - character_timer_adjustment);
}

function clear_character_attack_loop() {
    clearTimeout(character_attack_loop);
}

function clear_all_enemy_attack_loops() {
    Object.keys(enemy_attack_loops).forEach((key) => {
        clearTimeout(enemy_attack_loops[key]);
    });
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

    const enemy_count_xp_mod = current_enemies.filter(enemy => enemy.is_alive).length**(2/3);
    
    const attacker = current_enemies[enemy_id];

    let evasion_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/3); //down to .5 if there's full 8 enemies (multiple attackers make it harder to evade attacks)
    if(attacker.size === "small") {
        add_xp_to_skill({skill: skills["Pest killer"], xp_to_add: attacker.xp_value/enemy_count_xp_mod});
    } else if(attacker.size === "large") {
        add_xp_to_skill({skill: skills["Giant slayer"], xp_to_add: attacker.xp_value/enemy_count_xp_mod});
        evasion_chance_modifier *= get_total_skill_coefficient({scaling_type: "multiplicative", skill_id: "Giant slayer"});
    }

    const enemy_base_damage = attacker.stats.attack;

    let damages_dealt = [];

    let critted = false;

    let partially_blocked = false; //only used for combat info in message log

    for(let i = 0; i < attacker.stats.attack_count; i++) {
        damages_dealt.push(enemy_base_damage * (1.2 - Math.random() * 0.4)); //basic 20% deviation for damage
    }

    damages_dealt = damages_dealt.sort((a,b)=>b-a);
    
    if(character.equipment["off-hand"]?.offhand_type === "shield") { //HAS SHIELD
        if(character.stats.full.block_chance > Math.random()) {//BLOCKED THE ATTACK
            add_xp_to_skill({skill: skills["Shield blocking"], xp_to_add: attacker.xp_value/enemy_count_xp_mod});
            const blocked = character.equipment["off-hand"].getShieldStrength() * (character.equipment["off-hand"].tags.ignore_skill?1:character.stats.total_multiplier.block_strength);

            if(blocked > damages_dealt[0]) {
                log_message(character.name + " blocked an attack", "hero_blocked");
                return; //damage fully blocked, nothing more can happen 
            } else {
                damages_dealt = damages_dealt.map(val => Math.max(0,val-blocked));
                partially_blocked = true;
            }
         } else {
            add_xp_to_skill({skill: skills["Shield blocking"], xp_to_add: attacker.xp_value/(2*enemy_count_xp_mod)});
         }
    } else { // HAS NO SHIELD
        const hit_chance = get_hit_chance(attacker.stats.dexterity * Math.sqrt(attacker.stats.intuition ?? 1), character.stats.full.evasion_points*evasion_chance_modifier);

        if(hit_chance < Math.random()) { //EVADED ATTACK
            const xp_to_add = character.wears_armor() ? attacker.xp_value : attacker.xp_value * 1.5; 
            //50% more evasion xp if going without armor
            add_xp_to_skill({skill: skills["Evasion"], xp_to_add: xp_to_add/enemy_count_xp_mod});
            log_message(character.name + " evaded an attack", "enemy_missed");
            return; //damage fully evaded, nothing more can happen
        } else {
            add_xp_to_skill({skill: skills["Evasion"], xp_to_add: attacker.xp_value/(2*enemy_count_xp_mod)});
        }
    }

    total_hits_taken++;
    if(enemy_crit_chance > Math.random()){
        damages_dealt = damages_dealt.map(val => val*enemy_crit_damage);
        critted = true;
        total_crits_taken++;
    }

    if(!character.wears_armor()) //no armor so either completely naked or in things with 0 def
    {
        add_xp_to_skill({skill: skills["Iron skin"], xp_to_add: attacker.xp_value/enemy_count_xp_mod});
    } 
    
    let {damage_taken, fainted} = character.take_damage({damage_values: damages_dealt});

    add_xp_to_skill({skill: skills["Fortitude"], xp_to_add: (damage_taken**0.6)/enemy_count_xp_mod});

    const hit_count_msg = damages_dealt.length > 1?` x${damages_dealt.length}`:"";

    if(critted) {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, was critically hit" + hit_count_msg + " for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked_critically");
        } 
        else {
            log_message(character.name + " was critically hit" + hit_count_msg + " for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked_critically");
        }
    } else {
        if(partially_blocked) {
            log_message(character.name + " partially blocked, was hit" + hit_count_msg + " for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked");
        }
        else {
            log_message(character.name + " was hit" + hit_count_msg + " for " + Math.ceil(10*damage_taken)/10 + " dmg", "hero_attacked");
        }
    }

    if(fainted) {
        kill_player();
        return;
    }

    update_displayed_health();
}

function do_character_combat_action({target, attack_power, target_count}) {
    const hero_base_damage = attack_power;

    const groupsize_xp_multiplier = current_enemies.length**0.3334;

    let damage_dealt;
    
    let critted = false;
    
    let hit_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/4); // down to ~ 60% if there's full 8 enemies
    
    add_xp_to_skill({skill: skills["Combat"], xp_to_add: target.xp_value*groupsize_xp_multiplier/target_count});

    if(target.size === "small") {
        add_xp_to_skill({skill: skills["Pest killer"], xp_to_add: target.xp_value*groupsize_xp_multiplier/target_count});
        hit_chance_modifier *= get_total_skill_coefficient({scaling_type: "multiplicative", skill_id: "Pest killer"});
    } else if(target.size === "large") {
        add_xp_to_skill({skill: skills["Giant slayer"], xp_to_add: target.xp_value*groupsize_xp_multiplier/target_count});
    }

    const hit_chance = get_hit_chance(character.stats.full.attack_points * hit_chance_modifier, target.stats.agility * Math.sqrt(target.stats.intuition ?? 1));

    if(hit_chance > Math.random()) {//hero's attack hits

        total_hits_done++;
        if(character.equipment.weapon != null) {
            //if has weapon
            damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) )/10;

            add_xp_to_skill({skill: skills[weapon_type_to_skill[character.equipment.weapon.weapon_type]], xp_to_add: target.xp_value*groupsize_xp_multiplier/target_count}); 

        } else {
            //if has no weapon
            damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) )/10;
            add_xp_to_skill({skill: skills['Unarmed'], xp_to_add: target.xp_value*groupsize_xp_multiplier/target_count});
        }
        //small randomization by up to 20%, then bonus from skill

        if(options.do_enemy_onhit_animations) {
            const enemy_id = current_enemies.findIndex(enemy => enemy===target);
            do_enemy_onhit_animation(enemy_id);
        }
        if(character.stats.full.crit_rate > Math.random()) {
            damage_dealt = Math.round(10*damage_dealt * character.stats.full.crit_multiplier)/10;
            critted = true;
            total_crits_done++;
            
        }
        else {
            critted = false;
        }
        
        damage_dealt = Math.ceil(10*Math.max(damage_dealt - Math.max(0,target.stats.defense-character.stats.full.armor_penetration), damage_dealt*0.1, 1))/10;

        target.stats.health -= damage_dealt;
        if(damage_dealt > strongest_hit) {
            strongest_hit = damage_dealt;
        }
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

            //gained xp multiplied by TOTAL size of enemy group raised to 1/3
            let xp_reward = target.xp_value * groupsize_xp_multiplier;
            add_xp_to_character(xp_reward/target_count, true);

            let loot = target.get_loot({drop_chance_modifier: 1/current_enemies.length**0.6667});
            if(loot.length > 0) {
                log_loot({loot_list: loot, is_combat: true});
                loot = loot.map(x => {return {item_key: item_templates[x.item_id].getInventoryKey(), count: x.count}});
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
function kill_enemy(target, do_quest_events = true) {
    target.is_alive = false;
    if(target.add_to_bestiary) {
        if(enemy_killcount[target.name]) {
            enemy_killcount[target.name] += 1;
            update_bestiary_entry_killcount(target.name);
        } else {
            enemy_killcount[target.name] = 1;
            create_new_bestiary_entry(target.name);
        }
    }
    const enemy_id = current_enemies.findIndex(enemy => enemy===target);
    clear_enemy_attack_loop(enemy_id);

    if(do_quest_events) {
        do_quest_event({
            quest_event_type: "kill",
            quest_event_target: target.id,
            quest_event_count: 1,
        });

        Object.keys(target.tags || {}).forEach(tag => {
            do_quest_event({
                quest_event_type: "kill_any",
                quest_event_target: tag,
                quest_event_count: 1,
            });
        })
    }
}

function kill_player({is_combat = true} = {}) {
    if(is_combat) {
        total_deaths++;
        log_message(character.name + " has lost consciousness", "hero_defeat");

        update_displayed_health();
        if(options.auto_return_to_bed && last_location_with_bed) {
            change_location({location_id: last_location_with_bed});
            start_sleeping();
        } else {
            change_location({location_id: current_location.parent_location.id});
        }
    }

    add_active_effect("Recovering", 5);
}

function use_stamina({stamina_to_use = 1, skip_persistence_xp_for_stance_change = false}) {
    
    character.stats.full.stamina -= stamina_to_use/(character.stats.full.stamina_efficiency || 1);

    if(character.stats.full.stamina < 0)  {
        character.stats.full.stamina = 0;
    }

    if(character.stats.full.stamina < 1) {

        //double the gain if hp under 20%
        if(character.stats.full.health/character.stats.full.max_health < 0.2) {
            stamina_to_use *= 2;
        }
        for(let i = 0; i < cold_status_effects.length; i++) {
            if(active_effects[cold_status_effects[i]]) {
                stamina_to_use *= (1.19**i); //~x2 at i==4
            }
        }

        if(!skip_persistence_xp_for_stance_change) {
            add_xp_to_skill({skill: skills["Persistence"], xp_to_add: stamina_to_use});
        }
        update_displayed_stats();
    }

    update_displayed_stamina();
}

/**
 * adds xp to skills, handles their levelups and tooltips
 * @param skill - skill object 
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 * @returns {Boolean}
 */
function add_xp_to_skill({skill, xp_to_add = 1, should_info = true, use_bonus = true, add_to_parent = true, cap_gained_xp = true, is_from_loading = false, do_quest_events = true})
{
    let leveled = false;
    if(xp_to_add == 0) {
        return leveled;
    } else if(xp_to_add < 0) {
        console.error(`Tried to add negative xp to skill ${skill.skill_id}`);
        return leveled;
    } else if(isNaN(xp_to_add)) {
        console.error(`Tried to add NaN xp to skill ${skill.skill_id}`);
        return leveled;
    }

    if(use_bonus) {
        xp_to_add = xp_to_add * global_xp_multiplier * get_skill_xp_gain(skill.skill_id);

        if(skill.parent_skill) {
            xp_to_add *= skill.get_parent_xp_multiplier();
        }
    }

    if(cap_gained_xp && typeof skill.xp_to_next_lvl === Number) {
        //cap on singular gains for non-crafting skills; cap for crafting skills handled in crafting code as it's dependent on how many items are made at once
        xp_to_add = Math.min(xp_to_add, skill.xp_to_next_lvl*skill_xp_gains_cap);
    }
    
    const prev_name = skill.name();
    const was_hidden = skill.visibility_treshold > skill.total_xp;

    let {message, gains, unlocks} = skill.add_xp({xp_to_add: xp_to_add});
    const new_name = skill.name();
    if(skill.parent_skill && add_to_parent) {
        if(skill.total_xp > skills[skill.parent_skill].total_xp) {
            /*
                add xp to parent if skill would now have more than the parent
                calc xp ammount so that it's no more than the difference between child and parent
            */
            let xp_for_parent = Math.min(skill.total_xp - skills[skill.parent_skill].total_xp, xp_to_add);
            add_xp_to_skill({skill: skills[skill.parent_skill], xp_to_add: xp_for_parent, should_info, use_bonus: false, add_to_parent, cap_gained_xp: false, is_from_loading});
        }
    }

    const is_visible = skill.visibility_treshold <= skill.total_xp;


    if(was_hidden && is_visible) {
        //skill only now became visible, so it needs to be added to display
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
    
    if(is_visible) {
        if(prev_name !== new_name) { //skill name has changed; this may trigger on levelup OR on becoming visible
            if(which_skills_affect_skill[skill.skill_id]) {
                for(let i = 0; i < which_skills_affect_skill[skill.skill_id].length; i++) {
                    update_displayed_skill_bar(skills[which_skills_affect_skill[skill.skill_id][i]], false);
                }
            }
        }

        if(typeof message !== "undefined"){ 
        //not undefined => levelup happened and levelup message was returned
            leveled = true;

            message = message.replace("%HeroName%", character.name);

            update_displayed_skill_bar(skill, true);

            if(typeof should_info === "undefined" || should_info)
            {
                update_character_stats();
            }

            if(typeof skill.get_effect_description !== "undefined")
            {
                update_displayed_skill_description(skill);
            }

            if(skill.is_parent) {
                update_all_displayed_skills_xp_gain();
            } else {
                update_displayed_skill_xp_gain(skill);
            }

            //no point doing any checks for optimization
            update_displayed_stamina_efficiency();
            
            process_rewards({source_name: skill.skill_id, source_type: "skill", rewards: unlocks, inform_overall: should_info});
            
            if(typeof should_info === "undefined" || should_info){
                log_message(message, "skill_raised");
            }

            if(prev_name !== new_name) { //skill name has changed
                //display of skill name in other places (like tooltips of other skills) is handled slightly earlier
                if(!was_hidden && (typeof should_info === "undefined" || should_info)) {
                    log_message(`Skill ${prev_name} upgraded to ${new_name}`, "skill_raised");
                }

                if(current_location?.connected_locations && !current_activity) {
                    Object.keys(current_location.activities).forEach(activity_key => {
                        if(activities[current_location.activities[activity_key].activity_name].base_skills_names.includes(skill.skill_id)) {
                            update_gathering_tooltip(activities[activity_key]);
                        }
                    });
                }

                Object.keys(character.inventory).forEach(inv_key => {
                    //update equippable/useable item
                    const item = getItemFromKey(inv_key);
                    if(item.tags.usable) {
                        const effects = item.effects;
                        for(let i = 0; i < effects.length; i++) {
                            if(effect_templates[effects[i].effect].effects?.bonus_skill_levels?.[skill.skill_id]) {
                                update_displayed_character_inventory({item_key: inv_key});
                                return;
                            }
                        }
                    } else if(item.tags.equippable) {
                        const bonuses = item.getBonusSkillLevels();
                        if(bonuses[skill.skill_id]) {
                            update_displayed_character_inventory({item_key: inv_key});
                        }
                    }
                });
                Object.keys(character.equipment).forEach(eq_slot => {
                    //update equipped item
                    if(!character.equipment[eq_slot]) {
                        return;
                    }
                    const bonuses = character.equipment[eq_slot].getBonusSkillLevels(); {
                        if(bonuses[skill.skill_id]) {
                            update_displayed_equipment();
                            update_displayed_character_inventory({equip_slot: eq_slot});
                        }
                    }
                });
                Object.keys(booklist_entry_divs).forEach(book_id => {
                    //update anthology entry
                    const bonuses = book_stats[book_id]?.bonuses?.xp_multipliers || {};
                    if(bonuses[skill.skill_id]) {
                        update_booklist_entry(book_id, true);
                    }
                });
                    
                update_displayed_effects();
                //a bit lazy, but there shouldn't ever be enough to cause a lag
            }

            if(speed_modifiers_from_skills[skill.skill_id] && !is_from_loading) {
                //check if skill affects any travel times, update pathing if so
                pathfinder = new Pathfinder();
                pathfinder.fill_connections(locations);
                travel_times = {};
                travel_times[current_location.id] = pathfinder.find_shortest_paths(current_location.id);
                //shouldn't need any display updates
            }

            if(tags_for_droprate_modifier_skills[skill.skill_id]) { 
                //this skill affects some droprates, so bestiary update is required
                
                //go through enemy types that were killed, check if relevant tag is present, update related display if so
                Object.keys(enemy_killcount).forEach(enemy_id => {
                    if(enemy_templates[enemy_id].tags[tags_for_droprate_modifier_skills[skill.skill_id]]) {
                        //update_bestiary_entry(enemy_id);
                        update_bestiary_entry_tooltip(enemy_id);
                    }
                });
            }

            if(do_quest_events) {
                do_quest_event({
                    quest_event_type: "reach_skill",
                    quest_event_target: skill.skill_id,
                    quest_event_count: skill.current_level,
                });
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

    if(location.enemy_groups_killed == location.enemy_count || location.is_challenge) { //first clear

        if(location.is_challenge) {
            lock_location({location, challenge_self_lock: true});
        }
        should_return = true;
        
        if(location.first_reward) {
            process_rewards({rewards: location.first_reward, source_type: "location", source_name: location.name, is_first_clear: true, source_id: location.id});
        }
    } else if(location.repeatable_reward.xp && typeof location.repeatable_reward.xp === "number") {
        process_rewards({rewards: {xp: location.repeatable_reward.xp}, source_type: "location", source_name: location.name, is_first_clear: false, source_id: location.id});
    }

    if(location.rewards_with_clear_requirement) {
        for(let i = 0; i < location.rewards_with_clear_requirement.length; i++) {
            if(location.enemy_groups_killed == location.enemy_count * location.rewards_with_clear_requirement[i].required_clear_count)
            {
                //only once, on N-th clear
                process_rewards({rewards: location.rewards_with_clear_requirement[i], source_type: "location", source_name: location.name, is_first_clear: false, source_id: location.id});
            }
        }
    }

    //calls in first clear give xp, this call omits xp to avoid repeating it
    //repeatable rewards are indeed intended to be called on first clear as well (with the exception of xp, duh)
    process_rewards({rewards: {...location.repeatable_reward, xp: null}, source_type: "location", source_name: location.name, is_first_clear: false, source_id: location.id});

    location.otherUnlocks();

    //return if need be; additional check in case it was already performed by rewards
    if(should_return && current_location?.parent_location) {
        change_location({location_id: current_location.parent_location.id}); //go back to parent location, only on first clear
    }
}

/**
 * processes rewards and logs all necessary messages
 * @param {Object} rewards_data
 * @param {Object} rewards_data.rewards //the standard object with rewards
 * @param {String} rewards_data.source_type //location, gameAction, textline
 * @param {Boolean} rewards_data.is_first_clear //exclusively for location rewards (and only for a single message to be logged)
 * @param {Boolean} rewards_data.inform_textline //if textline unlock is to be logged
 * @param {String} rewards_data.source_name //in case it's needed for logging a message
 */
function process_rewards({rewards = {}, source_type, source_name, is_first_clear, inform_overall = true, inform_textline = true, only_unlocks = false, is_from_loading = false}) {
    let was_any_location_availability_changed = false;

    if(rewards.messages && !is_from_loading) {
        for(let i = 0; i < rewards.messages.length; i++) {
            log_message(rewards.messages[i]);
        }
    }

    if(rewards.money && typeof rewards.money === "number" && !only_unlocks) {
        if(inform_overall) {
            log_message(`${character.name} earned ${format_money(rewards.money)}`);
        }
        add_money_to_character(rewards.money);
    }

    if(rewards.xp && typeof rewards.xp === "number" && !only_unlocks) {
        if(source_type === "location") {
            if(inform_overall) {
                if(is_first_clear) {
                    log_message(`Obtained ${rewards.xp}xp for clearing ${source_name} for the first time`, "location_reward");
                } else {
                    log_message(`Obtained additional ${rewards.xp}xp for clearing ${source_name}`, "location_reward");
                }
            }
        } else {
            //other sources
            log_message(`Gained ${rewards.xp}xp`, "location_reward");
        }
        add_xp_to_character(rewards.xp);
    }

    if(rewards.skill_xp && !only_unlocks) {
        Object.keys(rewards.skill_xp).forEach(skill_key => {
            if(typeof rewards.skill_xp[skill_key] === "number") {
                if(inform_overall) {
                    log_message(`${character.name} gained ${rewards.skill_xp[skill_key]}xp to ${skills[skill_key].name()}`);
                }
                add_xp_to_skill({skill: skills[skill_key], xp_to_add: rewards.skill_xp[skill_key], cap_gained_xp: false});
            }
        });
    }
    
    if(rewards.locations) {
        //if(source_type === "location") {
            for(let i = 0; i < rewards.locations.length; i++) {
               was_any_location_availability_changed = 
                    unlock_location({location: locations[rewards.locations[i].location], skip_message: (inform_overall && rewards.locations[i].skip_message || is_from_loading)}) 
                    || was_any_location_availability_changed;
                    
            }
    }

    if(rewards.flags) {
        for(let i = 0; i < rewards.flags.length; i++) {
            const flag = global_flags[rewards.flags[i]];
            global_flags[rewards.flags[i]] = true;
            if(!flag && flag_unlock_texts[rewards.flags[i]] && inform_overall) {
                log_message(`${flag_unlock_texts[rewards.flags[i]]}`, "activity_unlocked");
            }
        }
    }

    if(rewards.textlines) {
        for(let i = 0; i < rewards.textlines.length; i++) {
            let any_unlocked = false;
            for(let j = 0; j < rewards.textlines[i].lines.length; j++) {
                if(dialogues[rewards.textlines[i].dialogue].textlines[rewards.textlines[i].lines[j]].is_unlocked == false) {
                    any_unlocked = true;
                    dialogues[rewards.textlines[i].dialogue].textlines[rewards.textlines[i].lines[j]].is_unlocked = true;
                }
            }
            if(any_unlocked && inform_textline && inform_overall && !rewards.textlines[i].skip_message) {
                log_message(`You should talk to ${rewards.textlines[i].dialogue}`, "dialogue_unlocked");
                //maybe do this only when there's just 1 dialogue with changes?
            }
        }
    }

    if(rewards.dialogues) {
        for(let i = 0; i < rewards.dialogues?.length; i++) {
            const dialogue = dialogues[rewards.dialogues[i]]
            if(!dialogue.is_unlocked) {
                dialogue.is_unlocked = true;
                log_message(`You can now talk with ${dialogue.name}`, "activity_unlocked");
            }
        }
    }

    if(rewards.traders) { 
        for(let i = 0; i < rewards.traders.length; i++) {
            const trader = traders[rewards.traders[i].trader];
            if(!trader.is_unlocked) {
                trader.is_unlocked = true;
                if(!rewards.traders[i].skip_message) {
                    if(trader.unlock_message) {
                        log_message(trader.unlock_message, "activity_unlocked");
                    } else {
                        log_message(`You can now trade with ${trader.name}`, "activity_unlocked");
                    }
                }
            }
        }
    }

    if(rewards.housing) {
        Object.keys(rewards.housing).forEach(location_key => {
            locations[location_key].housing.is_unlocked = true;
        });
    }

    if(rewards.global_activities) {
        for(let i = 0; i < rewards.global_activities?.length; i++) {
                unlock_global_activity({activity_id: rewards.global_activities[i]});
        }
    }


    if(rewards.activities) {
        for(let i = 0; i < rewards.activities?.length; i++) {
            if(!locations[rewards.activities[i].location].activities[rewards.activities[i].activity].tags?.gathering || global_flags.is_gathering_unlocked) {

                unlock_activity({location: locations[rewards.activities[i].location].name, 
                                activity: locations[rewards.activities[i].location].activities[rewards.activities[i].activity],
                                skip_message: is_from_loading,
                            });

            }
        }
    }

    if(rewards.actions) {
        for(let i = 0; i < rewards.actions?.length; i++) {
            if(rewards.actions[i].dialogue) {
                unlock_action({
                                dialogue: dialogues[rewards.actions[i].dialogue]?.name,
                                action: dialogues[rewards.actions[i].dialogue].actions[rewards.actions[i].action],
                                skip_message: is_from_loading,
                            });
            } else if(rewards.actions[i].location){
                unlock_action({
                                location: locations[rewards.actions[i].location]?.name,
                                action: locations[rewards.actions[i].location].actions[rewards.actions[i].action],
                                skip_message: is_from_loading,
                            });
            }
        }
    }

    if(rewards.stances) {  
        for(let i = 0; i < rewards.stances.length; i++) {
            unlock_combat_stance(rewards.stances[i]);
        }
    }

    if(rewards.skills) {
        for(let i = 0; i < rewards.skills.length; i++) {
            if(!skills[rewards.skills[i]].is_unlocked) {
                skills[rewards.skills[i]].is_unlocked = true;
                create_new_skill_bar(skills[rewards.skills[i]]);
                update_displayed_skill_bar(skills[rewards.skills[i]], false);
                if(inform_overall) {
                    log_message(`Unlocked new skill: ${skills[rewards.skills[i]].name()}`);
                }

                if(source_type === "skill") {
                    if(!which_skills_affect_skill[rewards.skills[i]]) {
                        which_skills_affect_skill[rewards.skills[i]] = [];
                    }

                    if(skills[source_name]) {
                        which_skills_affect_skill[rewards.skills[i]].push(source_name);
                        //shouldn't cause issues, as it will only trigger on skill unlocks by other skills
                    } else {
                        console.error(`Tried to register skill "${source_name}" as related to "${rewards.skills[i]}", but the former does not exist!`);
                    }
                }

                //update all related skills; may be none if unlock was not from another skill, so need to check with '?'
                for(let j = 0; j < which_skills_affect_skill[rewards.skills[i]]?.length; j++) {
                    update_displayed_skill_bar(skills[which_skills_affect_skill[rewards.skills[i]][j]], false);
                }
            }
        }
    }

    if(rewards.recipes) {
        for(let i = 0; i < rewards.recipes.length; i++) {
            if(!recipes[rewards.recipes[i].category][rewards.recipes[i].subcategory][rewards.recipes[i].recipe_id].is_unlocked) {
                recipes[rewards.recipes[i].category][rewards.recipes[i].subcategory][rewards.recipes[i].recipe_id].is_unlocked = true;
                if(inform_overall) {
                    log_message(`Unlocked new recipe: ${recipes[rewards.recipes[i].category][rewards.recipes[i].subcategory][rewards.recipes[i].recipe_id].name}`);
                }
            }
        }
    }

    if(rewards.quests) {
        for(let i = 0; i < rewards.quests.length; i++) {
            if(!questManager.isQuestActive(rewards.quests[i])) {
                questManager.startQuest({quest_id: rewards.quests[i]});
                if(inform_overall) {
                    //log_message(`Received a new quest: ${quests[rewards.quests[i]].getQuestName()}`);
                    //already done in quests
                }
            }
        }
    }

    if(rewards.quest_progress) {
        for(let i = 0; i < rewards.quest_progress.length; i++) {
            const quest_id = rewards.quest_progress[i].quest_id;
            const task_index = rewards.quest_progress[i].task_index;
            if(task_index == quests[quest_id].getCompletedTaskCount()) {
                if(quests[quest_id]?.quest_tasks[task_index]) {
                    questManager.finishQuestTask({quest_id: quest_id, task_index: task_index, skip_warning: true});
                } else {
                    console.warn(`Tried to complete ${task_index}'th task for quest '${quest_id}', but either quest or index does not exist!`);
                }
            }
        }
    }

    if(rewards.locks) {
        if(rewards.locks.textlines) {
            Object.keys(rewards.locks.textlines).forEach(dialogue_key => {
                for(let i = 0; i < rewards.locks.textlines[dialogue_key].length; i++) {
                    dialogues[dialogue_key].textlines[rewards.locks.textlines[dialogue_key][i]].is_finished = true;
                }
            });
        }
        if(rewards.locks.locations) {
            for(let i = 0; i < rewards.locks.locations.length; i++) {
                was_any_location_availability_changed = lock_location({location: locations[rewards.locks.locations[i]]}) || was_any_location_availability_changed;
            }
        }
        if(rewards.locks.traders) {
            for(let i = 0; i < rewards.locks.traders.length; i++) {
                traders[rewards.locks.traders[i]].is_finished = true;
            }
        }
        if(rewards.locks.quests) {
            for(let i = 0; i < rewards.locks.quests.length; i++) {
                questManager.finishQuest({quest_id: rewards.locks.quests[i], skip_rewards: true})
            }
        }
        if(rewards.locks.actions) {
            for(let i = 0; i < rewards.locks.actions.length; i++) {
                lock_action({
                            dialogue_key: rewards.locks.actions[i].dialogue,
                            location_key: rewards.locks.actions[i].location,
                            action_key: rewards.locks.actions[i].action
                        });
            }
        }
    }

    if(rewards.items && !only_unlocks) {
        for(let i = 0; i < rewards.items.length; i++) {
            const item = item_templates[rewards.items[i]];
            //log_message(`${character.name} obtained "${item.getName()} x${rewards.items[i].count||1}"`);
            //add_to_character_inventory([{item_key: item.getInventoryKey(), count: rewards.items[i].count}]);
            log_message(`${character.name} obtained "${item.getName()} x1"`);
            add_to_character_inventory([{item_key: item.getInventoryKey(), count: 1}]);
        }
    }

    if(rewards.reputation) {
        Object.keys(rewards.reputation).forEach(region => {
            ReputationManager.add_reputation({region, reputation: rewards.reputation[region]});
        });
        update_displayed_reputation();
    }

    if(was_any_location_availability_changed && !is_from_loading) {
        //pathing update
        pathfinder = new Pathfinder();
        pathfinder.fill_connections(locations);
        travel_times = {};
        travel_times[current_location.id] = pathfinder.find_shortest_paths(current_location.id);

        //shouldn't need any display updates
    }

    if(rewards.move_to && !only_unlocks) {
        if(source_type !== "action") {
            change_location({location_id: rewards.move_to.location});
        } else {
            current_location = locations[rewards.move_to.location];
        }
    }
}

/**
 * 
 * @param location game location object 
 * @returns whether it was actually unlocked (false meaning it was already available before)
 */
function unlock_location({location, skip_message}) {
    let was_unlocked = false;
    if(!location.is_unlocked){
        location.is_unlocked = true;
        was_unlocked = true;
        if(!skip_message) {
            const message = location.unlock_text || `Unlocked location ${location.name}`;
            log_message(message, "location_unlocked");
        }

        //reloads the current location just in case it needs the new unlock to be added to current display
        //current action check most probably unnecessary
        if(current_location && !current_dialogue && !current_game_action) {
            change_location({location_id: current_location.id, skip_travel_time: true});
        }
    }

    if(location.housing?.is_unlocked) {
        unlocked_beds[location.id] = true;
    }

    return was_unlocked;
}

/**
 * 
 * @param {*} param0 
 * @returns whether it was actually locked (false meaning it was already locked before)
 */
function lock_location({location, challenge_self_lock = false}) {
    let was_locked = false;
    if(favourite_locations[location.id]) {
        delete favourite_locations[location.id];
        if(!challenge_self_lock) {
            remove_fast_travel_choice({location_id: location.id});
        }
    }

    if(!location.is_finished) {
        was_locked = true;
        location.is_finished = true;
    }
    if(last_combat_location === location.id) {
        last_combat_location = null;
    }

    return was_locked;
}

function add_location_to_favourites({location_id}) {
    if(favourite_locations[location_id]) {
        console.warn(`Tried to favourite location "${locations[location_id].name}" despite it already being in favourites`);
        return;
    }

    favourite_locations[location_id] = true;
    update_location_icon();
}

function remove_location_from_favourites({location_id, update_choices = true}) {
    if(!favourite_locations[location_id]) {
        console.warn(`Tried to unfavourite location "${locations[location_id].name}" despite it not being in favourites`);
        return;
    }

    delete favourite_locations[location_id];
    update_location_icon();
    if(update_choices) {
        remove_fast_travel_choice({location_id});
    }
}

function clear_enemies() {
    current_enemies = null;
    for(let i = 0; i < 7; i++) {
        remove_enemy_onhit_animation(i);
    }
}

function use_recipe(target, ammount_wanted_to_craft = 1) {

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
        const recipe_div = document.querySelector(`[data-crafting_category="${category}"][data-crafting_subcategory="${subcategory}"] [data-recipe_id="${recipe_id}"]`);
        let leveled = false;
        let result;
        let xp_to_add;
        if(subcategory === "items") {
            const {available_ammount, materials} = selected_recipe.get_availability()
            let ammount_that_can_be_crafted = Math.min(ammount_wanted_to_craft, available_ammount);
            let attempted_crafting_ammount = ammount_that_can_be_crafted; //ammount that will be attempted (e.g. 100)
            let successful_crafting_ammount; //ammount that will succeed (e.g. 100 * 75.6% success = 75.6 -> 75 + 60% for another 1)
            if(ammount_that_can_be_crafted > 0) { 
                const success_chance = selected_recipe.get_success_chance(station_tier);
                result = selected_recipe.getResult();
                let {result_id, count} = result;

                const recipe_skill = skills[selected_recipe.recipe_skill];
                const needed_xp = recipe_skill.total_xp_to_next_lvl - recipe_skill.total_xp;
                //const xp_per_craft = get_recipe_xp_value({category, subcategory, recipe_id});
                const xp_per_craft = Math.min(recipe_skill.xp_to_next_lvl*crafting_skill_xp_gains_cap, get_recipe_xp_value({category, subcategory, recipe_id})*get_skill_xp_gain(recipe_skill.skill_id));
                const estimated_xp_per_craft = xp_per_craft * success_chance;
                const needed_crafts = Math.ceil(needed_xp/(estimated_xp_per_craft));
                
                attempted_crafting_ammount = Math.min(needed_crafts, ammount_that_can_be_crafted);
                successful_crafting_ammount = Math.floor(attempted_crafting_ammount*success_chance);
                
                //chance to get 1 more if it was not an integer
                const variable_craft = Math.random()<(attempted_crafting_ammount*success_chance - successful_crafting_ammount)?1:0;
                successful_crafting_ammount += variable_craft;
                
                //const current_gained_xp = (attempted_crafting_ammount-1)*estimated_xp_per_craft + (variable_craft?xp_per_craft:(xp_per_craft/4));
                const current_gained_xp = (successful_crafting_ammount + (attempted_crafting_ammount-successful_crafting_ammount)/4)*xp_per_craft;
                let success = 0;
                let fail = 0;
                
                if(attempted_crafting_ammount < ammount_that_can_be_crafted && current_gained_xp < needed_xp) {
                    //if more can be crafted and failed to get enough for a levelup, try to make up to 3 more (since it's 1/4th per fail and there's already 1 fail)
                    for(let i = 0; i < 2 && attempted_crafting_ammount+success+fail < ammount_that_can_be_crafted; i++) {
                        
                        if(Math.random()<success_chance) {
                            success++;
                        } else {
                            fail++;
                        }
                        
                        if((current_gained_xp + xp_per_craft*(success+fail/4)) >= needed_xp) {
                            break;
                        }
                    }
                    attempted_crafting_ammount += success + fail;
                    successful_crafting_ammount += success;
                }

                xp_to_add = current_gained_xp + xp_per_craft*(success+fail/4);

                total_crafting_attempts += attempted_crafting_ammount;
                total_crafting_successes += successful_crafting_ammount;

                //remove used materials by id
                for(let i = 0; i < selected_recipe.materials.length; i++) {
                    if(selected_recipe.materials[i].material_id) {
                        const key = item_templates[selected_recipe.materials[i].material_id].getInventoryKey();
                        remove_from_character_inventory([{item_key: key, item_count: selected_recipe.materials[i].count*attempted_crafting_ammount}]);
                    }
                } 

                //remove used materials by material_type
                for(let i = 0; i < materials.length; i++) {
                    const mat_type = item_templates[materials[i]].material_type;
                    const mat = selected_recipe.materials.find(x => x.material_type === mat_type);
                    remove_from_character_inventory([{item_key: item_templates[materials[i]].getInventoryKey(), item_count: mat.count*attempted_crafting_ammount}]);
                } 

                if(successful_crafting_ammount > 0) {
                    add_to_character_inventory([{item_key: item_templates[result_id].getInventoryKey(), count: count*successful_crafting_ammount}]);
                    let msg = `Created ${item_templates[result_id].getName()}`;
                    if(attempted_crafting_ammount > 1) {
                        msg+=` [${count*successful_crafting_ammount} out of ${count*attempted_crafting_ammount}]`;
                    } else {
                        msg+= ` x${count*successful_crafting_ammount}`;
                    }
                    log_message(msg, "crafting");

                } else {
                    let msg = `Failed to create ${item_templates[result_id].getName()}`;
                    if(attempted_crafting_ammount > 1) {
                        msg+=` [0 out of ${count*attempted_crafting_ammount}]`;
                    } else {
                        msg+= ` x${count*attempted_crafting_ammount}`;
                    }
                    log_message(msg, "crafting");
                }

                leveled = add_xp_to_skill({skill: recipe_skill, xp_to_add: xp_to_add, cap_gained_xp: false, use_bonus: false}); 
                //no cap, as it was already capped; skip bonus as it was already added
                Object.keys(item_templates[result_id].tags).forEach(tag => {
                    const skill_id = crafting_tags_to_skills[tag];
                    if(skill_id) {
                        let leveled = add_xp_to_skill({skill: skills[skill_id], xp_to_add: xp_to_add/2, cap_gained_xp: true, use_bonus: false});
                        //cap, as it's assumed to not be a crafting skill; skip bonus as it was already added
                        if(leveled) {
                            character.stats.add_active_effect_bonus();
                            update_character_stats();
                            Object.keys(character.inventory).forEach(item_key => {
                                if(character.inventory[item_key].item.tags.medicine) {
                                    update_displayed_character_inventory({item_key});
                                }
                            });
                        }
                    }
                });
                
                if(attempted_crafting_ammount < ammount_that_can_be_crafted) {
                    use_recipe(target, ammount_that_can_be_crafted - attempted_crafting_ammount);
                } else {
                    update_item_recipe_visibility();
                    update_item_recipe_tooltips();
                }
                
                //do those two whether success or fail since materials get used either way

                if(leveled) {
                    //reload all recipe tooltips of matching category, except it's kinda pointless if reload happens anyway?
                }
            } else {
                console.warn(`Tried to use a recipe without having enough materials!`);
            }
            
        } else if(subcategory === "components" || selected_recipe.recipe_type === "component" || selected_recipe.recipe_type === "componentless" ) {
            //either component, clothing, or componentless
            //read the selected material, pass it as param

            const material_div = recipe_div.children[1].querySelector(".selected_material");
            if(!material_div) {
                return;
            } else {
                const material_1_key = material_div.dataset.item_key;
                const {id} = JSON.parse(material_1_key);
                const recipe_material = selected_recipe.materials.filter(x=> x.material_id===id)[0];

                if(recipe_material.count <= character.inventory[material_1_key]?.count) {

                    const recipe_skill = skills[selected_recipe.recipe_skill];
                    let ammount_that_can_be_crafted = Math.min(ammount_wanted_to_craft, Math.floor(character.inventory[material_1_key].count/recipe_material.count));
                    let needed_xp = recipe_skill.total_xp_to_next_lvl - recipe_skill.total_xp;
                    let accumulated_xp = 0;
                    let crafted_items = {};
                    let crafted_count = 0;
                    const all_crafted = {};
                    const result = selected_recipe.getResult(character.inventory[material_1_key].item, station_tier);

                    let quality;

                    for(let i = 0; i < ammount_that_can_be_crafted; i++) {
                        //loop for every item to be crafted, as they differ in quality and resultingly in xp too
                        const result_tier = result.component_tier ?? result.item_tier;
                        quality = selected_recipe.get_quality(station_tier - result_tier);

                        crafted_items[quality] = (crafted_items[quality]+1 || 1);
                        all_crafted[quality] = (all_crafted[quality]+1 || 1);
                        crafted_count++;

                        accumulated_xp += Math.min(
                            recipe_skill.xp_to_next_lvl*crafting_skill_xp_gains_cap, 
                            get_recipe_xp_value({category, subcategory, recipe_id, material_count:recipe_material.count, result_tier: result_tier, rarity_multiplier: rarity_multipliers[getItemRarity(quality)]})* get_skill_xp_gain(recipe_skill.skill_id)
                        );
                        if(accumulated_xp  >= needed_xp) {
                            const qualities = Object.keys(crafted_items).map(x => Number(x)).sort((a,b)=>b-a);
                            const highest_qual = qualities[0];

                            if(crafted_count > 1) {
                                log_message(`Created ${result.getName()} x${crafted_count} [highest quality: ${highest_qual}% x${crafted_items[highest_qual]}] (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                            } else {
                                log_message(`Created ${result.getName()} [${highest_qual}% quality] x1 (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                            }

                            add_xp_to_skill({skill: recipe_skill, xp_to_add: accumulated_xp, cap_gained_xp: false, use_bonus: false});

                            crafted_items = {};
                            crafted_count = 0;
                            accumulated_xp = 0;
                            needed_xp = recipe_skill.total_xp_to_next_lvl - recipe_skill.total_xp;
                        }
                    }
                    total_crafting_attempts+=ammount_that_can_be_crafted;
                    total_crafting_successes+=ammount_that_can_be_crafted;

                    if(crafted_count > 0) {
                        const qualities = Object.keys(crafted_items).map(x => Number(x)).sort((a,b)=>b-a);
                        const highest_qual = qualities[0];

                        if(crafted_count > 1) {
                            log_message(`Created ${result.getName()} x${crafted_count} [highest quality: ${highest_qual}% x${crafted_items[highest_qual]}] (+${Math.floor(accumulated_xp)} xp)`, "crafting");

                        } else {
                            log_message(`Created ${result.getName()} [${highest_qual}% quality] x1 (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                        }
                        add_xp_to_skill({skill: recipe_skill, xp_to_add: accumulated_xp, cap_gained_xp: false, use_bonus: false});
                    }

                    //grab key, modify it with proper quality value, add (together with count) to list for adding to inv
                    const result_key = result.getInventoryKey();
                    const parsed_key = JSON.parse(result_key);
                    const crafted_qualities = Object.keys(all_crafted).map(x => Number(x));
                    const to_add = [];
                    for(let i = 0; i < crafted_qualities.length; i++ ) {
                        const new_key = JSON.stringify({...parsed_key, quality: crafted_qualities[i]});
                        to_add.push({item_key: new_key, count: all_crafted[crafted_qualities[i]]}); 
                    }
                    add_to_character_inventory(to_add);

                    //remove used mats
                    remove_from_character_inventory([{item_key: material_1_key, item_count: recipe_material.count*ammount_that_can_be_crafted}]);

                    //update display
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
                    //a probably unnecessary check to see if they are actually in inventory
                    //no need to check how many there is as crafting always takes only 1
                    if(character.inventory[component_1_key].count && character.inventory[component_2_key].count) {
                        
                        const recipe_skill = skills[selected_recipe.recipe_skill]; //should always be "Crafting" but who knows what changes in the future?
                        let ammount_that_can_be_crafted = Math.min(ammount_wanted_to_craft, character.inventory[component_1_key].count, character.inventory[component_2_key].count);
                        let needed_xp = recipe_skill.total_xp_to_next_lvl - recipe_skill.total_xp;
                        let accumulated_xp = 0;
                        let crafted_items = {};
                        let crafted_count = 0;
                        const comp_1 = character.inventory[component_1_key].item;
                        const comp_2 = character.inventory[component_2_key].item;
                        const all_crafted = {};
                        const result = selected_recipe.getResult(comp_1, comp_2, station_tier);

                        let quality;
                        const comp_quality_weighted = selected_recipe.get_component_quality_weighted(comp_1, comp_2);
                        const comp_tier_max = Math.max(comp_1.component_tier, comp_2.component_tier)

                        for(let i = 0; i < ammount_that_can_be_crafted; i++) {
                            quality = selected_recipe.get_quality(comp_quality_weighted, (station_tier-Math.max(comp_tier_max)) || 0);

                            crafted_items[quality] = (crafted_items[quality]+1 || 1);
                            all_crafted[quality] = (all_crafted[quality]+1 || 1);
                            crafted_count++;

                            accumulated_xp += Math.min(
                                    recipe_skill.xp_to_next_lvl, 
                                    get_recipe_xp_value({category, subcategory, recipe_id, selected_components: [comp_1, comp_2], rarity_multiplier: rarity_multipliers[getItemRarity(quality)]})*get_skill_xp_gain(recipe_skill.skill_id)
                            );
                            
                            if(accumulated_xp >= needed_xp) {
                                const qualities = Object.keys(crafted_items).map(x => Number(x)).sort((a,b)=>b-a);
                                const highest_qual = qualities[0];

                                if(crafted_count > 1) {
                                    log_message(`Created ${result.getName()} x${crafted_count} [highest quality: ${highest_qual}% x${crafted_items[highest_qual]}] (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                                } else {
                                    log_message(`Created ${result.getName()} [${highest_qual}% quality] x1 (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                                }

                                add_xp_to_skill({skill: recipe_skill, xp_to_add: accumulated_xp, use_bonus: false, cap_gained_xp: false});

                                crafted_items = {};
                                crafted_count = 0;
                                accumulated_xp = 0;
                                needed_xp = recipe_skill.total_xp_to_next_lvl - recipe_skill.total_xp;
                            }
                        }

                        total_crafting_attempts+=ammount_that_can_be_crafted;
                        total_crafting_successes+=ammount_that_can_be_crafted;

                        if(crafted_count > 0) {
                            const qualities = Object.keys(crafted_items).map(x => Number(x)).sort((a,b)=>b-a);
                            const highest_qual = qualities[0];

                            if(crafted_count > 1) {
                                log_message(`Created ${result.getName()} x${crafted_count} [highest quality: ${highest_qual}% x${crafted_items[highest_qual]}] (+${Math.floor(accumulated_xp)} xp)`, "crafting");

                            } else {
                                log_message(`Created ${result.getName()} [${highest_qual}% quality] x1 (+${Math.floor(accumulated_xp)} xp)`, "crafting");
                            }
                            add_xp_to_skill({skill: recipe_skill, xp_to_add: accumulated_xp, use_bonus: false, cap_gained_xp: false});
                        }

                        //grab key, modify it with proper quality value, add (together with count) to list for adding to inv
                        const result_key = result.getInventoryKey();
                        const parsed_key = JSON.parse(result_key);
                        const crafted_qualities = Object.keys(all_crafted).map(x => Number(x));
                        const to_add = [];
                        for(let i = 0; i < crafted_qualities.length; i++ ) {
                            const new_key = JSON.stringify({...parsed_key, quality: crafted_qualities[i]});
                            to_add.push({item_key: new_key, count: all_crafted[crafted_qualities[i]]}); 
                        }
                        add_to_character_inventory(to_add);

                        //remove used mats
                        remove_from_character_inventory([{item_key: component_1_key, item_count: ammount_that_can_be_crafted}, {item_key: component_2_key, item_count: ammount_that_can_be_crafted}]);
                        const component_keys = {};
                        component_keys[component_1_key] = true;
                        component_keys[component_2_key] = true;
                        update_displayed_component_choice({category, recipe_id, component_keys});
                    }
                }
            }
            //update_displayed_crafting_recipes();
        }  
    }
}

function add_to_content_stack({content_type, data, what_to_remove = content_stack_removal_options.TOP}) {
    content_stack.push({content_type, data, what_to_remove});

    switch_action_box_content();
}

function remove_from_content_stack() {
    const content = content_stack.pop();
    const what_to_remove = content.what_to_remove || content_stack_removal_options.TOP;

    if(what_to_remove === content_stack_removal_options.TOP) {
        //nothing - already done
    } else if(what_to_remove === content_stack_removal_options.ALL) {
        //clear it completely, which will default to location display
        while(content_stack[0]) {
            content_stack.pop();
        }
    } else {
        throw new Error(`No such content stack removal option as "${what_to_remove}"`);
    }

    switch_action_box_content();
}

function pass_data_down_the_content_stack({data}) {
    if(content_stack.length > 1) {
        content_stack[content_stack.length - 2].data.special = data;
    }
}

function switch_action_box_content() {
    //cancel everything when switching
    if(current_dialogue) {
        current_dialogue = null;
    } else if(current_activity) {
        current_activity = null;
        end_activity_animation();
    } else if(current_game_action) {
        current_game_action = null;
        end_activity_animation();
        clearInterval(game_action_interval);
    }

    if(content_stack.length) {
        let {content_type, data} = content_stack[content_stack.length - 1];

        if(content_type.startsWith("dialogue")) {
            current_dialogue = data.dialogue_key;
        }
        if(content_type === "dialogue") {

            //nothing?
        } else if(content_type === "dialogue_answer") {
            //no need to handle this one? (and it's expected to not appear here), as there's no need to put the answer to the stack
        } else if(content_type === "dialogue_branch") {
            //need to handle this one, to allow infinite depth branching?
        } else if(content_type === "action") {
            //everything else is handled in action code
            current_dialogue = data.dialogue_key;
            current_game_action = data.action_key;
        } else if(content_type === "activity") {
            current_activity = data.activity;
            //no need to do much as nothing should be stackable on top of it
        } else {
            throw new Error(`Error on switching action box content: no such content type as "${content_type}"`);
        }

        if(content_type) {
            //something -> pass it forward
            fill_action_box({content_type, data});
        } else {
            //nothing -> shouldn't be possible
        }
        
    } else {
        //stack is empty, just display the current location

        change_location({location_id: current_location.id, skip_travel_time: true});
    }
}

function character_equip_item(item_key) {
    equip_item_from_inventory(item_key);
    if(current_enemies) {
        reset_combat_loops(true);
    } else if(current_location.tags.safe_zone) {
        //update resource gathering tooltips in case there's a skill lvl bonus change
        //done on any change as of now, but could be slightly optimized
        Object.keys(current_location.activities).forEach(activity_key => {
            if(current_location.activities[activity_key].gained_resources) {
                update_gathering_tooltip(current_location.activities[activity_key]);
            }
        });
    }
}

function character_unequip_item(item_slot) {
    unequip_item(item_slot);
    if(current_enemies) {
        reset_combat_loops(true);
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
        //goes through item effects, checking if it has any that is either not currently active or with longer duration than any active
    }
    
    if(used) {
        update_displayed_effects();
        character.stats.add_active_effect_bonus();
        update_character_stats();

        const recovered = [];
        Object.keys(item_templates[id].recovery_chances).forEach(recoverable => {
            const chance = item_templates[id].recovery_chances[recoverable];
            if(chance > Math.random()) {
                recovered.push({item_id: recoverable});
            }
        });
        add_to_character_inventory(recovered);

        //update consuming-related skills if relevant tags are present
        Object.keys(skill_consumable_tags).forEach(skill_id => {
            if(item_templates[id].tags[skill_consumable_tags[skill_id]]) {
                let leveled = add_xp_to_skill({skill: skills[skill_id], xp_to_add: (item_templates[id].value/10)**.6667});
                //if levelup, update all related tooltips
                if(leveled) {
                    character.stats.add_active_effect_bonus();
                    update_character_stats();
                    Object.keys(character.inventory).forEach(item_key => {
                        if(character.inventory[item_key].item.tags[skill_consumable_tags[skill_id]]) {
                            update_displayed_character_inventory({item_key});
                        }
                    });
                }
            }
        });

        remove_from_character_inventory([{item_key}]);
    }
}

function add_consumable_to_favourites(item_id) {
    if(!item_templates[item_id]) {
        throw new Error(`Tried to add "${item_id}" to auto consume, but no such item exists.`);
    } else if(!item_templates[item_id].tags.usable) {
        throw new Error(`Tried to add "${item_id}" to auto consume, but it's not a consumable.`);
    }
    favourite_consumables[item_id] = true;
    //update autouse button display? currently done in .html
}

function remove_consumable_from_favourites(item_id) {
    if(!favourite_consumables[item_id]) {
        throw new Error(`Tried to remove "${item_id}" from auto consume, but it's not there.`);
    }
    delete favourite_consumables[item_id];
    if(character.inventory[item_templates[item_id].getInventoryKey()]) {
        //update autouse button display? currently done in .html
    }
}

function change_consumable_favourite_status(item_id) {
    if(!item_templates[item_id]) {
        throw new Error(`Tried to change "${item_id}" auto consum status, but no such item exists.`);
    } else if(!item_templates[item_id].tags.usable) {
        throw new Error(`Tried to change "${item_id}" auto consume status, but it's not a consumable.`);
    }

    if(favourite_consumables[item_id]) {
        remove_consumable_from_favourites(item_id);
    } else {
        add_consumable_to_favourites(item_id);
    }

    if(character.inventory[item_templates[item_id].getInventoryKey()]) {
        //update autouse button display? currently done in .html
    }
}

function add_active_effect(effect_key, duration){
    let do_not_apply_because_stronger_is_active = false; //readable names are good, right?
    Object.keys(active_effects).forEach(effect => {
        if(do_not_apply_because_stronger_is_active) {
            return;
        }
        Object.keys(effect_templates[effect].group_tags).forEach(group_tag => {
            if(do_not_apply_because_stronger_is_active) {
                return;
            }
            if(group_tag in effect_templates[effect_key].group_tags) {
                if(effect_templates[effect].group_tags[group_tag] > effect_templates[effect_key].group_tags[group_tag]) {
                    //stronger effect is active, skip
                    do_not_apply_because_stronger_is_active = true; 
                } else {
                    //aply the effect normally, remove the weaker
                    delete active_effects[effect];
                }
            }
        });
    });

    if(do_not_apply_because_stronger_is_active) {
        //shouldn't need any recalculations or display updates as nothing was changed
        return;
    }
    active_effects[effect_key] = new ActiveEffect({...effect_templates[effect_key], duration});
    character.stats.add_active_effect_bonus();
    update_displayed_effects();
    update_character_stats();
}

/**
 * Handles preliminary management of quest events, simplifying work by automatically providing all the additional data
 * @param {Object} quest_event_data 
 */
function do_quest_event({quest_event_type, quest_event_target, quest_event_count}) {

    questManager.catchQuestEvent({
        quest_event_type,
        quest_event_target,
        quest_event_count,
        additional_quest_tags: {
            location: current_location?.id || "",
            season: current_game_time.getSeason() || "",
            //just whatever might be possibly needed, to be updated as things expand
        }
    })
}

/**
 * 
 */
function give_export_reward() {
    add_active_effect("Spark of Inspiration", 1800);
    log_message("Gained a Spark of Inspiration!", "export_reward");
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
        save_data["language"] = language;
        save_data.saved_at = get_date();
        save_data.total_playtime = total_playtime;
        save_data.total_deaths = total_deaths;
        save_data.total_crafting_attempts = total_crafting_attempts;
        save_data.total_crafting_successes = total_crafting_successes;
        save_data.total_kills = total_kills;
        save_data.total_crits_done = total_crits_done;
        save_data.total_crits_taken = total_crits_taken;
        save_data.total_hits_done = total_hits_done;
        save_data.total_hits_taken = total_hits_taken;
        save_data.strongest_hit = strongest_hit;
        save_data.gathered_materials = gathered_materials;
        save_data.global_flags = global_flags;
        save_data.last_rewarded_export = last_rewarded_export || 0;
        save_data["character"] = {
                                name: character.name, titles: character.titles, 
                                inventory: {}, equipment: character.equipment,
                                money: character.money, 
                                xp: {
                                    total_xp: character.xp.total_xp,
                                },
                                hp_to_full: character.stats.full.max_health - character.stats.full.health,
                                stamina_to_full: character.stats.full.max_stamina - character.stats.full.stamina,
                                reputation: character.reputation,
                            };
        //stats don't get saved, they will be recalculated upon loading
        save_data["player_storage"] = {inventory: {}};

        save_data.rain_counter = rain_counter;
        save_data.cold_status_counters = cold_status_counters;

        Object.keys(character.inventory).forEach(key =>{
            save_data["character"].inventory[key] = {count: character.inventory[key].count};
        });
        
        Object.keys(player_storage.inventory).forEach(key =>{
            save_data["player_storage"].inventory[key] = {count: player_storage.inventory[key].count};
        });
       
        //Object.keys(character.equipment).forEach(key =>{
            //save_data["character"].equipment[key] = true;
            //need to rewrite equipment loading first
        //});

        save_data["favourite_consumables"] = favourite_consumables;

        save_data["recipes"] = {};
        Object.keys(recipes).forEach(category => {
            save_data["recipes"][category] = {};
            Object.keys(recipes[category]).forEach(subcategory => {
                save_data["recipes"][category][subcategory] = {};
                Object.keys(recipes[category][subcategory]).forEach(recipe_id => {
                    save_data["recipes"][category][subcategory][recipe_id] = {};
                    save_data["recipes"][category][subcategory][recipe_id].is_unlocked = recipes[category][subcategory][recipe_id].is_unlocked;
                    save_data["recipes"][category][subcategory][recipe_id].is_finished = recipes[category][subcategory][recipe_id].is_finished;
                });
            });
        });

        save_data["skill_category_order"] = skill_category_order;
        save_data["skills"] = {};
        Object.keys(skills).forEach(function(key) {
            if(!skills[key].is_parent){
                save_data["skills"][skills[key].skill_id] = {total_xp: skills[key].total_xp}; 
                //a bit redundant, but keep it in case key in skills is different than skill_id
            }
        }); //only save total xp of each skill, again in case of any changes
        
        save_data["current location"] = current_location.id;

        save_data["locations"] = {};
        Object.keys(locations).forEach(function(key) { 
            save_data["locations"][key] = {};
            if(locations[key].is_unlocked) {      
                save_data["locations"][key].is_unlocked = true;
            }
            if(locations[key].is_finished) {      
                save_data["locations"][key].is_finished = true;
            }

            if("parent_location" in locations[key]) { //combat zone //check for is_unlocked too?
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
            if(locations[key].actions) {
                save_data["locations"][key]["actions"] = {};
                Object.keys(locations[key].actions).forEach(action_key => {
                    if(locations[key].actions[action_key].is_unlocked || locations[key].actions[action_key].is_finished) {
                        save_data["locations"][key]["actions"][action_key] = {};

                        if(locations[key].actions[action_key].is_unlocked) {
                            save_data["locations"][key]["actions"][action_key].is_unlocked = true;
                        }
                        if(locations[key].actions[action_key].is_finished) {
                            save_data["locations"][key]["actions"][action_key].is_finished = true;
                        }
                    }
                    
                });
            }
            if(locations[key].housing?.is_unlocked) {
                save_data["locations"][key].housing_unlocked = true;
            }
        }); //save locations' (and their activities'/actions') unlocked status and their killcounts

        save_data.favourite_locations = favourite_locations;

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
                                             gathered_materials: current_activity.gathered_materials,
                                            };
        }
        
        save_data["dialogues"] = {};
        Object.keys(dialogues).forEach(function(dialogue) {
            save_data["dialogues"][dialogue] = {is_unlocked: dialogues[dialogue].is_unlocked, is_finished: dialogues[dialogue].is_finished, textlines: {}, actions: {}};
            if(dialogues[dialogue].textlines) {
                Object.keys(dialogues[dialogue].textlines).forEach(textline_key => {
                    save_data["dialogues"][dialogue].textlines[textline_key] = {is_unlocked: dialogues[dialogue].textlines[textline_key].is_unlocked,
                                                                is_finished: dialogues[dialogue].textlines[textline_key].is_finished};
                });
            }
            if(dialogues[dialogue].actions) {
                Object.keys(dialogues[dialogue].actions).forEach(action_key => {
                    save_data["dialogues"][dialogue].actions[action_key] = {is_unlocked: dialogues[dialogue].actions[action_key].is_unlocked,
                                                                is_finished: dialogues[dialogue].actions[action_key].is_finished};
                });
            }
        }); //save dialogues' and their textlines' unlocked/finished statuses

        save_data["traders"] = {};
        Object.keys(traders).forEach(function(trader) {
            if(traders[trader].is_finished) {
                //trader is no longer accessible
                save_data["traders"][trader] = {is_unlocked: traders[trader].is_unlocked,
                                                is_finished: traders[trader].is_finished};

            } else if(traders[trader].is_unlocked) {
                if(traders[trader].last_refresh == -1 || traders[trader].can_refresh()) {
                    //no need to save inventory, as trader would be anyway refreshed on any visit
                    save_data["traders"][trader] = {last_refresh: -1,
                                                    is_unlocked: traders[trader].is_unlocked};
                } else {
                    const temp_inventory = {};
                    Object.keys(traders[trader].inventory).forEach(key =>{
                        temp_inventory[key] = {count: traders[trader].inventory[key].count};
                    });
                    save_data["traders"][trader] = {inventory: temp_inventory,
                                                    last_refresh: traders[trader].last_refresh,
                                                    is_unlocked: traders[trader].is_unlocked,
                                                    is_finished: traders[trader].is_finished,
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
                    is_finished: book_stats[book].is_finished,
                };
            }
        });

        save_data["quests"] = {};
        Object.keys(quests).forEach(quest_id => {
            //save quest status and their tasks' statuses

            save_data["quests"][quest_id] = {
                is_active: quest_id in active_quests,
                is_finished: quests[quest_id].is_finished,
                task_status: [],
            };

            for(let i = 0; i < quests[quest_id].quest_tasks.length; i++) {
                if(quests[quest_id].quest_tasks[i].is_finished) {
                    save_data["quests"][quest_id].task_status[i] = {is_finished: true};
                } else {
                    if(quest_id in active_quests){
                        //save the progress and return, as only up to the first not-completed needs to be saved, anything after that cannot have  progress
                        save_data["quests"][quest_id].task_status[i] = {progress: active_quests[quest_id].quest_tasks[i].task_condition};
                        return;
                    }
                }
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

        save_data["skill_list_state"] = {};
        for (let i = 0; i < skill_list.childElementCount; i++) {
            save_data["skill_list_state"][i] = skill_list.children[i].classList.contains("skill_category_expanded");
        }

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
    if(Date.now() - last_rewarded_export > time_between_export_rewards) {
        last_rewarded_export = Date.now();
        give_export_reward();
    }

    //will create save twice...
    save_progress();
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
        if(is_manual) {
            log_message("Saved the game manually");
            save_counter = 0;
        }
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

//core function for loading
function load(save_data) {
    try{
        //single loading method
        
        //current enemies are not saved

        let any_warnings = false;

        current_game_time.loadTime(save_data["current time"]);
        time_field.innerHTML = current_game_time.toString();
        //set game time

        Object.keys(save_data.global_flags||{}).forEach(flag => {
            
            if(flag === "is_deep_forest_beaten") { //compatibility for pre-0.5
                global_flags["is_strength_proved"] = save_data.global_flags[flag];
            } else {
                global_flags[flag] = save_data.global_flags[flag];
            }
        });

        if(save_data.language) {
            if(languages[save_data.language]) {
                language = save_data.language;
            } else {
                console.warn(`Language ${save_data.language} could not be found.`);
                if(options.mofu_mofu_mode) {
                    language = languages.mofu_english;
                } else {
                    language = languages.english;
                }
            }
            
        }

        last_rewarded_export = save_data.last_rewarded_export || last_rewarded_export;

        total_playtime = save_data.total_playtime || 0;
        total_deaths = save_data.total_deaths || 0;
        total_crafting_attempts = save_data.total_crafting_attempts || 0;
        total_crafting_successes = save_data.total_crafting_successes || 0;
        total_kills = save_data.total_kills || 0;
        total_crits_done = save_data.total_crits_done || 0;
        total_crits_taken = save_data.total_crits_taken || 0;
        total_hits_done = save_data.total_hits_done || 0;
        total_hits_taken = save_data.total_hits_taken || 0;
        strongest_hit = save_data.strongest_hit || 0;
        gathered_materials = save_data.gathered_materials || {};

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

        options.log_every_gathering_period = save_data.options?.log_every_gathering_period;
        option_log_all_gathering(options.log_every_gathering_period);

        options.log_total_gathering_gain = save_data.options?.log_total_gathering_gain;
        option_log_gathering_result(options.log_total_gathering_gain);

        options.do_background_animations = save_data.options?.do_background_animations;
        option_do_background_animations(options.do_background_animations);

        options.skip_play_button = save_data.options?.skip_play_button;
        option_skip_play_button(options.skip_play_button);

        options.mofu_mofu_mode = save_data.options?.mofu_mofu_mode;
        option_mofu_mofu_mode(options.mofu_mofu_mode);

        options.do_enemy_onhit_animations = save_data.options?.do_enemy_onhit_animations;
        option_do_enemy_onhit_animations(options.do_enemy_onhit_animations);

        //compatibility for old saves, can be removed at some point
        const is_from_before_eco_rework = compare_game_version("v0.3.5", save_data["game version"]) == 1;

        character.money = (save_data.character.money || 0) * ((is_from_before_eco_rework == 1)*10 || 1);
        update_displayed_money();

        add_xp_to_character(save_data.character.xp.total_xp, false);

        rain_counter = save_data.rain_counter || 0;
        for(let i = 0; i < save_data.cold_status_counters?.length; i++) {
            cold_status_counters[i] = save_data.cold_status_counters[i] || 0;
        }

        Object.keys(save_data.favourite_consumables || {}).forEach(key => {
            favourite_consumables[key] = true;
        });

        /*
        Object.keys(save_data.character.reputation || {}).forEach(rep_region => {
            if(rep_region in character.reputation) {
                character.reputation[rep_region] = save_data.character.reputation[rep_region];
            } else {
                console.warn(`Skipped reputation, no such region as "${rep_region}"`);
                any_warnings = true;
            }
        });
        */
        update_displayed_reputation();


        set_loading_screen_progress("Checking out your books");
        
        if(save_data.skill_category_order) {
            save_data.skill_category_order.forEach((elem, idx) => {
                skill_category_order[idx] = elem;
            });
        }

        if(save_data.books) {
            let total_book_xp = 0;
            const literacy_xp = save_data.skills["Literacy"].total_xp;
            Object.keys(save_data.books).forEach(book=>{
                if(!item_templates[book]) {
                    console.warn(`Book ${book} couldn't be found and was skipped!`);
                    any_warnings = true;
                }

                if(save_data.books[book].accumulated_time > 0) {
                    if(save_data.books[book].is_finished) {
                        item_templates[book].setAsFinished();
                        character.stats.add_book_bonus(book_stats[book].bonuses);
                        process_rewards({rewards: book_stats[book].rewards, only_unlocks: true, inform_overall: false, is_from_loading: true});

                        total_book_xp += book_stats[book].required_time * book_stats[book].literacy_xp_rate;
                    } else {
                        item_templates[book].addProgress(save_data.books[book].accumulated_time);
                        total_book_xp += book_stats[book].accumulated_time * book_stats[book].literacy_xp_rate;
                    }
                }

                update_booklist_entry(book, save_data.books[book].is_finished);
            });
            if(total_book_xp > literacy_xp) {
                add_xp_to_skill({skill: skills["Literacy"], should_info: false, xp_to_add: total_book_xp, use_bonus: false, cap_gained_xp: false, is_from_loading: true});
                console.warn(`Saved XP for "Literacy skill" was less than it should be based on progress with books (${literacy_xp} vs ${total_book_xp}), so it was adjusted to match it!`);
                any_warnings = true;
            } else {
                add_xp_to_skill({skill: skills["Literacy"], should_info: false, xp_to_add: literacy_xp, use_bonus: false, cap_gained_xp: false, is_from_loading: true});
            }
        }
        
        Object.keys(save_data.skills).forEach(key => { 
            if(key === "Literacy") {
                return; //done separately, for compatibility with older saves (can be eventually removed)
            }
            if(skills[key] && !skills[key].is_parent){
                if(save_data.skills[key].total_xp > 0) {
                    add_xp_to_skill({
                                        skill: skills[key], xp_to_add: save_data.skills[key].total_xp, 
                                        should_info: false, add_to_parent: true, use_bonus: false, cap_gained_xp: false,
                                        is_from_loading: true
                                    });
                }
            } else if(save_data.skills[key].total_xp > 0) {
                    console.warn(`Skill "${key}" couldn't be found!`);
                    any_warnings = true;
            }
        }); //add xp to skills

        if(save_data["stances"]) {
            Object.keys(save_data["stances"]).forEach(stance => {
                if(save_data["stances"]) {
                    stances[stance].is_unlocked = true;
                } 
            });
        }

        update_displayed_stance_list(stances, current_stance, faved_stances);

        if(save_data.faved_stances) {
            Object.keys(save_data.faved_stances).forEach(stance_id=> {
                if(stances[stance_id] && stances[stance_id].is_unlocked) {
                    fav_stance(stance_id);
                }
            });
        }

        if(save_data.current_stance) {
            current_stance = stances[save_data.current_stance.id] || stances[save_data.current_stance];
            selected_stance = stances[save_data.selected_stance.id] || stances[save_data.selected_stance];

            change_stance({stance_id: selected_stance.id});
        }

        Object.keys(save_data.character.equipment).forEach(function(key){
            if(save_data.character.equipment[key] != null) {
                const quality_mult = compare_game_version("v0.4.4", save_data["game version"]) == 1?100:1; //x100 if its from before quality rework
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
                        any_warnings = true;
                    } else if(!item_templates[components.handle]) {
                        console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                        any_warnings = true;
                    } else {
                        const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                        equip_item(item, true);
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
                        any_warnings = true;
                    } else if(!item_templates[components.handle]) {
                        console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                        any_warnings = true;
                    } else {
                        const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                        equip_item(item, true);
                    }
                } else if(save_data.character.equipment[key].equip_slot === "arti'fact" || save_data.character.equipment[key].tags?.tool) {
                    equip_item(getItem(save_data.character.equipment[key]), true);
                } else { //armor
                    
                    const {quality, equip_slot} = save_data.character.equipment[key];
                    
                    if(save_data.character.equipment[key].components && save_data.character.equipment[key].components.internal.includes(" [component]")) {
                        //compatibility for armors from before v0.4.3
                        const item = getItem({...item_templates[save_data.character.equipment[key].components.internal.replace(" [component]","")], quality:quality*quality_mult});
                        equip_item(item, true);
                    }
                    else if(save_data.character.equipment[key].components) {
                        let components = save_data.character.equipment[key].components;
                        if(!item_templates[components.internal]){
                            console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                            any_warnings = true;
                        } else if(components.external && !item_templates[components.external]) {
                            console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                            any_warnings = true;
                        } else {
                            const item = getItem({components, quality:quality*quality_mult, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item, true);
                        }
                    } else {
                        const item = getItem({...item_templates[save_data.character.equipment[key].name], quality:quality*quality_mult});
                        equip_item(item, true);
                    }

                }
            }
        }); //equip proper items

        if(character.equipment.weapon === null) {
            equip_item(null, true);
        }

        const item_list = [];

        Object.keys(save_data.character.inventory).forEach(key => {
            if(is_JSON(key)) {
                //case where this is False is left as compatibility for saves before v0.4.4
                let {id, components, quality} = JSON.parse(key);
                if(id && !quality) { 
                    //id is just a key of item_templates
                    //if it's present, item is "simple" (no components)
                    //and if it has no quality, it's something non-equippable
                    if(item_templates[id]) {
                        if(id === "Coal" && is_a_older_than_b(save_data["game version"], "v0.4.6.12")) {
                            item_list.push({item_key: item_templates["Charcoal"].getInventoryKey(), count: save_data.character.inventory[key].count, quality: quality});
                        } else {
                            item_list.push({item_key: key, count: save_data.character.inventory[key].count, quality: quality});
                        }
                    } else {
                        console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]} couldn't be found!`);
                        any_warnings = true;
                        return;
                    }
                } else if(components) {
                    const {head, handle, shield_base, internal, external} = components;
                    if(head) { //weapon
                        if(!item_templates[head]){
                            console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else {
                            item_list.push({item_key: key, count: save_data.character.inventory[key].count, quality: quality});
                        }
                    } else if(shield_base){ //shield
                        if(!item_templates[shield_base]){
                            console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: shield handle component "${handle}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else {
                            item_list.push({item_key: key, count: save_data.character.inventory[key].count, quality: quality});
                        }
                    } else if(internal) { //armor
                        if(!item_templates[internal]){
                            console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else if(!item_templates[external]) {
                            console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                            any_warnings = true;
                            return;
                        } else {
                            let equip_slot = getArmorSlot(internal);
                            if(!equip_slot) {
                                return;
                            }
                            item_list.push({item_key: key, count: save_data.character.inventory[key].count, quality: quality});
                        }
                    } else {
                        console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} seems to refer to non-existing item type!`);
                    }
                } else if(quality) { //no comps but quality (clothing / artifact?)
                    item_list.push({item_key: key, count: save_data.character.inventory[key].count, quality: quality});
                } else {
                    console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} is incorrect!`);
                }
            } else { //older savefile
                if(Array.isArray(save_data.character.inventory[key])) { //is a list of unstackable items (equippables or books), needs to be added 1 by 1
                    for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                        if(save_data.character.inventory[key][i].item_type === "EQUIPPABLE" ) {
                            if(save_data.character.inventory[key][i].equip_slot === "weapon") {
                                
                                const {quality} = save_data.character.inventory[key][i];
                                let components;
                                if(save_data.character.inventory[key][i].components) {
                                    components = save_data.character.inventory[key][i].components
                                } else {
                                    const {head, handle} = save_data.character.inventory[key][i];
                                    components = {head, handle};
                                }

                                if(!item_templates[components.head]){
                                    console.warn(`Skipped item: weapon head component "${components.head}" couldn't be found!`);
                                    any_warnings = true;
                                } else if(!item_templates[components.handle]) {
                                    console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                                    any_warnings = true;
                                } else {
                                    const item = getItem({item_type: "EQUIPPABLE", equip_slot: "weapon", components});
                                    item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                }
                            } else if(save_data.character.inventory[key][i].equip_slot === "off-hand") {
                                const {quality} = save_data.character.inventory[key][i];
                                let components;
                                if(save_data.character.inventory[key][i].components) {
                                    components = save_data.character.inventory[key][i].components
                                } else {
                                    const {shield_base, handle} = save_data.character.inventory[key][i];
                                    components = {shield_base, handle};
                                }

                                if(!item_templates[components.shield_base]){
                                    console.warn(`Skipped item: shield base component "${components.shield_base}" couldn't be found!`);
                                    any_warnings = true;
                                } else if(!item_templates[components.handle]) {
                                    console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                                    any_warnings = true;
                                } else {
                                    const item = getItem({item_type: "EQUIPPABLE", equip_slot: "off-hand", components});
                                    item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                }
                            } else if(save_data.character.inventory[key][i].equip_slot === "artifact" || save_data.character.inventory[key][i].equip_slot === "amulet") {
                                item_list.push({item_key: key, count: 1});
                            } else { //armor    
                                if(save_data.character.inventory[key][i].components && save_data.character.inventory[key][i].components.internal.includes(" [component]")) {
                                    //compatibility for armors from before v0.4.3
                                    //const item = getItem({item_type: "EQUIPPABLE", equip_slot: "weapon", components});
                                    item_list.push({item_key: key, count: 1});
                                }
                                else if(save_data.character.inventory[key][i].components) {
                                    let components = save_data.character.inventory[key][i].components;
                                    if(!item_templates[components.internal]){
                                        console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                                        any_warnings = true;
                                    } else if(components.external && !item_templates[components.external]) {
                                        console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                                        any_warnings = true;
                                    } else {
                                        const item = getItem({item_type: "EQUIPPABLE", components});
                                        item_list.push({item_key: item.getInventoryKey(), count: 1, quality: save_data.character.inventory[key][i].quality*100});
                                    }
                                } else {
                                    item_list.push({item_id: key, count: 1});
                                }
                            }
                        } else {
                            item_list.push({item_id: key, count: 1, quality: save_data.character.inventory[key][i].quality*100});
                        }
                        
                    }
                } else { //is stackable 
                    if(item_templates[key]) {
                        item_list.push({item_id: key, count: save_data.character.inventory[key].count});
                    } else {
                        console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]}" couldn't be found!`);
                        any_warnings = true;
                        return;
                    }
                }
            }
        }); //add all loaded items to list
        add_to_character_inventory(item_list); // and then to inventory

        const storage_item_list = [];
        if(save_data.player_storage) {
            Object.keys(save_data.player_storage.inventory).forEach(function(key){
                if(is_JSON(key)) {
                    let {id, components, quality} = JSON.parse(key);
                    if(id && !quality) { 
                        //id is just a key of item_templates
                        //if it's present, item is "simple" (no components)
                        //and if it has no quality, it's something non-equippable
                        if(item_templates[id]) {
                            storage_item_list.push({item_key: key, count: save_data.player_storage.inventory[key].count, quality: quality});
                        } else {
                            console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]} couldn't be found!`);
                            any_warnings = true;
                            return;
                        }
                    } else if(components) {
                        const {head, handle, shield_base, internal, external} = components;
                        if(head) { //weapon
                            if(!item_templates[head]){
                                console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else {
                                storage_item_list.push({item_key: key, count: save_data.player_storage.inventory[key].count, quality: quality});
                            }
                        } else if(shield_base){ //shield
                            if(!item_templates[shield_base]){
                                console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: shield handle component "${handle}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else {
                                storage_item_list.push({item_key: key, count: save_data.player_storage.inventory[key].count, quality: quality});
                            }
                        } else if(internal) { //armor
                            if(!item_templates[internal]){
                                console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else if(!item_templates[external]) {
                                console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                                any_warnings = true;
                                return;
                            } else {
                                let equip_slot = getArmorSlot(internal);
                                if(!equip_slot) {
                                    return;
                                }
                                storage_item_list.push({item_key: key, count: save_data.player_storage.inventory[key].count, quality: quality});
                            }
                        } else {
                            console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} seems to refer to non-existing item type!`);
                        }
                    } else if(quality) { //no comps but quality (clothing / artifact?)
                        storage_item_list.push({item_key: key, count: save_data.player_storage.inventory[key].count, quality: quality});
                    } else {
                        console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} is incorrect!`);
                    }
                } //storage didn't exist before everything became stackable, so no need to check the other case
            }); //add all loaded items to list
            player_storage.add_to_inventory(storage_item_list); // and then to storage inventory
        }

        set_loading_screen_progress("Meowing at your cat");

        Object.keys(save_data.dialogues).forEach(function(dialogue) {
            if(dialogues[dialogue]) {
                dialogues[dialogue].is_unlocked = save_data.dialogues[dialogue].is_unlocked;
                dialogues[dialogue].is_finished = save_data.dialogues[dialogue].is_finished;
            } else {
                if(dialogue === "cute little rat" && is_a_older_than_b(save_data["game version"], "v0.5.0")) {
                    return;
                }
                console.warn(`Dialogue "${dialogue}" couldn't be found!`);
                any_warnings = true;
                return;
            }
            if(save_data.dialogues[dialogue].textlines) {  
                Object.keys(save_data.dialogues[dialogue].textlines).forEach(textline_key => {
                    if(dialogues[dialogue].textlines[textline_key]) {
                        dialogues[dialogue].textlines[textline_key].is_unlocked = save_data.dialogues[dialogue].textlines[textline_key].is_unlocked;
                        dialogues[dialogue].textlines[textline_key].is_finished = save_data.dialogues[dialogue].textlines[textline_key].is_finished;
                    } else {
                        console.warn(`Textline "${textline_key}" in dialogue "${dialogue}" couldn't be found!`);
                        any_warnings = true;
                        return;
                    }
                }); 
            }
            if(save_data.dialogues[dialogue].actions) {  
                Object.keys(save_data.dialogues[dialogue].actions).forEach(action_key => {
                    if(dialogues[dialogue].actions[action_key]) {
                        dialogues[dialogue].actions[action_key].is_unlocked = save_data.dialogues[dialogue].actions[action_key].is_unlocked;
                        dialogues[dialogue].actions[action_key].is_finished = save_data.dialogues[dialogue].actions[action_key].is_finished;
                    } else {
                        console.warn(`Textline "${action_key}" in dialogue "${dialogue}" couldn't be found!`);
                        any_warnings = true;
                        return;
                    }
                }); 
            }
        }); //load for dialogues and their textlines and actions their unlocked/finished status

        Object.keys(save_data.traders).forEach(function(trader) { 
            let trader_item_list = [];
            if(traders[trader]){
                traders[trader].is_unlocked = save_data.traders[trader].is_unlocked;

                if(save_data.traders[trader].is_finished) {
                    traders[trader].is_finished = true;
                    return;
                }

                if(save_data.traders[trader].inventory) {
                    Object.keys(save_data.traders[trader].inventory).forEach(function(key){
                        if(is_JSON(key)) {
                            let {id, components, quality} = JSON.parse(key);
                            if(id && !quality) { 
                                //id is just a key of item_templates
                                //if it's present, item is "simple" (no components)
                                //and if it has no quality, it's something non-equippable
                                if(item_templates[id]) {
                                    trader_item_list.push({item_key: key, count: save_data.traders[trader].inventory[key].count});
                                } else {
                                    console.warn(`Inventory item "${key}" from save on version "${save_data["game version"]} couldn't be found!`);
                                    any_warnings = true;
                                    return;
                                }
                            } else if(components) {
                                const {head, handle, shield_base, internal, external} = components;
                                if(head) { //weapon
                                    if(!item_templates[head]){
                                        console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else if(!item_templates[handle]) {
                                        console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else {
                                        trader_item_list.push({item_key: key, count: save_data.traders[trader].inventory[key].count, quality});
                                    }
                                } else if(shield_base){ //shield
                                    if(!item_templates[shield_base]){
                                        console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else if(!item_templates[handle]) {
                                        console.warn(`Skipped item: shield handle component "${handle}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else {
                                        //const item = getItem({components, quality, equip_slot: "off-hand", item_type: "EQUIPPABLE"});
                                        trader_item_list.push({item_key: key, count: save_data.traders[trader].inventory[key].count, quality});
                                    }
                                } else if(internal) { //armor
                                    if(!item_templates[internal]){
                                        console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else if(!item_templates[external]) {
                                        console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                                        any_warnings = true;
                                        return;
                                    } else {
                                        if(!getArmorSlot(internal)) {
                                            return;
                                        }
                                        trader_item_list.push({item_key: key, count: save_data.traders[trader].inventory[key].count, quality});
                                    }
                                } else {
                                    console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} seems to refer to non-existing item type!`);
                                }
                            } else if(quality) { //no comps but quality (clothing / artifact?)
                                trader_item_list.push({item_key: key, count: save_data.traders[trader].inventory[key].count, quality});
                            } else {
                                console.error(`Intentory key "${key}" from save on version "${save_data["game version"]} is incorrect!`);
                            }
                            
                        } else { //compatibility for saves before v0.4.4
                            if(Array.isArray(save_data.traders[trader].inventory[key])) { //is a list of unstackable (equippable or book) item, needs to be added 1 by 1
                                for(let i = 0; i < save_data.traders[trader].inventory[key].length; i++) {
                                    if(save_data.traders[trader].inventory[key][i].item_type === "EQUIPPABLE"){
                                        if(save_data.traders[trader].inventory[key][i].equip_slot === "weapon") {
                                            const {quality} = save_data.traders[trader].inventory[key][i];
                                            let components;
                                            if(save_data.traders[trader].inventory[key][i].components) {
                                                components = save_data.traders[trader].inventory[key][i].components
                                            } else {
                                                const {head, handle} = save_data.traders[trader].inventory[key][i];
                                                components = {head, handle};
                                            }

                                            if(!item_templates[components.head]){
                                                console.warn(`Skipped item: weapon head component "${components.head}" couldn't be found!`);
                                                any_warnings = true;
                                            } else if(!item_templates[components.handle]) {
                                                console.warn(`Skipped item: weapon handle component "${components.handle}" couldn't be found!`);
                                                any_warnings = true;
                                            } else {
                                                const item = getItem({components, item_type: "EQUIPPABLE", equip_slot: "weapon"});
                                                trader_item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                            }
                                        } else if(save_data.traders[trader].inventory[key][i].equip_slot === "off-hand") {
                                            
                                            const {quality} = save_data.traders[trader].inventory[key][i];
                                            let components;
                                            if(save_data.traders[trader].inventory[key][i].components) {
                                                components = save_data.traders[trader].inventory[key][i].components
                                            } else {
                                                const {shield_base, handle} = save_data.traders[trader].inventory[key][i];
                                                components = {shield_base, handle};
                                            }

                                            if(!item_templates[components.shield_base]){
                                                console.warn(`Skipped item: shield base component "${components.shield_base}" couldn't be found!`);
                                                any_warnings = true;
                                            } else if(!item_templates[components.handle]) {
                                                console.warn(`Skipped item: shield handle "${components.handle}" couldn't be found!`);
                                                any_warnings = true;
                                            } else {
                                                //trader_item_list.push({item_key: key, count: 1, quality: quality*100});
                                                const item = getItem({components, item_type: "EQUIPPABLE", equip_slot: "off-hand"});
                                                trader_item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                            }
                                        } else { //armor
                                            const {quality} = save_data.traders[trader].inventory[key][i];
                                            if(save_data.traders[trader].inventory[key][i].components && save_data.traders[trader].inventory[key][i].components.internal.includes(" [component]")) {
                                                //compatibility for armors from before v0.4.3
                                                const item = getItem({...item_templates[key]});
                                                trader_item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                            } else if(save_data.traders[trader].inventory[key][i].components) {
                                                let components = save_data.traders[trader].inventory[key][i].components;
                                                if(!item_templates[components.internal]){
                                                    console.warn(`Skipped item: internal armor component "${components.internal}" couldn't be found!`);
                                                    any_warnings = true;
                                                } else if(components.external && !item_templates[components.external]) {
                                                    console.warn(`Skipped item: external armor component "${components.external}" couldn't be found!`);
                                                    any_warnings = true;
                                                } else {
                                                    //trader_item_list.push({item_key: key, count: 1, quality: quality*100});
                                                    const item = getItem({components, item_type: "EQUIPPABLE", equip_slot: "armor"});
                                                    trader_item_list.push({item_key: item.getInventoryKey(), count: 1, quality: quality*100});
                                                }
                                            } else { //no components, so clothing? not sure, it's old stuff
                                                trader_item_list.push({item_id: key, count: 1, quality: quality*100});
                                            }
                                        }
                                    } else {
                                        console.warn(`Skipped item, no such item type as "${0}" could be found`)
                                        any_warnings = true;
                                    }
                                }
                            } else {
                                save_data.traders[trader].inventory[key].item.value = item_templates[key].value;
                                if(item_templates[key].item_type === "EQUIPPABLE") {
                                    save_data.traders[trader].inventory[key].item.equip_effect = item_templates[key].equip_effect;
                                } else if(item_templates[key].item_type === "USABLE") {
                                    save_data.traders[trader].inventory[key].item.use_effect = item_templates[key].use_effect;
                                }
                                trader_item_list.push({item_id: key, count: save_data.traders[trader].inventory[key].count});
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
                any_warnings = true;
                return;
            }
        }); //load trader inventories

        set_loading_screen_progress("Hiding rats in your walls");

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

                    if(is_a_older_than_b(save_data["game version"], "v0.4.6")) { //compatibility patch for pre-rep and/or pre-rewrite of rewards with required clear count
                        if(locations[key].rewards_with_clear_requirement) {
                            //process rewards with clear req, as these won't be checked on further clears
                            for(let i = 0; i < locations[key].rewards_with_clear_requirement.length; i++) {
                                if(locations[key].enemy_groups_killed == locations[key].enemy_count * locations[key].rewards_with_clear_requirement[i].required_clear_count)
                                {
                                    //always do it if there was enough or more than enough clears
                                    process_rewards({
                                                        rewards: locations[key].rewards_with_clear_requirement[i], source_type: "location", 
                                                        source_name: locations[key].name, is_first_clear: false, source_id: locations[key].id,
                                                        is_from_loading: true
                                                    });
                                }
                            }
                        }
                    } else {
                        if(locations[key].rewards_with_clear_requirement) {
                            //process rewards with clear req, as these won't be checked on further clears
                            for(let i = 0; i < locations[key].rewards_with_clear_requirement.length; i++) {
                                if(locations[key].enemy_groups_killed >= locations[key].enemy_count * locations[key].rewards_with_clear_requirement[i].required_clear_count)
                                {
                                    //always do it if there was enough or more than enough clears
                                    process_rewards({
                                                        rewards: locations[key].rewards_with_clear_requirement[i], source_type: "location", 
                                                        source_name: locations[key].name, is_first_clear: false, source_id: locations[key].id, 
                                                        only_unlocks: true, is_from_loading: true
                                                    });
                                }
                            }
                        }
                    }

                    if(locations[key].first_reward) {
                        //process first clear reward, as it won't be checked on further clears
                        process_rewards({
                            rewards: locations[key].first_reward, 
                            source_type: "location", 
                            is_first_clear: true, 
                            source_id: location.id,
                            is_from_loading: true,
                            only_unlocks: true,
                        });
                    }
                }

                //unlock activities
                if(save_data.locations[key].unlocked_activities) {
                    for(let i = 0; i < save_data.locations[key].unlocked_activities.length; i++) {
                        if(!locations[key].activities[save_data.locations[key].unlocked_activities[i]]) {
                            continue;
                        }
                        if(save_data.locations[key].unlocked_activities[i] === "plowing the fields") { //old compatibility patch
                            locations[key].activities["fieldwork"].is_unlocked = true;
                        } else {
                            locations[key].activities[save_data.locations[key].unlocked_activities[i]].is_unlocked = true;
                        }
                    }
                }

                if(save_data.locations[key].actions) {
                    Object.keys(save_data.locations[key].actions).forEach(action_key => {
                        if(save_data.locations[key].actions[action_key].is_unlocked) {
                            locations[key].actions[action_key].is_unlocked = true;
                        }

                        if(save_data.locations[key].actions[action_key].is_finished) {
                            locations[key].actions[action_key].is_finished = true;
                        }

                    });
                }

                if(save_data.locations[key].housing_unlocked) {
                    if(!Object.keys(locations[key].housing).length) {
                        console.warn(`Location "${locations[key].name}" was saved as having a bed unlocked, but it no longer has this mechanic and was skipped!`);
                        any_warnings = true;
                    } else {
                        locations[key].housing.is_unlocked = true;
                        if(save_data.locations[key].is_unlocked) {
                            unlocked_beds[key] = true;
                        }
                    }
                } else if(locations[key].housing?.is_unlocked){ {
                    unlocked_beds[key] = true;
                }

                }

            } else {
                console.warn(`Location "${key}" couldn't be found!`);
                any_warnings = true;
                return;
            }
        }); //load for locations their unlocked status and their killcounts

        if(is_a_older_than_b(save_data["game version"], "v0.5")) {
            //unlock status was swapped from local activity to global activity, so a need for this
            if(locations["Nearby cave"].activities["climbing"].is_unlocked) {
                activities["climbing"].is_unlocked = true;
            }
        }

        if(is_a_older_than_b(save_data["game version"], "v0.4.6.7")) {
            locations["Town square"].is_unlocked = false;
            if(save_data["current location"] === "Town square") {
                save_data["current location"] = "Village";
            }
            //tiny lock and location swap as it was accidentally unlocked in 4.6.0 - 4.6.6
        }
        

        Object.keys(save_data.activities).forEach(function(activity) {
            if(activities[activity]) {
                activities[activity].is_unlocked = save_data.activities[activity].is_unlocked || false;
            } else if(activity === "plowing the fields") { //old compatibility patch
                activities["fieldwork"].is_unlocked = save_data.activities[activity].is_unlocked || false;
            } else {
                console.warn(`Activity "${activity}" couldn't be found!`);
                any_warnings = true;
            }
        });

        if(is_a_older_than_b(save_data["game version"], "v0.5")) {
            //save from before v0.5: 
            // - split sold count equally between traders
            // - add an "Old shovel"
            const loot_count = {};
            const divisor = Object.keys(market_region_mapping).length;
            Object.keys(save_data.loot_sold_count).forEach(loot_key => {
                const count = save_data.loot_sold_count[loot_key];
                Object.keys(market_region_mapping).forEach(region_key => {
                    if(!loot_count[region_key]) {
                        loot_count[region_key] = {};
                    }
                    
                    loot_count[region_key][loot_key] = [{sold: 0, recovered: 0}];
                    loot_count[region_key][loot_key][0].sold = Math.floor(count.sold/divisor);
                    loot_count[region_key][loot_key][0].recovered = Math.floor(count.recovered/divisor);
                });
            });
            set_loot_sold_count(loot_count);
            
            if(dialogues["old craftsman"].textlines["learn"].is_finished) {
                add_to_character_inventory([{item_id: "Old shovel"}]);
            }
        } else if(is_a_older_than_b(save_data["game version"], "v0.5.0.22") && is_a_older_than_b("v0.5", save_data["game version"])) {
            //save between 0.5 and trickle rate fix
            const loot_count = {};
            
            Object.keys(save_data.loot_sold_count).forEach(region_key => {
                loot_count[region_key] = {};
                Object.keys(save_data.loot_sold_count[region_key]).forEach(trade_key => {
                    loot_count[region_key][trade_key] = [];
                    for(let i = 0; i < save_data.loot_sold_count[region_key][trade_key].length; i++) {
                        if(save_data.loot_sold_count[region_key][trade_key][i].sold > capped_at) {
                            console.warn(`Encountered a large sold count (${save_data.loot_sold_count[region_key][trade_key][i].sold}) of a trade group "${trade_key}" at tier ${i}. Due to the save being from a game version where a certain bug`
                                    + ` could make these values keep growing by themselves, it was reduced to ${capped_at}, and it's recovered_count was lowered proportionally.`);

                            const ratio = save_data.loot_sold_count[region_key][trade_key][i].recovered/save_data.loot_sold_count[region_key][trade_key][i].sold;
                            save_data.loot_sold_count[region_key][trade_key][i].sold = capped_at;
                            save_data.loot_sold_count[region_key][trade_key][i].recovered = capped_at*ratio;
                        }

                        loot_count[region_key][trade_key].push({sold: save_data.loot_sold_count[region_key][trade_key][i].sold, recovered: save_data.loot_sold_count[region_key][trade_key][i].recovered});
                    }
                });
            });

            set_loot_sold_count(loot_count);
        } else {
            //set it normally
            set_loot_sold_count(save_data.loot_sold_count || {});
        }

        //load active effects if save is not from before their rework
        if(compare_game_version(save_data["game version"], "v0.4.4") >= 0){
            Object.keys(save_data.active_effects).forEach(function(effect) {
                active_effects[effect] =  new ActiveEffect({...effect_templates[effect], duration: save_data.active_effects[effect].duration});
            });
            character.stats.add_active_effect_bonus();
        }

        set_loading_screen_progress("Hiding from the vet");

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

        set_loading_screen_progress("Hiding rats in your walls (again!)");

        if(save_data["enemy_killcount"]) {
            Object.keys(save_data["enemy_killcount"]).forEach(enemy_name => {
                enemy_killcount[enemy_name] = save_data["enemy_killcount"][enemy_name];
                create_new_bestiary_entry(enemy_name);
            });
        }

        set_loading_screen_progress("Looking for things that can be done tomorrow instead");

        if(save_data["quests"]) {
            Object.keys(save_data["quests"]).forEach(quest => {

                if(save_data["quests"][quest].is_finished) {
                    //finished => all tasks are also finished, don't care about their specifics
                    for(let i = 0; i < quests[quest].quest_tasks.length; i++) {
                        quests[quest].quest_tasks[i].is_finished = true;
                    }
                    questManager.startQuest({quest_id: quest, should_inform: false});
                    questManager.finishQuest({quest_id: quest, should_inform: false, only_unlocks: true, is_from_loading: true});

                } else if(save_data["quests"][quest].is_active) {
                    questManager.startQuest({quest_id: quest, should_inform: false});
                    //active => at least 1 task is unfinished and its specifics matter
                    for(let i = 0; i < save_data["quests"][quest].task_status.length-1; i++) {
                        //set all but last to finished
                        quests[quest].quest_tasks[i].is_finished = true;
                    }

                    //set progress of the first unfinished task
                    const unfinished_index = save_data["quests"][quest].task_status.length-1;
                    const first_unfinished_task = save_data["quests"][quest].task_status[unfinished_index].progress;


                    Object.keys(first_unfinished_task || {}).forEach(task_group => {
                        if(!quests[quest].quest_tasks[unfinished_index].task_condition[task_group]) {
                            console.warn(`Skipped loading progress for quest "${quest}", no such task group as "${task_group}" was present.`);
                            any_warnings = true;
                            return;
                        }
                        Object.keys(first_unfinished_task[task_group]).forEach(task_type =>{
                            if(!quests[quest].quest_tasks[unfinished_index].task_condition[task_group][task_type]) {
                                console.warn(`Skipped loading progress for quest "${quest}", no such task type as "${task_type}" was present.`);
                                any_warnings = true;
                                return;
                            }
                            Object.keys(first_unfinished_task[task_group][task_type]).forEach(task_target_id => {
                                if(!quests[quest].quest_tasks[unfinished_index].task_condition[task_group][task_type][task_target_id]) {
                                    console.warn(`Skipped loading progress for quest "${quest}", no such task target as "${task_target_id}" was present.`);
                                    any_warnings = true;
                                    return;
                                }
                                quests[quest].quest_tasks[unfinished_index].task_condition[task_group][task_type][task_target_id].current = first_unfinished_task[task_group][task_type][task_target_id].current;
                            });
                        });
                    });
                    if(!quests[quest].is_hidden) {
                        update_displayed_quest(quest);
                    }
                }
            });
        }

        //save from before quests, need to manually setup story quests
        if(is_a_older_than_b(save_data["game version"], "v0.5.0")){
            
            //memory line
            questManager.startQuest({quest_id: "Lost memory", should_inform: false});
            if(dialogues["village elder"].textlines["what happened"].is_finished) {
                questManager.finishQuestTask({quest_id: "Lost memory", task_index: 0, skip_message: true});

                if(dialogues["village elder"].textlines["need to"].is_finished) {
                    questManager.finishQuestTask({quest_id: "Lost memory", task_index: 1, skip_message: true});

                    if(dialogues["village elder"].textlines["cleared cave"].is_finished) {
                        questManager.finishQuestTask({quest_id: "Lost memory", task_index: 2, skip_message: true});
    
                        if(dialogues["suspicious man"].textlines["defeated"].is_finished) {
                            questManager.finishQuestTask({quest_id: "Lost memory", task_index: 3, skip_message: true});
                        }
                    }
                }
                
            }

            //rat saga line
            if(locations["Suspicious wall"].is_finished) {
                questManager.startQuest({quest_id: "The Infinite Rat Saga", should_inform: false});

                if(locations["Mysterious gate"].enemy_groups_killed >= locations["Mysterious gate"].enemy_count) {
                    questManager.finishQuestTask({quest_id: "The Infinite Rat Saga", task_index: 0, skip_message: true});

                    if(locations["Nearby cave"].actions["open the gate"].is_finished) {
                        questManager.finishQuestTask({quest_id: "The Infinite Rat Saga", task_index: 1, skip_message: true});

                        if(locations["Writhing tunnel"].enemy_groups_killed >= locations["Writhing tunnel"].enemy_count) {
                            questManager.finishQuestTask({quest_id: "The Infinite Rat Saga", task_index: 2, skip_message: true});
                        }
                    }
                }
            }

            //slums line
            if(dialogues["suspicious man"].textlines["gang"].is_finished) {
                questManager.startQuest({quest_id: "Light in the darkness", should_inform: false});
                questManager.finishQuestTask({quest_id: "Light in the darkness", task_index: 0, skip_message: true});

                if(locations["Gang hideout"].is_finished) {
                    questManager.finishQuestTask({quest_id: "Light in the darkness", task_index: 1, skip_message: true});
                }
            }

            //town farm quest
            if(dialogues["farm supervisor"].textlines["fight0"].is_finished || dialogues["farm supervisor"].textlines["fight"].is_finished) {
                questManager.startQuest({quest_id: "Ploughs to swords", should_inform: false});

                if(dialogues["farm supervisor"].textlines["fight"].is_finished) {
                    questManager.finishQuestTask({quest_id: "Ploughs to swords", task_index: 0, skip_message: true});
                    
                    if(dialogues["farm supervisor"].textlines["defeated boars"].is_finished) {
                        questManager.finishQuestTask({quest_id: "Ploughs to swords", task_index: 1, skip_message: true});
                    }
                }
            }
        }

        //reposted because "fight" textline was originally not included, causing issues
        if(is_a_older_than_b(save_data["game version"], "v0.5.0.7") && is_a_older_than_b("v0.5.0", save_data["game version"])){ 
             if(dialogues["farm supervisor"].textlines["fight0"].is_finished || dialogues["farm supervisor"].textlines["fight"].is_finished) {
                questManager.startQuest({quest_id: "Ploughs to swords", should_inform: false});

                if(dialogues["farm supervisor"].textlines["fight"].is_finished) {
                    questManager.finishQuestTask({quest_id: "Ploughs to swords", task_index: 0, skip_message: true});
                    
                    if(dialogues["farm supervisor"].textlines["defeated boars"].is_finished) {
                        questManager.finishQuestTask({quest_id: "Ploughs to swords", task_index: 1, skip_message: true});
                    }
                }
            }
        }

        //continuation for compatibility as there was no good place in dialogues to put it in...
        if(dialogues["farm supervisor"].textlines["defeated boars"].is_finished) {
            dialogues["farm supervisor"].textlines["troubled"].is_unlocked = true;
        }
        
        set_loading_screen_progress("Mixing catnip with more catnip");

        if(save_data["recipes"]) {
            Object.keys(save_data["recipes"]).forEach(category => {
                Object.keys(save_data["recipes"][category]).forEach(subcategory => {
                    Object.keys(save_data["recipes"][category][subcategory]).forEach(recipe_id => {
                        if(!recipes[category][subcategory][recipe_id]) {
                            if(is_a_older_than_b(save_data["game version"], "v0.5.0")){
                                if(
                                    (
                                        category === "crafting" 
                                        && subcategory === "items" 
                                        && (recipes["butchering"]["items"][recipe_id] || recipes["woodworking"]["items"][recipe_id])
                                    )
                                    || recipe_id === "Shield base" 
                                    || recipe_id === "Shield handle"
                                ) {
                                    //don't warn as they were moved to different category
                                    return;
                                }
                            }

                            console.warn(`Could not find recipe "${category}"->"${subcategory}"->"${recipe_id}". It might have been removed.`);
                            any_warnings = true;
                            return;
                        }
                        if(save_data["recipes"][category][subcategory][recipe_id].is_unlocked) {
                            recipes[category][subcategory][recipe_id].is_unlocked = true;
                        }
                        if(save_data["recipes"][category][subcategory][recipe_id].is_finished) {
                            recipes[category][subcategory][recipe_id].is_finished = true;
                        }
                    });
                });
            });
        }

        set_loading_screen_progress("Doing some finishing pats");

        if(save_data.favourite_locations) {
            Object.keys(save_data.favourite_locations).forEach(location_key => {
                if(locations[location_key]) {
                    favourite_locations[location_key] = true;
                } else {
                    console.warn(`Saved favourite locations included "${location_key}", which is not a valid location id`);
                    any_warnings = true;
                }
            });
        }

        if(save_data.skill_list_state) {
            Object.keys(save_data.skill_list_state).forEach(index => {
                if (skill_list.childElementCount > 0 && save_data.skill_list_state[index]) {
                    skill_list.children[index].classList.add("skill_category_expanded");
                }
            })
        }

        update_character_stats();
        update_displayed_character_inventory();

        update_displayed_health();
        //load current health
        
        update_displayed_effects();
        
        create_displayed_crafting_recipes();
        change_location({location_id: save_data["current location"], skip_travel_time: true, do_quest_events: false, skip_combat: true});

        //temperature is location dependent so display setting is loaded after location is set
        options.use_uncivilised_temperature_scale = save_data.options?.use_uncivilised_temperature_scale;
        option_use_uncivilised_temperature_scale(options.use_uncivilised_temperature_scale);

        //set activity if any saved
        if(save_data.current_activity) {
            //search for it in location from save_data
            const activity_id = save_data.current_activity.activity_id;
            if(typeof activity_id !== "undefined" && current_location.activities[activity_id] && activities[current_location.activities[activity_id].activity_name]) {
                
                start_activity(activity_id);
                if(activities[current_location.activities[activity_id].activity_name].type === "JOB") {
                    current_activity.working_time = save_data.current_activity.working_time;
                    current_activity.earnings = save_data.current_activity.earnings * ((is_from_before_eco_rework == 1)*10 || 1);
                    document.getElementById("action_end_earnings").innerHTML = `(earnings: ${format_money(current_activity.earnings)})`;
                } else if(activities[current_location.activities[activity_id].activity_name].type === "GATHERING") {
                    current_activity.gathered_materials = save_data.current_activity.gathered_materials || {};
                }

                current_activity.gathering_time = save_data.current_activity.gathering_time;
                
            } else {
                console.warn(`Couldn't find saved activity "${activity_id}"! It might have been removed`);
                any_warnings = true;
            }
        }

        if(save_data.is_sleeping) {
            start_sleeping();
        }
        if(save_data.is_reading) {
            start_reading(save_data.is_reading);
        }

        if(any_warnings) {
            set_loading_screen_warnings_warning();
        }

        update_displayed_time();
        set_loading_screen_versions(save_data["game version"]);
    } catch(error) {
        set_loading_screen_versions(save_data["game version"]);
        throw error;
    }
} 

/**
 * called from index.html;
 * loads game from file by resetting everything that needs to be reset and then calling main loading method with same parameter;
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
} 

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
                //no need to check if it should import or do a fresh start (in case it's a result of hard reset), as that's already handled elsewhere
                load(JSON.parse(localStorage.getItem(save_key)));
                log_message("Dev save was not found. Loaded live version save.");
            }
        } else {
            load(JSON.parse(localStorage.getItem(save_key)));
        }
    } catch(error) {
        is_loading_error = true;
        set_loading_screen_progress("Something went wrong 😭");
        set_loading_screen_errors_warning();
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

function hard_reset() {
    let confirmation = prompt(`This will erase all your progress and you will have to start from the very beginning. If you are sure this is what you want, type "reset" below`);

    if(confirmation === "reset" || confirmation === `"reset"`) {
        if(is_on_dev()) {
            localStorage.removeItem(dev_save_key);
            localStorage.setItem("skip_live_import", "true");
        } else {
            localStorage.removeItem(save_key);
        }
        window.location.reload();
        return false;
    } else {
        console.log("Hard reset was cancelled.");
    }
}

//update game time
function update_timer(time_in_minutes) {
    const was_night = is_night(current_game_time);
    current_game_time.goUp(time_in_minutes || (is_sleeping ? 6 : 1));

    //update_character_stats(); //done every second, probably only used for day-night cycle at this point
    const daynight_change = was_night !== is_night(current_game_time);
    if(daynight_change) {
        update_character_stats();
    }
    
    update_displayed_time();
}

function progress_time({value = 0, source}) {
    update_timer(value);

    update_effect_durations({time_in_minutes: value, is_sleep: is_sleeping, is_travel: source==="travel"});
}

/**
 * 
 * @param {Object} param0
 * @param {String} param0.source skipped -> assume it's normal game ticks
 */
function update_effect_durations({time_in_minutes = 1, is_travel}) {
    let were_stats_updated = false;
    Object.keys(active_effects).forEach(key => {
        if(!is_travel || is_travel && active_effects[key].affected_by_travel) {

            active_effects[key].duration-= time_in_minutes;
            if(active_effects[key].duration <= 0) {
                //duration ended - remove effect
                delete active_effects[key];
                character.stats.add_active_effect_bonus();
                update_character_stats();
                were_stats_updated = true; //only for use later, as skipping update in here would be bad
            }
        }
    });

    return were_stats_updated;
}

function update() {
    setTimeout(() => {
        end_date = Date.now(); 
        //basically when previous tick ends, used for timer smoothing

        time_variance_accumulator += ((end_date - start_date) - 1000/tickrate);
        //duration of previous tick, minus time it was supposed to take
        //important to keep it between setting end_date and start_date, so they are 2 completely separate values

        start_date = Date.now();
        /*
        basically when current tick starts
        so before this assignment, start_date is when previous tick started
        and end_date is when previous_tick ended
        */

        let were_stats_updated = false;
        const prev_day = current_game_time.day;
        update_timer();

        if(start_date - last_rewarded_export > time_between_export_rewards) {
            document.getElementById("save_to_file_button").classList.add("export_button_with_reward");
        } else {
            document.getElementById("save_to_file_button").classList.remove("export_button_with_reward");
        }

        update_export_button_tooltip(start_date - last_rewarded_export, time_between_export_rewards);

        const curr_day = current_game_time.day;
        if(curr_day > prev_day) {
            recover_item_prices(trade_price_recovery_flat, trade_price_recovery_ratio);
            trickle_market_saturations(market_saturation_trickle_rate);
            if(is_in_trade()) {
                //update displayed prices due to recovery
                update_displayed_character_inventory({is_trade: true});
                update_displayed_trader_inventory();
            }
        }

        //update effect durations and displays;
        were_stats_updated = were_stats_updated || update_effect_durations({time_in_minutes: 1});
        update_displayed_effect_durations();
        update_displayed_effects();

        const new_temperature = get_current_temperature_smoothed();

        if(!current_location.is_under_roof) {
            //not under roof, background animations can happen
            if(is_raining()) {
                if(rain_counter >= time_until_wet) {
                //been in rain long enough, add wet even if present
                    add_active_effect("Wet",30);
                } else {
                    //haven't been in rain long enough, increase the counter

                    if(new_temperature < 0)
                        //snowing, doesn't soak the player as much the rain
                        rain_counter += 0.25
                    else 
                        rain_counter++;
                }

                if(!was_raining && options.do_background_animations) {

                    window.removeEventListener("resize", start_stars_animation);

                    if(new_temperature >= 0) {
                        window.addEventListener("resize", start_rain_animation);
                        window.removeEventListener("resize", start_snow_animation);
                        start_rain_animation();
                    } else {
                        window.addEventListener("resize", start_snow_animation);
                        window.removeEventListener("resize", start_rain_animation);
                        start_snow_animation();
                    }
                }

                was_raining = true && options.do_background_animations;
            } else {
                //not raining

                if(rain_counter > 0) {
                    //not in rain -> reduce rain counter
                    rain_counter--;
                }
                was_raining = false;

                //not in rain -> sky visible
                if(!was_starry && is_night()) {

                    if(options.do_background_animations) {
                        window.addEventListener("resize", start_stars_animation);
                        window.removeEventListener("resize", start_snow_animation);
                        window.removeEventListener("resize", start_rain_animation);
                        start_stars_animation();
                    }
                    was_starry = true && options.do_background_animations;
                } else if(was_starry && !is_night()) {
                    stop_background_animation();
                    window.removeEventListener("resize", start_stars_animation);
                }
            }
        } else {
            //under roof
            if(was_raining || was_starry) {
                //was animation - stop doing that
                stop_background_animation();
                window.removeEventListener("resize", start_stars_animation);
                window.removeEventListener("resize", start_snow_animation);
                window.removeEventListener("resize", start_rain_animation);
            }
            was_raining = false;
            was_starry = false;
        }

        //temperature changed => update stats if needed
        if(current_temperature !== new_temperature) {
            if(!were_stats_updated) {
                update_character_stats();
            }
        }
        //update temperature display every tick, it's just easiest this way
        update_displayed_temperature();

        current_temperature = new_temperature;

        //add cold status if applicable
        let was_effect_added = false;
        for(let i = cold_status_temperatures.length - 1; i >= 0; i--) {
            if(current_temperature + get_character_cold_tolerance() <= cold_status_temperatures[i]) {
                if((active_effects["Wet"] && cold_status_counters[i] >= time_until_cold_when_wet) || (cold_status_counters[i] >= time_until_cold)) {
                    if(was_effect_added) {
                        continue;
                    }
                    add_active_effect(cold_status_effects[i],60);
                } else {
                    cold_status_counters[i]++;
                }

                add_xp_to_skill({skill: skills["Cold resistance"], xp_to_add: 0.2});
            } else {
                if(cold_status_counters[i] > 0) {
                    cold_status_counters[i]--;
                }
            }
        }

        if("parent_location" in current_location){ //if it's a combat_zone

            //use consumables if their longest effect ran out
            //remove them from list if there are no more in inventory
            Object.keys(favourite_consumables).forEach(item_id => {
                const inv_key = item_templates[item_id].getInventoryKey();
                if(!character.inventory[inv_key]) {
                    //if out of item, remove it from auto-consume
                    remove_consumable_from_favourites(item_id);
                    return;
                }

                const effects = item_templates[item_id].effects.sort((a,b) => {
                    if(options.auto_use_when_longest_runs_out) {
                        return b.duration-a.duration;
                    } else {
                         return a.duration-b.duration;
                    }
                });

                //if effect not active, use item and return
                if(!active_effects[effects[0].effect]) {
                    use_item(inv_key);
                    //use will call remove item which will call remove consumable from favs, so nothing more to do here
                    return;
                }
            });

            add_xp_to_skill({skill: skills["Breathing"], xp_to_add: 0.1});
        } else { //everything other than combat
            if(is_sleeping) {
                do_sleeping();
                add_xp_to_skill({skill: skills["Sleeping"], xp_to_add: current_location.housing?.sleeping_xp_per_tick});
            }
            else {
                if(is_resting) {
                    do_resting();
                }
                if(is_reading) {
                    do_reading();
                }
            } 

            if(selected_stance.id !== current_stance.id) {
                change_stance({stance_id: selected_stance.id});
            }

            if(current_activity) { //in activity

                //if effects: add them
                if(current_activity.applied_effects) {
                    for(let i = 0; i < current_activity.applied_effects.length; i++) {
                        add_active_effect(current_activity.applied_effects[i].effect, current_activity.applied_effects[i].duration);
                    }
                }

                //add xp to all related skills
                if(activities[current_activity.activity_name].type !== "GATHERING"){
                    for(let i = 0; i < activities[current_activity.activity_name].base_skills_names?.length; i++) {
                        add_xp_to_skill({skill: skills[activities[current_activity.activity_name].base_skills_names[i]], xp_to_add: current_activity.skill_xp_per_tick});
                    }
                }

                if(activities[current_activity.activity_name].type === "TRAINING") {
                    add_xp_to_skill({skill: skills["Breathing"], xp_to_add: 0.5});
                } else {
                    add_xp_to_skill({skill: skills["Breathing"], xp_to_add: 0.1});
                }

                current_activity.gathering_time += 1;
                if(current_activity.gained_resources && current_activity.gathering_time >= current_activity.gathering_time_needed) { 
                    const {gathering_time_needed, gained_resources} = current_activity.getActivityEfficiency();

                    current_activity.gathering_time_needed = gathering_time_needed;

                    const items = [];

                    for(let i = 0; i < gained_resources.length; i++) {
                        if(Math.random() > (1-gained_resources[i].chance)) {
                            const count = Math.floor(Math.random()*(gained_resources[i].count[1]-gained_resources[i].count[0]+1))+gained_resources[i].count[0];

                            items.push({item_key: item_templates[gained_resources[i].name].getInventoryKey(), count: count});

                            gathered_materials[gained_resources[i].name] = (gathered_materials[gained_resources[i].name] || 0) + count;
                        }
                    }

                    if(items.length > 0) {
                        if(options.log_every_gathering_period) {
                            log_loot({loot_list: items});
                        }

                        for(let i = 0; i < items.length; i++) {
                            current_activity.gathered_materials[items[i].item_key] = (current_activity.gathered_materials[items[i].item_key] + items[i].count || items[i].count);
                        }
                        
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

                //if job: payment
                if(activities[current_activity.activity_name].type === "JOB") {
                    current_activity.working_time += 1;

                    if(current_activity.working_time % current_activity.working_period == 0) { 
                        //finished working period, add money
                        current_activity.earnings += current_activity.get_payment();
                    }

                    update_displayed_ongoing_activity(current_activity, true);
                }
                if(activities[current_activity.activity_name].type !== "JOB") {
                    update_displayed_ongoing_activity(current_activity, false);
                }
    
                if(!can_work(current_activity)) {
                    end_activity();
                }
                
            } else {
                //no current activity

                add_xp_to_skill({skill: skills["Breathing"], xp_to_add: 0.1});
                const divs = document.getElementsByClassName("activity_div");
                //go through all displayed activities, if they are of proper type check if they are available and if there's a change, modify their display
                for(let i = 0; i < divs.length; i++) {
                    const activity = current_location.activities[divs[i].getAttribute("data-activity")];

                    if(activities[activity.activity_name].type === "JOB" || activities[activity.activity_name].type === "TRAINING") {
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

            let sounds = current_location.getBackgroundNoises();
            if(sounds.length > 0){
                if(Math.random() < 1/600) {
                    log_message(`"${sounds[Math.floor(Math.random()*sounds.length)]}"`, "background");
                }
            }
            if (current_activity && Math.random() < 1/100) {
                sounds = activities[current_activity.activity_name].getBackgroundNoises();
                if(sounds.length > 0){
                    log_message(`"${sounds[Math.floor(Math.random()*sounds.length)]}"`, "background");
                }
            }
        }

        let health_to_add = 0;
        let health_to_subtract = 0
        //health regen
        if(character.stats.full.health_regeneration_flat) {
            health_to_add += character.stats.full.health_regeneration_flat;
        }
        if(character.stats.full.health_regeneration_percent) {
            health_to_add += character.stats.full.max_health * character.stats.full.health_regeneration_percent/100;
        }
        //health loss
        if(character.stats.full.health_loss_flat) {
            health_to_subtract -= character.stats.full.health_loss_flat;
        }
        if(character.stats.full.health_loss_percent) {
            health_to_subtract += character.stats.full.max_health * character.stats.full.health_loss_percent/100;
        }

        update_health({ammount_to_restore: health_to_add, ammount_to_loose: health_to_subtract});

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

        if(character.stats.full.stamina > character.stats.full.max_stamina) {
            character.stats.full.stamina = character.stats.full.max_stamina
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

        if(!is_sleeping && current_location && current_location.light_level === "normal" && is_night()) {
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
        change_location({location_id: "Village", skip_travel_time: true});
    } 

    if(current_location.parent_location) {
        start_combat();
    }
    
    update_displayed_health();
        
    start_date = Date.now();
    update();
}

window.equip_item = character_equip_item;
window.unequip_item = character_unequip_item;

window.change_location = change_location;
window.reload_normal_location = reload_normal_location;
window.handleLocationIconClick = handle_location_icon_click;
window.remove_location_from_favourites = remove_location_from_favourites;

window.start_dialogue = start_dialogue;
window.end_dialogue = end_dialogue;
window.start_textline = start_textline;

window.remove_fast_travel_choice = remove_fast_travel_choice;

window.start_activity = start_activity;
window.end_activity = end_activity;

window.start_game_action = start_game_action;
window.end_game_action = end_game_action;

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
window.update_displayed_total_price = update_displayed_total_price;

window.open_storage = open_storage;
window.exit_storage = close_storage;
window.move_item_to_storage = move_item_to_storage;
window.remove_item_from_storage = remove_item_from_storage;
window.is_storage_open = is_storage_open;

window.format_money = format_money;
window.get_character_money = character.get_character_money;

window.use_item = use_item;
window.change_consumable_favourite_status = change_consumable_favourite_status;

window.do_enemy_combat_action = do_enemy_combat_action;

window.sort_displayed_inventory = sort_displayed_inventory;
window.update_displayed_character_inventory = update_displayed_character_inventory;
window.update_displayed_trader_inventory = update_displayed_trader_inventory;
window.update_displayed_storage_inventory = update_displayed_storage_inventory;

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

window.remove_from_content_stack = remove_from_content_stack;

window.option_uniform_textsize = option_uniform_textsize;
window.option_bed_return = option_bed_return;
window.option_combat_autoswitch = option_combat_autoswitch;
window.option_remember_filters = option_remember_filters;
window.option_log_all_gathering = option_log_all_gathering;
window.option_log_gathering_result = option_log_gathering_result;
window.option_use_uncivilised_temperature_scale = option_use_uncivilised_temperature_scale;
window.option_do_background_animations = option_do_background_animations;
window.option_skip_play_button = option_skip_play_button;
window.option_mofu_mofu_mode = option_mofu_mofu_mode;
window.option_do_enemy_onhit_animations = option_do_enemy_onhit_animations;

window.getDate = get_date;

window.isOnDev = is_on_dev;

window.saveProgress = save_progress;
window.save_to_file = save_to_file;
window.load_progress = load_from_file;
window.loadBackup = load_backup;
window.importOtherReleaseSave = load_other_release_save;
window.hardReset = hard_reset;
window.get_game_version = get_game_version;

window.run = run;

//Verify_Game_Objects();
window.Verify_Game_Objects = Verify_Game_Objects;

set_loading_screen_progress("Waking up from a nyap...");

play_button.addEventListener("click", run);
play_button.addEventListener("click", hide_loading_screen);


//check if there's an existing save file, otherwise just do some initial setup
if(!is_on_dev() && save_key in localStorage || (is_on_dev() && dev_save_key in localStorage || is_on_dev() && !("skip_live_import" in localStorage) && save_key in localStorage )) {
    load_from_localstorage();
    update_character_stats();
    update_displayed_xp_bonuses();
} else {
    set_loading_screen_versions();
    add_to_character_inventory([{item_id: "Cheap iron sword", quality: 40}, 
                                {item_id: "Cheap leather pants", quality: 40},
                                {item_id: "Stale bread", count: 5},
                            ]);

    add_xp_to_character(0);
    character.money = 102;
    update_displayed_money();
    update_character_stats();

    update_displayed_stance_list(stances, current_stance, faved_stances);
    change_stance({stance_id: "normal"});
    create_displayed_crafting_recipes();
    change_location({location_id: "Village", skip_travel_time: true});
    questManager.startQuest({quest_id: "Lost memory"});
}



if(!is_loading_error) {
    set_loading_screen_progress("Waiting for you to click 'PLAY'");
    hide_loading_text();
    show_play_button();
} else {
    hide_loading_text();
    set_play_button_text("Play...?");
    show_play_button();
}


function add_stuff_for_testing() {
    const items = [];
    for(let i = 1; i < 250; i++) {
        items.push({item_id: "Iron sword", quality:i});
        items.push({item_id: "Cheap iron sword", quality:i});
    }
    add_to_character_inventory(items);
}

function add_all_stuff_to_inventory(count = 10){
    Object.keys(item_templates).forEach(item => {
        add_to_character_inventory([
            {item_id: item, count: count},
        ]);
    })
}

function add_all_active_effects(duration){
    Object.keys(effect_templates).forEach(effect_key => {
        active_effects[effect_key] = new ActiveEffect({...effect_templates[effect_key], duration});
    });
    character.stats.add_active_effect_bonus();
    update_displayed_effects();
}

//add_to_character_inventory([{item_id: "Iron sword", count: 20, quality: 100}]);
//add_to_character_inventory([{item_id: "Iron sword", count: 20, quality: 120}]);
//add_to_character_inventory([{item_id: "Iron sword", count: 20, quality: 140}]);


//add_stuff_for_testing();
//add_all_stuff_to_inventory();
//add_all_active_effects(120);
//add_consumable_to_favourites("Stale bread");

update_displayed_equipment();
sort_displayed_inventory({sort_by: "name", target: "character"});

if(options.skip_play_button) {
    play_button.click();
}

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

export { current_enemies, 
        current_location, 
        can_work, active_effects, 
        enough_time_for_earnings, add_xp_to_skill, 
        get_current_book, 
        last_location_with_bed, 
        last_combat_location, 
        current_stance, selected_stance,
        faved_stances, options,
        global_flags,
        character_equip_item,
        unlocked_beds,
        favourite_consumables,
        remove_consumable_from_favourites,
        process_rewards,
        travel_times,
        language
};