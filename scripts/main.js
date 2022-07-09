"use strict";

import { current_game_time, format_time } from "./game_time.js";
import { item_templates, getItem} from "./items.js";
import { locations } from "./locations.js";
import { skills, skill_groups, get_next_skill_milestone, get_unlocked_skill_rewards} from "./skills.js";
import { dialogues } from "./dialogues.js";
import { Enemy, enemy_templates } from "./enemies.js";
import { traders } from "./trade.js";
import { character } from "./character.js";
import { activities } from "./activities.js";

//equipment slots
const equipment_slots_divs = {head: document.getElementById("head_slot"), torso: document.getElementById("torso_slot"),
                              arms: document.getElementById("arms_slot"), ring: document.getElementById("ring_slot"),
                              weapon: document.getElementById("weapon_slot"), "off-hand": document.getElementById("offhand_slot"),
                              legs: document.getElementById("legs_slot"), feet: document.getElementById("feet_slot"),
                              amulet: document.getElementById("amulet_slot")
                              };		
                            
const stats_divs = {strength: document.getElementById("strength_slot"), agility: document.getElementById("agility_slot"),
                    dexterity: document.getElementById("dexterity_slot"), intuition: document.getElementById("intuition_slot"),
                    magic: document.getElementById("magic_slot"), 
                    attack_speed: document.getElementById("attack_speed_slot"), attack_power: document.getElementById("attack_power_slot"), 
                    defense: document.getElementById("defense_slot"), crit_rate: document.getElementById("crit_rate_slot"), 
                    crit_multiplier: document.getElementById("crit_multiplier_slot")
                    };

const other_combat_divs = {hit_chance: document.getElementById("hit_chance_slot"), defensive_action: document.getElementById("defensive_action_slot"),
                           defensive_action_chance: document.getElementById("defensive_action_chance_slot")
                          };

const skill_bar_divs = {};

//current enemy
var current_enemy = null;
//attacks for combat
let attack_order = 0;
//current location
var current_location;
let current_combat;

var current_activity;
var activity_anim; //small "animation" for activity text

//resting, true -> health regenerates
var is_resting = true;

//sleeping, true -> health regenerates, timer goes up faster
var is_sleeping = false;

var save_period = 60;
//ticks between saves, 60 = ~1 minute
var save_counter = 0;

var time_variance_accumulator = 0;
//accumulates deviations
var time_adjustment = 0;
var start_date;
var end_date;

var current_dialogue;

var current_trader = null;
const to_sell = {value: 0, items: []};
const to_buy = {value: 0, items: []};

const active_effects = {};
//e.g. health regen from food

//active effects display
const active_effects_tooltip = document.getElementById("effects_tooltip");
const active_effect_count = document.getElementById("active_effect_count");

const tickrate = 1;
//how many ticks per second
//best leave it at 1, as less is rather slow, and more makes ticks noticably unstable


//enemy crit stats
const enemy_crit_chance = 0.1;
const enemy_crit_damage = 2; //multiplier, not a flat bonus

//character healt display
const current_health_value_div = document.getElementById("character_health_value");
const current_health_bar = document.getElementById("character_healthbar_current");

//character stamina display
const current_stamina_value_div = document.getElementById("character_stamina_value");
const current_stamina_bar = document.getElementById("character_stamina_bar_current");

//character xp display
const character_xp_div = document.getElementById("character_xp_div");
const character_level_div = document.getElementById("character_level_div");

//enemy health display
const current_enemy_health_value_div = document.getElementById("enemy_health_value");
const current_enemy_health_bar = document.getElementById("enemy_healthbar_current");
//enemy info
const enemy_info_div = document.getElementById("enemy_info_div");
const enemy_stats_div = document.getElementById("enemy_stats_div");
const enemy_name_div = document.getElementById("enemy_name_div");

const enemy_count_div = document.getElementById("enemy_count_div");

//inventory display
const inventory_div = document.getElementById("inventory_content_div");

//character name
const name_field = document.getElementById("character_name_field");
name_field.value = character.name;

//skills
const skill_list = document.getElementById("skill_list_div");

const message_log = document.getElementById("message_log_div");
const time_field = document.getElementById("time_div");

//just a small multiplier for xp, mostly for testing I guess
const global_xp_bonus = 1;

//location actions & trade
const action_div = document.getElementById("location_actions_div");
const trade_div = document.getElementById("trade_div");
const trader_inventory_div = document.getElementById("trader_inventory_div");

const location_name_div = document.getElementById("location_name_div");

time_field.innerHTML = current_game_time.toString();

const rarity_colors = {
    trash: "lightgray",
    common: "white",
    uncommon: "lightgreen",
    rare: "blue",
    epic: "purple",
    legendary: "orange",
}

// button testing cuz yes
const test_button = document.getElementById("test_button");
test_button.style.display = 'none';
/*
document.getElementById("test_button").addEventListener("click", () => 
{
    // add_xp_to_character(100);
    //add_to_inventory("character", [{item: new Item(item_templates["Stale bread"]), count: 5}]);
    // add_to_inventory("character", [{item: new Item(item_templates["Fresh bread"]), count: 5}]);
    // add_to_inventory("character", [{item: new Item(item_templates["Rat fang"]), count: 5}]);

    add_xp_to_skill(skills["Sleeping"], 10000);
    add_xp_to_skill(skills["Swords"], 10000);
}); 
*/

name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

function capitalize_first_letter(some_string) {
    return some_string.charAt(0).toUpperCase() + some_string.slice(1);
}

function change_location(location_name) {

    clearInterval(current_combat);
    current_combat = null;
    attack_order = 0;

    var location = locations[location_name];
    

    if(!location) {
        throw `No such location as "${location_name}"`;
    }
    var action;
    clear_action_div();

    if(typeof current_location !== "undefined" && current_location.name !== location.name ) { 
        //so it's not called when initializing the location on page load or on reloading current location (due to new unlocks)
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }
    
    current_location = location;
    const previous_location = current_location;

    if("connected_locations" in location) { // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        enemy_info_div.style.display = "none";
        enemy_count_div.style.display = "none";

        current_enemy = null;

        if(typeof previous_location !== "undefined" && "parent_location" in previous_location) { // if previous was combat
            clear_enemy_and_enemy_info();
            update_combat_stats();
        }
        
        //add buttons for starting dialogues
        for(let i = 0; i < location.dialogues.length; i++) { 
            if(!dialogues[location.dialogues[i]].is_unlocked || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
                continue;
            } 
            
            const dialogue_div = document.createElement("div");

            if(Object.keys(dialogues[location.dialogues[i]].textlines).length > 0) { //has any textlines
                
                dialogue_div.innerHTML = dialogues[location.dialogues[i]].trader? `<i class="fas fa-store"></i>  ` : `<i class="far fa-comments"></i>  `;
                dialogue_div.innerHTML += dialogues[location.dialogues[i]].starting_text;
                dialogue_div.classList.add("start_dialogue");
                dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
                dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
                action_div.appendChild(dialogue_div);
            } else if(dialogues[location.dialogues[i]].trader) { //has no textlines but is a trader -> add button to directly start trading
                const trade_div = document.createElement("div");
                trade_div.innerHTML = `<i class="fas fa-store"></i>  ` + traders[dialogues[location.dialogues[i]].trader].trade_text;
                trade_div.classList.add("dialogue_trade")
                trade_div.setAttribute("data-trader", dialogues[location.dialogues[i]].trader);
                trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
                action_div.appendChild(trade_div);
            }
        }

        //add buttons to start activities
        for(let i = 0; i < location.activities.length; i++) {
            if(!activities[location.activities[i].activity]?.is_unlocked || !location.activities[i]?.is_unlocked) {
                continue;
            }

            const activity_div = document.createElement("div");
            
            
            if(activities[location.activities[i].activity].type === "JOB") {
                activity_div.innerHTML = `<i class="fas fa-hammer"></i>  `;
                activity_div.classList.add("activity_div");
                activity_div.setAttribute("data-activity", i);
                activity_div.setAttribute("onclick", `start_activity({id: ${i}});`);

                if(can_work(location.activities[i])) {
                    activity_div.classList.add("start_activity");
                } else {
                    activity_div.classList.add("activity_unavailable");
                }

                const job_tooltip = document.createElement("div");
                job_tooltip.classList.add("job_tooltip");
                job_tooltip.innerHTML = `Available from ${location.activities[i].availability_time.start} to ${location.activities[i].availability_time.end} <br>`;
                if(location.activities[i].max_working_time / location.activities[i].working_period >= 2) {
                    job_tooltip.innerHTML += `Pays ${format_money(location.activities[i].payment)} per every ` +  
                        `${format_time({time: {minutes: location.activities[i].working_period}})} worked, up to ${format_time({time: {minutes: location.activities[i].max_working_time}})}`;
                } else {
                    job_tooltip.innerHTML += `Pays ${format_money(location.activities[i].payment)} after working for ${format_time({time: {minutes: location.activities[i].working_period}})}`;
                }


                activity_div.appendChild(job_tooltip);
            }
            else if(activities[location.activities[i].activity].type === "TRAINING") {
                activity_div.innerHTML = `<i class="fas fa-dumbbell"></i>  `;
                activity_div.classList.add("activity_div");
                activity_div.setAttribute("data-activity", i);
                activity_div.setAttribute("onclick", `start_activity({id: ${i}});`);

                activity_div.classList.add("start_activity");

            }

            activity_div.innerHTML += location.activities[i].starting_text;
            action_div.appendChild(activity_div);
        }
        
        //add button to go to sleep
        if(location.sleeping) { 
            const start_sleeping_div = document.createElement("div");
            
            start_sleeping_div.innerHTML = '<i class="fas fa-bed"></i>  ' + location.sleeping.text;
            start_sleeping_div.id = "start_sleeping_div";
            start_sleeping_div.setAttribute('onclick', 'start_sleeping()');

            action_div.appendChild(start_sleeping_div);
        }
        
        //add butttons to change location
        for(let i = 0; i < location.connected_locations.length; i++) { 

            if(location.connected_locations[i].location.is_unlocked == false) { //skip if not unlocked
                continue;
            }

            action = document.createElement("div");
            
            if("connected_locations" in location.connected_locations[i].location) {// check again if connected location is normal or combat
                action.classList.add("travel_normal");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = `<i class="fas fa-map-signs"></i>  ` + location.connected_locations[i].custom_text;
                }
                else {
                    action.innerHTML = `<i class="fas fa-map-signs"></i>  ` + "Go to " + location.connected_locations[i].location.name;
                }
            } else {
                action.classList.add("travel_combat");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = `<i class="fas fa-skull"></i>  ` + location.connected_locations[i].custom_text;
                }
                else {
                    action.innerHTML = `<i class="fas fa-skull"></i>  ` + "Enter the " + location.connected_locations[i].location.name;
                }
            }
            action.classList.add("action_travel");
            action.setAttribute("data-travel", location.connected_locations[i].location.name);
            action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

            action_div.appendChild(action);
        }

    } else { //so if entering combat zone
        enemy_count_div.style.display = "block";
        enemy_info_div.style.display = "block";
        enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemies_killed % location.enemy_count;

        action = document.createElement("div");
        action.classList.add("travel_normal", "action_travel");
        if(location.leave_text) {
            action.innerHTML = `<i class="fas fa-map-signs"></i>  ` + location.leave_text;
        } else {
            action.innerHTML = `<i class="fas fa-map-signs"></i>  ` + "Go back to " + location.parent_location.name;
        }
        action.setAttribute("data-travel", location.parent_location.name);
        action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

        action_div.appendChild(action);

        current_combat = setInterval(do_combat, 500/tickrate);
    }

    location_name_div.innerText = current_location.name;
    const location_description_tooltip = document.createElement("div");
    location_description_tooltip.id = "location_description_tooltip";
    location_description_tooltip.innerText = current_location.description;
    location_name_div.appendChild(location_description_tooltip);
}

