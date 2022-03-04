"use strict";

import { current_game_time, format_time } from "./game_time.js";
import { Item, item_templates } from "./items.js";
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
                    dexterity: document.getElementById("dexterity_slot"), magic: document.getElementById("magic_slot"), 
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
//additional attacks for combat
var additional_hero_attacks = 0;
var additional_enemy_attacks = 0;
//current location
var current_location;

var current_activity;

//resting, true -> health regenerates
var is_resting = true;

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

//character xp display
const character_xp_div = document.getElementById("character_xp_div");

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
const location_description_div = document.getElementById("location_description_div");

time_field.innerHTML = current_game_time.toString();

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

    add_xp_to_skill(skills["Farming"], 10000);
    add_xp_to_skill(skills["Swords"], 10000);
}); 
*/
name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Hero");

function capitalize_first_letter(some_string) {
    return some_string.charAt(0).toUpperCase() + some_string.slice(1);
}

function change_location(location_name) {
    var location = locations[location_name];
    if(!location) {
        throw `No such location as "${location_name}"`;
    }
    var action;
    clear_action_div();
    if(typeof current_location !== "undefined" && current_location.name !== location.name ) { 
        //so it's not called when initializing the location on page load or when it's called when new location is unlocked
        log_message(`[ Entering ${location.name} ]`, "message_travel");
    }
    
    if("connected_locations" in location) { // basically means it's a normal location and not a combat zone (as combat zone has only "parent")
        enemy_info_div.style.display = "none";
        enemy_count_div.style.display = "none";
        
        for(let i = 0; i < location.dialogues.length; i++) { //add buttons for starting dialogues (displaying their textlines on click will be in another method?)
            if(!dialogues[location.dialogues[i]].is_unlocked || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
                continue;
            } 
            
            const dialogue_div = document.createElement("div");
            
            dialogue_div.innerHTML = dialogues[location.dialogues[i]].starting_text;
            dialogue_div.innerHTML += dialogues[location.dialogues[i]].trader? `  <i class="fas fa-store"></i>` : `  <i class="far fa-comments"></i>`;
            dialogue_div.classList.add("start_dialogue");
            dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
            dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
            action_div.appendChild(dialogue_div);
        }

        //add buttons to start activities
        for(let i = 0; i < location.activities?.length; i++) {
            if(!activities[location.activities[i].activity]?.is_unlocked || !location.activities[i]?.is_unlocked) {
                continue;
            }

            const activity_div = document.createElement("div");
            
            activity_div.innerHTML = location.activities[i].starting_text;
            if(activities[location.activities[i].activity].type === "JOB") {
                activity_div.innerHTML += `  <i class="fas fa-hammer"></i>`;
                activity_div.classList.add("activity_div");
                activity_div.setAttribute("data-activity", i);
                activity_div.setAttribute("onclick", `start_activity({id: ${i}});`);

                if(enough_time_for_work(location.activities[i])) {
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
            else {
                console.error("Activity type not yet supported!");
            }

            action_div.appendChild(activity_div);
        }

        for(let i = 0; i < location.connected_locations.length; i++) { //add butttons to change location

            if(location.connected_locations[i].location.is_unlocked == false) { //skip if not unlocked
                continue;
            }

            action = document.createElement("div");
            
            if("connected_locations" in location.connected_locations[i].location) {// check again if connected location is normal or combat
                action.classList.add("travel_normal");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = location.connected_locations[i].custom_text + `  <i class="fas fa-map-signs"></i>`;
                }
                else {
                    action.innerHTML = "Go to " + location.connected_locations[i].location.name + `  <i class="fas fa-map-signs"></i>`;
                }
            } else {
                action.classList.add("travel_combat");
                if("custom_text" in location.connected_locations[i]) {
                    action.innerHTML = location.connected_locations[i].custom_text + `  <i class="fas fa-skull"></i>`;
                }
                else {
                    action.innerHTML = "Enter the " + location.connected_locations[i].location.name + `  <i class="fas fa-skull"></i>`;
                }
            }
            action.classList.add("action_travel");
            action.setAttribute("data-travel", location.connected_locations[i].location.name);
            action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

            action_div.appendChild(action);

            if(typeof current_location !== "undefined" && "parent_location" in current_location) { // if previous was combat and new is normal
                clear_enemy_and_enemy_info();
                update_combat_stats();
            }
        }

    } else { //so if entering combat zone
        enemy_count_div.style.display = "block";
        enemy_info_div.style.display = "block";
        enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemies_killed % location.enemy_count;

        action = document.createElement("div");
        action.classList.add("travel_normal", "action_travel");
        action.innerHTML = "Go back to " + location.parent_location.name + `  <i class="fas fa-map-signs"></i>`;
        action.setAttribute("data-travel", location.parent_location.name);
        action.setAttribute("onclick", "change_location(this.getAttribute('data-travel'));");

        action_div.appendChild(action);
    }

    current_location = location;
    location_name_div.innerHTML = current_location.name;
    location_description_div.innerHTML = current_location.description;
}

function start_activity(selected_activity) {
    //{id}

    current_activity = Object.assign({},current_location.activities[selected_activity.id]);
    current_activity.name = current_activity.activity;
    current_activity.activity = activities[current_activity.activity];

    if(activities[current_activity.name].type === "JOB") {
        if(!enough_time_for_work(current_activity)) {
            current_activity = null;
            return;
        }

        current_activity.earnings = 0;
        current_activity.working_time = 0;

        if(!current_activity.activity) {
            throw "Job option not found!";
        }
    } else if(activities[current_activity].type === "TRAINING") {
        if(!current_activity.activity) {
            throw "Training option not found!";
        }
    } else if(activities[current_activity].type === "GATHERING") { 
        if(!current_activity.activiti) {
            throw `"${activities[current_activity].type}" is not a valid activity type!`;
        } 
    }

    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = current_activity.activity.action_text;
    action_status_div.id = "action_status_div";

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
     action_div.appendChild(action_end_div);
}

function end_activity() {
    
    log_message(`${character.name} finished ${current_activity.name}`);
    
    if(current_activity.earnings) {
        character.money += current_activity.earnings;
        log_message(`${character.name} earned ${format_money(current_activity.earnings)}`);
        update_displayed_money();
    }
    
    current_activity = null;
    change_location(current_location.name);
}

function enough_time_for_work(selected_job) {
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
        trade_div.innerHTML = traders[dialogue.trader].trade_text + `  <i class="fas fa-store"></i>`;
        trade_div.classList.add("dialogue_trade")
        trade_div.setAttribute("data-trader", dialogue.trader);
        trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
        //TODO: this
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

function start_textline(textline_key){
    const dialogue = dialogues[current_dialogue];
    const textline = dialogue.textlines[textline_key];

    log_message(`> > ${textline.name}`, "dialogue_question")
    log_message(textline.text, "dialogue_answer");

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
                    locations[textline.unlocks.activities[i].location].activities[j].is_unlocked = true;
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

function start_trade(trader_key) {
    traders[trader_key].refresh(); 
    action_div.style.display = "none";
    trade_div.style.display = "inherit";
    //todo: save inventory (and last_refresh) with the rest of saved data (still need to leave this refresh here though)
    

    current_trader = trader_key;
    document.getElementById("trader_cost_mult_value").textContent = `${100*traders[current_trader].profit_margin}%`
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

            add_to_inventory("character", [{item: new Item(item_templates[item.item.split(" #")[0]]), 
                                            count: item.count}])
            
            remove_from_inventory("trader", {name: item.item.split(" #")[0], 
                                            count: item.count,
                                            id: item.item.split(" #")[1]});

        }
        while(to_sell.items.length > 0) {
            //remove from character inventory
            //add to trader inventory

            const item = to_sell.items.pop();
            
            remove_from_inventory("character", {name: item.item.split(" #")[0], 
                count: item.count,
                id: item.item.split(" #")[1]});

            add_to_inventory("trader", [{item: new Item(item_templates[item.item.split(" #")[0]]), 
                count: item.count}])
        }
    }

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

function add_to_buying_list(selected_item) {
    const is_stackable = item_templates[selected_item.item.split(' #')[0]].stackable;

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

    } else {
        to_buy.items.push(selected_item);
    }

    to_buy.value += Math.floor(traders[current_trader].profit_margin * item_templates[selected_item.item.split(' #')[0]].value) * selected_item.count;

    return -Math.floor(traders[current_trader].profit_margin * item_templates[selected_item.item.split(' #')[0]].value) * selected_item.count;
}

function remove_from_buying_list(selected_item) {
    const is_stackable = item_templates[selected_item.item.split(' #')[0]].stackable;
    var actual_number_to_remove = selected_item.count;

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_buy.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) {
            present_item.count -= selected_item.count;
        } else {
            actual_number_to_remove = present_item.count
            to_buy.items.splice(to_buy.items.indexOf(present_item),1);
        }
    } else { //unstackable item, so always just 1
        to_buy.items.splice(to_buy.items.indexOf(selected_item),1);
    }

    to_buy.value -= Math.floor(traders[current_trader].profit_margin * item_templates[selected_item.item.split(' #')[0]].value) * actual_number_to_remove;
    return Math.floor(traders[current_trader].profit_margin * item_templates[selected_item.item.split(' #')[0]].value) * actual_number_to_remove;
}