/**
 * 
 * @param {Object} selected_activity - {id} of activity in Location's activities list
 */
function start_activity(selected_activity) {
    current_activity = Object.assign({},current_location.activities[selected_activity.id]);
    current_activity.name = current_activity.activity;
    current_activity.activity = activities[current_activity.activity];

    if(activities[current_activity.name].type === "JOB") {
        if(!can_work(current_activity)) {
            current_activity = null;
            return;
        }

        current_activity.earnings = 0;
        current_activity.working_time = 0;

        if(!current_activity.activity) {
            throw "Job option not found!";
        }
    } else if(activities[current_activity.name].type === "TRAINING") {
        if(!current_activity.activity) {
            throw "Training option not found!";
        }
    } else if(activities[current_activity.name].type === "GATHERING") { 
        if(!current_activity.activity) {
            throw `"${activities[current_activity.name].type}" is not a valid activity type!`;
        } 
    }

    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = current_activity.activity.action_text;
    action_status_div.id = "action_status_div";

    const action_xp_div = document.createElement("div");
    action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} xp per in-game minute to ${current_activity.activity.base_skills_names.toString().replace(",", ", ")}`;
    action_xp_div.id = "action_xp_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_activity()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Finish ${current_activity.name}`;
    action_end_text.id = "action_end_text";

    
    action_end_div.appendChild(action_end_text);

    if(current_activity.activity.type === "JOB") {
        const action_end_earnings = document.createElement("div");
        action_end_earnings.innerText = `(earnings: ${format_money(0)})`;
        action_end_earnings.id = "action_end_earnings";

        action_end_div.appendChild(action_end_earnings);
    }

     action_div.appendChild(action_status_div);
     action_div.appendChild(action_xp_div);
     action_div.appendChild(action_end_div);

     if(current_activity.activity.type === "JOB" && !enough_time_for_earnings(current_activity) && !document.getElementById("not_enough_time_for_earnings_div")) {
                            const time_info_div = document.createElement("div");
                            time_info_div.id = "not_enough_time_for_earnings_div";
                            time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
                            action_div.insertBefore(time_info_div, action_div.children[2]);
                        }

     start_activity_animation();
}

function start_activity_animation() {
    activity_anim = setInterval(() => { //sets a tiny little "animation" for activity text
        const action_status_div = document.getElementById("action_status_div");
        /*
        if(action_status_div.innerText[action_status_div.innerText.length - 4] === ' ') {
            action_status_div.innerText = action_status_div.innerText.slice(0, action_status_div.innerText.length - 4) 
                                         + action_status_div.innerText.slice(action_status_div.innerText.length - 3);
        } else {
            action_status_div.innerText = action_status_div.innerText.slice(0, action_status_div.innerText.length - 3) 
                                         + " " + action_status_div.innerText.slice(action_status_div.innerText.length - 3);
        }
        */
        if(action_status_div.innerText.endsWith("...")) {
            action_status_div.innerText = action_status_div.innerText.substring(0, action_status_div.innerText.length - 3);
        } else{
            action_status_div.innerText += ".";
        }
     }, 600);
}

function end_activity_animation() {
    clearInterval(activity_anim);
}

function end_activity() {
    
    log_message(`${character.name} finished ${current_activity.name}`);
    
    if(current_activity.earnings) {
        character.money += current_activity.earnings;
        log_message(`${character.name} earned ${format_money(current_activity.earnings)}`);
        update_displayed_money();
    }
    end_activity_animation(); //clears the "animation"
    current_activity = null;
    change_location(current_location.name);
}

/**
 * 
 * @param {Object} activity_data {activity, location.name}
 */
 function unlock_activity(activity_data) {
    if(!activity_data.activity.is_unlocked){
        activity_data.activity.is_unlocked = true;
        log_message(`Unlocked activity ${activity_data.activity.activity} in location ${activity_data.location}`, "activity_unlocked");
    }
}

//single tick of resting
function do_resting() {
    if(character.full_stats.health < character.full_stats.max_health)
    {
        const resting_heal_ammount = Math.max(character.full_stats.max_health * 0.01,1); 
        //todo: scale it with skill, because why not?; maybe up to x2 bonus

        character.full_stats.health += (resting_heal_ammount);
        if(character.full_stats.health > character.full_stats.max_health) {
            character.full_stats.health = character.full_stats.max_health;
        } 
        update_displayed_health();
    }

    if(character.full_stats.stamina < character.full_stats.max_stamina)
    {
        const resting_stamina_ammount = Math.round(Math.max(character.full_stats.max_stamina/120, 1)); 
        //todo: scale it with skill as well

        character.full_stats.stamina += (resting_stamina_ammount);
        if(character.full_stats.stamina > character.full_stats.max_stamina) {
            character.full_stats.stamina = character.full_stats.max_stamina;
        } 
        update_displayed_stamina();
    }
}

function do_sleeping() {
    if(character.full_stats.health < character.full_stats.max_health)
    {
        const sleeping_heal_ammount = Math.max(character.full_stats.max_health * 0.04, 1); 
        //todo: scale it with skill (maybe up to x2.5 bonus)
        
        character.full_stats.health += (sleeping_heal_ammount);
        if(character.full_stats.health > character.full_stats.max_health) {
            character.full_stats.health = character.full_stats.max_health;
        } 
        update_displayed_health();
    }

    if(character.full_stats.stamina < character.full_stats.max_stamina)
    {
        const sleeping_stamina_ammount = Math.round(Math.max(character.full_stats.max_stamina/30, 1)); 
        //todo: scale it with skill as well

        character.full_stats.stamina += (sleeping_stamina_ammount);
        if(character.full_stats.stamina > character.full_stats.max_stamina) {
            character.full_stats.stamina = character.full_stats.max_stamina;
        } 
        update_displayed_stamina();
    }
}

function start_sleeping() {
    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = "Sleeping...";
    action_status_div.id = "action_status_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_sleeping()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Wake up`;
    action_end_text.id = "action_end_text";

    
    action_end_div.appendChild(action_end_text);

    action_div.appendChild(action_status_div);
    action_div.appendChild(action_end_div);

    start_activity_animation();

    is_sleeping = true;
}

function end_sleeping() {
    is_sleeping = false;
    change_location(current_location.name);
    end_activity_animation();
}

/**
 * 
 * @param {*} selected_job location job property
 * @returns if current time is within working hours
 */
function can_work(selected_job) {
    //if can start at all

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

    return true;
}

/**
 * 
 * @param {} selected_job location job property
 * @returns if there's enough time to earn anything
 */
function enough_time_for_earnings(selected_job) {
    //if enough time for at least 1 working period
    if(selected_job.availability_time.end > selected_job.availability_time.start) {
        //ends on the same day
        if(current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60
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
            current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60 + 24*60
            //time available on this day + time available on next day are less than time needed
            ||
            current_game_time.hour * 60 + current_game_time.minute < selected_job.availability_time.start*60
            //timer is less than the starting hour, so it's the next day
            &&
            current_game_time.hour * 60 + current_game_time.minute + selected_job.working_period > selected_job.availability_time.end*60
            //time left on this day is not enough to finish
            ) {  
            return false;
        }
    }

    return true;
}

/**
 * 
 * @param {String} dialogue_key 
 */
function start_dialogue(dialogue_key) {
    //initialize dialogue options
    
    const dialogue = dialogues[dialogue_key];
    current_dialogue = dialogue_key;

    clear_action_div();
    Object.keys(dialogue.textlines).forEach(function(key) { //add buttons for textlines
            if(dialogue.textlines[key].is_unlocked && !dialogue.textlines[key].is_finished) { //do only if text_line is not unavailable
                const textline_div = document.createElement("div");
                textline_div.innerHTML = `"${dialogue.textlines[key].name}"`;
                textline_div.classList.add("dialogue_textline");
                textline_div.setAttribute("data-textline", key);
                textline_div.setAttribute("onclick", `start_textline(this.getAttribute('data-textline'))`);
                action_div.appendChild(textline_div);
            }
    });

    if(dialogue.trader) {
        const trade_div = document.createElement("div");
        trade_div.innerHTML = `<i class="fas fa-store"></i>  ` + traders[dialogue.trader].trade_text;
        trade_div.classList.add("dialogue_trade")
        trade_div.setAttribute("data-trader", dialogue.trader);
        trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
        action_div.appendChild(trade_div);
    }

    const end_dialogue_div = document.createElement("div");

    end_dialogue_div.innerHTML = dialogue.ending_text;
    end_dialogue_div.classList.add("end_dialogue_button");
    end_dialogue_div.setAttribute("onclick", "end_dialogue()");

    action_div.appendChild(end_dialogue_div);

    

    //ending dialogue -> just do: change_location(current_location.name);
}

function end_dialogue() {
    current_dialogue = null;
    change_location(current_location.name);
}

/**
 * 
 * @param {String} textline_key 
 */