function add_to_selling_list(selected_item) {
    const is_stackable = item_templates[selected_item.item.split(' #')[0]].stackable;

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

    } else {
        to_sell.items.push(selected_item);
    }

    to_sell.value += item_templates[selected_item.item.split(' #')[0]].value * selected_item.count;
    return item_templates[selected_item.item.split(' #')[0]].value * selected_item.count;
}

function remove_from_selling_list(selected_item) {
    const is_stackable = item_templates[selected_item.item.split(' #')[0]].stackable;
    var actual_number_to_remove = selected_item.count;

    if(is_stackable) { //stackable, so "count" may be more than 1
        const present_item = to_sell.items.find(a => a.item === selected_item.item);
        if(present_item?.count > selected_item.count) {
            present_item.count -= selected_item.count;
        } else {
            actual_number_to_remove = present_item.count;
            to_sell.items.splice(to_sell.items.indexOf(present_item), 1);
        }
    } else { //unstackable item, so just 1
        to_sell.items.splice(to_sell.items.indexOf(selected_item),1);
    }

    to_sell.value -= item_templates[selected_item.item.split(' #')[0]].value * actual_number_to_remove;
    return -item_templates[selected_item.item.split(' #')[0]].value * actual_number_to_remove;
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
                    if(trader.inventory[key][i].name === to_buy.items[j].item.split(" #")[0] && i == Number(to_buy.items[j].item.split(" #")[1])) {
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

                item_name_div.innerHTML = `[${trader.inventory[key][i].equip_slot}] ${trader.inventory[key][i].name}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
                item_div.classList.add("inventory_item", "trader_item");       

                //add tooltip
                item_div.appendChild(create_item_tooltip(trader.inventory[key][i], {trader: true}));

                item_control_div.classList.add('inventory_item_control', 'trader_item_control', `trader_item_${trader.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.setAttribute("data-trader_item", `${trader.inventory[key][i].name} #${i}`)
                item_control_div.appendChild(item_div);

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
    
            item_name_div.innerHTML = `[${actual_item.equip_slot}] ${actual_item.name} x${item_count}`;
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

            trader_inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = character.inventory[to_sell.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `[${item_templates[actual_item.name].equip_slot}] ${actual_item.name}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "trader_item");       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'trader_item_control', `trader_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-trader_item", `${actual_item.name} #${item_index}`)
            item_control_div.appendChild(item_div);

            trader_inventory_div.appendChild(item_control_div);
        }
    }

    sort_displayed_inventory({sort_by: sorting_param || "name", target: "trader"});
}

function sort_displayed_inventory(options) {

    const target = options.target === "trader" ? trader_inventory_div : inventory_div;

    /*
    seems terribly overcomplicated
    can't think of better solution for now
    
    */
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
        else if(options.sort_by === "name") {
            
            //if they are equippable, take in account the [slot] value displayed in front of item in inventory
            const item_a = item_templates[(a.getAttribute("data-character_item") || a.getAttribute("data-trader_item")).split(" #")[0]];
            const name_a = (item_a.equip_slot || '') + item_a.name;
            const item_b = item_templates[(b.getAttribute("data-character_item") || b.getAttribute("data-trader_item")).split(" #")[0]];
            const name_b = (item_b.equip_slot || '') + item_b.name;

            if(name_a > name_b) {
                return 1;
            } else {
                return -1;
            }

        } else if(options.sort_by === "price") {
            if(item_templates[(a.getAttribute("data-character_item") || a.getAttribute("data-trader_item")).split(" #")[0]].value 
                    > item_templates[(b.getAttribute("data-character_item") || b.getAttribute("data-trader_item")).split(" #")[0]].value) {
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

function get_new_enemy() {
    current_enemy = current_location.get_next_enemy();
    enemy_stats_div.innerHTML = `Str: ${current_enemy.stats.strength} | Agl: ${current_enemy.stats.agility} 
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
        return;
    }

    //todo: separate formulas for physical and magical weapons
    //and also need magic weapons before that...

    var hero_base_damage = character.full_stats.attack_power;
    var enemy_base_damage = current_enemy.stats.strength;

    var damage_dealt;

    var critted;

    var partially_blocked;

    if(character.stats.attack_speed > current_enemy.stats.attack_speed) {
        additional_hero_attacks += (character.stats.attack_speed/current_enemy.stats.attack_speed - 1);
        additional_enemy_attacks = 0;
    } else if (character.stats.attack_speed < current_enemy.stats.attack_speed) {
        additional_enemy_attacks += (current_enemy.stats.attack_speed/character.stats.attack_speed - 1);
        additional_hero_attacks = 0;
    }
    

    for(let i = 0; i <= additional_hero_attacks; i++) { //hero attacks
        if(i > 0) {
            additional_hero_attacks -= 1;
        }

        if(character.combat_stats.hit_chance > Math.random()) {//hero's attack hits
            add_xp_to_skill(skills["Combat"], current_enemy.xp_value, true);
            if(character.equipment.weapon != null) {
                add_xp_to_skill(skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`], current_enemy.xp_value, true); 
            
                damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4) 
                                            * skills[`${capitalize_first_letter(character.equipment.weapon.weapon_type)}s`].get_coefficient())/10;
            } else {
                damage_dealt = Math.round(10 * hero_base_damage * (1.2 - Math.random() * 0.4))/10;
                //TODO: unarmed skill, apply bonus here
            }
            //small randomization by up to 20%, then bonus from skill
            
            if(character.full_stats.crit_rate > Math.random()) {
                damage_dealt = Math.round(damage_dealt * character.full_stats.crit_multiplier);
                critted = true;
            }
            else {
                critted = false;
            }
            
            damage_dealt = Math.max(damage_dealt - current_enemy.stats.defense, 1);

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
                additional_enemy_attacks = 0;
                return;
            }

            update_displayed_enemy_health();
        } else {
            log_message(character.name + " has missed");
        }
    }

    for(let i = 0; i <= additional_enemy_attacks; i++) { //enemy attacks
        if(i > 0) {
            additional_enemy_attacks -= 1;
        }

        damage_dealt = enemy_base_damage * (1.2 - Math.random() * 0.4);
        partially_blocked = false;


        if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD
            if(character.equipment.offhand.shield_strength >= damage_dealt) {
                if(character.combat_stats.block_chance > Math.random()) {//BLOCKED THE ATTACK
                    add_xp_to_skill(skills["Shield blocking"], current_enemy.xp_value, true);
                    log_message(character.name + " has blocked the attack");
                    continue;
                 }
            }
            else { 
                if(character.combat_stats.block_chance - 0.3 > Math.random()) { //PARTIALLY BLOCKED THE ATTACK
                    add_xp_to_skill(skills["Shield blocking"], current_enemy.xp_value, true);
                    damage_dealt -= character.equipment.offhand.shield_strength;
                    partially_blocked = true;
                    //FIGHT GOES LIKE NORMAL, but log that it was partially blocked
                }
            }
        }
        else { // HAS NO SHIELD
            if(character.combat_stats.evasion_chance > Math.random()) { //EVADED ATTACK
                add_xp_to_skill(skills["Evasion"], current_enemy.xp_value, true);
                log_message(character.name + " has evaded the attack");
                continue;
            }
        }
                
        if(enemy_crit_chance > Math.random())
        {
            damage_dealt *= enemy_crit_damage;
            damage_dealt = Math.round(10*Math.max(damage_dealt - character.full_stats.defense, 1))/10;
            character.full_stats.health -= damage_dealt;
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack, but was critically hit for " + damage_dealt + " dmg", "hero_attacked_critically");
            } 
            else {
                log_message(character.name + " was critically hit for " + damage_dealt + " dmg", "hero_attacked_critically");
            }
        } else {
            damage_dealt = Math.round(10*Math.max(damage_dealt - character.full_stats.defense, 1))/10;
            character.full_stats.health -= damage_dealt;
            if(partially_blocked) {
                log_message(character.name + " partially blocked the attack and was hit for " + damage_dealt + " dmg", "hero_attacked");
            }
            else {
                log_message(character.name + " was hit for " + damage_dealt + " dmg", "hero_attacked");
            }
        }

        if(character.full_stats.health <= 0) {
            log_message(character.name + " has lost consciousness", "hero_defeat");

            if(character.full_stats.health < 0) {
                character.full_stats.health = 0;
            }
            update_displayed_health();
            additional_hero_attacks = 0;
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
            tooltip_desc.innerHTML = `${skill.description}<br><br>Group: ${skill.skill_group}`; 
        } else {
            tooltip_desc.innerHTML = `${skill.description}`; 
        }
        
        skill_bar_max.appendChild(skill_bar_text);
        skill_bar_max.appendChild(skill_bar_current);
        skill_bar_max.appendChild(skill_tooltip);

        skill_bar_divs[skill.skill_id].appendChild(skill_bar_max);
        skill_bar_divs[skill.skill_id].setAttribute("data-skill", skill.skill_id);
        skill_bar_divs[skill.skill_id].classList.add("skill_div");
        skill_list.appendChild(skill_bar_divs[skill.skill_id]);

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

    skill_bar_divs[skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}`;
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
    
    if(typeof level_up !== "undefined"){
        if(typeof should_info === "undefined" || should_info)
        {
            log_message(level_up, "message_skill_leveled_up");
            update_character_stats();
        }

        if(typeof skill.get_effect_description !== "undefined")
        {
            skill_bar_divs[skill.skill_id].children[0].children[2].children[2].innerHTML = `${skill.get_effect_description()}`;

        }

        //TODO: update tooltip
    }

    //TODO: sort displayed skills
}

function add_xp_to_character(xp_to_add, should_info) {
    const level_up = character.add_xp(xp_to_add * (global_xp_bonus || 1));

    /*
    character_xp_div
        character_level_div
        character_xp_bar_max
            character_xp_bar_current
        charaxter_xp_value

    */

    character_xp_div.children[1].children[0].style.width = `${100*character.xp.current_xp/character.xp.xp_to_next_lvl}%`;
    character_xp_div.children[2].innerText = `${character.xp.current_xp}/${character.xp.xp_to_next_lvl} xp`;
    
    if(level_up) {
        if((typeof should_info === "undefined" || should_info)) {
            
            log_message(level_up);
        }

        character_xp_div.children[0].innerText = `Level: ${character.xp.current_level}`;
        update_character_stats();
        update_displayed_health();
    }
    
}

function get_location_rewards(location) {
    if(location.enemies_killed == location.enemy_count) { //first clear
        change_location(current_location.parent_location.name); //go back to parent location, only on first clear
    }


    //all clears, so that if something gets added after location was cleared, it will still be unlockable
    for(let i = 0; i < location.rewards.locations.length; i++) { //unlock locations
        unlock_location(location.rewards.locations[i])
    }

    for(let i = 0; i < location.rewards.textlines.length; i++) { //unlock textlines and dialogues
        var any_unlocked = false;
        for(let j = 0; j < location.rewards.textlines[i].lines.length; j++) {
            if(dialogues[location.rewards.textlines[i].dialogue].textlines[location.rewards.textlines[i].lines[j]].is_unlocked == false) {
                any_unlocked = true;
                dialogues[location.rewards.textlines[i].dialogue].textlines[location.rewards.textlines[i].lines[j]].is_unlocked = true;
            }
        }
        if(any_unlocked) {
            log_message(`Maybe you should check on ${location.rewards.textlines[i].dialogue}...`);
            //maybe do this only when there's just 1 dialogue with changes?
        }
    }
    //TODO: unlocking full dialogues and not just textlines

    
    /*
    TODO: give more rewards on all clears
    - bonus xp for character
    - some xp for location-related skills? (i.e. if location is dark, then for "night vision" or whatever it will be called)
    - items/money?
    */
}

function unlock_location(location) {
    if(!location.is_unlocked){
        location.is_unlocked = true;
        log_message(`You can now go to ${location.name}`, "location_unlocked");
    }
}

//single tick of resting
function do_resting() {
    if(character.full_stats.health < character.full_stats.max_health)
    {
        const resting_heal_ammount = 1; 
        //todo: add sleeping that will heal faster and scale with level of some skill
        //and also with max hp (like at least 1% of total hp, maybe even 10% with stuff maxed out?)
        character.full_stats.health += (resting_heal_ammount);
        if(character.full_stats.health > character.full_stats.max_health) {
            character.full_stats.health = character.full_stats.max_health;
        } 
        update_displayed_health();
    }
}

//writes message to the message log
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

function update_displayed_health() { //call it when eating, resting or getting hit
    current_health_value_div.innerHTML = (Math.round(character.full_stats.health*10)/10) + "/" + character.full_stats.max_health;
    current_health_bar.style.width = (character.full_stats.health*100/character.full_stats.max_health).toString() +"%";
}

function update_displayed_enemy_health() { //call it when getting new enemy and when enemy gets hit
    current_enemy_health_value_div.innerHTML = (Math.round(current_enemy.stats.health*10)/10) + "/" + current_enemy.stats.max_health;
    current_enemy_health_bar.style.width =  (current_enemy.stats.health*100/current_enemy.stats.max_health).toString() +"%";
}

function clear_enemy_and_enemy_info() {
    current_enemy = null;
    current_enemy_health_value_div.innerHTML = "0";
    current_enemy_health_bar.style.width = "100%";
    enemy_stats_div.innerHTML = `Str: 0 | Agl: 0 | Dex: 0 | Def: 0 | Magic: 0 | Atk speed: 0;`
    enemy_name_div.innerHTML = "None";
}

function add_to_inventory(who, items) {
    //items  -> [{item: some item object, count: X}]
    let target;
    if(who === "character") {
        target = character;
    } else if(who === "trader") {
        target = traders[current_trader];
    }

    for(let i = 0; i < items.length; i++){
        if(!target.inventory.hasOwnProperty(items[i].item.name)) //not in inventory
        {
            if(items[i].item.stackable)
            {
                target.inventory[items[i].item.name] = items[i];
            }
            else 
            {
                target.inventory[items[i].item.name] = [items[i].item];
            }
        }
        else //in inventory 
        {
            if(items[i].item.stackable)
            {
                target.inventory[items[i].item.name].count += items[i].count;
            } 
            else 
            {
                target.inventory[items[i].item.name].push(items[i].item);
            }
        }

    }
    if(who === "character") {
        update_displayed_inventory();
    } else if(who === "trader") {
        update_displayed_trader_inventory();
    }
}

function remove_from_inventory(who, item_info) {
    //item info -> {name: X, count: X, id: X}, with either count or id, depending on if item is stackable or not

    let target;
    if(who === "character") {
        target = character;
    } else if(who === "trader") {
        target = traders[current_trader];
    }

    if(target.inventory.hasOwnProperty(item_info.name)) { //check if its in inventory, just in case, probably not needed

        if(target.inventory[item_info.name].hasOwnProperty("item")) { //stackable

            if(typeof item_info.count === "number" && Number.isInteger(item_info.count) && item_info.count >= 1) 
            {
                target.inventory[item_info.name].count -= item_info.count;
            } 
            else 
            {
                target.inventory[item_info.name].count -= 1;
            }

            if(target.inventory[item_info.name].count == 0) //less than 0 shouldn't happen so no need to check
            {
                delete target.inventory[item_info.name];
                //removes item from inventory if it's county is less than 1
            }
        }
        else { //unstackable
            target.inventory[item_info.name].splice(item_info.id, 1);
            //removes item from the array
            //dont need to check if .id even exists, as splice by default uses 0 (even when undefined is passed)

            if(target.inventory[item_info.name].length == 0) 
            {
                delete target.inventory[item_info.name];
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

function dismantle_item() {
    //todo: this thing
    //priority: extremely low
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
        remove_from_inventory("character", {name: item_name, count: 1});
    }
}

function update_displayed_money() {
    document.getElementById("money_div").innerHTML = `Your purse contains: ${format_money(character.money)}`;
}

function update_displayed_inventory() {
    //actual inventory only, character item slots separately
    
    inventory_div.innerHTML = "";

    Object.keys(character.inventory).forEach(function(key) {
        if(character.inventory[key] instanceof Array) //unstackables
        { 
            for(let i = 0; i < character.inventory[key].length; i++) {

                let should_continue = false;
                for(let j = 0; j < to_sell.items.length; j++) {
                    if(character.inventory[key][i].name === to_sell.items[j].item.split(" #")[0] && i == Number(to_sell.items[j].item.split(" #")[1])) {
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

                item_name_div.innerHTML = `[${item_templates[character.inventory[key][i].name].equip_slot}] ${character.inventory[key][i].name}`;
                item_name_div.classList.add("inventory_item_name");
                item_div.appendChild(item_name_div);
    
                item_div.classList.add("inventory_item", "character_item", `item_${character.inventory[key][i].item_type.toLowerCase()}`);

                item_control_div.setAttribute("data-character_item", `${character.inventory[key][i].name} #${i}`)
                //shouldnt create any problems, as any change to inventory will also call this method, 
                //so removing/equipping any item wont cause mismatch

                item_div.appendChild(create_item_tooltip(character.inventory[key][i]));
                item_control_div.classList.add('inventory_item_control', 'character_item_control', `character_item_${character.inventory[key][i].item_type.toLowerCase()}`);
                item_control_div.appendChild(item_div);

                
                var item_equip_div = document.createElement("div");
                item_equip_div.innerHTML = "[equip]";
                item_equip_div.classList.add("equip_item_button");
                item_control_div.appendChild(item_equip_div);
                

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
    

            item_name_div.innerHTML = `[${item_templates[item.name].equip_slot}] ${item.name}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);

            item_div.classList.add("inventory_equipped_item");

            item_control_div.setAttribute("data-character_item", `${item.name} #${key}`)

            item_div.appendChild(create_item_tooltip(item));
            item_control_div.classList.add("equipped_item_control", `character_item_${item.item_type.toLowerCase()}`);
            item_control_div.appendChild(item_div);

            var item_unequip_div = document.createElement("div");
            item_unequip_div.innerHTML = "[take off]";
            item_unequip_div.classList.add("unequip_item_button");
            item_control_div.appendChild(item_unequip_div);

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

            inventory_div.appendChild(item_control_div);
            
        } else { //it's unstackable, no need for item_count as it's always at 1

            const actual_item = traders[current_trader].inventory[to_buy.items[i].item.split(" #")[0]][item_index];

            const item_control_div = document.createElement("div");
            const item_div = document.createElement("div");
            const item_name_div = document.createElement("div");

            item_name_div.innerHTML = `[${item_templates[actual_item.name].equip_slot}] ${actual_item.name}`;
            item_name_div.classList.add("inventory_item_name");
            item_div.appendChild(item_name_div);
            item_div.classList.add("inventory_item", "character_item");       

            //add tooltip
            item_div.appendChild(create_item_tooltip(actual_item, {trader: true}));

            item_control_div.classList.add('item_to_trade', 'inventory_item_control', 'character_item_control', `character_item_${actual_item.item_type.toLowerCase()}`);
            item_control_div.setAttribute("data-character_item", `${actual_item.name} #${item_index}`)
            item_control_div.appendChild(item_div);

            inventory_div.appendChild(item_control_div);
        }
    }


    sort_displayed_inventory("character");
}