function start_textline(textline_key){
    const dialogue = dialogues[current_dialogue];
    const textline = dialogue.textlines[textline_key];

    log_message(`> > ${textline.name}`, "dialogue_question")
    log_message(textline.text, "dialogue_answer");

    for(let i = 0; i < textline.unlocks.dialogues.length; i++) { //unlocking dialogues
        const dialogue = dialogues[textline.unlocks.dialogues[i]]
        if(!dialogue.is_unlocked) {
            dialogue.is_unlocked = true;
            log_message(`Can now talk with ${dialogue.name} in ${dialogue.location_name}`, "activity_unlocked");
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

    for(let i = 0; i < textline.locks_lines.length; i++) { //locking textlines
        dialogue.textlines[textline.locks_lines[i]].is_finished = true;
    }

    if(textline.unlocks.activities) { //unlocking activities
        for(let i = 0; i < textline.unlocks.activities.length; i++) { 
            for(let j = 0; j < locations[textline.unlocks.activities[i].location].activities.length; j++) {
                if(locations[textline.unlocks.activities[i].location].activities[j].activity === textline.unlocks.activities[i].activity) {

                    unlock_activity({location: locations[textline.unlocks.activities[i].location].name, 
                                     activity: locations[textline.unlocks.activities[i].location].activities[j]});

                    if(current_location.name === textline.unlocks.activities[i].location) {
                        change_location(current_location.name);
                    }
                    break;
                }
            }
        }
    }
    start_dialogue(current_dialogue);
}

/**
 * 
 * @param {String} trader_key 
 */
function start_trade(trader_key) {
    traders[trader_key].refresh(); 
    action_div.style.display = "none";
    trade_div.style.display = "inherit";

    current_trader = trader_key;
    document.getElementById("trader_cost_mult_value").textContent = `${Math.round(100 * (1 + (traders[current_trader].profit_margin - 1) * (1 - skills["Haggling"].get_level_bonus())))}%`
    update_displayed_trader_inventory();
}

function cancel_trade() {
    
    to_buy.items = [];
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.value = 0;

    update_displayed_inventory();
    update_displayed_trader_inventory();
}

function accept_trade() {
    

    //button shouldn't be clickable if trade is not affordable, so this is just in case
    const new_balance = character.money + to_sell.value - to_buy.value
    if(new_balance < 0) {
        throw "Trying to make a trade that can't be afforded"
    } else {

        character.money = new_balance;

        while(to_buy.items.length > 0) {
            //add to character inventory
            //remove from trader inventory

            const item = to_buy.items.pop();
            const [item_name, item_id] = item.item.split(' #');
            let actual_item;
            if(item_id) {
                actual_item = traders[current_trader].inventory[item_name][item_id];

                remove_from_inventory("trader", {item_name, 
                                                item_count: 1,
                                                item_id});

                add_to_inventory("character", [{item: actual_item, 
                                                count: 1}]);                              
            } else {

                actual_item = traders[current_trader].inventory[item_name].item;
                
                remove_from_inventory("trader", {item_name, 
                                                 item_count: item.count});

                add_to_inventory("character", [{item: actual_item, 
                                                count: item.count}]);
            }

            
        }
        while(to_sell.items.length > 0) {
            //remove from character inventory
            //add to trader inventory
            
            const item = to_sell.items.pop();
            const [item_name, item_id] = item.item.split(' #');
            let actual_item;
            if(item_id) {
                actual_item = character.inventory[item_name][item_id];
                
                remove_from_inventory("character", {item_name, 
                                                    item_count: 1,
                                                    item_id});

                add_to_inventory("trader", [{item: actual_item, 
                                             count: 1}]);
            } else {
                actual_item = character.inventory[item_name].item;
                remove_from_inventory("character", {item_name, 
                                                    item_count: item.count});

                add_to_inventory("trader", [{item: actual_item, 
                                             count: item.count}]);
            }

            
        }
    }

    add_xp_to_skill(skills["Haggling"], to_sell.value + to_buy.value);

    to_buy.value = 0;
    to_sell.value = 0;

    update_displayed_inventory();
    update_displayed_trader_inventory();
    update_displayed_money();
}

function exit_trade() {
    action_div.style.display = "";
    trade_div.style.display = "none";
    current_trader = null;
    to_buy.items = [];
    to_buy.value = 0;
    to_sell.items = [];
    to_sell.value = 0;

    update_displayed_inventory();
}

function get_character_money() {
    return character.money;
}
/**
 * @param {} selected_item 
 * {item: {string with value of data- attribute}, count: Number, id: Number (position in inventory)}
 * @returns {Number} total cost of operation
 */
function add_to_buying_list(selected_item) {
    const is_stackable = !Array.isArray(traders[current_trader].inventory[selected_item.item.split(' #')[0]]);
    if(is_stackable) {

        const present_item = to_buy.items.find(a => a.item === selected_item.item);
        
        if(present_item) {
            if(traders[current_trader].inventory[selected_item.item.split(' #')[0]].count < selected_item.count + present_item.count) {
                //trader has not enough when items already added make the total be too much, so just put all in the list
                present_item.count = traders[current_trader].inventory[selected_item.item.split(' #')[0]].count;
            } else {
                present_item.count += selected_item.count;
            }

        } else { 
            if(traders[current_trader].inventory[selected_item.item.split(' #')[0]].count < selected_item.count) { 
                //trader has not enough: buy all available
                selected_item.count = traders[current_trader].inventory[selected_item.item.split(' #')[0]].count;
            }

            to_buy.items.push(selected_item);
        }

        const value = get_item_value(selected_item, true);
        to_buy.value += value;
        return -value;

    } else {

        to_buy.items.push(selected_item);

        const value = get_item_value(selected_item, false);
        to_buy.value += value;
        return -value;
    }
}

function remove_from_buying_list(selected_item) {
    const is_stackable = !Array.isArray(traders[current_trader].inventory[selected_item.item.split(' #')[0]]);
    var actual_number_to_remove = selected_item.count;

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_buy.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) {
            present_item.count -= selected_item.count;
        } else {
            actual_number_to_remove = present_item.count
            to_buy.items.splice(to_buy.items.indexOf(present_item),1);
        }

        const value = get_item_value(selected_item, true);
        to_buy.value -= value;
        return value;

    } else { //unstackable item, so always just 1
        //find index of item and remove it
        to_buy.items.splice(to_buy.items.map(item => item.item).indexOf(selected_item.item),1);
        const value = get_item_value(selected_item, false);
        to_buy.value -= value;
        return value;
    }
}

function add_to_selling_list(selected_item) {
    const is_stackable = !Array.isArray(character.inventory[selected_item.item.split(' #')[0]]);

    if(is_stackable) {

        const present_item = to_sell.items.find(a => a.item === selected_item.item);

        if(present_item) {
            if(character.inventory[selected_item.item.split(' #')[0]].count < selected_item.count + present_item.count) {
                //character has not enough when items already added make the total be too much, so just put all in the list
                present_item.count = character.inventory[selected_item.item.split(' #')[0]].count;
            } else {
                present_item.count += selected_item.count;
            }

        } else { 
            if(character.inventory[selected_item.item.split(' #')[0]].count < selected_item.count) { 
                //character has not enough: sell all available
                selected_item.count = character.inventory[selected_item.item.split(' #')[0]].count;
            }
            to_sell.items.push(selected_item);
            
        }
        const value = item_templates[selected_item.item.split(' #')[0]].getValue() * selected_item.count;
        to_sell.value += value;
        return value;

    } else {
        to_sell.items.push(selected_item);

        const actual_item = character.inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        const value = actual_item.getValue();
        to_sell.value += value;
        return value;
    }
}

function remove_from_selling_list(selected_item) {
    const is_stackable = !Array.isArray(character.inventory[selected_item.item.split(' #')[0]]);
    var actual_number_to_remove = selected_item.count;

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_sell.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) {
            present_item.count -= selected_item.count;
        } else {
            actual_number_to_remove = present_item.count;
            to_sell.items.splice(to_sell.items.indexOf(present_item), 1);
        }
        const value = item_templates[selected_item.item.split(' #')[0]].getValue() * actual_number_to_remove;
        to_sell.value -= value;
        return -value;
    } else { //unstackable item
        //find index of item and remove it
        to_sell.items.splice(to_sell.items.map(item => item.item).indexOf(selected_item.item),1);

        const actual_item = character.inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        const value = actual_item.getValue();
        to_sell.value -= value;
        return -value;
    }

}

function get_item_value(selected_item, is_stackable) {

    const profit_margin = 1 + (traders[current_trader].profit_margin - 1) * (1 - skills["Haggling"].get_level_bonus());
    if(is_stackable) {
        return Math.ceil(profit_margin * item_templates[selected_item.item.split(' #')[0]].getValue()) * selected_item.count;
    } else {
        const actual_item = traders[current_trader].inventory[selected_item.item.split(' #')[0]][selected_item.item.split(' #')[1]];
        return Math.ceil(profit_margin * actual_item.getValue());
    }
}

function update_displayed_trader_inventory(sorting_param) {
    const trader = traders[current_trader];
    trader_inventory_div.textContent = "";

    Object.keys(trader.inventory).forEach(function(key) {
        if(trader.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < trader.inventory[key].length; i++) {

                let should_continue = false;
                for(let j = 0; j < to_buy.items.length; j++) {
                    if(trader.inventory[key][i].getName() === to_buy.items[j].item.split(" #")[0] && i == Number(to_buy.items[j].item.split(" #")[1])) {
                        //checks if item is present in to_buy, if so then doesn't add it to displayed in this inventory
                        should_continue = true;
                        break;
                    }
                }
                if(should_continue) {
                    continue;
                }

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");

                item_name_div.innerHTML = `<span class="item_slot">[${trader.inventory[key][i].equip_slot}]</span> ${trader.inventory[key][i].getName()}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
                item_div.classList.add("inventory_item", "trader_item");       

                //add tooltip
                item_div.appendChild(create_item_tooltip(trader.inventory[key][i], {trader: true}));

                item_control_div.classList.add('inventory_item_control', 'trader_item_control', `trader_item_${trader.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-trader_item", `${trader.inventory[key][i].getName()} #${i}`)
                item_control_div.appendChild(item_div);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(trader.inventory[key][i].getValue() * trader.profit_margin, true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);

                trader_inventory_div.appendChild(item_control_div);
            }
        } else //stackables
        {
            let item_count = trader.inventory[key].count;
            for(let i = 0; i < to_buy.items.length; i++) {
                
                if(trader.inventory[key].item.name === to_buy.items[i].item.split(" #")[0]) {
                    item_count -= Number(to_buy.items[i].count);

                    if(item_count == 0) {
                        return;
                    }
                    if(item_count < 0) {
                        throw 'Something is wrong with trader item count';
                    }

                    break;
                }
            }
            
            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            item_name_div.innerHTML = `${trader.inventory[key].item.name} x${item_count}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add('item_stackable', "inventory_item", 'trader_item');

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_div.appendChild(create_item_tooltip(trader.inventory[key].item, {trader: true}));


            item_control_div.classList.add('trader_item_control', 'inventory_item_control', `trader_item_${trader.inventory[key].item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${trader.inventory[key].item.name}`);
            item_control_div.setAttribute("data-item_count", `${item_count}`);
            
            item_control_div.appendChild(item_div);
            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(trader.inventory[key].item.getValue() * trader.profit_margin, true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
        }
    });
    
    for(let i = 0; i < to_sell.items.length; i++) {
        //add items from to_sell to display
        // to_sell only contains names, so need to browse character.inventory for items that match

        const item_index = Number(to_sell.items[i].item.split(" #")[1]);

        if(isNaN(item_index)) { //it's stackable, so item_count is needed
            const item_count = to_sell.items[i].count;
            const actual_item = character.inventory[to_sell.items[i].item].item;

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            item_name_div.innerHTML = `${actual_item.name} x${item_count}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add('item_stackable', "inventory_item", 'trader_item');

            item_div.appendChild(create_item_tooltip(actual_item));

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_control_div.classList.add('item_to_trade', 'trader_item_control', 'inventory_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.name}`);
            item_control_div.setAttribute("data-item_count", `${item_count}`);
            item_control_div.appendChild(item_div);

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = character.inventory[to_sell.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `[${actual_item.equip_slot}] ${actual_item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "trader_item");       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'trader_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.getName()} #${item_index}`)
            item_control_div.appendChild(item_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            trader_inventory_div.appendChild(item_control_div);
        }
    }

    sort_displayed_inventory({sort_by: sorting_param || "name", target: "trader"});
}

function sort_displayed_inventory({sort_by, target = "character", direction = "asc"}) {

    if(target === "trader") {
        target = trader_inventory_div;
    } else if(target === "character") {
        target = inventory_div;
    }
    else {
        console.warn(`Something went wrong, no such inventory as '${target}'`);
        return;
    }

    [...target.children].sort((a,b) => {
        //equipped items on top
        if(a.classList.contains("equipped_item_control") && !b.classList.contains("equipped_item_control")) {
            return -1;
        } else if(!a.classList.contains("equipped_item_control") && b.classList.contains("equipped_item_control")){
            return 1;
        } 
        //items being traded on bottom
        else if(a.classList.contains("item_to_trade") && !b.classList.contains("item_to_trade")) {
            return 1;
        } else if(!a.classList.contains("item_to_trade") && b.classList.contains("item_to_trade")) {
            return -1;
        }

        //other items by either name or otherwise by value

        else if(sort_by === "name") {
            //if they are equippable, take in account the [slot] value displayed in front of item in inventory
            const name_a = a.children[0].innerText.toLowerCase();
            const name_b = b.children[0].innerText.toLowerCase();

            //priotize displaying equipment below stackable items
            if(name_a[0] === '[' && name_b[0] !== '[') {
                return 1;
            } else if(name_a[0] !== '[' && name_b[0] === '[') {
                return -1;
            }
            else if(name_a > name_b) {
                return 1;
            } else {
                return -1;
            }

        } else if(sort_by === "price") {
            
            let value_a = Number(a.lastElementChild.innerText.replace(/[ GSC]/g, ''));
            let value_b = Number(b.lastElementChild.innerText.replace(/[ GSC]/g, ''));
            
            if(value_a > value_b) {
                return 1;
            } else {
                return -1;
            }
        }

    }).forEach(node => target.appendChild(node));
}

function clear_action_div() {
    while(action_div.lastElementChild) {
        action_div.removeChild(action_div.lastElementChild);
    }
}

function get_new_enemy(enemy) {
    current_enemy = enemy || current_location.get_next_enemy();
    enemy_stats_div.innerHTML = `Atk: ${current_enemy.stats.strength} | Agl: ${current_enemy.stats.agility} 
    | Dex: ${current_enemy.stats.dexterity} | Def: ${current_enemy.stats.defense} 
    | Atk speed: ${current_enemy.stats.attack_speed.toFixed(1)}`

    enemy_name_div.innerHTML = current_enemy.name;

    update_displayed_enemy_health();

    //also show magic if not 0?
}

//single tick of fight
function do_combat() {
    if(current_enemy == null) {
        get_new_enemy();
        update_combat_stats();
        attack_order = 0;
        return;
    }

    //todo: separate formulas for physical and magical weapons?
    //and also need magic weapons before that...

    var hero_base_damage = character.get_attack_power();
    var enemy_base_damage = current_enemy.stats.strength;

    var damage_dealt;

    var critted;

    var partially_blocked;
    
    if(attack_order > 0 || attack_order == 0 && character.get_attack_speed() > current_enemy.stats.attack_speed) { //the hero attacks the enemy
        attack_order -= current_enemy.stats.attack_speed;
        use_stamina();

        add_xp_to_skill(skills["Combat"], current_enemy.xp_value, true);
        if(current_enemy.size === "small") {
            add_xp_to_skill(skills["Pest killer"], current_enemy.xp_value, true);
        } else if(current_enemy.size === "large") {
            add_xp_to_skill(skills["Giant slayer"], current_enemy.xp_value, true);
        }

        if(character.combat_stats.hit_chance > Math.random()) {//hero's attack hits

            if(character.equipment.weapon != null) {
                damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) 
                                            * skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`].get_coefficient())/10;


                add_xp_to_skill(skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`], current_enemy.xp_value, true); 
            } else {
                damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) * skills['Unarmed'].get_coefficient())/10;
                add_xp_to_skill(skills['Unarmed'], current_enemy.xp_value, true);
            }
            //small randomization by up to 20%, then bonus from skill
            
            if(character.full_stats.crit_rate > Math.random()) {
                damage_dealt = Math.round(10*damage_dealt * character.full_stats.crit_multiplier)/10;
                critted = true;
            }
            else {
                critted = false;
            }
            
            damage_dealt = Math.max(Math.round(10*(damage_dealt - current_enemy.stats.defense))/10, 1);

            current_enemy.stats.health -= damage_dealt;
            if(critted) {
                log_message(current_enemy.name + " was critically hit for " + damage_dealt + " dmg", "enemy_attacked_critically");
            }
            else {
                log_message(current_enemy.name + " was hit for " + damage_dealt + " dmg", "enemy_attacked");
            }

            if(current_enemy.stats.health <= 0) {
                current_enemy.stats.health = 0; 
                update_displayed_enemy_health();
                //just to not go negative on displayed health

                log_message(character.name + " has defeated " + current_enemy.name, "enemy_defeated");
                add_xp_to_character(current_enemy.xp_value, true);

                var loot = current_enemy.get_loot();
                if(loot.length > 0) {
                    log_loot(loot);
                    add_to_inventory("character", loot);
                }
                current_location.enemies_killed += 1;
                if(current_location.enemies_killed > 0 && current_location.enemies_killed % current_location.enemy_count == 0) {
                    get_location_rewards(current_location);
                } 

                enemy_count_div.children[0].children[1].innerHTML = current_location.enemy_count - current_location.enemies_killed % current_location.enemy_count;

                current_enemy = null;
                attack_order = 0;
                return;
            }

            update_displayed_enemy_health();
        } else {
            log_message(character.name + " has missed");
        }
    } else { //the enemy attacks the hero
        attack_order += character.get_attack_speed();

        damage_dealt = enemy_base_damage * (1.2 - Math.random() * 0.4);
        partially_blocked = false;


        if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
            if(character.combat_stats.block_chance > Math.random()) {//BLOCKED THE ATTACK
                add_xp_to_skill(skills["Shield blocking"], current_enemy.xp_value, true);
                if(character.equipment["off-hand"].getShieldStrength() >= damage_dealt) {
                    log_message(character.name + " has blocked the attack");
                    return; //damage fully blocked, nothing more can happen 
                } else {
                    damage_dealt -= character.equipment["off-hand"].getShieldStrength();
                    partially_blocked = true;
                }
             }
        }
        else { // HAS NO SHIELD

            use_stamina()
            
            if(character.combat_stats.evasion_chance > Math.random()) { //EVADED ATTACK
                add_xp_to_skill(skills["Evasion"], current_enemy.xp_value, true);
                log_message(character.name + " has evaded the attack");
                return; //damage fully evaded, nothing more can happen
            }
        }
        
        let critted = false;
        if(enemy_crit_chance > Math.random())
        {
            damage_dealt *= enemy_crit_damage;
            critted = true;
        }

        let {damage_taken, fainted} = character.take_damage({damage_value: damage_dealt});

        if(critted)
        {
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack, but was critically hit for " + damage_taken + " dmg", "hero_attacked_critically");
            } 
            else {
                log_message(character.name + " was critically hit for " + damage_taken + " dmg", "hero_attacked_critically");
            }
        } else {
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack and was hit for " + damage_taken + " dmg", "hero_attacked");
            }
            else {
                log_message(character.name + " was hit for " + damage_taken + " dmg", "hero_attacked");
            }
        }

        if(fainted) {
            log_message(character.name + " has lost consciousness", "hero_defeat");

            update_displayed_health();
            current_enemy = null;
            change_location(current_location.parent_location.name);
            return;
        }
        update_displayed_health();
    }

    /* 
     enemy is in a global variable
     if killed, uses method of Location object to assign a random new enemy (of ones in Location) to that variable;
    
     attack dmg either based on strength + weapon stat, or some magic stuff?
     maybe some weapons will be str based and will get some small bonus from magic if player has proper skill unlocked
     (something like "weapon aura"), while others (wands and staffs) will be based purely on magic
     single stat "magic" + multiple related skills?
     also should offer a bit better scaling than strength, so worse at beginning but later on gets better?
     also a magic resistance skill for player
     */
}