function equip_item_from_inventory(item_info) {
    //item info -> {name: X, count: X, id: X}, count currently not used
    if(character.inventory.hasOwnProperty(item_info.name)) { //check if its in inventory, just in case
        if(character.inventory[item_info.name].hasOwnProperty("item")) { //stackable
            console.log("not implemented");
        }
        else { //unstackable
            //add specific item to equipment slot
            // -> id and name tell which exactly item it is, then also check slot in item object and thats all whats needed
            equip_item(character.inventory[item_info.name][item_info.id]);
            remove_from_inventory("character", item_info); //put this outside if() when equipping gets implemented for stackables as well
        }
    }
}

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
    item_tooltip.innerHTML = 
    `<b>${item.name}</b>
    <br>${item.description}`;

    //add stats if can be equipped
    if(item.item_type === "EQUIPPABLE"){

        //if a shield
        if(item.offhand_type === "shield") {
            item_tooltip.innerHTML += 
            `<br><br><strong>[shield]</strong><br><br>Can fully block attacks not stronger than: ${item.shield_strength}`;
        }
        else if(item.equip_slot === "weapon") {
            item_tooltip.innerHTML += `<br><br>Type: <strong>${item.weapon_type}</strong>`;
        }
        else {
            item_tooltip.innerHTML += `<br><br>Slot: <strong>${item.equip_slot}</strong`;
        }

        Object.keys(item.equip_effect).forEach(function(effect_key) {

            if(effect_key === "attack") {
                item_tooltip.innerHTML += 
                `<br><br>Attack: ${item.equip_effect[effect_key].flat}`;
            } else {
                item_tooltip.innerHTML += 
                `<br><br>Flat ${effect_key} bonus: ${item.equip_effect[effect_key].flat_bonus}`;
            }

            if(item.equip_effect[effect_key].multiplier != null) {
                item_tooltip.innerHTML += 
            `<br>${capitalize_first_letter(effect_key)} multiplier: ${item.equip_effect[effect_key].multiplier}`;
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

    item_tooltip.innerHTML += `<br><br>Value: ${format_money(Math.floor(item.value * ((options && options.trader) ? traders[current_trader].profit_margin : 1)))}`;

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
            equipment_slots_divs[key].innerHTML = character.equipment[key].name;
            equipment_slots_divs[key].classList.remove("equipment_slot_empty");

            eq_tooltip = create_item_tooltip(character.equipment[key]);
        }
        equipment_slots_divs[key].appendChild(eq_tooltip);
    });
}