function use_stamina(num) {
    character.full_stats.stamina -= (num || 1);

    if(character.full_stats.stamina < 0)  {
        character.full_stats.stamina = 0;
    };

    if(character.full_stats.stamina < 1) {
        add_xp_to_skill(skills["Persistence"], num || 1);
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
function add_xp_to_skill(skill, xp_to_add, should_info) 
{
    if(skill.total_xp == 0) 
    { //creates new skill bar
        skill_bar_divs[skill.skill_id] = document.createElement("div");

        const skill_bar_max = document.createElement("div");
        const skill_bar_current = document.createElement("div");
        const skill_bar_text = document.createElement("div");
        const skill_bar_name = document.createElement("div");
        const skill_bar_xp = document.createElement("div");

        const skill_tooltip = document.createElement("div");
        const tooltip_xp = document.createElement("div");
        const tooltip_desc = document.createElement("div");
        const tooltip_effect = document.createElement("div");
        const tooltip_milestones = document.createElement("div");
        const tooltip_next = document.createElement("div");
        

        skill_bar_max.classList.add("skill_bar_max");
        skill_bar_current.classList.add("skill_bar_current");
        skill_bar_text.classList.add("skill_bar_text");
        skill_bar_name.classList.add("skill_bar_name");
        skill_bar_xp.classList.add("skill_bar_xp");
        skill_tooltip.classList.add("skill_tooltip");
        tooltip_next.classList.add("skill_tooltip_next_milestone");

        skill_bar_text.appendChild(skill_bar_name);
        skill_bar_text.append(skill_bar_xp);

        skill_tooltip.appendChild(tooltip_xp);
        skill_tooltip.appendChild(tooltip_desc);
        skill_tooltip.appendChild(tooltip_effect); 
        skill_tooltip.appendChild(tooltip_milestones);
        skill_tooltip.appendChild(tooltip_next);

        

        if(skill.skill_group) {
            tooltip_desc.innerHTML = `${skill.description}<br><br>Group: ${skill.skill_group}<br><br>`; 
        } else {
            tooltip_desc.innerHTML = `${skill.description}<br><br>`; 
        }
        
        skill_bar_max.appendChild(skill_bar_text);
        skill_bar_max.appendChild(skill_bar_current);
        skill_bar_max.appendChild(skill_tooltip);

        skill_bar_divs[skill.skill_id].appendChild(skill_bar_max);
        skill_bar_divs[skill.skill_id].setAttribute("data-skill", skill.skill_id);
        skill_bar_divs[skill.skill_id].classList.add("skill_div");
        skill_list.appendChild(skill_bar_divs[skill.skill_id]);


        if(typeof should_info === "undefined" || should_info) {
            log_message(`Learned new skill: ${skill.name()}`);
        }

        [...skill_list_div.children]
        .sort((a,b)=>a.getAttribute("data-skill")>b.getAttribute("data-skill")?1:-1)
        .forEach(node=>skill_list_div.appendChild(node));
    //sorts inventory_div alphabetically
    } 

    const level_up = skill.add_xp(xp_to_add * (global_xp_bonus || 1));

    /*
    skill_bar divs: 
        skill -> children (1): 
            skill_bar_max -> children(3): 
                skill_bar_text -> children(2):
                    skill_bar_name,
                    skill_bar_xp
                skill_bar_current, 
                skill_tooltip -> children(5):
                    tooltip_xp,
                    tooltip_desc,
                    tooltip_effect,
                    tooltip_milestones,
                    tooltip_next
    */

    skill_bar_divs[skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}/${skill.max_level}`;
    //skill_bar_name

    if(skill.current_xp !== "Max") {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `${100*Math.round(skill.current_xp/skill.xp_to_next_lvl*1000)/1000}%`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[0].children[1].innerHTML = `Max!`;
    }
    //skill_bar_xp

    skill_bar_divs[skill.skill_id].children[0].children[1].style.width = `${100*skill.current_xp/skill.xp_to_next_lvl}%`;
    //skill_bar_current

    if(skill.current_xp !== "Max") {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `${skill.current_xp}/${skill.xp_to_next_lvl}`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[0].innerHTML = `Maxed out!`;
    }
    //tooltip_xp

    if(get_unlocked_skill_rewards(skill.skill_id)) {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[3].innerHTML  = `<br>${get_unlocked_skill_rewards(skill.skill_id)}`;
    }

    if(typeof get_next_skill_milestone(skill.skill_id) !== "undefined") {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[4].innerHTML  = `lvl ${get_next_skill_milestone(skill.skill_id)}: ???`;
    } else {
        skill_bar_divs[skill.skill_id].children[0].children[2].children[4].innerHTML = "";
    }

    if(typeof skill.get_effect_description !== "undefined")
        {
            skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;
            //tooltip_effect
        }
    
    if(typeof level_up !== "undefined"){ //not undefined => levelup happened and levelup message was returned
//character stats currently get added in character.add_bonuses() method, called in skill.get_bonus_stats() method, called in skill.add_xp() when levelup happens
        if(typeof should_info === "undefined" || should_info)
        {
            log_message(level_up, "message_skill_leveled_up");
            update_character_stats();
        }

        if(typeof skill.get_effect_description !== "undefined")
        {
            skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;

        }
    }
}

/**
 * adds xp to character, handles levelups
 * @param {Number} xp_to_add 
 * @param {Boolean} should_info 
 */
function add_xp_to_character(xp_to_add, should_info = true) {
    const level_up = character.add_xp(xp_to_add * (global_xp_bonus || 1));

    /*
    character_xp_div
        character_xp_bar_max
            character_xp_bar_current
        charaxter_xp_value
    */
    character_xp_div.children[0].children[0].style.width = `${100*character.xp.current_xp/character.xp.xp_to_next_lvl}%`;
    character_xp_div.children[1].innerText = `${character.xp.current_xp}/${character.xp.xp_to_next_lvl} xp`;
    
    if(level_up) {
        if(should_info) {
            log_message(level_up);
        }
        
        character_level_div.innerText = `Level: ${character.xp.current_level}`;
        character.full_stats.health = character.full_stats.max_health; //free healing on level up, because it's a nice thing to have
        update_character_stats();
        update_displayed_health();
    }
    
}

/**
 * 
 * @param location game location object 
 */
function get_location_rewards(location) {
    if(location.enemies_killed == location.enemy_count) { //first clear
        change_location(current_location.parent_location.name); //go back to parent location, only on first clear

        if(location.first_reward.xp && typeof location.first_reward.xp === "number") {
            add_xp_to_character(location.first_reward.xp);
            log_message(`Obtained ${location.first_reward.xp}xp for clearing ${location.name} for the first time`);
        }
    }

    if(location.repeatable_reward.xp && typeof location.repeatable_reward.xp === "number") {
        add_xp_to_character(location.repeatable_reward.xp);
        log_message(`Obtained additional ${location.repeatable_reward.xp}xp for clearing ${location.name}`);
    }


    //all clears, so that if something gets added after location was cleared, it will still be unlockable
    for(let i = 0; i < location.repeatable_reward.locations?.length; i++) { //unlock locations
        unlock_location(location.repeatable_reward.locations[i])
    }

    for(let i = 0; i < location.repeatable_reward.textlines?.length; i++) { //unlock textlines and dialogues
        var any_unlocked = false;
        for(let j = 0; j < location.repeatable_reward.textlines[i].lines.length; j++) {
            if(dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked == false) {
                any_unlocked = true;
                dialogues[location.repeatable_reward.textlines[i].dialogue].textlines[location.repeatable_reward.textlines[i].lines[j]].is_unlocked = true;
            }
        }
        if(any_unlocked) {
            log_message(`Maybe you should check on ${location.repeatable_reward.textlines[i].dialogue}...`);
            //maybe do this only when there's just 1 dialogue with changes?
        }
    }
    //TODO: unlocking full dialogues and not just textlines

    
    /*
    TODO: give more rewards on all clears
    - some xp for location-related skills? (i.e. if location is dark, then for "night vision" or whatever it will be called)
    - items/money?
    */
}

/**
 * 
 * @param location game location object 
 */
function unlock_location(location) {
    if(!location.is_unlocked){
        location.is_unlocked = true;
        log_message(`Unlocked location ${location.name}`, "location_unlocked");
    }
}

/**
 * writes message to the message log
 * @param {String} message_to_add text to display
 * @param {String} message_type used for adding proper class to html element
 */
function log_message(message_to_add, message_type) {
    if(typeof message_to_add === 'undefined') {
        return;
    }

    var message = document.createElement("div");
    message.classList.add("message_common");

    var class_to_add = "message_default";

    //selects proper class to add based on argument
    //totally could have just passed class name as argument and use it instead of making this switch
    switch(message_type) {
        case "enemy_defeated":
            class_to_add = "message_victory";
            break;
        case "hero_defeat":
            class_to_add = "message_hero_defeated";
            break;
        case "enemy_attacked":
            class_to_add = "message_enemy_attacked";
            break;
        case "enemy_attacked_critically":
            class_to_add = "message_enemy_attacked_critically";
            break;
        case "hero_attacked":
            class_to_add = "message_hero_attacked";
            break;
        case "hero_attacked_critically":
            class_to_add = "message_hero_attacked_critically";
            break;
        case "combat_loot":
            class_to_add = "message_items_obtained";
            break;
        case "skill_raised":
            class_to_add = "message_skill_leveled_up";
            break;	
        case "message_travel":
            class_to_add = "message_travel";
            break;
        case "dialogue_question":
            class_to_add = "message_dialogue_question";
            break;
        case "dialogue_answer":
            class_to_add = "message_dialogue_answer";
            break;
        case "activity_unlocked":
        case "location_unlocked":
            class_to_add = "message_location_unlocked";
    }

    message.classList.add(class_to_add);

    message.innerHTML = message_to_add + "<div class='message_border'> </>";


    if(message_log.children.length > 60) 
    {
        message_log.removeChild(message_log.children[0]);
    } //removes first position if there's too many messages

    message_log.appendChild(message);
    message_log.scrollTop = message_log.scrollHeight;
}

function log_loot(loot_list) {
    
    if(loot_list.length == 0) {
        return;
    }

    var message = "Looted " + loot_list[0]["item"]["name"] + " x" + loot_list[0]["count"];
    if(loot_list.length > 1) {
        for(let i = 1; i < loot_list.length; i++) {
            message += (", " + loot_list[i]["item"]["name"] + " x" + loot_list[i]["count"]);
        }
    } //this looks terrible

    log_message(message, "combat_loot");
    
}

function update_displayed_health() { //call it when using healing items, resting or getting hit
    current_health_value_div.innerText = (Math.round(character.full_stats.health*10)/10) + "/" + character.full_stats.max_health + " hp";
    current_health_bar.style.width = (character.full_stats.health*100/character.full_stats.max_health).toString() +"%";
}
function update_displayed_stamina() { //call it when eating, resting or fighting
    current_stamina_value_div.innerText = Math.round(character.full_stats.stamina) + "/" + Math.round(character.full_stats.max_stamina) + " stamina";
    current_stamina_bar.style.width = (character.full_stats.stamina*100/character.full_stats.max_stamina).toString() +"%";
}

function update_displayed_enemy_health() { //call it when getting new enemy and when enemy gets hit
    current_enemy_health_value_div.innerHTML = (Math.round(current_enemy.stats.health*10)/10) + "/" + current_enemy.stats.max_health + " hp";
    current_enemy_health_bar.style.width =  (current_enemy.stats.health*100/current_enemy.stats.max_health).toString() +"%";
}

function clear_enemy_and_enemy_info() {
    current_enemy = null;
    current_enemy_health_value_div.innerHTML = "0";
    current_enemy_health_bar.style.width = "100%";
    enemy_stats_div.innerHTML = `Str: 0 | Agl: 0 | Dex: 0 | Def: 0 | Magic: 0 | Atk speed: 0;`
    enemy_name_div.innerHTML = "None";
}

/**
 * 
 * @param {String} who either "character" or "trader"
 * @param {*} items list of items to add
 */
function add_to_inventory(who, items, trader_key) {
    //items  -> [{item: some item object, count: X}]
    let target;
    if(who === "character") {
        target = character;
    } else if(who === "trader" && trader_key) {
        target = traders[trader_key];
    } else if(who === "trader") {
        target = traders[current_trader];
    }

    for(let i = 0; i < items.length; i++){
        if(!target.inventory.hasOwnProperty(items[i].item.getName())) //not in inventory
        {
            if(items[i].item.stackable)
            {
                target.inventory[items[i].item.getName()] = items[i];
            }
            else 
            {
                target.inventory[items[i].item.getName()] = [items[i].item];
            }
        }
        else //in inventory 
        {
            if(items[i].item.stackable)
            {
                target.inventory[items[i].item.getName()].count += items[i].count;
            } 
            else 
            {
                target.inventory[items[i].item.getName()].push(items[i].item);
            }
        }

    }
    if(who === "character") {
        update_displayed_inventory();
    } else if(who === "trader" && !trader_key) {
        update_displayed_trader_inventory();
    }
}

/**
 * 
 * @param {String} who  either "character" or "trader"
 */
function remove_from_inventory(who, {item_name, item_count, item_id}) {
    //either count or id, depending on if item is stackable or not

    let target;
    if(who === "character") {
        target = character;
    } else if(who === "trader") {
        target = traders[current_trader];
    }

    if(target.inventory.hasOwnProperty(item_name)) { //check if its in inventory, just in case, probably not needed
        if(target.inventory[item_name].hasOwnProperty("item")) { //stackable

            if(typeof item_count === "number" && Number.isInteger(item_count) && item_count >= 1) 
            {
                target.inventory[item_name].count -= item_count;
            } 
            else 
            {
                target.inventory[item_name].count -= 1;
            }

            if(target.inventory[item_name].count == 0) //less than 0 shouldn't happen so no need to check
            {
                delete target.inventory[item_name];
                //removes item from inventory if it's county is less than 1
            }
        }
        else { //unstackable
            target.inventory[item_name].splice(item_id, 1);
            //removes item from the array
            //dont need to check if .id even exists, as splice by default uses 0 (even when undefined is passed)

            if(target.inventory[item_name].length == 0) 
            {
                delete target.inventory[item_name];
                //removes item array from inventory if its empty
            } 
        }
    }

    if(who === "character") {
        update_displayed_inventory();
    } else if(who === "trader") {
        update_displayed_trader_inventory();
    }
}

/**
 * TODO
 */
function dismantle_item() {
    //TODO
}

function use_item(item_name) { 
    //can only use 1 at once and usable items are stackable, so item_name is enough

    const item_effects = item_templates[item_name].use_effect;
    
    var used = false;

    Object.keys(item_effects).forEach(function(key) {
        /*
        add effects to active_effects if not present
        same or lower strength: dont allow
        stronger: overwrite current
        */

        //temporary implementation
        if(!active_effects[key] || active_effects[key].flat < item_effects[key].flat) {
            active_effects[key] = Object.assign({}, item_effects[key]);
            used = true;
        }
        
    });
    if(used) {
        update_displayed_effects();
        remove_from_inventory("character", {item_name, item_count: 1});
    }
}

function update_displayed_money() {
    document.getElementById("money_div").innerHTML = `Your purse contains: ${format_money(character.money)}`;
}

/**
 * updates displayed inventory of the character (only inventory, worn equipment is managed by separate method)
 */
function update_displayed_inventory() {    
    inventory_div.innerHTML = "";

    Object.keys(character.inventory).forEach(function(key) {
        if(character.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < character.inventory[key].length; i++) {

                let should_continue = false;
                for(let j = 0; j < to_sell.items.length; j++) {
                    if(character.inventory[key][i].getName() === to_sell.items[j].item.split(" #")[0] && i == Number(to_sell.items[j].item.split(" #")[1])) {
                        //checks if item is present in to_sell, if so then doesn't add it to displayed in this inventory
                        should_continue = true;
                        break;
                    }
                }
                if(should_continue) {
                    continue;
                }

                const item_control_div = document.createElement("div");
                const item_div = document.createElement("div");
                const item_name_div = document.createElement("div");

                item_name_div.innerHTML = `<span class = "item_slot" >[${character.inventory[key][i].equip_slot}]</span> ${character.inventory[key][i].getName()}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
    
                item_div.classList.add("inventory_item", "character_item", `item_${character.inventory[key][i].item_type.toLowerCase()}`);

                item_control_div.setAttribute("data-character_item", `${character.inventory[key][i].getName()} #${i}`)
                //shouldnt create any problems, as any change to inventory will also call this method, 
                //so removing/equipping any item wont cause mismatch

                item_div.appendChild(create_item_tooltip(character.inventory[key][i]));
                item_control_div.classList.add('inventory_item_control', 'character_item_control', `character_item_${character.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.appendChild(item_div);

                
                var item_equip_span = document.createElement("span");
                item_equip_span.innerHTML = "[equip]";
                item_equip_span.classList.add("equip_item_button", "item_controls");
                item_control_div.appendChild(item_equip_span);

                var item_value_span = document.createElement("span");
                item_value_span.innerHTML = `${format_money(character.inventory[key][i].getValue(), true)}`;
                item_value_span.classList.add("item_value", "item_controls");
                item_control_div.appendChild(item_value_span);
                
                inventory_div.appendChild(item_control_div);
            }
        } else //stackables
        {
            let item_count = character.inventory[key].count;
            for(let i = 0; i < to_sell.items.length; i++) {
                
                if(character.inventory[key].item.name === to_sell.items[i].item.split(" #")[0]) {
                    item_count -= Number(to_sell.items[i].count);

                    if(item_count == 0) {
                        return;
                    }
                    if(item_count < 0) {
                        throw 'Something is wrong with character item count';
                    }

                    break;
                }
            }

            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    

            item_name_div.innerHTML = `${character.inventory[key].item.name} x${item_count}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_item", 'character_item', 'item_stackable', `item_${character.inventory[key].item.item_type.toLowerCase()}`);

            item_div.appendChild(create_item_tooltip(character.inventory[key].item));

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_control_div.classList.add('inventory_item_control', 'character_item_control', `character_item_${character.inventory[key].item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${character.inventory[key].item.name}`)
            item_control_div.setAttribute("data-item_count", `${item_count}`)
            item_control_div.appendChild(item_div);

            if(character.inventory[key].item.item_type === "USABLE") {
                const item_use_button = document.createElement("div");
                item_use_button.classList.add("item_use_button");
                item_use_button.innerText = "[use]";
                item_control_div.appendChild(item_use_button);
            }    

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(character.inventory[key].item.getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }

    });

    //equipped items
    Object.keys(character.equipment).forEach(function(key) {
        const item = character.equipment[key];
        if(item) {
            var item_control_div = document.createElement("div");
            var item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    

            item_name_div.innerHTML = `[${item.equip_slot}] ${item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_equipped_item");

            item_control_div.setAttribute("data-character_item", `${item.getName()} #${key}`)

            item_div.appendChild(create_item_tooltip(item));
            item_control_div.classList.add("equipped_item_control", `character_item_${item.item_type.toLowerCase()}`);
            item_control_div.appendChild(item_div);

            var item_unequip_div = document.createElement("div");
            item_unequip_div.innerHTML = "[take off]";
            item_unequip_div.classList.add("unequip_item_button", "item_controls");
            item_control_div.appendChild(item_unequip_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(character.equipment[key].getValue(), true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }
    });

    //add items from to_buy to display
    for(let i = 0; i < to_buy.items.length; i++) {
        
        const item_index = Number(to_buy.items[i].item.split(" #")[1]);

        if(isNaN(item_index)) { //it's stackable, so item_count is needed
            const item_count = to_buy.items[i].count;
            const actual_item = traders[current_trader].inventory[to_buy.items[i].item].item;

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");
    
            item_name_div.innerHTML = `${actual_item.name} x${item_count}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add('item_stackable', "inventory_item", 'character_item');

            item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

            const trade_button_5 = document.createElement("div");
            trade_button_5.classList.add("trade_ammount_button");
            trade_button_5.innerText = "5";
            trade_button_5.setAttribute("data-trade_ammount", 5);

            const trade_button_10 = document.createElement("div");
            trade_button_10.classList.add("trade_ammount_button");
            trade_button_10.innerText = "10";
            trade_button_10.setAttribute("data-trade_ammount", 10);

            item_control_div.classList.add('item_to_trade', 'character_item_control', 'inventory_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${actual_item.name}`);
            item_control_div.setAttribute("data-item_count", `${item_count}`);
            item_control_div.appendChild(item_div);

            item_control_div.appendChild(trade_button_5);
            item_control_div.appendChild(trade_button_10);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue() * traders[current_trader].profit_margin, true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = traders[current_trader].inventory[to_buy.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `[${item_templates[actual_item.getName()].equip_slot}] ${actual_item.getName()}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "character_item", "trade_item_equippable",);       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'character_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${actual_item.getName()} #${item_index}`)
            item_control_div.appendChild(item_div);

            var item_value_span = document.createElement("span");
            item_value_span.innerHTML = `${format_money(actual_item.getValue() * traders[current_trader].profit_margin, true)}`;
            item_value_span.classList.add("item_value", "item_controls");
            item_control_div.appendChild(item_value_span);

            inventory_div.appendChild(item_control_div);
        }
    }


    sort_displayed_inventory({target: "character"});
}

/**
 * equips item and removes it from inventory
 * @param item_info {name, id}
 */
function equip_item_from_inventory({item_name, item_id}) {
    if(character.inventory.hasOwnProperty(item_name)) { //check if its in inventory, just in case
        //add specific item to equipment slot
        // -> id and name tell which exactly item it is, then also check slot in item object and thats all whats needed
        equip_item(character.inventory[item_name][item_id]);
        remove_from_inventory("character", {item_name, item_id});
    }
}

/**
 * equips passed item, doesn't do anything more with it 
 * don't call this one directly, but via equip_item_from_inventory()
 * @param: game item object
 */
function equip_item(item) {
    unequip_item(item.equip_slot);
    character.equipment[item.equip_slot] = item;
    update_displayed_equipment();
    update_displayed_inventory();
    update_character_stats();	
}

function unequip_item(item_slot) {
    if(character.equipment[item_slot] != null) {
        add_to_inventory("character", [{item: character.equipment[item_slot]}]);
        character.equipment[item_slot] = null;
        update_displayed_equipment();
        update_displayed_inventory();
        update_character_stats();
    }
}

function create_item_tooltip(item, options) {
    //create tooltip and it's content
    var item_tooltip = document.createElement("span");
    item_tooltip.classList.add(options && options.css_class || "item_tooltip");

    item_tooltip.innerHTML = `<b>${item.getName()}</b>`;
    if(item.description) {
        item_tooltip.innerHTML += `<br>${item.description}`; 
    }

    //add stats if can be equipped
    if(item.item_type === "EQUIPPABLE"){

        item_tooltip.innerHTML += `<br><br><b style="color: ${rarity_colors[item.getRarity()]}">Quality: ${Math.round(item.quality*100)}% </b>`;

        //if a shield
        if(item.offhand_type === "shield") {
            item_tooltip.innerHTML += 
            `<br><br><b>[shield]</b><br><br>Can block up to ${item.getShieldStrength()} damage`;
        }
        else if(item.equip_slot === "weapon") {
            item_tooltip.innerHTML += `<br><br>Type: <b>${item.weapon_type}</b>`;
        }
        else {
            item_tooltip.innerHTML += `<br><br>Slot: <b>${item.equip_slot}</b`;
        }

        if(item.getAttack) {
            item_tooltip.innerHTML += 
                `<br><br>Attack: ${item.getAttack()}<br>`;
        } else if(item.getDefense) { 
            item_tooltip.innerHTML += 
            `<br><br>Defense: ${item.getDefense()}<br>`;
        } 
        const equip_stats = item.getStats();
        Object.keys(equip_stats).forEach(function(effect_key) {

            if(equip_stats[effect_key].flat != null) {
                item_tooltip.innerHTML += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")} +${equip_stats[effect_key].flat}`;
            }
            if(equip_stats[effect_key].multiplier != null) {
                item_tooltip.innerHTML += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")} x${equip_stats[effect_key].multiplier}`;
        }
        });
    } 
    else if (item.item_type === "USABLE") {

        Object.keys(item.use_effect).forEach(function(effect) {

            item_tooltip.innerHTML += `<br><br>Increases ${effect.replace("_", " ")} by`;

            if(item.use_effect[effect].flat) {
                item_tooltip.innerHTML += ` +${item.use_effect[effect].flat}`;
                if(item.use_effect[effect].percent) {
                    item_tooltip.innerHTML += ` and +${item.use_effect[effect].percent}%`;
                }
            } else if(item.use_effect[effect].percent) {
                item_tooltip.innerHTML += ` +${item.use_effect[effect].percent}%`;
            }

            if(item.use_effect[effect].duration) {
                item_tooltip.innerHTML += ` for ${item.use_effect[effect].duration} ticks`;
            } else {
                item_tooltip.innerHTML += ` permanently`;
            }
        });
    }

    item_tooltip.innerHTML += `<br><br>Value: ${format_money(Math.ceil(item.getValue() * ((options && options.trader) ? traders[current_trader].profit_margin : 1) || 1))}`;

    return item_tooltip;
}

function update_displayed_equipment() {
    Object.keys(equipment_slots_divs).forEach(function(key) {
        var eq_tooltip; 

        if(character.equipment[key] == null) { //no item in slot
            eq_tooltip = document.createElement("span");
            eq_tooltip.classList.add("item_tooltip");
            equipment_slots_divs[key].innerHTML = `${key} slot`;
            equipment_slots_divs[key].classList.add("equipment_slot_empty");
            eq_tooltip.innerHTML = `Your ${key} slot`;
        }
        else 
        {
            equipment_slots_divs[key].innerHTML = character.equipment[key].getName();
            equipment_slots_divs[key].classList.remove("equipment_slot_empty");

            eq_tooltip = create_item_tooltip(character.equipment[key]);
        }
        equipment_slots_divs[key].appendChild(eq_tooltip);
    });
}

/**
 * updates character main stats (health, strength, etc), stats dependant on enemy are updated in update_combat_stats()
 */
function update_character_stats() { //updates character stats

    character.update_stats();

    update_displayed_stats();
    update_displayed_health();
    update_displayed_stamina();
    //update_displayed_mana();
    update_combat_stats();
}

function update_displayed_stats() { //updates displayed stats

    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.full_stats[key]*100).toFixed(1)}%`;
        } 
        else if(key === "attack_speed") {
            stats_divs[key].innerHTML = `${(character.get_attack_speed()).toFixed(1)}`;
        }
        else if(key === "attack_power") {
            stats_divs[key].innerHTML = `${(character.get_attack_power()).toFixed(1)}`;
        }
        else {
            stats_divs[key].innerHTML = `${(character.full_stats[key]).toFixed(1)}`;
        }
    });
}
/**
 * updates character stats that depend on enemy, so hit chance and evasion/block
 */
function update_combat_stats() { //chances to hit and evade/block
    if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
        character.combat_stats.evasion_chance = null;
        character.combat_stats.block_chance = Math.round(0.4 * skills["Shield blocking"].get_coefficient("flat") * 10000)/10000;
    }

    if(current_enemy != null) { //IN COMBAT

        let hit_bonus;
        let evasion_bonus;
        if(current_enemy.size === "small") {
            hit_bonus = skills["Pest killer"].get_coefficient("multiplicative");
        } else if(current_enemy.size === "large") {
            evasion_bonus = skills["Giant slayer"].get_coefficient("multiplicative");
        }

        character.combat_stats.hit_chance = Math.min(1, Math.sqrt(character.full_stats.intuition) * character.full_stats.dexterity/current_enemy.stats.agility 
                                            * 0.25 * skills["Combat"].get_coefficient("multiplicative") * (hit_bonus || 1));

        //so 100% if at least four times more dexterity, 50% if same, can go down almost to 0%

        if(character.equipment["off-hand"] == null || character.equipment["off-hand"].offhand_type !== "shield") {
            const power = character.full_stats.agility > current_enemy.stats.dexterity ? 2/3 : 1
            character.combat_stats.evasion_chance = Math.min(1, Math.pow(0.25*character.full_stats.agility/current_enemy.stats.dexterity, power) * Math.sqrt(character.full_stats.intuition)
                                                    * 0.25 * skills["Evasion"].get_coefficient("multiplicative") * (evasion_bonus || 1));

            //so up to 100% if at least eight times more agility, 25% if same, can go down almost to 0%
        }
    } 
    else {
        character.combat_stats.hit_chance = null;
        character.combat_stats.evasion_chance = null;
    }

    update_displayed_combat_stats();
}

function update_displayed_combat_stats() {
    if(current_enemy != null) {
        other_combat_divs.hit_chance.innerHTML = `${(character.combat_stats.hit_chance*100).toFixed(1)}%`;
    }
    else {
        other_combat_divs.hit_chance.innerHTML = "";
    }

    if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD

        other_combat_divs.defensive_action.innerHTML = "Block:";
        other_combat_divs.defensive_action_chance.innerHTML = `${(character.combat_stats.block_chance*100).toFixed(1)}%`;

    }
    else {
        other_combat_divs.defensive_action.innerHTML = "Evasion:";
        if(current_enemy != null) {
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.combat_stats.evasion_chance*100).toFixed(1)}%`;
        }
        else {
            other_combat_divs.defensive_action_chance.innerHTML = "";
        }
    }
}

function update_displayed_effects() {
    const effect_count = Object.keys(active_effects).length;
    active_effect_count.innerText = effect_count;
    if(effect_count > 0) {
        active_effects_tooltip.innerHTML = '';
        Object.keys(active_effects).forEach(function(effect) {
            const effect_div = document.createElement("div");
            const effect_desc_div = document.createElement("div");
            const effect_duration_div = document.createElement("div");

            effect_desc_div.innerText = `${capitalize_first_letter(effect.replace("_", " "))} +${active_effects[effect].flat}`;

            effect_duration_div.innerText = active_effects[effect].duration;

            effect_div.appendChild(effect_desc_div);
            effect_div.append(effect_duration_div);
            active_effects_tooltip.appendChild(effect_div);
        });
    } else {
        active_effects_tooltip.innerHTML = 'No active effects';
    }
    update_displayed_effect_durations();
}

function update_displayed_effect_durations() {
    //it just iterates over all tooltips and decreases their durations by 1
    //kinda stupid, but makes some sense
    //later on might instead make another function for it and call it here
    for(let i = 0; i < active_effects_tooltip.children.length; i++) {
        active_effects_tooltip.children[i].children[1].innerText = Number(active_effects_tooltip.children[i].children[1].innerText) - 1;
    }

}

/** 
 * formats money to a nice string in form x..x G xx S xx C (gold/silver/copper) 
 * @param {Number} num value to be formatted
 * @param {Boolean} round if the value should be rounded a bit
 */