function update_character_stats() { //updates character stats
    Object.keys(character.stats).forEach(function(stat){
        if(stat === "attack_power") {
            return;
        }

        character.full_stats[stat] = character.stats[stat];

        Object.keys(character.equipment).forEach(function(key) {
            if(character.equipment[key] != null && character.equipment[key].equip_effect[stat]) {
                character.full_stats[stat] += character.equipment[key].equip_effect[stat].flat_bonus;
            }
        }); //calculate stats based on equipment

        /*
        Object.keys(character.equipment).forEach(function(key) {
            if(character.equipment[key] != null && character.equipment[key].equip_effect[stat]) {
                character.full_stats[stat] *= character.equipment[key].equip_effect[stat].multiplier;
            }
        }); //same, but add multiplicative bonuses // or maybe sumarize the bonus first and then add it? (make it additive instead of multiplicative)
        */
    });
    //TODO: add bonuses from skills

    if(character.equipment.weapon != null) { 
        character.stats.attack_power = (character.full_stats.strength/10) * character.equipment.weapon.equip_effect.attack.flat 
                                        * (character.equipment.weapon.equip_effect.attack.multiplier || 1);
    } 
    else {
        character.stats.attack_power = character.full_stats.strength/10;
    }

    character.full_stats.attack_power = character.stats.attack_power;

    update_displayed_stats();
    update_combat_stats();
}

function update_displayed_stats() { //updates displayed stats
    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.full_stats[key]*100).toFixed(1)}%`
        } 
        else {
            stats_divs[key].innerHTML = `${(character.full_stats[key]).toFixed(1)}`
        }
    });
}

function update_combat_stats() { //chances to hit and evade/block
    if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD
        character.combat_stats.evasion_chance = null;
        character.combat_stats.block_chance = Math.round(0.4 * skills["Shield blocking"].get_coefficient("flat") * 10000)/10000;
    }

    if(current_enemy != null) { //IN COMBAT

        character.combat_stats.hit_chance = Math.min(0.99, Math.max(0.1, Math.sqrt(character.full_stats.dexterity/current_enemy.stats.agility) 
                                            * 0.5 * skills["Combat"].get_coefficient("multiplicative")));

        //so 99% if at least four times more dexterity, 50% if same, and never less than 10%

        if(character.equipment.offhand == null || character.equipment.offhand.offhand_type !== "shield") {
            const power = character.full_stats.agility > current_enemy.stats.dexterity ? 2/3 : 1
            character.combat_stats.evasion_chance = Math.min(0.99, Math.pow(character.full_stats.agility/current_enemy.stats.dexterity, power) * 0.25 * skills["Evasion"].get_coefficient("multiplicative"));
            //so up to 99% if at least eight more agility, 25% if same, can go down almost to 0%
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

    if(character.equipment.offhand != null && character.equipment.offhand.offhand_type === "shield") { //HAS SHIELD

        other_combat_divs.defensive_action.innerHTML = "Block:";

        if(current_enemy != null && character.equipment.offhand.shield_strength < current_enemy.stats.strength) { //IN COMBAT && SHIELD WEAKER THAN AVERAGE NON-CRIT ATTACK
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.combat_stats.block_chance*100-30).toFixed(1)}%`;
        } 
        else {
            other_combat_divs.defensive_action_chance.innerHTML = `${(character.combat_stats.block_chance*100).toFixed(1)}%`;
        }
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