function format_money(num, round) {
    var value;
    const sign = num >= 0 ? '' : '-';
    num = Math.abs(num);

    if(round) {
        //round it up a bit to skip tiny little meaningless leftovers
        const size = Math.log10(num);
        if(size > 5 && size < 7) { //remove last 2 digits (C value)
            num = Math.round(num/100) * 100;
        } else if(size > 7) { //remove last 4 digits (S and C values)
            num = Math.round(num/10000) * 10000;
        }
    }

    if(num > 0) {
        value = (num%100 != 0 ? `${num%100} C` : '');

        if(num > 99) {
            value = (Math.floor(num/100)%100 != 0?`${Math.floor(num/100)%100} S ` :'') + value;
            if(num > 9999) {
                value = `${Math.floor(num/10000)} G ` + value;
            }
        }

        return sign + value;

    } else {
        return 'nothing';
    }
}

/**
 * puts all important stuff into a string
 * @returns string with save data
 */
function create_save() {
    try{
        const save_data = {};
        save_data["current time"] = current_game_time;
        save_data["character"] = {name: character.name, titles: character.titles, 
                                inventory: character.inventory, equipment: character.equipment,
                                money: character.money, 
                                xp: {
                                    total_xp: character.xp.total_xp,
                                },
                                hp_to_full: character.full_stats.max_health - character.full_stats.health,
                                stamina_to_full: character.full_stats.max_stamina - character.full_stats.stamina};
        //no need to save all stats; on loading, base stats will be taken from code and then additional stuff will be calculated again (in case anything changed)

        save_data["skills"] = {};
        Object.keys(skills).forEach(function(key) {
            save_data["skills"][skills[key].skill_id] = {total_xp: skills[key].total_xp}; //a bit redundant, but keep it in case key in skills is different than skill_id
        }); //only save total xp of each skill, again in case of any changes
        
        save_data["current location"] = current_location.name;

        if(current_enemy == null) {
            save_data["current enemy"] = null;
        } 
        else {
            save_data["current enemy"] = {name: current_enemy.name, stats: current_enemy.stats}; 
            //no need to save everything, just name + stats -> get enemy from template and change stats to those saved
        }

        save_data["locations"] = {};
        Object.keys(locations).forEach(function(key) { 
            save_data["locations"][key] = {};
            if(locations[key].is_unlocked) {      
                save_data["locations"][key].is_unlocked = true;
            }

            if("parent_location" in locations[key]) { //combat zone
                save_data["locations"][key]["enemies_killed"] = locations[key].enemies_killed;
            }

            if(locations[key].activities) {
                save_data["locations"][key]["unlocked_activities"] = []
                for(let i = 0; i < locations[key].activities.length; i++) {
                    if(locations[key].activities[i].is_unlocked) {
                        save_data["locations"][key]["unlocked_activities"].push(locations[key].activities[i].activity);
                    }
                }
            }
        }); //save locations' (and their activities') unlocked status and their killcounts

        save_data["activities"] = {};
        Object.keys(activities).forEach(function(activity) {
            if(activities[activity].is_unlocked) {
                save_data["activities"][activity] = {is_unlocked: true};
            }
        }); //save activities' unlocked status (this is separate from unlock status in location)

        if(current_activity) {
            save_data["current_activity"] = {activity: current_activity.activity.name, 
                                             working_time: current_activity.working_time, 
                                             earnings: current_activity.earnings};
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
            if(traders[trader].last_refresh == -1 || traders[trader].can_refresh()) {
                //no need to save, as trader would be anyway refreshed on any visit
                return;
            } else {
                save_data["traders"][trader] = {inventory: traders[trader].inventory, last_refresh: traders[trader].last_refresh};
            }
        });

        save_data["is_sleeping"] = is_sleeping;

        save_data["active_effects"] = active_effects;

        return JSON.stringify(save_data);
    } catch(error) {
        console.error("Something went wrong on saving the game!");
        console.error(error);
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
function save_to_localStorage(is_manual) {
    localStorage.setItem("save data", create_save());
    if(is_manual) {
        log_message("Saved the game manually");
    }
}

function load(save_data) {
    //single loading method

    //TODO: some loading screen
    try{
        current_game_time.load_time(save_data["current time"]);
        time_field.innerHTML = current_game_time.toString();
        //set game time

        name_field.value = save_data.character.name;
        character.name = save_data.character.name;

        if(save_data["current enemy"] != null) { 
            current_enemy = new Enemy(enemy_templates[save_data["current enemy"].name]);
            current_enemy.stats = save_data["current enemy"].stats; 
            get_new_enemy(current_enemy);
        } //load enemy

        Object.keys(save_data.character.equipment).forEach(function(key){
            if(save_data.character.equipment[key] != null) {
                try{

                    if(key === "weapon") {
                        const {head, handle, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[head]){
                            console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                        } else {
                            const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    } else if(key === "off-hand") {
                        const {shield_base, handle, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[shield_base]){
                            console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                        } else if(!item_templates[handle]) {
                            console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                        } else {
                            const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    } else {
                        const {internal, external, quality, equip_slot} = save_data.character.equipment[key];
                        if(!item_templates[internal]){
                            console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                        } else if(external && !item_templates[external]) {
                            console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                        } else {
                            const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                            equip_item(item);
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }); //equip proper items

        const item_list = [];

        Object.keys(save_data.character.inventory).forEach(function(key){
            if(Array.isArray(save_data.character.inventory[key])) { //is a list of unstackable items (equippables), needs to be added 1 by 1
                for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                    try{
                        if(save_data.character.inventory[key][i].equip_slot === "weapon") {
                            const {head, handle, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[head]){
                                console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                            } else {
                                const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        } else if(save_data.character.inventory[key][i].equip_slot === "off-hand") {
                            const {shield_base, handle, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[shield_base]){
                                console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                            } else if(!item_templates[handle]) {
                                console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                            } else {
                                const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        } else {
                            const {internal, external, quality, equip_slot} = save_data.character.inventory[key][i];
                            if(!item_templates[internal]){
                                console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                            } else if(external && !item_templates[external]) {
                                console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                            } else {
                                const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                                item_list.push({item, count: 1});
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            else { //is stackable 
                if(item_templates[key]) {
                    save_data.character.inventory[key].item.value = item_templates[key].value;
                    save_data.character.inventory[key].item.description = item_templates[key].description;
                    if(item_templates[key].item_type === "USABLE") {
                        save_data.character.inventory[key].item.use_effect = item_templates[key].use_effect;
                    }
                    item_list.push({item: getItem(save_data.character.inventory[key].item), count: save_data.character.inventory[key].count});
                } else {
                    console.warn(`Inventory item "${key}" couldn't be found!`);
                    return;
                }
            }
            
        }); //add all loaded items to list

        add_to_inventory("character", item_list); // and then to inventory

        character.money = save_data.character.money || 0;
        update_displayed_money();

        add_xp_to_character(save_data.character.xp.total_xp/(global_xp_bonus || 1), false);

        Object.keys(save_data.skills).forEach(function(key){ 
            if(skills[key]){
                if(save_data.skills[key].total_xp > 0) {
                    add_xp_to_skill(skills[key], save_data.skills[key].total_xp/(global_xp_bonus || 1), false);
                }
            } else {
                console.warn(`Skill "${key}" couldn't be found!`);
                return;
            }
        }); //add xp to skills


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
                Object.keys(save_data.traders[trader].inventory).forEach(function(key){
                    if(Array.isArray(save_data.traders[trader].inventory[key])) { //is a list of unstackable (equippable) item, needs to be added 1 by 1
                        for(let i = 0; i < save_data.traders[trader].inventory[key].length; i++) {
                            try{
                                if(save_data.traders[trader].inventory[key][i].equip_slot === "weapon") {
                                    const {head, handle, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                    if(!item_templates[head]){
                                        console.warn(`Skipped item: weapon head component "${head}" couldn't be found!`);
                                    } else if(!item_templates[handle]) {
                                        console.warn(`Skipped item: weapon handle component "${handle}" couldn't be found!`);
                                    } else {
                                        const item = getItem({head, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                        trader_item_list.push({item, count: 1});
                                    }
                                } else if( save_data.traders[trader].inventory[key][i].equip_slot === "off-hand") {
                                    const {shield_base, handle, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                    if(!item_templates[shield_base]){
                                        console.warn(`Skipped item: shield base component "${shield_base}" couldn't be found!`);
                                    } else if(!item_templates[handle]) {
                                        console.warn(`Skipped item: shield handle "${handle}" couldn't be found!`);
                                    } else {
                                        const item = getItem({shield_base, handle, quality, equip_slot, item_type: "EQUIPPABLE"});
                                        trader_item_list.push({item, count: 1});
                                    }
                                } else {
                                    const {internal, external, quality, equip_slot} =  save_data.traders[trader].inventory[key][i];
                                    if(!item_templates[internal]){
                                        console.warn(`Skipped item: internal armor component "${internal}" couldn't be found!`);
                                    } else if(external && !item_templates[external]) {
                                        console.warn(`Skipped item: external armor component "${external}" couldn't be found!`);
                                    } else {
                                        const item = getItem({internal, external, quality, equip_slot, item_type: "EQUIPPABLE"});
                                        trader_item_list.push({item, count: 1});
                                    }
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
                        trader_item_list.push({item: getItem(save_data.traders[trader].inventory[key].item), count: save_data.traders[trader].inventory[key].count});
                    }
                });

                traders[trader].refresh(); 
                traders[trader].inventory = {};
                add_to_inventory("trader", trader_item_list, trader);

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
                if("parent_location" in locations[key]) { // if combat zone
                    locations[key].enemies_killed = save_data.locations[key].enemies_killed;
                }
                if(save_data.locations[key].unlocked_activities) {
                    for(let i = 0; i < locations[key].activities.length; i++) {
                        if(save_data.locations[key].unlocked_activities.includes(locations[key].activities[i].activity)) {
                            locations[key].activities[i].is_unlocked = true;
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
            } else {
                console.warn(`Activity "${activity}" couldn't be found!`);
            }
        });

        Object.keys(save_data.active_effects).forEach(function(effect) {
            active_effects[effect] = save_data.active_effects[effect];
        });

        
        if(save_data.character.hp_to_full == null || save_data.character.hp_to_full >= character.full_stats.max_health) {
            character.full_stats.health = 1;
        } else {
            character.full_stats.health = character.full_stats.max_health - save_data.character.hp_to_full;
        }
        //if missing hp is null (save got corrupted) or its more than max_health, set health to minimum allowed (which is 1)
        //otherwise just do simple substraction
        //then same with stamina below
        if(save_data.character.stamina_to_full == null || save_data.character.stamina_to_full >= character.full_stats.max_stamina) {
            character.full_stats.stamina = 0;
        } else {
            character.full_stats.stamina = character.full_stats.max_stamina - save_data.character.stamina_to_full;
        }
        
        update_character_stats();

        update_displayed_health();
        //load current health
        
        //TODO: apply effects properly
        update_displayed_effects();
        
        change_location(save_data["current location"]);

        //set activity if any saved
        if(save_data.current_activity) {
            //search for it in location from save_data
            const activity_id = locations[save_data["current location"]].activities.findIndex(activity => activity.activity ===  save_data.current_activity.activity);

            if(typeof activity_id !== "undefined") {
                start_activity({id: activity_id});
                if(activities[current_activity.activity.name].type === "JOB") {
                    current_activity.working_time = save_data.current_activity.working_time;
                    current_activity.earnings = save_data.current_activity.earnings;
                    document.getElementById("action_end_earnings").innerText = `(earnings: ${format_money(current_activity.earnings)})`;
                }
                
            } else {
                console.warn("Couldn't find saved activity! It might have been removed");
            }
        }

        if(save_data.is_sleeping) {
            start_sleeping();
        }
        
    } catch(error) {
        throw error; //let other loading methods (from_file and from_localstorage) take care of it
    }

} //core function for loading

/**
 * called from index.html
 * loads game from file by resetting everything that needs to be reset and then calling main loading method with same parameter
 * @param {String} save_string 
 */
function load_from_file(save_string) {
    try{
        Object.keys(character.equipment).forEach(function(key){
            if(character.equipment[key] != null) {
                unequip_item(key);
            }
        }); //remove equipment
        character.inventory = {}; //reset inventory to not duplicate items

        character.stats = character.base_stats;
        character.xp = character.starting_xp;
        //reset stats and xp

        Object.keys(skills).forEach(function(key){
            if(skills[key].total_xp > 0) {
                skills[key].current_xp = 0;
                skills[key].current_lvl = 0;
                skills[key].total_xp = 0;
                skills[key].xp_to_next_lvl = skills[key].base_xp_cost;
                skills[key].total_xp_to_next_lvl = skills[key].base_xp_cost;
            }
        }); //clear all skill progress from display
        Object.keys(skill_bar_divs).forEach(function(key) {
            delete skill_bar_divs[key];
        });

        exit_trade();

        const skill_list_div = document.getElementById("skill_list_div");
        while(skill_list_div.firstChild) {
            skill_list_div.removeChild(skill_list_div.lastChild);
        } //remove skill bars from display

        try {
            load(JSON.parse(atob(save_string)));
        } catch(error) {
            console.error("Something went wrong on loading from file!");
            console.error(error);
        }
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
        load(JSON.parse(localStorage.getItem("save data")));
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
}

function update_timer() {
    current_game_time.go_up(is_sleeping ? 6 : 1);
    time_field.innerHTML = current_game_time.toString();
} //updates time div

function update() {

    setTimeout(function()
    {
        end_date = Date.now(); 
        //basically when previous tick ends

        time_variance_accumulator += ((end_date - start_date) - 1000/tickrate);
        //duration of previous tick, minus time it was supposed to take
        //important to keep it between setting end_date and start_date, so they are 2 completely separate values

        //console.log((end_date - start_date).toString() + " : " + time_variance_accumulator.toString());

        start_date = Date.now();
        /*
        basically when current tick starts
        so before this assignment, start_date is when previous tick started
        and end_date is when previous_tick ended
        */

        update_timer();


        if("parent_location" in current_location){ //if it's a combat_zone
            //nothing here i guess?
        } else { //everything other than combat
            if(is_sleeping) {
                do_sleeping();
                add_xp_to_skill(skills["Sleeping"], current_location.sleeping.xp);
            }
            else if(is_resting) {
                do_resting();
            }

            if(current_activity) { //in activity

                //add xp to all related skills
                for(let i = 0; i < current_activity.activity.base_skills_names.length; i++) {
                    add_xp_to_skill(skills[current_activity.activity.base_skills_names[i]], current_activity.skill_xp_per_tick);
                }

                //if job: payment
                if(current_activity.activity.type === "JOB") {
                    current_activity.working_time += 1;

                    if(current_activity.working_time % current_activity.working_period == 0) { 
                        //finished working period, add money, then check if there's enough time left for another
                        current_activity.earnings += current_activity.payment;
                        document.getElementById("action_end_earnings").innerText = `(earnings: ${format_money(current_activity.earnings)})`

                        
                        if(!enough_time_for_earnings(current_activity) && !document.getElementById("not_enough_time_for_earnings_div")) {
                            const time_info_div = document.createElement("div");
                            time_info_div.id = "not_enough_time_for_earnings_div";
                            time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
                            action_div.insertBefore(time_info_div, action_div.children[2]);
                        }
                    }
                    
                    if(!can_work(current_activity)) {
                        end_activity();
                    }
                }

                //if gathering: add drops to inventory

            } else {
                const divs = document.getElementsByClassName("activity_div");
                for(let i = 0; i < divs.length; i++) {
                    const activity = current_location.activities[divs[i].getAttribute("data-activity")];

                    if(activities[activity.activity].type === "JOB") {
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
        }

        //regenerate hp
        if(active_effects.health_regeneration) {
            if(character.full_stats.health < character.full_stats.max_health) {
                character.full_stats.health += active_effects.health_regeneration.flat;

                if(character.full_stats.health > character.full_stats.max_health) {
                    character.full_stats.health = character.full_stats.max_health
                }

                update_displayed_health();
            }
            active_effects.health_regeneration.duration -= 1;
            if(active_effects.health_regeneration.duration <= 0) {
                delete active_effects.health_regeneration;
                update_displayed_effects();
            }
        }

        //regenerate stamina
        if(active_effects.stamina_regeneration) {
            if(character.full_stats.stamina < character.full_stats.max_stamina) {
                character.full_stats.stamina += active_effects.stamina_regeneration.flat;

                if(character.full_stats.stamina > character.full_stats.max_stamina) {
                    character.full_stats.stamina = character.full_stats.max_stamina
                }

                update_displayed_stamina();
            }
            active_effects.stamina_regeneration.duration -= 1;
            if(active_effects.stamina_regeneration.duration <= 0) {
                delete active_effects.stamina_regeneration;
                update_displayed_effects();
            }
        }
        update_displayed_effect_durations();

        save_counter += 1;
        if(save_counter >= save_period) {
            save_counter = 0;
            save_to_localStorage();
        } //save every X/60 minutes



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
        /*
        small correction, limiting maximum adjustment; absolutely necessary, as otherwise tabbing out would then cause problems
        as having tab unfocused would sometimes result in ticks either being a bit longer and accumulating over time, 
        or just almost entirely stop, and so in both cases time_variance_accumulator would keep growing and growing
        and growing and growing to some ridiculous values, then when game tab is focused again, 
        it would try to get rid of this "time debt" by going with max possible speed, 
        possibly for minutes or even longer
        */

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

window.equip_item = equip_item_from_inventory;
window.unequip_item = unequip_item;

window.change_location = change_location;

window.start_dialogue = start_dialogue;
window.end_dialogue = end_dialogue;
window.start_textline = start_textline;

window.start_activity = start_activity;
window.end_activity = end_activity;

window.start_sleeping = start_sleeping;
window.end_sleeping = end_sleeping;

window.start_trade = start_trade;
window.exit_trade = exit_trade;
window.add_to_buying_list = add_to_buying_list;
window.remove_from_buying_list = remove_from_buying_list;
window.add_to_selling_list = add_to_selling_list;
window.remove_from_selling_list = remove_from_selling_list;
window.cancel_trade = cancel_trade;
window.accept_trade = accept_trade;

window.format_money = format_money;
window.get_character_money = get_character_money;

window.use_item = use_item;

window.sort_displayed_inventory = sort_displayed_inventory;
window.update_displayed_inventory = update_displayed_inventory;
window.update_displayed_trader_inventory = update_displayed_trader_inventory;

window.save_to_localStorage = save_to_localStorage;
window.save_to_file = save_to_file;
window.load_progress = load_from_file;


if("save data" in localStorage) {
    load_from_localstorage();

    update_combat_stats();
}
else {
    add_to_inventory("character", [{item: getItem({...item_templates["Cheap iron sword"], quality: 0.4})}, 
                                   {item: getItem({...item_templates["Cheap leather pants"], quality: 0.4})},
                                   {item: getItem(item_templates["Stale bread"]), count: 5}]);

    equip_item_from_inventory({name: "Cheap iron spear", id: 0});
    equip_item_from_inventory({name: "Cheap leather pants", id: 0});
    add_xp_to_character(0);
    character.money = 15;
    update_displayed_money();
    update_character_stats();
}

//checks if there's an existing save file, otherwise just sets up some initial equipment
update_displayed_equipment();
run();