//formats money to a nice string in form x..x G xx S xx C (gold/silver/copper) 
function format_money(num) {
    var value;
    const sign = num >= 0 ? '' : '-';
    num = Math.abs(num);
    if(num > 0) {
        value = (num%100 != 0 ? `${num%100} C` : '');

        if(num > 99) {
            value = (Math.floor(num/100)%100 != 0?`${Math.floor(num/100)%100} S ` :'') + value;
            if(num > 9999) {
                value = `${Math.floor(num/10000)} G ` + value;
            }
        }
    } else {
        return 'nothing';
    }
    return sign + value;
}

//puts important stuff into the save string and returns it
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
                                hp_to_full: character.full_stats.max_health - character.full_stats.health};
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
            save_data["locations"][key] = {is_unlocked: locations[key].is_unlocked};
            if("parent_location" in locations[key]) { //combat zone
                save_data["locations"][key]["enemies_killed"] = locations[key].enemies_killed;
            }
            if(locations[key].activities) {
                for(let i = 0; i < locations[key].activities.length; i++) {
                    save_data["locations"][key]["unlocked_activities"] = []
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
            Object.keys(dialogues[dialogue].textlines).forEach(function(textline) {
                save_data["dialogues"][dialogue].textlines[textline] = {is_unlocked: dialogues[dialogue].textlines[textline].is_unlocked,
                                                            is_finished: dialogues[dialogue].textlines[textline].is_finished};
            });
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

        save_data["active_effects"] = active_effects;

        return JSON.stringify(save_data);
    } catch(error) {
        console.error("Something went wrong on saving the game!");
        console.error(error);
    }
} 

function save_to_file() {
    return btoa(create_save());
} //called from index.html

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
        } //load enemy

        Object.keys(save_data.character.equipment).forEach(function(key){
            if(save_data.character.equipment[key] != null) {
                save_data.character.equipment[key].value = item_templates[save_data.character.equipment[key].name].value;
                save_data.character.equipment[key].equip_effect = item_templates[save_data.character.equipment[key].name].equip_effect;
                equip_item(save_data.character.equipment[key]);
            }
        }); //equip proper items

        const item_list = [];

        Object.keys(save_data.character.inventory).forEach(function(key){
            if(Array.isArray(save_data.character.inventory[key])) { //is a list [of unstackable item], needs to be added 1 by 1
                for(let i = 0; i < save_data.character.inventory[key].length; i++) {
                    save_data.character.inventory[key][i].value = item_templates[key].value;
                    if(item_templates[key].item_type = "EQUIPPABLE") {
                        save_data.character.inventory[key][i].equip_effect = item_templates[key].equip_effect;
                    }
                    item_list.push({item: save_data.character.inventory[key][i], count: 1});
                }
            }
            else {
                save_data.character.inventory[key].item.value = item_templates[key].value;
                if(item_templates[key].item_type === "EQUIPPABLE") {
                    save_data.character.inventory[key].item.equip_effect = item_templates[key].equip_effect;
                } else if(item_templates[key].item_type === "USABLE") {
                    save_data.character.inventory[key].item.use_effect = item_templates[key].use_effect;
                }
                item_list.push({item: save_data.character.inventory[key].item, count: save_data.character.inventory[key].count});
            }
            
        }); //add all loaded items to list

        add_to_inventory("character", item_list); // and then to inventory

        character.money = save_data.character.money || 0;
        update_displayed_money();

        add_xp_to_character(save_data.character.xp.total_xp/(global_xp_bonus || 1), false);
        //TODO: make it less dumb

        Object.keys(save_data.skills).forEach(function(key){ 
            if(save_data.skills[key].total_xp > 0) {
                add_xp_to_skill(skills[key], save_data.skills[key].total_xp/(global_xp_bonus || 1), false);
            }
        }); //add xp to skills


        Object.keys(save_data.dialogues).forEach(function(dialogue) {
            dialogues[dialogue].is_unlocked = save_data.dialogues[dialogue].is_unlocked;
            dialogues[dialogue].is_finished = save_data.dialogues[dialogue].is_finished;

            Object.keys(save_data.dialogues[dialogue].textlines).forEach(function(textline){
                dialogues[dialogue].textlines[textline].is_unlocked = save_data.dialogues[dialogue].textlines[textline].is_unlocked;
                dialogues[dialogue].textlines[textline].is_finished = save_data.dialogues[dialogue].textlines[textline].is_finished;
            });
        }); //load for dialogues and their textlines their unlocked/finished status

        
        Object.keys(save_data.traders).forEach(function(trader) { 
            let trader_item_list = [];

            
            Object.keys(save_data.traders[trader].inventory).forEach(function(key){
                if(Array.isArray(save_data.traders[trader].inventory[key])) { //is a list [of unstackable item], needs to be added 1 by 1
                    for(let i = 0; i < save_data.traders[trader].inventory[key].length; i++) {
                        save_data.traders[trader].inventory[key][i].value = item_templates[key].value;
                        if(item_templates[key].item_type = "EQUIPPABLE") {
                            save_data.traders[trader].inventory[key][i].equip_effect = item_templates[key].equip_effect;
                        }
                        trader_item_list.push({item: save_data.traders[trader].inventory[key][i], count: 1});
                    }
                }
                else {
                    save_data.traders[trader].inventory[key].item.value = item_templates[key].value;
                    if(item_templates[key].item_type === "EQUIPPABLE") {
                        save_data.traders[trader].inventory[key].item.equip_effect = item_templates[key].equip_effect;
                    } else if(item_templates[key].item_type === "USABLE") {
                        save_data.traders[trader].inventory[key].item.use_effect = item_templates[key].use_effect;
                    }
                    trader_item_list.push({item: save_data.traders[trader].inventory[key].item, count: save_data.traders[trader].inventory[key].count});
                }
            });

            start_trade(trader);
            traders[trader].inventory = {};
            add_to_inventory("trader", trader_item_list);
            exit_trade();

            traders[trader].last_refresh = save_data.traders[trader].last_refresh;
        }); //load trader inventories
        

        Object.keys(save_data.locations).forEach(function(key) {
            locations[key].is_unlocked = save_data.locations[key].is_unlocked;
            if("parent_location" in locations[key]) { // if combat zone
                locations[key].enemies_killed = save_data.locations[key].enemies_killed;
            }
            if("unlocked_activities" in save_data.locations[key]) {
                for(let i = 0; i < locations[key].activities.length; i++) {
                    if(save_data.locations[key].unlocked_activities.includes(locations[key].activities[i].activity)) {
                        locations[key].activities[i].is_unlocked = true;
                    }
                }
            }
        }); //load for locations their unlocked status and their killcounts

        Object.keys(activities).forEach(function(activity) {
            activities[activity].is_unlocked = save_data.activities[activity].is_unlocked || false;
        });

        Object.keys(save_data.active_effects).forEach(function(effect) {
            active_effects[effect] = save_data.active_effects[effect];
        });

        update_character_stats();
        if(character.full_stats.max_health - save_data.character.hp_to_full > 0) {
            character.full_stats.health = character.full_stats.max_health - save_data.character.hp_to_full;
        } else {
            character.full_stats.health = 1;
        }
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
                current_activity.working_time = save_data.current_activity.working_time;
                current_activity.earnings = save_data.current_activity.earnings;
                document.getElementById("action_end_earnings").innerText = `(earnings: ${format_money(current_activity.earnings)})`;
                
            } else {
                console.error("Couldn't find saved activity! It might have been removed");
            }
        }

    } catch(error) {
        throw error; //let other loading methods (from_file and from_localstorage) take care of it
    }

} //core function for loading

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

function load_from_localstorage() {
    try{
        load(JSON.parse(localStorage.getItem("save data")));
    } catch(error) {
        console.error("Something went wrong on loading from localStorage!");
        console.error(error);
    }
} //called on loading the page, doesn't clear anything

function update_timer() {
    current_game_time.go_up();
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
            do_combat();
        } else { //everything other than combat
            if(is_resting) { //make a change so it only switches to true on clicking the resting action and is false on default
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

                        if(!enough_time_for_work(current_activity)) {
                            end_activity();
                        }
                    }
                }

                //if gathering: add drops to inventory
            } else {
                const divs = document.getElementsByClassName("activity_div");
                for(let i = 0; i < divs.length; i++) {
                    const activity = current_location.activities[divs[i].getAttribute("data-activity")];

                    if(activities[activity.activity].type === "JOB") {
                        if(enough_time_for_work(activity)) {
                            divs[i].classList.remove("activity_unavailable");
                            divs[i].classList.add("start_activity");
                        } else {
                            divs[i].classList.remove("start_activity");
                            divs[i].classList.add("activity_unavailable");
                        }
                        //TODO: instead make it grayed out and change cursor style
                        //and show a tooltip with hours when job is available
                        
                    }
                }
            }
        }

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
            else {
                update_displayed_effect_durations();
            }
        }

        save_counter += 1;
        if(save_counter >= save_period) {
            save_counter = 0;
            save_to_localStorage();
        } //save every X/60 minutes



        if(time_variance_accumulator <= 100 && time_variance_accumulator >= -100) {
            time_adjustment = time_variance_accumulator;
        }
        else {
            if(time_variance_accumulator > 100) {
                time_adjustment = 100;
            }
            else {
                if(time_variance_accumulator < -100) {
                    time_adjustment = -100;
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
    add_to_inventory("character", [{item: new Item(item_templates["Long stick"])}, 
                                   {item: new Item(item_templates["Raggy leather pants"])},
                                   {item: new Item(item_templates["Stale bread"]), count: 5}]);
    equip_item_from_inventory({name: "Long stick", id: 0});
    equip_item_from_inventory({name: "Raggy leather pants", id: 0});
    add_xp_to_character(0);
    character.money = 10;
    update_displayed_money();
    update_displayed_stats();
}
//checks if there's an existing save file, otherwise just sets up some initial equipment



update_displayed_equipment();
run();

export {tickrate};