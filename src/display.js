"use strict";

import { traders } from "./traders.js";
import { current_trader, to_buy, to_sell } from "./trade.js";
import { skills, get_unlocked_skill_rewards, get_next_skill_milestone } from "./skills.js";
import { character, get_skill_xp_gain, get_hero_xp_gain, get_skills_overall_xp_gain, get_total_skill_coefficient, get_total_skill_level, get_effect_with_bonuses, cold_status_temperatures, get_character_cold_tolerance, lowest_tolerable_temperature, get_skill_xp_gain_bonus, tool_slots } from "./character.js";
import { current_enemies, options, 
    can_work, current_location, 
    active_effects, enough_time_for_earnings, 
    get_current_book, last_location_with_bed, 
    last_combat_location, faved_stances, 
    selected_stance, 
    global_flags,
    unlocked_beds,
    favourite_consumables,
    travel_times, 
    language} from "./main.js";
import { dialogues } from "./dialogues.js";
import { activities } from "./activities.js";
import { format_time, current_game_time, seasons } from "./game_time.js";
import { book_stats, item_templates, Weapon, Armor, Shield, rarity_multipliers, getItemRarity, getItemFromKey } from "./items.js";
import { favourite_locations, get_location_type_penalty, location_types, locations } from "./locations.js";
import { enemy_killcount, enemy_templates } from "./enemies.js";
import { expo, format_reading_time, stat_names, get_hit_chance, round_item_price, format_working_time, task_type_names, celsius_to_fahrenheit, is_a_older_than_b } from "./misc.js"
//import { stances } from "./combat_stances.js";
import { get_recipe_xp_value, recipes } from "./crafting_recipes.js";
import { effect_templates } from "./active_effects.js";
import { player_storage } from "./storage.js";
import { quests } from "./quests.js";
import { get_current_temperature_smoothed, is_raining } from "./weather.js";
import { PointyStarParticle, RainParticle, SnowParticle } from "./particles.js";
import { get_game_version } from "./game_version.js";
import { process_conditions } from "./conditions.js";
import { translationManager } from "./translation.js";
let activity_anim; //for the activity and gameAction animation interval

let location_choice_divs = {}; //for dropdowns
const action_div = document.getElementById("location_actions_div");
const trade_div = document.getElementById("trade_div");
const storage_div = document.getElementById("storage_div");

const location_name_span = document.getElementById("location_name_span");
const location_icon_span = document.getElementById("location_icon_span");
const location_types_div = document.getElementById("location_types_div");
const location_tooltip = document.getElementById("location_name_tooltip");

//for visual effects
let canvas;
let context;
let background_animation;
let background_animation_timeout;
let background_animation_particles = [];

//inventory display
const inventory_div = document.getElementById("inventory_content_div");
let item_divs = {};
let trader_item_divs = {};
let storage_item_divs = {};
let item_buying_divs = {};
let item_selling_divs = {};
const trader_inventory_div = document.getElementById("trader_inventory_div");
const storage_inventory_div = document.getElementById("storage_inventory_div");

//message log
const message_log = document.getElementById("message_box_div");

//enemy info
const combat_div = document.getElementById("combat_div");
const enemies_div = document.getElementById("enemies_div");

const enemy_count_div = document.getElementById("enemy_count_div");


//enemy onhit animation
const onhitAnimation = [
    {
        "backgroundColor": "rgba(0, 0, 0, 0)",
        "rotate": "0deg",
    },
    {
        "backgroundColor": "rgba(255, 0, 0, 0.2)",
        "rotate": "0.3deg",
    }
]
const onhitAnimationTiming = {
    duration: 100,
	iterations: 2,
    direction: "alternate",
}

const onstartAnimation = [
    {
        "opacity": "0.2",
        "backgroundColor": "rgba(0, 124, 17, 0.2)",
    },
    {
        "opacity": "1",
    },
]
const onstartAnimationTiming = {
    duration: 800,
	iterations: 1,
}

const enemy_animations = {};

//character health display
const current_health_value_div = document.getElementById("character_health_value");
const current_health_bar = document.getElementById("character_healthbar_current");
const health_tooltip_div = document.getElementById("character_health_tooltip");

//character stamina display
const current_stamina_value_div = document.getElementById("character_stamina_value");
const current_stamina_bar = document.getElementById("character_stamina_bar_current");
const stamina_tooltip_div = document.getElementById("character_stamina_tooltip");

//character xp display
const character_xp_div = document.getElementById("character_xp_div");
const character_level_div = document.getElementById("character_level_div");
const xp_bar_tooltip_div = document.getElementById("character_xp_tooltip");

//active effects display
const active_effects_tooltip = document.getElementById("effects_tooltip");
const active_effect_count = document.getElementById("active_effect_count");

const time_field = document.getElementById("time_div");
const weather_field = document.getElementById("weather_div");

const skill_bar_divs = {};
const skill_list = document.getElementById("skill_list");
const skill_category_order = [];

const stance_bar_divs = {};
const stance_list = document.getElementById("stance_list");

const booklist_entry_divs = {};
const booklist_list = document.getElementById("books_list");

const bestiary_entry_divs = {};
const bestiary_list = document.getElementById("bestiary_list");

const combat_switch = document.getElementById("switch_to_combat")
const inventory_switch = document.getElementById("switch_to_inventory")

const quest_entry_divs = {};
const quest_list = document.getElementById("quest_list");

const data_entry_divs = {
                            reputation: document.getElementById("data_tab_reputation_div"),
                        };

let skill_sorting = "name";
let skill_sorting_direction = "asc";

let trader_inventory_sorting = "name";
let trader_inventory_sorting_direction = "asc";

let storage_sorting = "name";
let storage_sorting_direction = "asc";

let character_inventory_sorting = "name";
let character_inventory_sorting_direction = "asc";

const message_count = {
    message_combat: 0,
    message_unlocks: 0,
    message_loot: 0,
    message_events: 0,
    message_background: 0,
    message_crafting: 0,
};

const stats_divs = {strength: document.getElementById("strength_slot"), agility: document.getElementById("agility_slot"),
                    dexterity: document.getElementById("dexterity_slot"), intuition: document.getElementById("intuition_slot"),
                    magic: document.getElementById("magic_slot"), 
                    attack_speed: document.getElementById("attack_speed_slot"), attack_power: document.getElementById("attack_power_slot"), 
                    defense: document.getElementById("defense_slot"), crit_rate: document.getElementById("crit_rate_slot"), 
                    crit_multiplier: document.getElementById("crit_multiplier_slot")
                    };

const other_combat_divs = {attack_points: document.getElementById("hit_chance_slot"), defensive_action: document.getElementById("defensive_action_slot"),
                           defensive_points: document.getElementById("defensive_action_chance_slot")
                          };

let effect_divs = {};

const character_attack_bar = document.getElementById("character_attack_bar");

//equipment slots
const equipment_slots_divs = {head: document.getElementById("head_slot"), torso: document.getElementById("torso_slot"),
                              arms: document.getElementById("arms_slot"), ring: document.getElementById("ring_slot"),
                              weapon: document.getElementById("weapon_slot"), "off-hand": document.getElementById("off-hand_slot"),
                              legs: document.getElementById("legs_slot"), feet: document.getElementById("feet_slot"),
                              amulet: document.getElementById("amulet_slot"), artifact: document.getElementById("artifact_slot"),
                              cape: document.getElementById("cape_slot"),
                              pickaxe: document.getElementById("pickaxe_slot"),
                              axe: document.getElementById("axe_slot"),
                              sickle: document.getElementById("sickle_slot"),
                              shovel: document.getElementById("shovel_slot")
};

const rarity_colors = {
    trash: "lightgray",
    common: "white",
    uncommon: "lightgreen",
    rare: "blue",
    epic: "pink",
    legendary: "purple",
    mythical: "orange"
}

const crafting_pages = {}

let selected_crafting_category;
let selected_crafting_subcategory;

const loading_progress_div = document.getElementById("loading_screen_loading_progress");

const backup_load_button = document.getElementById("backup_load_button");
const other_save_load_button = document.getElementById("import_other_save_button");

const export_button_tooltip = document.getElementById("export_button_tooltip");

const default_dialogue_return_text = "Nevermind";

function capitalize_first_letter(some_string) {
    return some_string.charAt(0).toUpperCase() + some_string.slice(1);
}

function create_floating_effect(text, pos) {
    const effect_elem = document.createElement("div");
    pos.x = pos.x + Math.random()*80-40;

    effect_elem.style.top = pos.y + "px";
    effect_elem.style.left = pos.x + "px";
    effect_elem.classList.add("floating_effect");
    effect_elem.innerText = text;

    effect_elem.posX = pos.x;
    effect_elem.posY = pos.y;

    document.body.appendChild(effect_elem);
    
    let timer = 0;

    let anim_interval;
    if(Math.random() > 0.5) {
        anim_interval = setInterval(()=> {
            effect_elem.style.top = effect_elem.posY - 2*timer**0.95 + "px";
            effect_elem.style.left = effect_elem.posX - Math.sin(timer/10)*20 + "px";
            effect_elem.style.opacity = (100-timer**.95)/100;
            timer++;
        }, 30);
    } else {
        anim_interval = setInterval(()=> {
            effect_elem.style.top = effect_elem.posY - 2*timer**0.95 + "px";
            effect_elem.style.left = effect_elem.posX - Math.cos(timer/8)*16 + "px";
            effect_elem.style.opacity = (100-timer**.95)/100;
            timer++;
        }, 30);
    }

    setTimeout(()=>{
        clearInterval(anim_interval);
        effect_elem.remove();
    }, 4*1000);
}

function clear_skill_bars() {
    Object.keys(skill_bar_divs).forEach(function(key) {
        delete skill_bar_divs[key];
    });
}

function clear_action_div() {
    while(action_div.lastElementChild) {
        action_div.removeChild(action_div.lastElementChild);
        location_choice_divs = {};
    }
}

/**
 * @param {Item} item
 * @param {Object} options
 * @param {String} options.class_name
 * @param {Boolean} options.skip_quality
 * @param {Array} options.quality array with 1 or 2 values (1 - show only it, instead of item's; 2 - show start comparison between the two)
 */
function create_item_tooltip(item, options = {}, is_trade = false) {
    let item_tooltip = document.createElement("span");
    item_tooltip.classList.add(options?.class_name || "item_tooltip");
    item_tooltip.innerHTML = create_item_tooltip_content({item, options, is_trade});
    return item_tooltip;
}

/**
 * @param {Object} params
 * @param {Item} params.item
 * @param {Object} params.options
 * @param {String} params.options.class_name
 * @param {String} params.options.trader
 * @param {Boolean} params.options.skip_quality
 * @param {Array} params.options.quality array with 1 or 2 values (1 - show only it, instead of item's; 2 - show start comparison between the two)
 */
function create_item_tooltip_content({item, options={}, is_trade = false}) {
    let item_tooltip = "";

    //different function used depending if its in trade (oh the horror...)
    const value_function = is_trade?"getValue":"getBaseValue";
    
    item_tooltip = `<b>${item.getName()}</b>`;
    if(item.description) {
        item_tooltip += `<br>${item.description}`; 
    }

    let quality = item.quality;

    //add stats if can be equipped
    if(item.item_type === "EQUIPPABLE"){ 
        if(options?.quality && options.quality[0]) {
            quality = options.quality[0];
        }

        if(!item.ignore_quality) {
            if(!options.skip_quality && options?.quality?.length == 2) {
                item_tooltip += `<br><br><b>Quality: <span style="color: ${rarity_colors[item.getRarity(options.quality[0])]}"> ${options.quality[0]}% </span> - <span style="color: ${rarity_colors[item.getRarity(options.quality[1])]}"> ${options.quality[1]}% </span>`;
                item_tooltip += `<br>[<span style="color: ${rarity_colors[item.getRarity(options.quality[0])]}">${item.getRarity(options.quality[0])}</span>-<span style="color: ${rarity_colors[item.getRarity(options.quality[1])]}">${item.getRarity(options.quality[1])}</span>] </b>`;
            } else {
                item_tooltip += `<br><br><b style="color: ${rarity_colors[item.getRarity(quality)]}">Quality: ${quality}% [${item.getRarity(quality)}]</b>`;
            }
        }

        if(item.tags.unique) {
            item_tooltip += `<br><br><b class="item_unique">Unique</b>`
        }


        item_tooltip += `<br><br>Slot: <b>${item.equip_slot}</b>`;
        if(item.equip_slot === "weapon") {
            item_tooltip += `<br>Type: <b>${item.weapon_type}</b>`;
        }

        if(item.components) {
            let component_description = `<br><br><span class="item_component_list">`;
            const components = Object.keys(item.components);

            if(item.components) {
                component_description += `[${item_templates[item.components[components[0]]].name}]`;
                if(!item.components[components[1]]) {
                    component_description += `<br>+<br>no [${components[1]}]`;
                } else {
                    component_description += `<br>+<br>[${item_templates[item.components[components[1]]].name}]`;
                }
            }

            component_description += `</span>`;
            item_tooltip += component_description;
        }

        if(!options.skip_quality && options?.quality?.length == 2) {
            if(item.getAttack) {
                item_tooltip += 
                    `<br><br>Attack: ${Math.round(10*item.getAttack(options.quality[0]), true)/10} - ${Math.round(10*item.getAttack(options.quality[1], true))/10}`;
            } else if(item.getDefense) { 
                item_tooltip += 
                `<br><br>Defense: ${Math.round(10*item.getDefense(options.quality[0]))/10} - ${Math.round(10*item.getDefense(options.quality[1]))/10}`;
            } else if(item.offhand_type === "shield") {
                if(item.tags.ignore_skill) {
                    item_tooltip += 
                `<br><br>Can block up to: ${Math.round(10*item.getShieldStrength(options.quality[0]))/10} - ${Math.round(10*item.getShieldStrength(options.quality[1]))/10} damage [base: ${item.getShieldStrength(options.quality[0])}-${item.getShieldStrength(options.quality[1])}]`;
                } else {
                    item_tooltip += 
                `<br><br>Can block up to: ${Math.round(10*item.getShieldStrength(options.quality[0])*(character.stats.total_multiplier.block_strength))/10} - ${Math.round(10*item.getShieldStrength(options.quality[1])*(character.stats.total_multiplier.block_strength))/10} damage [base: ${item.getShieldStrength(options.quality[0])}-${item.getShieldStrength(options.quality[1])}]`;
                }
            }

            const equip_stats_0 = item.getStats(options.quality[0]);
            const equip_stats_1 = item.getStats(options.quality[1]);
            if(Object.keys(equip_stats_0).length > 0) {
                item_tooltip += `<br>`;
            }
            Object.keys(equip_stats_0).forEach(effect_key => {
                if(equip_stats_0[effect_key].flat != null) {
                    item_tooltip += 
                    `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: +${equip_stats_0[effect_key].flat} - ${equip_stats_1[effect_key].flat}`;
                }
                if(equip_stats_0[effect_key].multiplier != null) {
                    item_tooltip += 
                    `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: x${equip_stats_0[effect_key].multiplier} - ${equip_stats_1[effect_key].multiplier}`;
                }
            });
        } else {
            if(item.getAttack) {
                item_tooltip += 
                    `<br><br>Attack: ${Math.round(10*item.getAttack())/10}`;
            } else if(item.getDefense) { 
                item_tooltip += 
                `<br><br>Defense: ${Math.round(10*item.getDefense())/10}`;
            } else if(item.offhand_type === "shield") {
                if(item.tags.ignore_skill) {
                    item_tooltip += 
                `<br><br>Can block up to: ${Math.round(10*item.getShieldStrength())/10} damage [unaffected by skill]`;
                } else {
                    item_tooltip += 
                `<br><br>Can block up to: ${Math.round(10*item.getShieldStrength()*(character.stats.total_multiplier.block_strength))/10} damage [base: ${item.getShieldStrength()}]`;
                }
            }

            const equip_stats = item.getStats();
            if(Object.keys(equip_stats).length > 0) {
                item_tooltip += `<br>`;
            }
            Object.keys(equip_stats).forEach(function(effect_key) {

                if(equip_stats[effect_key].flat != null) {
                    item_tooltip += 
                    `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: +${equip_stats[effect_key].flat}`;
                }
                if(equip_stats[effect_key].multiplier != null) {
                    item_tooltip += 
                    `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: x${equip_stats[effect_key].multiplier}`;
                }
            });
        }
        const equip_bonus_skill_levels = item.getBonusSkillLevels();
        if(Object.keys(equip_bonus_skill_levels).length > 0) {
            item_tooltip += `<br>`;
        }
        Object.keys(equip_bonus_skill_levels).forEach(skill_key => {
            if(skill_key.includes("category_")) {
                item_tooltip +=  `<br>${skill_key} skills level: +${equip_bonus_skill_levels[skill_key]}`;
            } else {
                item_tooltip +=  `<br>${skills[skill_key].name()} level: +${equip_bonus_skill_levels[skill_key]}`;
            }
        });

        item_tooltip += "<br>";
    } else if (item.item_type === "USABLE") {
        item_tooltip += `<br>`;

        if(item.effects.length > 0) {
            item_tooltip += "<br>Effects: "
        }
        for(let i = 0; i < item.effects.length; i++) {
            item_tooltip += create_effect_tooltip({effect_name: item.effects[i].effect, duration: item.effects[i].duration, add_bonus: true}).outerHTML;
        }
    } else if(item.item_type === "BOOK") {
        if(!book_stats[item.name].is_finished) {
            item_tooltip += `<br><br>Time to read: ${item.getRemainingTime()} minutes`;
        }
        else {
            item_tooltip += `<br><br>Reading it provided ${character.name} with:`;
            if(Object.keys(book_stats[item.name].bonuses).length > 0) {
                item_tooltip += `<br>- ${format_book_bonuses(book_stats[item.name].bonuses)}`;
            }
            if(book_stats[item.name].rewards?.skills) {
                if(book_stats[item.name].rewards.skills.length == 1) {
                    item_tooltip += `<br>- a new skill`;
                } else {
                    item_tooltip += `<br>- new skills`;
                }
            }
            if(book_stats[item.name].rewards?.recipes) {
                if(book_stats[item.name].rewards.recipes.length == 1) {
                    item_tooltip += `<br>- a new recipe`;
                } else {
                    item_tooltip += `<br>- new recipes`;
                }
            }
        }
        item_tooltip += "<br>";
    } else if(item.tags.component) {
        if(options?.quality && options.quality[0]) {
            quality = options.quality[0];
        }

        if(!options.skip_quality && options?.quality?.length == 2) {
            item_tooltip += `<br><br><b>Quality: <span style="color: ${rarity_colors[item.getRarity(options.quality[0])]}"> ${options.quality[0]}% </span> - <span style="color: ${rarity_colors[item.getRarity(options.quality[1])]}"> ${options.quality[1]}% </span>`;
            item_tooltip += `<br>[<span style="color: ${rarity_colors[item.getRarity(options.quality[0])]}"> ${item.getRarity(options.quality[0])}</span> - <span style="color: ${rarity_colors[item.getRarity(options.quality[1])]}"> ${item.getRarity(options.quality[1])}</span>]</b>`;
        } else {
            item_tooltip += `<br><br><b style="color: ${rarity_colors[item.getRarity(quality)]}">Quality: ${quality}% [${item.getRarity(quality)}]</b>`;
        }
        if(item.component_tier) {
            item_tooltip += `<br><br>Component tier: ${item.component_tier}`;
        }
        if(Object.keys(item.component_stats).length > 0 || item?.attack_value !== 0 || item?.attack_multiplier !== 1 || item?.defense_value !== 0) {
            item_tooltip += `<br><br>Basic stats: `;
        }
        if(item?.attack_value) {
            item_tooltip += `<br>Attack power: +${item.attack_value}`;
        }
        if(item?.attack_multiplier && item.attack_multiplier !== 1) {
            item_tooltip += `<br>Size-specific attack power: x${item.attack_multiplier}`;
        }
        if(item?.defense_value) {
            item_tooltip += `<br>Defense: +${item.defense_value}`;
        }

        Object.keys(item.component_stats).forEach(function(effect_key) {
            if(item.component_stats[effect_key].flat != null) {
                item_tooltip += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: +${item.component_stats[effect_key].flat}`;
            }
            if(item.component_stats[effect_key].multiplier != null) {
                item_tooltip += 
                `<br>${capitalize_first_letter(effect_key).replace("_"," ")}: x${item.component_stats[effect_key].multiplier}`;
            }
        });
        item_tooltip += "<br>";
    } else {
        item_tooltip += "<br>";
    }
    if(item.material_type) {
        item_tooltip += `<br>Material type: ${item.material_type}<br>`;
    }

    if(!options.skip_quality && options?.quality?.length == 2) { 
        //ignore quality, instead use quality passed as param
        item_tooltip += `<br>Value: ${format_money(
            round_item_price(
                item[value_function]({quality:options.quality[0], region:current_location?.market_region})))} - ${format_money(round_item_price(item.getBaseValue({quality:options.quality[1]})
            ))}`;
    } else {
        item_tooltip += `<br>Value: ${format_money(round_item_price(item[value_function]({quality, region:current_location?.market_region, multiplier: ((options && options.trader) ? traders[current_trader].getProfitMargin() : 1)})))}`;
        if(item.saturates_market) {
            item_tooltip += ` [originally ${format_money(round_item_price(item.getBaseValue({quality, region:current_location?.market_region}) * ((options && options.trader) ? traders[current_trader].getProfitMargin() : 1) || 1))}]`
        }
    }

    return item_tooltip;
}

/** 
 * @param {Object} item_effect from item effects[]
 */
function create_effect_tooltip({effect_name, duration, add_bonus=false}) {
    const effect = effect_templates[effect_name];
    const tooltip = document.createElement("div");

    tooltip.classList.add("active_effect_tooltip");

    const name_span = document.createElement("span");
    name_span.classList.add("active_effect_name"); 
    name_span.innerHTML = `'${effect.name}' : `;
    const duration_span = document.createElement("span");
    duration_span.classList.add("active_effect_duration");
    duration_span.innerHTML = ""+ format_time({time: {minutes: duration}});
    const top_div = document.createElement("div");
    top_div.classList.add("active_effect_name_and_duration");
    top_div.appendChild(name_span);
    top_div.appendChild(duration_span);
    tooltip.appendChild(top_div);

    const effects_div = document.createElement("div");

    let effects;
    if(add_bonus) {
        effects = get_effect_with_bonuses(effect);
    } else {
        effects = effect.effects;
    }

    for(const [key, stat_value] of Object.entries(effects.stats)) {
        tooltip.innerHTML += `<br>${capitalize_first_letter(stat_names[key])}`;
        
        let flat = false;
        if(stat_value.flat) {
            const sign = stat_value.flat > 0? "+":"";
            tooltip.innerHTML += `: ${sign}${Math.round(100*stat_value.flat)/100}`;
            flat = true;

            
        }
        if(stat_value.multiplier) {
            if(flat) {
                tooltip.innerHTML += `, x${Math.round(100*stat_value.multiplier)/100}`;
            } else {
                tooltip.innerHTML += `: x${Math.round(100*stat_value.multiplier)/100}`;
            }
        }
    }

    
    const xp_multipliers = Object.keys(effects.xp_multipliers);
    if(xp_multipliers.length > 0) {
        let name;
        if(xp_multipliers[0] !== "all" && xp_multipliers[0] !== "hero" && xp_multipliers[0] !== "all_skill") {
            name = skills[xp_multipliers[0]].name();
        } else {
            name = xp_multipliers[0].replace("_"," ");
        }
        name = capitalize_first_letter(name);
        if(tooltip.innerHTML) {
            tooltip.innerHTML += `<br>${name} xp gain: x${effects.xp_multipliers[xp_multipliers[0]]}`;
        } else {
            tooltip.innerHTML = `${name} xp gain: x${effects.xp_multipliers[xp_multipliers[0]]}`;
        }
        for(let i = 1; i < xp_multipliers.length; i++) {
            let name;
            if(xp_multipliers[i] !== "all" && xp_multipliers[i] !== "hero" && xp_multipliers[i] !== "all_skill") {
                name = skills[xp_multipliers[i]].name();
            } else {
                name = xp_multipliers[i].replace("_"," ");
            }
            tooltip.innerHTML += `<br>${name} xp gain: x${effects.xp_multipliers[xp_multipliers[i]]}`;
        }
    }

    tooltip.appendChild(effects_div);
    return tooltip;
}

function end_activity_animation(remove) {
    clearInterval(activity_anim);
    const div = document.getElementById("action_status_div");
    if(remove && div) {
        div.innerHTML = "";
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

    let message = document.createElement("div");
    message.classList.add("message_common");

    let class_to_add = "message_default";
    let group_to_add = "message_events";

    //selects proper class to add based on argument
    switch(message_type) {
        case "enemy_defeated":
            class_to_add = "message_victory";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_defeat":
            class_to_add = "message_hero_defeated";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "enemy_attacked":
            class_to_add = "message_enemy_attacked";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "enemy_attacked_critically":
            class_to_add = "message_enemy_attacked_critically";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_attacked":
            class_to_add = "message_hero_attacked";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_missed":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;
        case "hero_blocked":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;    
        case "enemy_missed":
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;    
        case "hero_attacked_critically":
            class_to_add = "message_hero_attacked_critically";
            group_to_add = "message_combat";
            message_count.message_combat += 1;
            break;

        case "combat_loot":
            class_to_add = "message_items_obtained";
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;
        case "gathered_loot":
            class_to_add = "message_items_obtained";
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;
        case "total_gathered_loot":
            class_to_add = "message_total_items_obtained";
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;
        case "location_reward":
            group_to_add = "message_loot";
            message_count.message_loot += 1;
            break;

        case "skill_raised":
            class_to_add = "message_skill_leveled_up";
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "level_up":
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "activity_unlocked": 
            //currently uses default style class
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "location_unlocked":
            class_to_add = "message_location_unlocked";
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;
        case "dialogue_unlocked":
            group_to_add = "message_unlocks";
            message_count.message_unlocks += 1;
            break;

        case "message_travel":
            class_to_add = "message_travel";
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "export_reward":
            class_to_add = "message_export_reward";
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "activity_finished":
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "activity_money":
            group_to_add = "message_events";
            message_count.message_events += 1;
            break;
        case "notification":
            message_count.message_events += 1;
            group_to_add = "message_events";
            class_to_add = "message_notification";
            break;
        case "background":
            message_count.message_background +=1;
            group_to_add = "message_background";
            break;
        case "crafting":
            message_count.message_crafting +=1;
            group_to_add = "message_crafting";
            break;
        case "message_critical":
            message_count.message_events += 1;
            group_to_add = "message_events";
            class_to_add = "message_critical";
            break;
    }

    if(group_to_add === "message_combat" && message_count.message_combat > 80
    || group_to_add === "message_loot" && message_count.message_loot > 28
    || group_to_add === "message_unlocks" && message_count.message_unlocks > 40
    || group_to_add === "message_events" && message_count.message_events > 40
    || group_to_add === "message_background" && message_count.message_background > 28
    || group_to_add === "message_crafting" && message_count.message_crafting > 28
    ) {
        // find first child with specified group
        // delete it
        message_log.removeChild(message_log.getElementsByClassName(group_to_add)[0]);
    }

    message.classList.add(class_to_add, group_to_add);

    message.innerHTML = message_to_add + "<div class='message_border'> </>";

    message_log.appendChild(message);


    const button_id = group_to_add.replace("_","_show_"); //not the best way but likelihood of the ids being changed is quite low
    if(document.getElementById(button_id).classList.contains("active_selection_button")) {
        //scroll the message log but only if added message is in a not hidden category
        message_log.scrollTop = message_log.scrollHeight;
    }
}

function format_book_bonuses(bonuses) {
    let formatted = '';
    if(bonuses.stats) {
        const stats = Object.keys(bonuses.stats);
        
        formatted = `+${bonuses.stats[stats[0]]} ${stat_names[stats[0]]}`;
        for(let i = 1; i < stats.length; i++) {
            formatted += `, +${bonuses.stats[stats[i]]} ${stat_names[stats[i]]}`;
        }
    }

    if(bonuses.multipliers) {
        const multipliers = Object.keys(bonuses.multipliers);
        if(formatted) {
            formatted += `, x${bonuses.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        } else {
            formatted = `x${bonuses.multipliers[multipliers[0]]} ${stat_names[multipliers[0]]}`;
        }

        for(let i = 1; i < multipliers.length; i++) {
            formatted += `, x${bonuses.multipliers[multipliers[i]]} ${stat_names[multipliers[i]]}`;
        }
    }
    if(bonuses.xp_multipliers) {
        const xp_multipliers = Object.keys(bonuses.xp_multipliers);
        let name;
        if(xp_multipliers[0] !== "all" && xp_multipliers[0] !== "hero" && xp_multipliers[0] !== "all_skill") {
            name = skills[xp_multipliers[0]].name();
        } else {
            name = xp_multipliers[0].replace("_"," ");
        }

        if(formatted) {
            formatted += `, x${bonuses.xp_multipliers[xp_multipliers[0]]} ${name} xp gain`;
        } else {
            formatted = `x${bonuses.xp_multipliers[xp_multipliers[0]]} ${name} xp gain`;
        }
        for(let i = 1; i < xp_multipliers.length; i++) {
            let name;
            if(xp_multipliers[i] !== "all" && xp_multipliers[i] !== "hero" && xp_multipliers[i] !== "all_skill") {
                name = skills[xp_multipliers[i]].name();
            } else {
                name = xp_multipliers[i].replace("_"," ");
            }
            formatted += `, x${bonuses.xp_multipliers[xp_multipliers[i]]} ${name} xp gain`;
        }
    }

    return formatted;
}

function clear_message_log() {
    while(message_log.firstChild) {
        message_log.removeChild(message_log.lastChild);
    }
}

/**
 * @param {Array} loot_list [{item, count},...] 
 */
function log_loot({loot_list, is_combat=false, is_a_summary=false}) {
    
    if(loot_list.length == 0) {
        return;
    }

    let item;
    if(loot_list[0].item_id) {
        item = item_templates[loot_list[0].item_id];
    } else if(loot_list[0].item_key) {
        item = getItemFromKey(loot_list[0].item_key);
    }

    let message;
    let message_type;
    if(is_combat) {
        message_type = "combat_loot";
        message = 'Looted "';
    } else if(is_a_summary) {
        message_type = "total_gathered_loot";
        message = 'Gained in total: "';
    } else {
        message_type = "gathered_loot";
        message = 'Gained "';
    }

    message += item.getName() + `" x` + loot_list[0]["count"];

    if(loot_list.length > 1) {
        for(let i = 1; i < loot_list.length; i++) {
            if(loot_list[i].item_id) {
                item = item_templates[loot_list[i].item_id];
            } else if(loot_list[i].item_key) {
                item = getItemFromKey(loot_list[i].item_key);
            }
            message += (`, "` + item.getName() + `" x` + loot_list[i]["count"]);
        }
    }

    log_message(message, message_type);
}

/**
 * Originally created for activities, despite the name, but is now used for actions as well.
 * @param {Object} settings 
 */
function start_activity_animation(settings) {
    end_activity_animation();
    activity_anim = setInterval(() => { //sets a tiny little "animation" for activity text
        const action_status_div = document.getElementById("action_status_div");
        let end = "";
        if(action_status_div.innerHTML.endsWith("...")) {
            end = "...";
        } else if(action_status_div.innerHTML.endsWith("..")) {
            end = "..";
        } else if(action_status_div.innerHTML.endsWith("."))
            end = ".";

        if(settings?.book_title) {
            action_status_div.innerHTML = action_status_div.innerHTML.split(",")[0] + `, ${format_reading_time(item_templates[settings.book_title].getRemainingTime())} left`;
            action_status_div.innerHTML += end;
        }

        if(end.length < 3){
            action_status_div.innerHTML += ".";
        } else {
            action_status_div.innerHTML = action_status_div.innerHTML.substring(0, action_status_div.innerHTML.length - 3);
        }
     }, 600);
}

function update_displayed_trader() {
    action_div.style.display = "none";
    trade_div.style.display = "inherit";
    document.getElementById("trader_cost_mult_value").textContent = `${Math.round(100 * (traders[current_trader].getProfitMargin()))}%`
    update_displayed_trader_inventory();
}

function update_displayed_storage() {
    action_div.style.display = "none";
    storage_div.style.display = "inherit";
    update_displayed_storage_inventory();
}

function update_displayed_money() {
    document.getElementById("money_div").innerHTML = `Your purse contains: ${format_money(character.money)}`;
}

function update_displayed_total_price(total_price) {
    document.getElementById("trade_price_value").innerHTML = format_money(total_price);
}

/**
 * 
 * @returns {HTMLElement}
 */
function create_trade_buttons() {

    const trade_buttons = document.createElement("div");
    trade_buttons.classList.add("trade_ammount_buttons");

    const trade_button_5 = document.createElement("div");
    trade_button_5.classList.add("trade_ammount_button");
    trade_button_5.innerText = "5";
    trade_button_5.setAttribute("data-trade_ammount", 5);
    trade_buttons.appendChild(trade_button_5);

    const trade_button_10 = document.createElement("div");
    trade_button_10.classList.add("trade_ammount_button");
    trade_button_10.innerText = "10";
    trade_button_10.setAttribute("data-trade_ammount", 10);
    trade_buttons.appendChild(trade_button_10);

    const trade_button_max = document.createElement("div");
    trade_button_max.classList.add("trade_ammount_button");
    trade_button_max.innerText = "all";
    trade_button_max.setAttribute("data-trade_ammount", Infinity);
    trade_buttons.appendChild(trade_button_max);
    
    return trade_buttons;
}

function sort_displayed_inventory({sort_by = "name", target = "character", change_direction = false}) {
    let plus;
    let minus;
    if(target === "trader") {
        if(change_direction){
            if(sort_by && sort_by === trader_inventory_sorting) {
                if(trader_inventory_sorting_direction === "asc") {
                    trader_inventory_sorting_direction = "desc";
                } else {
                    trader_inventory_sorting_direction = "asc";
                }
            } else {
                if(sort_by === "price") {
                    trader_inventory_sorting_direction = "desc";
                } else {
                    trader_inventory_sorting_direction = "asc";
                }
            }
        }

        target = trader_inventory_div;
        plus = trader_inventory_sorting_direction==="asc"?1:-1;
        minus = trader_inventory_sorting_direction==="asc"?-1:1;
        trader_inventory_sorting = sort_by || "name";

    } else if(target === "character") {
        if(change_direction){
            if(sort_by && sort_by === character_inventory_sorting) {
                if(character_inventory_sorting_direction === "asc") {
                    character_inventory_sorting_direction = "desc";
                } else {
                    character_inventory_sorting_direction = "asc";
                }
            } else {
                if(sort_by === "price") {
                    character_inventory_sorting_direction = "desc";
                } else {
                    character_inventory_sorting_direction = "asc";
                }
            }
        }

        target = inventory_div;
        plus = character_inventory_sorting_direction==="asc"?1:-1;
        minus = character_inventory_sorting_direction==="asc"?-1:1;
        character_inventory_sorting = sort_by || "name";
    } else if(target === "storage"){
        if(change_direction){
            if(sort_by && sort_by === storage_sorting) {
                if(storage_sorting_direction === "asc") {
                    storage_sorting_direction = "desc";
                } else {
                    storage_sorting_direction = "asc";
                }
            } else {
                if(sort_by === "price") {
                    storage_sorting_direction = "desc";
                } else {
                    storage_sorting_direction = "asc";
                }
            }
        }

        target = storage_inventory_div;
        plus = storage_sorting_direction==="asc"?1:-1;
        minus = storage_sorting_direction==="asc"?-1:1;
        storage_sorting = sort_by || "name";
    } else {
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

        //traded items on bottom
        if(a.classList.contains("item_to_trade") && !b.classList.contains("item_to_trade")) {
            return 1;
        } else if(!a.classList.contains("item_to_trade") && b.classList.contains("item_to_trade")) {
            return -1;
        }

        //equippables below non-equippables
        if(a.classList.contains("character_item_equippable") && !b.classList.contains("character_item_equippable")) {
            return 1;
        } else if(!a.classList.contains("character_item_equippable") && b.classList.contains("character_item_equippable")){
            return -1;
        } 
        if(a.classList.contains("trader_item_equippable") && !b.classList.contains("trader_item_equippable")) {
            return 1;
        } else if(!a.classList.contains("trader_item_equippable") && b.classList.contains("trader_item_equippable")){
            return -1;
        } 
        if(a.classList.contains("storage_item_equippable") && !b.classList.contains("storage_item_equippable")) {
            return 1;
        } else if(!a.classList.contains("storage_item_equippable") && b.classList.contains("storage_item_equippable")){
            return -1;
        } 

        //components below non-components
        if(a.children[0].children[0].children[0].innerText === "[Comp]" && b.children[0].children[0].children[0].innerText !== "[Comp]") {
            return 1;
        } else if(a.children[0].children[0].children[0].innerText !== "[Comp]" && b.children[0].children[0].children[0].innerText === "[Comp]") {
            return -1;
        }

        //books below non-books
        if(a.children[0].children[0].children[0].innerText === "[Book]" && b.children[0].children[0].children[0].innerText !== "[Book]") {
            return 1;
        } else if(a.children[0].children[0].children[0].innerText !== "[Book]" && b.children[0].children[0].children[0].innerText === "[Book]") {
            return -1;
        }


        const slot_a = a.dataset.item_slot;
        const slot_b = b.dataset.item_slot;
        /*
        //tools above non-tools
        if(!tool_slots.includes(slot_a) && tool_slots.includes(slot_b)) {
            return 1;
        } else if(tool_slots.includes(slot_a) && !tool_slots.includes(slot_b)){
            return -1;
        }
        */
        
        //other items by properties, name or otherwise by value
        if (sort_by === "type") {
            //slot
            
            if(slot_a != slot_b) { 
                return Object.keys(equipment_slots_divs).indexOf(a.dataset.item_slot) - Object.keys(equipment_slots_divs).indexOf(b.dataset.item_slot);
            }

            //usable
            if (a.classList.contains("character_item_usable") != b.classList.contains("character_item_usable")) {
                return b.classList.contains("character_item_usable") - a.classList.contains("character_item_usable");
            }
            if (a.classList.contains("trader_item_usable") != b.classList.contains("trader_item_usable")) {
                return b.classList.contains("trader_item_usable") - a.classList.contains("trader_item_usable");
            }
            if (a.classList.contains("storage_item_usable") != b.classList.contains("storage_item_usable")) {
                return b.classList.contains("storage_item_usable") - a.classList.contains("storage_item_usable");
            }

            let item_template_a = null;
            let item_template_b = null;

            if (target === inventory_div) {
                item_template_a = item_templates[JSON.parse(a.dataset.character_item).id];
                item_template_b = item_templates[JSON.parse(b.dataset.character_item).id];
            }
            else if (target === trader_inventory_div) {
                item_template_a = item_templates[JSON.parse(a.dataset.trader_item).id];
                item_template_b = item_templates[JSON.parse(b.dataset.trader_item).id];
            }
            else if (target === storage_inventory_div) {
                item_template_a = item_templates[JSON.parse(a.dataset.storage_item).id];
                item_template_b = item_templates[JSON.parse(b.dataset.storage_item).id];
            }

            if (item_template_a && item_template_b) {
                if (item_template_a.material_type != item_template_b.material_type) { 
                    return item_template_a.material_type > item_template_b.material_type ? plus : minus;
                }
                if (item_template_a.component_type != item_template_b.component_type) { 
                    return item_template_a.component_type > item_template_b.component_types ? plus : minus;
                }
                if (item_template_a.component_tier != item_template_b.component_tier) { 
                    return item_template_a.component_tier > item_template_b.component_tier ? plus : minus;
                }
            }

            //...otherwise, fall back to sorting by name
        }

        if (sort_by === "name" || sort_by === "type") {

            const name_a = a.children[0].children[0].children[1].innerText.toLowerCase().replaceAll('"',"");
            const name_b = b.children[0].children[0].children[1].innerText.toLowerCase().replaceAll('"',"");
            if(name_a > name_b) {
                return plus;
            } else if(name_a < name_b) {
                return minus;
            } else {
                //if same name, sort based on quality 
                //works similar to sorting by value but is more precise
                //(shouldn't be possible to reach this for quality-less items)
                let value_a = Number.parseInt(a.dataset.item_quality);
                let value_b = Number.parseInt(b.dataset.item_quality);
                
                if(value_a > value_b) {
                    return plus;
                } else {
                    return minus;
                }
            }

        } else if(sort_by === "price") {
            
            let value_a = Number.parseInt(a.getAttribute(`data-item_value`));
            let value_b = Number.parseInt(b.getAttribute(`data-item_value`));
      
            if(value_a > value_b) {
                return plus;
            } else {
                if(value_a === value_b && "item_quality" in a.dataset && "item_quality" in b.dataset) {
                    if(Number.parseInt(a.dataset.item_quality) > Number.parseInt( b.dataset.item_quality)) {
                        return plus;
                    } else {
                        return minus;
                    }
                }
                return minus;
            }
        }

    }).forEach(node => target.appendChild(node));
}

function update_displayed_trader_inventory({item_key, trader_sorting="name", sorting_direction="asc", was_anything_new_added=false} = {}) {
    const trader = traders[current_trader];

    //removal of unneeded divs
    if(!item_key){
        Object.keys(trader_item_divs).forEach(div_key => {
            if(!trader.inventory[div_key]) {
                trader_item_divs[div_key].remove();
                delete trader_item_divs[div_key];
            }
        });
        Object.keys(item_selling_divs).forEach(div_key => {
            if(to_sell.items.filter(x => x.item_key === div_key).length === 0){
                //not in trade list - remove
                item_selling_divs[div_key].remove();
                delete item_selling_divs[div_key];
            }
        });
    }

    //creation of missing divs and updating of others

    if(item_key) {
        //key passed -> deal only with this singular item
        const item_count = trader.inventory[item_key].count;

        was_anything_new_added = trader_item_divs[item_key];
        const item_div = create_inventory_item_div({key: item_key, item_count, target: "trader", is_trade: true});

        if(trader_item_divs[item_key]) {
            trader_item_divs[item_key].replaceWith(item_div);
            trader_item_divs[item_key] = item_div;
        } else {
            trader_item_divs[item_key] = item_div;
            trader_inventory_div.appendChild(item_div);
        }
    } else {
        //no key passed - go through all items

        //go through inventory items
        Object.keys(trader.inventory).forEach(inventory_key => {
            let item_count = trader.inventory[inventory_key].count;

            //find if item is in to_sell, if so then grab the count and subtract it
            for(let i = 0; i < to_buy.items.length; i++) {
                if(inventory_key === to_buy.items[i].item_key) {
                    item_count -= Number(to_buy.items[i].count);

                    if(item_count == 0) {
                        trader_item_divs[inventory_key]?.remove();
                        delete trader_item_divs[inventory_key];
                        return;
                    }
                    if(item_count < 0) {
                        //shouldn't be possible to reach but who knows
                        throw new Error('Something is wrong with trader item count');
                    }
                    break;
                }
            }

            if(!trader_item_divs[inventory_key]) {
                //item is not present in display, create a new one
                trader_item_divs[inventory_key] = create_inventory_item_div({key: inventory_key, item_count, target: "trader", is_trade: true});
                trader_inventory_div.appendChild(trader_item_divs[inventory_key]);
                was_anything_new_added = true;
            } else {
                //item is present
                
                //grab the displayed count
                let div_count = Number.parseInt(trader_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText.replace("x",""));
                if(Number.isNaN(div_count)) {
                    div_count = 0;
                }
                //compare displayed count with actual count, update display to proper value if they differ
                if(div_count != item_count) {
                    if(item_count > 1) {
                        trader_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ` x${item_count}`;
                    } else {
                        trader_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ``;
                    }
                }

                //overwrite tooltip (for displayed prices)
                const tooltip_div = trader_item_divs[inventory_key].querySelector(".item_tooltip");
                tooltip_div.replaceWith(create_item_tooltip(trader.inventory[inventory_key].item, {trader: true}, true));

                const price_span = trader_item_divs[inventory_key].getElementsByClassName("item_value")[0];
                price_span.innerHTML =  `${format_money(round_item_price(trader.inventory[inventory_key].item.getValue({region: current_location.market_region, multiplier: (traders[current_trader].getProfitMargin() || 1)})), true)}`;
            }
        });

        //go through to_sell items
        for(let i = 0; i < to_sell.items.length; i++) {
            const key = to_sell.items[i].item_key;
            if(!item_selling_divs[key]) {
                //item not present - add to display
                item_selling_divs[key] = create_inventory_item_div({target: "trader", trade_index: i, is_trade: true});
                trader_inventory_div.appendChild(item_selling_divs[key]);
            } else {
                //verify and update count
                
                let div_count = trader_item_divs[key]?.dataset.item_count ?? 0;

                let item_count = to_sell.items[i].count;
                if(div_count !== item_count) {
                    if(item_count > 1) {
                        item_selling_divs[key].getElementsByClassName("item_count")[0].innerText = ` x${item_count}`;
                    } else {
                        item_selling_divs[key].getElementsByClassName("item_count")[0].innerText = ``;
                    }
                }
            }
        }
    }
    
    if(was_anything_new_added) {
        sort_displayed_inventory({target: "trader", sort_by: trader_sorting, direction: sorting_direction});
    }
}

/**
 * updates displayed inventory of the character (only inventory, worn equipment is managed by separate method)
 * 
 * if item_key/equip_slot is passed, it will instead only update the display of that one item
 * 
 */
function update_displayed_character_inventory({item_key, equip_slot, character_sorting="name", sorting_direction="asc", was_anything_new_added=false, is_trade=false, skip_sorting=false} = {}) {    
    //removal of unneeded divs
    if(!item_key){
        Object.keys(item_divs).forEach(div_key => {
            if(item_divs[div_key].classList.contains("equipped_item_control")) {
                //since equipment is keyed with slots and not item_keys, there might be something different under it, so needs additional check
                //div_key is the slot
                const item_key = item_divs[div_key].dataset.character_item;
                if(!character.equipment[div_key] || item_key !== character.equipment[div_key].getInventoryKey()) {
                    //character has nothing in this slot - remove
                    //character has something else in this slot - remove, will be recreated later
                    item_divs[div_key].remove();
                    delete item_divs[div_key];
                }
            } else {
                if(!character.inventory[div_key]) {
                    item_divs[div_key].remove();
                    delete item_divs[div_key];
                }
            }
        });

        Object.keys(item_buying_divs).forEach(div_key => {
            if(to_buy.items.filter(x => x.item_key === div_key).length === 0){
                //not in trade list - remove
                item_buying_divs[div_key].remove();
                delete item_buying_divs[div_key];
            }
        });
    }

    //creation of missing divs and updating of others
    if(item_key) {
        //specific item to be updated
        const item_count = character.inventory[item_key].count;

        was_anything_new_added = trader_item_divs[item_key];
        const item_div = create_inventory_item_div({key: item_key, item_count, target: "character", is_trade: true});

        if(item_divs[item_key]) {
            item_divs[item_key].replaceWith(item_div);
            item_divs[item_key] = item_div;
        } else {
            item_divs[item_key] = item_div;
            inventory_div.appendChild(item_div);
        }
    } else if(equip_slot){
        //equipped item
        item_divs[equip_slot] = create_inventory_item_div({key: equip_slot, target: "character", is_equipped: true, is_trade});
    } else {
        //inventory items
        Object.keys(character.inventory).forEach(inventory_key => {
            let item_count = character.inventory[inventory_key].count;

            //find if item is in to_sell, if so then grab the count and subtract it
            for(let i = 0; i < to_sell.items.length; i++) {
                if(inventory_key === to_sell.items[i].item_key) {
                    item_count -= Number(to_sell.items[i].count);

                    if(item_count == 0) {
                        item_divs[inventory_key]?.remove();
                        delete item_divs[inventory_key];
                        return;
                    }
                    if(item_count < 0) {
                        //shouldn't be possible to reach but who knows
                        throw new Error('Something is wrong with character item count');
                    }
                    break;
                }
            }

            if(!item_divs[inventory_key]) {
                //not in display, add it
                item_divs[inventory_key] = create_inventory_item_div({key: inventory_key, item_count, target: "character", is_trade});
                inventory_div.appendChild(item_divs[inventory_key]);
                was_anything_new_added = true;
            } else {
                //in display, just update it
                let div_count = Number.parseInt(item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText.replace("x",""));
                if(Number.isNaN(div_count)) {
                    div_count = 0;
                }
                if(div_count != item_count) {
                    if(item_count > 1) {
                        item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ` x${item_count}`;
                    } else {
                        item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ``;
                    }
                }

                //overwrite tooltip (for displayed prices)
                const tooltip_div = item_divs[inventory_key].querySelector(".item_tooltip");
                tooltip_div.replaceWith(create_item_tooltip(character.inventory[inventory_key].item, {}, is_trade));

                //grab and update price div, do it for all as trading can affect prices of multiple items
                const price_span = item_divs[inventory_key].getElementsByClassName("item_value")[0];
                if(is_trade) {
                    price_span.innerHTML =  `${format_money(round_item_price(character.inventory[inventory_key].item.getValue({region: current_location.market_region})), true)}`;
                } else {
                    price_span.innerHTML =  `${format_money(round_item_price(character.inventory[inventory_key].item.getBaseValue()), true)}`;
                }
           
            }
        });

        Object.keys(character.equipment).forEach(eq_slot => {
            if(!item_divs[eq_slot]) {
                if(character.equipment[eq_slot]) {
                    if(character.equipment[eq_slot]?.tags.tool) {
                        //don't display the equipped tools
                        return;
                    }
    
                    item_divs[eq_slot] = create_inventory_item_div({key: eq_slot, target: "character", is_equipped: true,is_trade});
                    inventory_div.appendChild(item_divs[eq_slot]);
                    was_anything_new_added = true;
                }
            }
        });

        for(let i = 0; i < to_buy.items.length; i++) {
            const key = to_buy.items[i].item_key;
            if(!item_buying_divs[key]) {
                item_buying_divs[key] = create_inventory_item_div({target: "character", trade_index: i,is_trade});
                inventory_div.appendChild(item_buying_divs[key]);
            } else {
                //verify and update count
                
                let div_count = item_divs[key]?.dataset.item_count ?? 0;

                let item_count = to_buy.items[i].count;
                if(div_count !== item_count) {
                    if(item_count > 1) {
                        item_buying_divs[key].getElementsByClassName("item_count")[0].innerText = ` x${item_count}`;
                    } else {
                        item_buying_divs[key].getElementsByClassName("item_count")[0].innerText = ``;
                    }
                }
            }
        }
    }
    
    if(was_anything_new_added && !skip_sorting) {
        sort_displayed_inventory({target: "character", sort_by: character_sorting, direction: sorting_direction});
    }
}

function update_displayed_storage_inventory({item_key, storage_sorting="name", sorting_direction="asc", was_anything_new_added=false} = {}) {

    //removal of unneeded divs
    if(!item_key){
        Object.keys(storage_item_divs).forEach(div_key => {
            if(!player_storage.inventory[div_key]) {
                storage_item_divs[div_key].remove();
                delete storage_item_divs[div_key];
            }
        });
    }

    //creation of missing divs and updating of others
    if(item_key) {
        const item_count = player_storage.inventory[item_key].count;
        storage_item_divs[item_key].remove();
        delete storage_item_divs[item_key];
        storage_item_divs[item_key] = create_inventory_item_div({key: item_key, item_count, target: "storage"});
        storage_inventory_div.appendChild(storage_item_divs[item_key]);
        was_anything_new_added = true;
    } else {
        Object.keys(player_storage.inventory).forEach(inventory_key => {
            let item_count = player_storage.inventory[inventory_key].count;


            if(!storage_item_divs[inventory_key]) {
                //not in display, add it
                storage_item_divs[inventory_key] = create_inventory_item_div({key: inventory_key, item_count, target: "storage"});
                storage_inventory_div.appendChild(storage_item_divs[inventory_key]);
                was_anything_new_added = true;
            } else {
                //in display, just update it
                let div_count = Number.parseInt(storage_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText.replace("x",""));
                if(Number.isNaN(div_count)) {
                    div_count = 0;
                }
                if(div_count != item_count) {
                    if(item_count > 1) {
                        storage_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ` x${item_count}`;
                    } else {
                        storage_item_divs[inventory_key].getElementsByClassName("item_count")[0].innerText = ``;
                    }
                }
            }
        });

    }
    
    if(!item_key && was_anything_new_added) {
        sort_displayed_inventory({target: "storage", sort_by: storage_sorting, direction: sorting_direction});
    }
}

function exit_displayed_storage() {
    action_div.style.display = "";
    storage_div.style.display = "none";
}

/**
 * creates a single item div for hero/trader, used to fill displayed inventories
 * @param {Object} params
 * @param {String} params.key 
 * @param {Number} params.item_count
 * @param {String} params.target character/trader/storage
 * @param {Boolean} params.is_equipped
 * @param {Number} params.trade_index index in to_buy/to_sell
 * @returns 
 */
function create_inventory_item_div({key, item_count, target, is_equipped, trade_index, is_trade = false}) {

    const item_control_div = document.createElement("div");
    const item_div = document.createElement("div");
    const item_name_div = document.createElement("div");
    const item_additional = document.createElement("div");
    item_additional.classList.add("item_additional_content");

    let target_item;
    let target_class_name;
    let item_class;
    let options = {};
    let price_multiplier = 1;
    if(target === "trader") {
        options.trader = true;
        price_multiplier = traders[current_trader].getProfitMargin() || price_multiplier;
    } else if(target === "storage") {
        options.storage = true;
    }

    if(is_equipped) {
        target_item = character.equipment[key];
        item_count = item_count ?? 1;
        item_class = "equipped_item";
        target_class_name = "character_item";
    } else {
        item_class = "inventory_item";
        if(target === "character") {
            if(typeof trade_index === "undefined") {
                target_item = character.inventory[key].item;
                item_count = item_count || character.inventory[key].count;
            } else {
                target_item = traders[current_trader].inventory[to_buy.items[trade_index].item_key].item;
                item_count = item_count || to_buy.items[trade_index].count;
            }
            target_class_name = "character_item";
        } else if(target === "trader") {
            if(typeof trade_index === "undefined") {
                target_item = traders[current_trader].inventory[key].item;
                item_count = item_count || traders[current_trader].inventory[key].count;
            } else {
                target_item = character.inventory[to_sell.items[trade_index].item_key].item;
                item_count = item_count || to_sell.items[trade_index].count;
            }
            target_class_name = "trader_item";
        } else if(target === "storage") {
            target_item = player_storage.inventory[key].item;
            item_count = item_count || player_storage.inventory[key].count;
            target_class_name = "storage_item";
        } else {
            throw new Error(`"${target}" is not a correct inventory owner`);
        }
    }

    if("quality" in target_item) {
        item_control_div.dataset.item_quality = target_item.quality;
    }


    if(target_item.tags?.equippable) {
        if(target_item.tags.tool) {
            item_name_div.innerHTML = `<span class = "item_slot" >[tool]</span> <span>${target_item.getName()}</span>`;
        } else {
            item_name_div.innerHTML = `<span class = "item_slot" >[${target_item.equip_slot}]</span> <span>${target_item.getName()}</span>`;
        }
        item_name_div.classList.add(`${item_class}_name`);
        item_div.appendChild(item_name_div);

        item_control_div.classList.add(`${item_class}_control`, `${target_class_name}_control`, `${target_class_name}_equippable`);
        item_control_div.appendChild(item_div);

        if(typeof trade_index !== "undefined") {
            item_div.classList.add(`${item_class}`, `${target_class_name}`, `trade_item_equippable`);
        } else {
            item_div.classList.add(`${item_class}`, `${target_class_name}`, `item_equippable`);
        }
        item_control_div.dataset.item_slot = target_item.equip_slot;
        //
    } else if(target_item.tags.component) {
        //
        item_name_div.innerHTML = `<span class = "item_category">[Comp]</span> <span class="item_name">${target_item.getName()}</span>`;
        item_name_div.classList.add(`${item_class}_name`);
        item_div.appendChild(item_name_div);

        item_control_div.classList.add(`${item_class}_control`, `${target_class_name}_control`, `${target_class_name}_component`);
        item_control_div.appendChild(item_div);

        item_div.classList.add(`${item_class}`, `${target_class_name}`, "item_component");
        //
    } else if(target_item.tags.book) {
        //
        item_name_div.innerHTML = '<span class = "item_category">[Book]</span>';
        item_name_div.classList.add(`${item_class}`);
        item_name_div.innerHTML += ` <span class = "book_name item_name">"${target_item.name}"</span>`;

        if(book_stats[target_item.name].is_finished) {
            item_div.classList.add("book_finished");
        } else if(get_current_book() === target_item.name) {
            item_control_div.classList.add("book_active");
        }
        //
    } else {
        //
        item_name_div.innerHTML = `<span class = "item_category"></span> <span class = "item_name">${target_item.getName()}</span>`;
    }
    
    if(item_count > 1) {
        item_name_div.innerHTML += `<span class="item_count"> x${item_count}</span>`;
    } else {
        item_name_div.innerHTML += `<span class="item_count"></span>`;
    }

    item_name_div.classList.add(`${item_class}_name`);
    item_div.appendChild(item_name_div);

    item_div.classList.add(`${item_class}`, `${target_class_name}`, `item_${target_item.item_type.toLowerCase()}`);

    item_div.appendChild(create_item_tooltip(target_item, options, is_trade));

    item_control_div.classList.add(`${item_class}_control`, `${target_class_name}_control`, `${target_class_name}_${target_item.item_type.toLowerCase()}`);
    item_control_div.setAttribute(`data-${target_class_name}`, `${target_item.getInventoryKey()}`)
    item_control_div.setAttribute("data-item_count", `${item_count}`)
    item_control_div.setAttribute("data-item_value", `${target_item.getBaseValue()}`); //is only used as sorting param
    item_control_div.appendChild(item_div);

    if(target === "character") {
        if(target_item.item_type === "USABLE") {
            const item_use_button = document.createElement("div");
            item_use_button.classList.add("item_use_button");
            item_use_button.innerText = "[use]";
            const item_auto_use_button = document.createElement("div");
            item_auto_use_button.classList.add("item_auto_use_button");
            item_auto_use_button.innerText = "auto";

            if(favourite_consumables[target_item.id]) {
                item_auto_use_button.classList.add("item_auto_use_button_active");
            }

            item_additional.appendChild(item_use_button);
            item_additional.appendChild(item_auto_use_button);
        } else if(target_item.item_type === "BOOK") {
            const item_read_button = document.createElement("div");
            item_read_button.classList.add("item_use_button");
            item_read_button.innerText = "[read]";
            item_additional.appendChild(item_read_button);

            item_div.classList.add("item_book");
        }
        if(typeof trade_index === "undefined" && target_item.tags.equippable) {
            if(!is_equipped) {
                let item_equip_span = document.createElement("span");
                item_equip_span.innerHTML = "[equip]";
                item_equip_span.classList.add("equip_item_button", "item_controls");
                item_additional.appendChild(item_equip_span);
            } else {
                let item_unequip_div = document.createElement("div");
                item_unequip_div.innerHTML = "[take off]";
                item_unequip_div.classList.add("unequip_item_button", "item_controls");
                item_additional.appendChild(item_unequip_div);
            }
        }
    } 
    
    item_additional.appendChild(create_trade_buttons());

    let item_value_span = document.createElement("span");
    item_value_span.innerHTML = `${format_money(round_item_price(target_item.getValue({region: current_location?.market_region, multiplier: price_multiplier})), true)}`;
    item_value_span.classList.add("item_value", "item_controls");
    item_additional.appendChild(item_value_span);
    item_control_div.appendChild(item_additional);

    if(typeof trade_index !== "undefined") {
        item_control_div.classList.add('item_to_trade');
    }

    return item_control_div;
}

/**
 * updates the displayed worn items + attaches tooltips
 */
function update_displayed_equipment() {
    Object.keys(equipment_slots_divs).forEach(function(key) {
        let eq_tooltip; 

        if(character.equipment[key] == null) { //no item in slot
            eq_tooltip = document.createElement("span");
            eq_tooltip.classList.add("item_tooltip");
            equipment_slots_divs[key].innerHTML = `${key} slot`;
            equipment_slots_divs[key].classList.add("equipment_slot_empty");
            eq_tooltip.innerHTML = `Your ${key} slot`;
        } else {
            equipment_slots_divs[key].innerHTML = character.equipment[key].getName();
            equipment_slots_divs[key].classList.remove("equipment_slot_empty");
            
            eq_tooltip = create_item_tooltip(character.equipment[key]);
        }
        equipment_slots_divs[key].appendChild(eq_tooltip);
    });
}

function update_displayed_book(book_id) {
    const book = item_templates[book_id];
    const book_key = book.getInventoryKey();
    if(book_stats[book.name].is_finished) {
        item_divs[book_key].classList.add("book_finished");
        item_divs[book_key].classList.remove("book_active");
    } else if(get_current_book() === book.name) {
        item_divs[book_key].classList.add("book_active");
    } else {
        item_divs[book_key].classList.remove("book_active");
    }

    item_divs[book_key].getElementsByClassName("item_tooltip")[0].remove();
    item_divs[book_key].getElementsByClassName("item_book")[0].appendChild(create_item_tooltip(book));
}

/**
 * sets visibility of divs for enemies (based on how many there are in current combat),
 * and enemies' AP / EP
 * 
 * called when new enemies get loaded
 */
function update_displayed_enemies() {
    for(let i = 0; i < 8; i++) { //go to max enemy count
        if(i < current_enemies.length) {
            enemies_div.children[i].children[0].style.display = null;
            enemies_div.children[i].children[0].children[0].innerHTML = current_enemies[i].name;

            let disp_speed;

            if(current_enemies[i].stats.attack_speed > 20) {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed);
            } else if (current_enemies[i].stats.attack_speed > 2) {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed*10)/10;
            } else {
                disp_speed = Math.round(current_enemies[i].stats.attack_speed*100)/100;
            }

            let hero_hit_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/4); // down to ~ 60% if there's full 8 enemies
            if(current_enemies[i].size === "small") {
                hero_hit_chance_modifier *= get_total_skill_coefficient({scaling_type: "multiplicative", skill_id: "Pest killer"});
            }

            let hero_evasion_chance_modifier = current_enemies.filter(enemy => enemy.is_alive).length**(-1/3); //down to .5 if there's full 8 enemies (multiple attackers make it harder to evade attacks)
            if(current_enemies[i].size === "large") {
                hero_evasion_chance_modifier *= get_total_skill_coefficient({scaling_type: "multiplicative", skill_id: "Giant slayer"});
            }
        
            const evasion_chance = 1 - get_hit_chance(character.stats.full.attack_points*hero_hit_chance_modifier, current_enemies[i].stats.agility * Math.sqrt(current_enemies[i].stats.intuition ?? 1));
            let hit_chance = get_hit_chance(current_enemies[i].stats.dexterity * Math.sqrt(current_enemies[i].stats.intuition ?? 1), character.stats.full.evasion_points*hero_evasion_chance_modifier);

            if(character.equipment["off-hand"]?.offhand_type === "shield") { //has shield
                hit_chance = 1;
            }

            //enemies_div.children[i].children[0].children[1].innerHTML = `AP : ${Math.round(ap)} | EP : ${Math.round(ep)}`;
            enemies_div.children[i].children[0].children[1].children[0].innerHTML = `Atk: ${current_enemies[i].stats.attack}dmg`;
            if(current_enemies[i].stats.attack_count > 1) {
                enemies_div.children[i].children[0].children[1].children[0].innerHTML+=` x${current_enemies[i].stats.attack_count}`;
            }
            enemies_div.children[i].children[0].children[1].children[1].innerHTML = `Spd: ${disp_speed}`;
            enemies_div.children[i].children[0].children[1].children[2].innerHTML = `Hit: ${Math.min(100,Math.max(0,Math.round(100*hit_chance)))}%`; //100% if shield!
            enemies_div.children[i].children[0].children[1].children[3].innerHTML = `Ddg: ${Math.min(100,Math.max(0,Math.round(100*evasion_chance)))}%`;
            enemies_div.children[i].children[0].children[1].children[4].innerHTML = `Def: ${current_enemies[i].stats.defense}`;

        } else {
            enemies_div.children[i].children[0].style.display = "none"; //just hide it
        }     
    }
}

/**
 * updates displayed health and healthbars of enemies
 */
function update_displayed_health_of_enemies() {
    for(let i = 0; i < current_enemies.length; i++) {
        if(current_enemies[i].is_alive) {
            enemies_div.children[i].children[0].style.filter = "brightness(100%)";
        } else {
            enemies_div.children[i].children[0].style.filter = "brightness(30%)";
            update_displayed_enemies();
        }

        //update size of health bar
        enemies_div.children[i].children[0].children[2].children[0].children[0].style.width = 
            Math.max(0, 100*current_enemies[i].stats.health/current_enemies[i].stats.max_health) + "%";

            enemies_div.children[i].children[0].children[2].children[1].innerText = `${Math.ceil(current_enemies[i].stats.health)}/${Math.ceil(current_enemies[i].stats.max_health)} hp`;

    }
}

function update_displayed_normal_location(location) {
    clear_action_div();
    location_types_div.innerHTML = "";
    combat_div.style.display = "none";
    location_tooltip.innerText = "";

    document.documentElement.style.setProperty('--location_desc_tooltip_visibility', "hidden");

    enemy_count_div.style.display = "none";
    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_default'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_default'));
    
    inventory_switch.click();
    combat_switch.style.pointerEvents = "none";
    combat_switch.style.cursor = "default";
    combat_switch.style.color = "gray";

    location_name_span.innerText = current_location.name;
    document.getElementById("location_description_div").innerText = current_location.getDescription();

    update_location_icon(location);

    /////////////////////////////
    //add button to open crafting
    if(global_flags.is_crafting_unlocked) {
        if(location.crafting?.is_unlocked) {
            const crafting_button = document.createElement("div");
            crafting_button.classList.add("location_choices", "choice_craft");
            crafting_button.setAttribute("onclick", 'openCraftingWindow()');
            crafting_button.innerHTML = `<i class="material-icons">construction</i> ${location.crafting.use_text}`;
            action_div.appendChild(crafting_button);
        }
    }

    ///////////////////////////
    //add button to go to sleep

    if(location.housing?.is_unlocked) { 
        const start_sleeping_div = document.createElement("div");
        
        start_sleeping_div.innerHTML = '<i class="material-icons">bed</i>  ' + location.housing.text_to_sleep;
        start_sleeping_div.id = "start_sleeping_div";
        start_sleeping_div.setAttribute('onclick', 'start_sleeping()');

        const open_storage_div = document.createElement("div");
        
        open_storage_div.innerHTML = '<i class="material-icons">inventory_2</i>  Open your personal chest';
        open_storage_div.id = "open_storage_div";
        open_storage_div.setAttribute('onclick', 'openStorage()');

        action_div.appendChild(start_sleeping_div);
        action_div.appendChild(open_storage_div);
    }
    
    ////////////////////////////////////
    //add buttons for starting dialogues

    const available_dialogues = location.dialogues.filter(dialogue => {
        if(!dialogues[dialogue].is_unlocked || dialogues[dialogue].is_finished) {
            return false;
        } else {
            let lines_available = false;
            Object.keys(dialogues[dialogue].textlines).forEach(line => {
                if(lines_available) {
                    return;
                } else {
                    lines_available = dialogues[dialogue].textlines[line].is_unlocked && !dialogues[dialogue].textlines[line].is_finished;
                }
            });
            return lines_available;
        }
    });

    if(available_dialogues.length > 0) {
        location_choice_divs["dialogues"] = create_location_choice_dropdown({name: "Talk to someone", icon: "question_answer", class_name: "choice_dialogue"});

        location_choice_divs["dialogues"].append(...create_location_choices({location: location, category: "talk"}));
    }

    /////////////////////////
    //add buttons for trading

    const available_traders = location.traders.filter(trader => traders[trader].is_unlocked && !traders[trader].is_finished);

    if(available_traders.length > 0) {
        location_choice_divs["traders"] = create_location_choice_dropdown({name: "Visit a merchant", icon: "storefront", class_name: "choice_trade"});

        location_choice_divs["traders"].append(...create_location_choices({location: location, category: "trade"}));
    }
    

    ///////////////////////////
    //add buttons to start jobs

    const available_jobs = Object.values(location.activities).filter(activity => activities[activity.activity_name].type === "JOB" 
                                                                    && activities[activity.activity_name].is_unlocked
                                                                    && activity.is_unlocked
                                                                    && activities[activity.activity_name].base_skills_names.filter(skill => !skills[skill].is_unlocked).length == 0);
    
    if(available_jobs.length > 0) {
        location_choice_divs["jobs"] = create_location_choice_dropdown({name: "Find work", icon: "work_outline", class_name: "choice_work"});

        location_choice_divs["jobs"].append(...create_location_choices({location: location, category: "work"}));
    }


    ///////////////////////////////
    //add buttons to start training

    const available_trainings = Object.values(location.activities).filter(activity => activities[activity.activity_name].type === "TRAINING" 
                                                                    && activities[activity.activity_name].is_unlocked
                                                                    && activity.is_unlocked
                                                                    && activities[activity.activity_name].base_skills_names.filter(skill => !skills[skill].is_unlocked).length == 0);
    
    if(available_trainings.length > 0) {
        location_choice_divs["trainings"] = create_location_choice_dropdown({name: "Train", icon: "fitness_center", class_name: "choice_train"});

        location_choice_divs["trainings"].append(...create_location_choices({location: location, category: "train"}));
    }

    ////////////////////////////////
    //add buttons to start gathering

    if(global_flags.is_gathering_unlocked) {
        const available_gatherings = Object.values(location.activities).filter(activity => activities[activity.activity_name].type === "GATHERING" 
                                                                        && activities[activity.activity_name].is_unlocked
                                                                        && activity.is_unlocked
                                                                        && activities[activity.activity_name].base_skills_names.filter(skill => !skills[skill].is_unlocked).length == 0);
        
        
        if(available_gatherings.length > 0) {
            location_choice_divs["gatherings"] = create_location_choice_dropdown({name: "Gather resources", icon: "search", class_name: "choice_gather"});
    
            location_choice_divs["gatherings"].append(...create_location_choices({location: location, category: "gather"}));
        }
        
    }

    const available_actions = Object.values(location.actions).filter(action => action.is_unlocked && !action.is_finished);
    if(available_actions.length > 0) {
        location_choice_divs["actions"] = create_location_choice_dropdown({name: "Take an action", icon: "circle", class_name: "choice_action"});

        location_choice_divs["actions"].append(...create_location_choices({location: location, category: "action"}));
    }

    /////////////////////////////////
    //add butttons to change location

    const available_locations = location.connected_locations.filter(loc => (loc.location.is_unlocked && !loc.location.is_finished && !loc.location.is_challenge));
    if(available_locations.length > 0) {
        location_choice_divs["locations"] = create_location_choice_dropdown({name: "Move somewhere else", icon: "directions", class_name: "choice_travel"});

        location_choice_divs["locations"].append(...create_location_choices({location: location, category: "travel"}));
    }

    ////////////////////////////
    //add buttons for challenges

    const available_challenges = location.connected_locations.filter(loc => (loc.location.is_challenge && loc.location.is_unlocked && !loc.location.is_finished));
    if(available_challenges.length > 0) {
        location_choice_divs["challenges"] = create_location_choice_dropdown({name: "Take on a challenge", icon: "warning_amber", class_name: "choice_travel"});

        location_choice_divs["challenges"].append(...create_location_choices({location: location, category: "challenge"}));
    }

    /////////////////////////////
    //add buttons for fast travel

    const available_fast_travel = 
    [
        ...Object.keys(favourite_locations).filter(key => (key !== current_location.id)), 
        ...Object.keys(unlocked_beds).filter(key => (key !== current_location.id && locations[key].is_unlocked && !locations[key].is_finished))
    ];

    if((available_fast_travel.length + (last_combat_location?1:0)) > 0) {
        location_choice_divs["fast_travel"] = create_location_choice_dropdown({name: "Fast travel", icon: "directions", class_name: "choice_travel"});

        location_choice_divs["fast_travel"].append(...create_location_choices({location: location, category: "fast_travel"}));
    }

    action_div.append(...Object.values(location_choice_divs));
}

function update_location_icon() {
    if(current_location.housing && current_location.housing.is_unlocked) {
        location_icon_span.innerHTML = '<i class="material-icons location_bed_icon">bed</i>'
    } else if(favourite_locations[current_location.id]) {
        location_icon_span.innerHTML = '<i class="material-icons">star</i>'
    } else {
        location_icon_span.innerHTML = '<i class="material-icons">star_border</i>'
    }
}

function create_location_choice_dropdown({name, icon, class_name}) {

    const elem = document.createElement("div");
    elem.innerHTML = `<i class="material-icons">${icon}</i> ${name}`;
    elem.classList.add("location_choice_dropdown", class_name);

    elem.addEventListener("click", (event)=>{
        let target = event.target;
        if(target.classList.contains("material-icons")) {
            target = target.parentNode;
        }

        if(target.classList.contains("location_choice_dropdown")) {
            target.classList.toggle("location_choice_dropdown_expanded");

            //done after toggling class, so it will trigger if class was NOT present when clicked
            if(target.classList.contains("location_choice_dropdown_expanded")) {
                target.scrollIntoView({block: "end", inline: "nearest", behavior: "smooth"});
            }
        }
    });

    return elem;
}

/**
 * 
 * @param {*} location 
 * @param {*} category 
 * @return {Array} an array of html nodes presenting the available choices
 */
function create_location_choices({location, category, is_combat = false}) {
    let choice_list = [];
    //that's a lot of ifs for same argument, maybe switch to switch instead?

    if(category === "talk") {
        for(let i = 0; i < location.dialogues.length; i++) { 
            if(!dialogues[location.dialogues[i]].is_unlocked || dialogues[location.dialogues[i]].is_finished) { //skip if dialogue is not available
                continue;
            } 

            const lines_available = location.dialogues.filter(dialogue => {
                    let lines_available = false;
                    Object.keys(dialogues[dialogue].textlines).forEach(line => {
                        if(lines_available) {
                            return;
                        } else {
                            lines_available = dialogues[dialogue].textlines[line].is_unlocked && !dialogues[dialogue].textlines[line].is_finished;
                        }
                    });
                    return lines_available;
            }).length > 0;
            if(!lines_available) {
                continue;
            }
            
            const dialogue_div = document.createElement("div");
    
            //if(Object.keys(dialogues[location.dialogues[i]].textlines).length > 0) { //has any textlines
                
            //dialogue_div.innerHTML = add_icons ? `<i class="material-icons">question_answer</i>  ` : "";
            dialogue_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + dialogues[location.dialogues[i]].starting_text;
            dialogue_div.classList.add("start_dialogue", "location_choice");
            dialogue_div.setAttribute("data-dialogue", location.dialogues[i]);
            dialogue_div.setAttribute("onclick", "start_dialogue(this.getAttribute('data-dialogue'));");
            choice_list.push(dialogue_div);
            //}
        }
    } else if (category === "trade") {
        for(let i = 0; i < location.traders.length; i++) { 
            if(!traders[location.traders[i]].is_unlocked || traders[location.traders[i]].is_finished) { //skip if trader is not available
                continue;
            } 
            
            const trader_div = document.createElement("div");  

            //trader_div.innerHTML = add_icons ? `<i class="material-icons">storefront</i>   ` : "";
            trader_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + traders[location.traders[i]].trade_text;
            trader_div.classList.add("start_trade", "location_choice");
            trader_div.setAttribute("data-trader", location.traders[i]);
            trader_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'));");
            choice_list.push(trader_div);
        }
    } else if (category === "work") {
        Object.keys(location.activities).forEach(key => {
            if(!activities[location.activities[key].activity_name]?.is_unlocked 
                || !location.activities[key]?.is_unlocked 
                || activities[location.activities[key].activity_name].type !== "JOB") 
            {
                return;
            }
            
            const activity_div = document.createElement("div");

            //activity_div.innerHTML = `<i class="material-icons">work_outline</i>  `;
            activity_div.classList.add("activity_div", "location_choice");
            activity_div.setAttribute("data-activity", key);
            activity_div.setAttribute("onclick", "start_activity(this.getAttribute('data-activity'));");

            if(can_work(location.activities[key])) {
                activity_div.classList.add("start_activity");
            } else {
                activity_div.classList.add("activity_unavailable");
            }

            const job_tooltip = document.createElement("div");
            job_tooltip.classList.add("job_tooltip");
            if(!location.activities[key].infinite){
                if(location.activities[key].availability_time) {
                    job_tooltip.innerHTML = `Available from ${location.activities[key].availability_time.start} to ${location.activities[key].availability_time.end} <br>`;
                }
                if(location.activities[key].availability_seasons) {
                    if(location.activities[key].availability_seasons.length === 3) {
                        const unavailable_seasons = seasons.filter(x => !location.activities[key].availability_seasons.includes(x));
                        job_tooltip.innerHTML += `Not available during ${unavailable_seasons.toString().replaceAll(",",", ")} <br>`;
                    } else {
                        job_tooltip.innerHTML += `Available during ${location.activities[key].availability_seasons.toString().replaceAll(",",", ")} <br>`;
                    }
                }
            }
            job_tooltip.innerHTML += `Pays ${format_money(location.activities[key].get_payment())} per every ` +  
                    `${format_working_time(location.activities[key].working_period)} worked`;
            

            activity_div.appendChild(job_tooltip);
    
            activity_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + location.activities[key].starting_text;
            choice_list.push(activity_div);
        });
    } else if (category === "train") {
        Object.keys(location.activities).forEach(key => {
            if(!activities[location.activities[key].activity_name]?.is_unlocked 
                || !location.activities[key]?.is_unlocked 
                || activities[location.activities[key].activity_name].type !== "TRAINING"
                || activities[location.activities[key].activity_name].base_skills_names.filter(skill => !skills[skill].is_unlocked).length > 0) 
            {
                return;
            }

            const activity_div = document.createElement("div");

            //activity_div.innerHTML = `<i class="material-icons">fitness_center</i>  `;
            activity_div.classList.add("activity_div", "start_activity", "location_choice");
            activity_div.setAttribute("data-activity", key);
            activity_div.setAttribute("onclick", "start_activity(this.getAttribute('data-activity'));");

            if(location.activities[key].availability_seasons) {
                const activity_tooltip = document.createElement("div");
                activity_tooltip.classList.add("job_tooltip");
                if(location.activities[key].availability_seasons.length === 3) {
                    const unavailable_seasons = seasons.filter(x => !location.activities[key].availability_seasons.includes(x));
                    activity_tooltip.innerHTML = `Not available during ${unavailable_seasons.toString().replaceAll(",",", ")} <br>`;
                } else {
                    activity_tooltip.innerHTML = `Available during ${location.activities[key].availability_seasons.toString().replaceAll(",",", ")} <br>`;
                }
                activity_div.appendChild(activity_tooltip);
            }

            activity_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + location.activities[key].starting_text;
            choice_list.push(activity_div);
        });
    } else if (category === "gather") {
        Object.keys(location.activities).forEach(key => {
            if(!activities[location.activities[key].activity_name]?.is_unlocked 
                || !location.activities[key]?.is_unlocked 
                || activities[location.activities[key].activity_name].type !== "GATHERING"
                || activities[location.activities[key].activity_name].base_skills_names.filter(skill => !skills[skill].is_unlocked).length > 0) 
            {
                return;
            }

            const activity_div = document.createElement("div");

            //activity_div.innerHTML = `<i class="material-icons">search</i>  `;
            activity_div.classList.add("activity_div", "start_activity", "location_choice");
            activity_div.setAttribute("data-activity", key);
            activity_div.setAttribute("onclick", "start_activity(this.getAttribute('data-activity'));");

            activity_div.appendChild(create_gathering_tooltip(location.activities[key]));
    
            activity_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + location.activities[key].starting_text;
            choice_list.push(activity_div);
        });
    } else if (category === "travel") {
        if(!is_combat){
            for(let i = 0; i < location.connected_locations.length; i++) { 
                
                if(!location.connected_locations[i].location.is_unlocked || location.connected_locations[i].location.is_finished) { //skip if not unlocked or if finished
                    continue;
                }
                if(location.connected_locations[i].location.is_challenge) {
                    continue;
                    //challenges displayed separately
                }

                const action = document.createElement("div");
                
                const travel_time = format_time({time: {minutes: travel_times[location.id][location.connected_locations[i].location.id]}});

                if("connected_locations" in location.connected_locations[i].location) {// check again if connected location is normal or combat
                    action.classList.add("travel_normal");
                    if("custom_text" in location.connected_locations[i]) {
                        action.innerHTML = `<div class='location_choice_icon_box'><i class="material-icons location_choice_icon">check_box_outline_blank</i></div> ` + location.connected_locations[i].custom_text + " [" + travel_time + "]";
                    }
                    else {
                        action.innerHTML = `<div class='location_choice_icon_box'><i class="material-icons location_choice_icon">check_box_outline_blank</i></div> ` + "Go to [" + location.connected_locations[i].location.name+"]"+" [" + travel_time + "]";
                    }
                } else {
                    action.classList.add("travel_combat");
                    if("custom_text" in location.connected_locations[i]) {
                        action.innerHTML = `<div class='location_choice_icon_box'><i class="material-icons">warning_amber</i></div> ` + location.connected_locations[i].custom_text + " [" + travel_time + "]";
                    } else {
                        action.innerHTML = `<div class='location_choice_icon_box'><i class="material-icons">warning_amber</i></div>  ` + "Enter the [" + location.connected_locations[i].location.name+"] [" + travel_time + "]";
                    }
                }
            
                action.classList.add("action_travel", "location_choice");
                action.setAttribute("data-travel", location.connected_locations[i].location.id);
                action.setAttribute("onclick", "change_location({location_id: this.getAttribute('data-travel')});");
        
                choice_list.push(action);
            } 
        } else {
            const action = document.createElement("div");
            action.classList.add("travel_normal", "action_travel", "location_choice");

            const travel_time = format_time({time: {minutes: travel_times[location.id][location.parent_location.id]}});
            let travel_time_text = "";
            if(travel_time) {
                travel_time_text = " [" + travel_time + "]";
            }
            if(location.leave_text) {
                action.innerHTML = location.leave_text + travel_time_text;
            } else {
                action.innerHTML = "Go back to [" + location.parent_location.name + "]" + travel_time_text;
            }
            action.setAttribute("data-travel", location.parent_location.id);
            action.setAttribute("onclick", "change_location({location_id:this.getAttribute('data-travel')});");

            choice_list.push(action);
        }

        if(last_location_with_bed && !location.housing?.is_unlocked && !location.connected_locations) {
            const last_bed = locations[last_location_with_bed];

            const action = document.createElement("div");
            action.classList.add("action_travel", "travel_normal", "location_choice");

            const travel_time = format_time({time: {minutes: travel_times[location.id][last_bed.id]}});
            
            if(!is_combat) {
                action.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> `
            }
            if(travel_time) {
                action.innerHTML += `Quick return to [${last_bed.name}]` +" [" + travel_time + "]";
            } else {
                action.innerHTML += `Quick return to [${last_bed.name}]`;
            }

            action.setAttribute("data-travel", last_bed.name);
            action.setAttribute("onclick", "change_location({location_id:this.getAttribute('data-travel')});");
    
            choice_list.push(action);
        }

        choice_list.sort((a,b) => b.classList.contains("travel_normal") - a.classList.contains("travel_normal"));
    } else if (category === "challenge") {
        const available_challenges = location.connected_locations.filter(loc => (loc.location.is_challenge && loc.location.is_unlocked && !loc.location.is_finished));
       
        for(let i = 0; i < available_challenges.length; i++) { 
            const action = document.createElement("div");

            action.classList.add("travel_combat", "location_choice");
            if("custom_text" in available_challenges[i]) {
                action.innerHTML = `<i class="material-icons">warning_amber</i>  ` + available_challenges[i].custom_text;
            }
            else {
                action.innerHTML = `<i class="material-icons">warning_amber</i>  ` + "Enter the " + available_challenges[i].location.name;
            }
            
            action.classList.add("action_travel");
            action.setAttribute("data-travel", available_challenges[i].location.id);
            action.setAttribute("onclick", "change_location({location_id:this.getAttribute('data-travel')});");
    
            choice_list.push(action);
        }
    } else if (category === "action") {
        Object.keys(location.actions).forEach(key => {
            if(location.actions[key].is_finished || !location.actions[key].is_unlocked) {
                return;
            }

            const location_action_div = document.createElement("div");

            //location_action_div.innerHTML = `<i class="material-icons">circle</i>  `;
            location_action_div.classList.add("location_action_div", "start_game_action", "location_choice");
            location_action_div.setAttribute("data-location_action", key);
            location_action_div.setAttribute("onclick", "start_game_action(this.getAttribute('data-location_action'));");

            location_action_div.appendChild(create_location_action_tooltip(location.actions[key]));
    
            location_action_div.innerHTML += `<i class="material-icons location_choice_icon">check_box_outline_blank</i> ` + location.actions[key].starting_text;
            choice_list.push(location_action_div);
        });
    } else if (category === "fast_travel") {
        choice_list = create_fast_travel_choices();
    }

    return choice_list;
}

function create_fast_travel_choices() {
    let choice_list = [];

    let available_fast_travel = 
    [
        ...Object.keys(favourite_locations).filter(key => (key !== current_location.id)),
        ...Object.keys(unlocked_beds).filter(key => (key !== current_location.id && locations[key].is_unlocked && !locations[key].is_finished))
    ];

    if(last_combat_location && !available_fast_travel.includes(last_combat_location)) {
        available_fast_travel.push(last_combat_location);
    }

    available_fast_travel = available_fast_travel.sort((a,b) => {
        if(locations[a].housing?.is_unlocked && !locations[b].housing?.is_unlocked) {
            return -1;
        } else if(!locations[a].housing?.is_unlocked && locations[b].housing?.is_unlocked) {
            return 1;
        } else {
            if(locations[a].tags.safe_zone && !locations[b].tags.safe_zone) {
                return -1;
            } else if(!locations[a].tags.safe_zone && locations[b].tags.safe_zone) {
                return 1;
            } else {
                return 0;
            }
        }
    });

    for(let i = 0; i < available_fast_travel.length; i++) { 
        if(!locations[available_fast_travel[i]].is_unlocked || locations[available_fast_travel[i]].is_finished) { //skip if not unlocked or if finished
            continue;
        }
        if(available_fast_travel[i] === current_location.id) { //do not show current location as a valid destination
            continue;
        }

        const action = document.createElement("div");
        const travel_time = format_time({time: {minutes: travel_times[current_location.id][available_fast_travel[i]]}});

        if(locations[available_fast_travel[i]].tags.safe_zone) {
        
            action.classList.add("travel_normal");

            if(locations[available_fast_travel[i]].housing?.is_unlocked) {
                action.innerHTML = `<i class="material-icons">bed</i> <span class="fast_travel_name">` + "Travel to [" + locations[available_fast_travel[i]].name+"] [" + travel_time + "]</span>";
            } else {
                action.innerHTML = `<i class="material-icons location_choice_icon">check_box_outline_blank</i> <span class="fast_travel_name">` + "Travel to [" + locations[available_fast_travel[i]].name+"] [" + travel_time + "]</span>";
            }
            
            action.classList.add("action_travel", "location_choice");
            action.setAttribute("data-travel", locations[available_fast_travel[i]].id);
            action.setAttribute("onclick", "change_location({location_id:this.getAttribute('data-travel'), event});");
        } else {            
            action.classList.add("travel_combat");
            
            action.innerHTML = `<i class="material-icons">warning_amber</i> <span class="fast_travel_name">Travel to [${locations[available_fast_travel[i]].name}] [${travel_time}] </span>`;
            
            action.classList.add("action_travel", "location_choice");
            action.setAttribute("data-travel", locations[available_fast_travel[i]].id);
            action.setAttribute("onclick", "change_location({location_id: this.getAttribute('data-travel'), event});");
        }

        if(!locations[available_fast_travel[i]].housing?.is_unlocked && locations[available_fast_travel[i]].id !== last_combat_location) {
            const removal_button = document.createElement("span");
            removal_button.innerHTML = `<i class="material-icons fast_travel_removal_button">close</i>`;
            removal_button.setAttribute("onclick","remove_location_from_favourites({location_id:this.parentNode.getAttribute('data-travel')})");
            action.appendChild(removal_button);
        }

        choice_list.push(action);
    }
    return choice_list;
}

function remove_fast_travel_choice({location_id}) {
    if(!location_choice_divs["fast_travel"]) {
        return;
    }
    
    const element = location_choice_divs["fast_travel"].querySelector(`[data-travel="${location_id}"`);

    if(!element) {
        return;
    }

    if(location_id === last_combat_location || locations[location_id].housing?.is_unlocked) {
        //remove only button
        element.getElementsByClassName("fast_travel_removal_button")[0].parentNode.remove();
    } else {
        //remove full element
        element.remove();
    }
}

function update_displayed_combat_location(location) {

    document.documentElement.style.setProperty('--location_desc_tooltip_visibility', "visible");
    clear_action_div();
    location_types_div.innerHTML = "";
    let action;

    update_location_icon(location);

    enemy_count_div.style.display = "block";
    combat_div.style.display = "block";

    if(!options.disable_combat_autoswitch) {
        combat_switch.click();
        combat_switch.classList.add("active_selection_button");
        inventory_switch.classList.remove("active_selection_button");
    } 
    combat_switch.style.pointerEvents = "auto";
    combat_switch.style.cursor = "pointer";
    combat_switch.style.color = "white";

    document.documentElement.style.setProperty('--actions_div_height', getComputedStyle(document.body).getPropertyValue('--actions_div_height_combat'));
    document.documentElement.style.setProperty('--actions_div_top', getComputedStyle(document.body).getPropertyValue('--actions_div_top_combat'));


    enemy_count_div.children[0].children[1].innerHTML = location.enemy_count - location.enemy_groups_killed % location.enemy_count;

    action = create_location_choices({location: location, category: "travel", is_combat: true});

    action_div.append(...action);

    location_name_span.innerText = current_location.name;
    if(current_location.types.length == 0) {
        document.documentElement.style.setProperty('--location_name_div_width', '390px');
    } else {
        document.documentElement.style.setProperty('--location_name_div_width', '250px');
    }

    location_tooltip.innerText = current_location.getDescription();
    location_tooltip.classList.add("location_tooltip");
    
    document.getElementById("location_description_div").innerText = current_location.getDescription();
    create_location_types_display(current_location);
}

function create_location_types_display(current_location){
    for(let i = 0; i < current_location.types?.length; i++) {
        const type_div = document.createElement("div");

        type_div.innerHTML = current_location.types[i].type + (current_location.types[i].stage>1?` ${"I".repeat(current_location.types[i].stage)}`:"");
        type_div.classList.add("location_type_div");

        const type_tooltip = document.createElement("div");
        type_tooltip.innerHTML = location_types[current_location.types[i].type].stages[current_location.types[i].stage].description;
        type_tooltip.classList.add("location_type_tooltip");

        const {type, stage} = current_location.types[i];
        const {effects} = location_types[type].stages[stage];
        if(Object.keys(effects || {}).length > 0) {
            type_tooltip.innerHTML += `<br>`;

            Object.keys(effects).forEach(stat => {
                if(effects[stat].multiplier) {
                    const base = effects[stat].multiplier;
                    const actual = get_location_type_penalty(type, stage, stat, "multiplier");
                    type_tooltip.innerHTML += `<br>${stat_names[stat]} x${Math.round(1000*actual)/1000}`;
                    if(base != actual) {
                        type_tooltip.innerHTML += ` [base: x${effects[stat].multiplier}]`;
                    }
                }
                if(effects[stat].flat) {
                    const base = effects[stat].flat;
                    const actual = get_location_type_penalty(type, stage, stat, "flat");
                    type_tooltip.innerHTML += `<br>${stat_names[stat]}: ${Math.round(1000*actual)/1000}`;
                    if(base != actual) {
                        type_tooltip.innerHTML += ` [base: ${effects[stat].flat}]`;
                    }
                }
                
            });

        } //other effects to be done when/if they are added

        type_div.appendChild(type_tooltip);
        location_types_div.appendChild(type_div);
    }
}

function update_displayed_location_types(current_location){
    location_types_div.innerHTML = "";
    create_location_types_display(current_location);
}

function open_crafting_window() {
    action_div.style.display = "none";
    document.getElementById("crafting_window").style.display = "block";

    if(!selected_crafting_category || !selected_crafting_subcategory) {
        switch_crafting_recipes_page("crafting");
    }

    update_displayed_crafting_recipes();
}

function close_crafting_window() {
    action_div.style.display = "block";
    document.getElementById("crafting_window").style.display = "none";
    update_displayed_normal_location(current_location);
}

/**
 * switches between main pages of crafting menu (crafting, alchemy, cooking, etc)
 * @param {String} category 
 */
function switch_crafting_recipes_page(category) {
    selected_crafting_category = category;

    //only show buttons for subcategories that exist
    const elements = document.getElementById('crafting_subpage_buttons').children;
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = recipes[category][elements[i].dataset.crafting_subcategory] ? "" : "none";
    }

    elements[0].click();

    unexpand_displayed_recipes();
}

/**
 * switches between subpages of a crafting page (items-components-equipment)
 * @param {String} category 
 * @param {String} subcategory 
 */
function switch_crafting_recipes_subpage(subcategory) {
    selected_crafting_subcategory = subcategory;

    const elements = document.querySelectorAll(`[data-crafting_category][data-crafting_subcategory]`);
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].dataset.crafting_category == selected_crafting_category && elements[i].dataset.crafting_subcategory == selected_crafting_subcategory) {
            elements[i].style.display = "";
        }
        else {
            elements[i].style.display = "none";
        }
    }

    unexpand_displayed_recipes();
}

function unexpand_displayed_recipes() {
    const classes = ["selected_recipe", "selected_component_list", "selected_component_category"];
    for(let i = 0; i < classes.length; i++) {
        const elements = document.getElementsByClassName(classes[i]);
        for(let j = 0 ; j < elements.length; j++) {
            elements[j].classList.remove(classes[i]);
        }
    }
}

function get_recipe_page(category, subcategory) {
    if (!crafting_pages[category]) {
        crafting_pages[category] = {};
    }
    if (!crafting_pages[category][subcategory]) {
        crafting_pages[category][subcategory] = document.querySelector(`[data-crafting_category="${category}"][data-crafting_subcategory="${subcategory}"]`);
    }
    if (!crafting_pages[category][subcategory]) {
        let new_category = document.createElement('div');
        new_category.classList.add("crafting_category");
        new_category.classList.add("crafting_recipe_list");
        new_category.dataset.crafting_category = category;
        new_category.dataset.crafting_subcategory = subcategory;


        crafting_pages[category][subcategory] = document.getElementById("recipe_categories").appendChild(new_category);
    }

    return crafting_pages[category][subcategory];
}

function create_displayed_crafting_recipes() {
    Object.keys(recipes).forEach(recipe_category => {
        Object.keys(recipes[recipe_category]).forEach(recipe_subcategory => {
            if (recipe_subcategory === "items") {
                get_recipe_page(recipe_category, recipe_subcategory).innerHTML = "";
            }
            Object.keys(recipes[recipe_category][recipe_subcategory]).forEach(recipe => {
                add_crafting_recipe_to_display({category: recipe_category, subcategory: recipe_subcategory, recipe_id: recipe});
            });
        });
    });

    update_item_recipe_visibility();
}

function add_crafting_recipe_to_display({category, subcategory, recipe_id}) {
    const recipe = recipes[category][subcategory][recipe_id];
    if(!recipe.is_unlocked) {
        return;
    }
    const recipe_div = document.createElement("div");

    const recipe_name_span = document.createElement("span");
    recipe_name_span.innerHTML = recipe.name;

    recipe_div.append(recipe_name_span);
    recipe_div.classList.add("recipe_div");
    recipe_div.dataset.recipe_id = recipe_id;

    if(subcategory === "items") {
        recipe_name_span.classList.add("recipe_item_name");
        recipe_div.children[0].innerHTML = '<i class="material-icons icon" style="visibility:hidden"> keyboard_double_arrow_down </i>' + recipe_div.children[0].innerHTML;
        //invisible icon added just so it properly matches in height and text position with recipes in other subcategories
        if(!recipe.get_availability().available_ammount) {
            recipe_div.classList.add("recipe_unavailable");
        }

        recipe_div.addEventListener("click", (event)=>{
            if(event.target.classList.contains("recipe_item_name") && !event.target.parentNode.classList.contains("recipe_unavailable")) {
                window.useRecipe(event.target);
            } else if(event.target.classList.contains("craft_ammount_button")) {
                window.useRecipe(event.target.parentNode, Number(event.target.dataset.craft_ammount));
            }
        });

        const craft_ammount_buttons = document.createElement("div");
        craft_ammount_buttons.classList.add("craft_ammount_buttons");
        
        const button_5 = document.createElement("div");
        button_5.innerHTML = "5";
        button_5.dataset.craft_ammount = 5;
        button_5.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_5);

        const button_10 = document.createElement("div");
        button_10.innerHTML = "10";
        button_10.dataset.craft_ammount = 10;
        button_10.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_10);

        const button_all = document.createElement("div");
        button_all.innerHTML = "all";
        button_all.dataset.craft_ammount = Infinity;
        button_all.classList.add("craft_ammount_button");

        craft_ammount_buttons.append(button_all);

        recipe_div.append(craft_ammount_buttons);

        recipe_div.append(create_recipe_tooltip({category, subcategory, recipe_id}));
    } else if(subcategory === "components") {
        recipe_name_span.classList.add("recipe_name");
        recipe_div.children[0].innerHTML = '<i class="material-icons icon crafting_dropdown_icon"> keyboard_double_arrow_down </i>' + recipe_div.children[0].innerHTML;
        const material_selection = document.createElement("div");
        material_selection.classList.add("folded_material_list");
        recipe_div.addEventListener("click", (event)=>{
            if(event.target.classList.contains("recipe_name") || event.target.classList.contains("crafting_dropdown_icon")) {
                window.updateDisplayedMaterialChoice({category, subcategory, recipe_id});
                toggle_exclusive_class({element: recipe_div, class_name: "selected_recipe"});
            } 
        });

        recipe_div.append(material_selection);
    } else if(recipe.recipe_type === "component" || recipe.recipe_type === "componentless") {
        //component but from other category, which generally means clothing, or componentless, which currently means only capes
        
        recipe_name_span.classList.add("recipe_name");
        
        if(recipe.item_type === "Armor") {
            recipe_div.classList.add("clothing_recipe");
        }

        recipe_div.children[0].innerHTML = '<i class="material-icons icon crafting_dropdown_icon"> keyboard_double_arrow_down </i>' + recipe_div.children[0].innerHTML;
        const material_selection = document.createElement("div");
        material_selection.classList.add("folded_material_list");
        recipe_div.addEventListener("click", (event)=>{
            if(event.target.classList.contains("recipe_name") || event.target.classList.contains("crafting_dropdown_icon")) {

                remove_class_from_all("selected_component_list");
                remove_class_from_all("selected_component_category");
                
                window.updateDisplayedMaterialChoice({category, subcategory, recipe_id});
                toggle_exclusive_class({element: recipe_div, class_name: "selected_recipe"});
            } 
        });

        recipe_div.append(material_selection);
    } else if(subcategory === "equipment") {
        if(recipe.item_type === "Armor") {
            recipe_div.classList.add("armor_recipe");
        } else if(recipe.item_type === "Weapon") {
            recipe_div.classList.add("weapon_recipe");
        } else if(recipe.item_type === "Shield") {
            recipe_div.classList.add("shield_recipe");
        } else {
            console.warn(`Recipe "${category}" -> "${subcategory}" -> "${recipe_id}" has wrong type of resulting item ("${recipe.item_type}")`)
        }

        recipe_name_span.classList.add("recipe_name");
        
        recipe_div.children[0].innerHTML = '<i class="material-icons icon crafting_dropdown_icon"> keyboard_double_arrow_down </i>' +  recipe_div.children[0].innerHTML;

        const component_selection_1 = document.createElement("div"); //weapon head or internal armor
        component_selection_1.innerHTML = `<span class="crafting_selection"><i class="material-icons icon subcrafting_dropdown_icon"> keyboard_double_arrow_down </i>Select a [${recipe.components[0]}]</span>`;
        
        const component_1_list = document.createElement("div");
        component_1_list.classList.add("folded_crafting_selection");
        component_selection_1.appendChild(component_1_list);

        const component_selection_2 = document.createElement("div"); //weapon handle or external armor
        component_selection_2.innerHTML = `<span class="crafting_selection"><i class="material-icons icon subcrafting_dropdown_icon"> keyboard_double_arrow_down </i>Select a [${recipe.components[1]}]</span>`;
        
        const component_2_list = document.createElement("div");
        component_2_list.classList.add("folded_crafting_selection");
        component_selection_2.appendChild(component_2_list);

        const component_selections = document.createElement("div");
        component_selections.append(component_selection_1);
        component_selections.append(component_selection_2);

        recipe_div.addEventListener("click", (event)=>{
            if(event.target.classList.contains("recipe_name") || event.target.classList.contains("crafting_dropdown_icon")) {

                remove_class_from_all("selected_component_list");
                remove_class_from_all("selected_component_category");
                
                toggle_exclusive_class({element: recipe_div, class_name: "selected_recipe"});

                window.updateDisplayedComponentChoice({category, subcategory, recipe_id});

                update_recipe_tooltip({category, subcategory, recipe_id, components: []});
            }
        });

        component_selection_1.parentNode.children[0].addEventListener("click", (event)=>{
            //unfold a list for selection; its content already loaded by a different function
            if(event.target.classList.contains("crafting_selection") || event.target.classList.contains("subcrafting_dropdown_icon")) {
                component_selection_1.children[1].classList.toggle("selected_component_list");
                component_selection_1.children[0].classList.toggle("selected_component_category");
                if(recipe_div.querySelectorAll(".folded_crafting_selection").item(0).lastChild 
                    && !is_element_above_x(recipe_div.querySelectorAll(".folded_crafting_selection").item(0).lastChild, document.getElementById("exit_crafting_button"))) 
                {
                    recipe_div.querySelectorAll(".folded_crafting_selection").item(0).lastChild.scrollIntoView({block: "end", inline: "nearest"});
                }
            }
        });
        component_selection_2.parentNode.children[1].addEventListener("click", (event)=>{
            //unfold a list for selection; its content already loaded by a different function
            if(event.target.classList.contains("crafting_selection")  || event.target.classList.contains("subcrafting_dropdown_icon")) {
                component_selection_2.children[1].classList.toggle("selected_component_list");
                component_selection_2.children[0].classList.toggle("selected_component_category");
                if(!is_element_above_x(recipe_div.querySelector(".recipe_creation_button"), document.getElementById("exit_crafting_button"))) {
                    recipe_div.querySelector(".recipe_creation_button").scrollIntoView({block: "end", inline: "nearest"});
                }
            }
        });

        const accept_recipe_button = document.createElement("div");
        accept_recipe_button.innerHTML = "<span class='recipe_creation_span'>Create</span>";
        accept_recipe_button.classList.add("recipe_creation_button");

        const craft_ammount_buttons = document.createElement("div");
        craft_ammount_buttons.classList.add("craft_ammount_buttons");
        
        const button_5 = document.createElement("div");
        button_5.innerHTML = "5";
        button_5.dataset.craft_ammount = 5;
        button_5.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_5);

        const button_10 = document.createElement("div");
        button_10.innerHTML = "10";
        button_10.dataset.craft_ammount = 10;
        button_10.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_10);

        const button_all = document.createElement("div");
        button_all.innerHTML = "all";
        button_all.dataset.craft_ammount = Infinity;
        button_all.classList.add("craft_ammount_button");

        craft_ammount_buttons.append(button_all);

        accept_recipe_button.append(craft_ammount_buttons);

        accept_recipe_button.addEventListener("click", (event)=>{
            if(event.target.classList.contains("recipe_creation_button")) {
                window.useRecipe(event.target);
            } else if(!event.target.classList.contains("craft_ammount_button")) {
                window.useRecipe(event.target.parentNode);
            } else {
                window.useRecipe(event.target.parentNode.parentNode, Number(event.target.dataset.craft_ammount));
            }
        });

        recipe_div.append(component_selections);
        recipe_div.append(accept_recipe_button);
        accept_recipe_button.append(create_recipe_tooltip({category, subcategory, recipe_id, components: []}));
    } else {
        throw new Error(`No such crafting subcategory as "${subcategory}"`);
    }

    get_recipe_page(category, subcategory).appendChild(recipe_div);
}

/**
 * updates all displayed recipes; 
 * needs to be called whenever something is crafted (in case some recipe became unavailable due to lack of materials) and/or whenever a crafting-related skill levels up
 */
function update_displayed_crafting_recipes() {
    Object.keys(recipes).forEach(recipe_category => {
        Object.keys(recipes[recipe_category]).forEach(recipe_subcategory => {
            Object.keys(recipes[recipe_category][recipe_subcategory]).forEach(recipe => {
                if(recipes[recipe_category][recipe_subcategory][recipe].is_unlocked){
                    if(crafting_pages[recipe_category][recipe_subcategory].querySelector(`[data-recipe_id="${recipe}"]`)) {
                        update_displayed_crafting_recipe({category: recipe_category, subcategory: recipe_subcategory, recipe_id: recipe});
                    } else {
                        add_crafting_recipe_to_display({category: recipe_category, subcategory: recipe_subcategory, recipe_id: recipe});
                    }
                }
            })
        })
    });
}

/**
 * updates description and display color, based on resource availability and skill lvl
 */
function update_displayed_crafting_recipe({category, subcategory, recipe_id}) {
    const recipe_div = crafting_pages[category][subcategory].querySelector(`[data-recipe_id="${recipe_id}"]`);
    const recipe = recipes[category][subcategory][recipe_id];

    if(subcategory === "items") {
        if(recipe.get_availability().available_ammount) {
            recipe_div.classList.remove("recipe_unavailable");
        } else {
            recipe_div.classList.add("recipe_unavailable");
        }
        update_recipe_tooltip({category, subcategory, recipe_id});
    } else if(subcategory === "components" || recipe.recipe_type === "component") {
        update_recipe_tooltip({category, subcategory, recipe_id});
    } else if(subcategory === "equipment") {
        //update_recipe_tooltip({category, subcategory, recipe_id, material: null, components: []});
        //shouldn't actually be needed as tooltip already updates when opening recipe and when selecting components
    } else {
        console.error(`No such crafting subcategory as "${subcategory}"`);
    }
}

/**
 * creates a tooltip for the >final result<
 */
function create_recipe_tooltip({category, subcategory, recipe_id, material, components}) {
    const recipe = recipes[category][subcategory][recipe_id];
    const tooltip = document.createElement("div");
    tooltip.classList.add("recipe_tooltip");
    if(subcategory === "items") {
        tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id});
        tooltip.classList.add("items_recipe_tooltip");
    } else if(subcategory === "components" || recipe.recipe_type === "component") {
        if(!material) {
            throw new Error(`Component recipes require passing a material, but recipe "${category}" -> "${subcategory}" -> "${recipe_id}" had none!`);
        }
        tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id, material});
        tooltip.classList.add("component_recipe_tooltip");
    } else if(subcategory === "equipment") {
        tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id, material, components});
        tooltip.classList.add("equipment_recipe_tooltip");
    } else {
        console.error(`No such crafting subcategory as "${subcategory}"`);
    }
    return tooltip;
}

function update_item_recipe_tooltips() {
    Object.keys(recipes).forEach(recipe_category => {
        Object.keys(recipes[recipe_category]).forEach(recipe_subcategory => {
            if(recipe_subcategory === "items") {
                Object.keys(recipes[recipe_category][recipe_subcategory]).forEach(recipe => {
                    if(recipes[recipe_category][recipe_subcategory][recipe].is_unlocked){
                        update_recipe_tooltip({category: recipe_category, subcategory: "items", recipe_id: recipe});
                    }
                });
            }
        });
    });
}

function update_recipe_tooltip({category, subcategory, recipe_id, components}) {
    const recipe = recipes[category][subcategory][recipe_id];
    if(subcategory === "items") {
        const tooltip = crafting_pages[category][subcategory].querySelector(`[data-recipe_id="${recipe_id}"]`).querySelector(`.${subcategory}_recipe_tooltip`);

        tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id});
    } else if(subcategory === "components" || recipe.recipe_type === "component" || recipe.recipe_type === "componentless") {
        const material_selections_div = crafting_pages[category][subcategory].querySelector(`[data-recipe_id='${recipe_id}']`).children[1];
        for(let i = 0; i < material_selections_div.children.length; i++) {
            const tooltip = material_selections_div.children[i].querySelector(`[data-recipe_id="${recipe_id}"]`)?.querySelector(`.${subcategory}_recipe_tooltip`);
            if(!tooltip) {
                return;
            }
            const material_key = material_selections_div.children[i].dataset.item_key;
            const {id} = JSON.parse(material_key);
            const material_recipe = recipe.materials.filter(material => material.material_id === id);
            
            tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id, material: material_recipe[0]});
        }
    } else if(subcategory === "equipment") {
            const tooltip = crafting_pages[category][subcategory].querySelector(`[data-recipe_id="${recipe_id}"]`)?.querySelector(`.${subcategory}_recipe_tooltip`);
            if(!tooltip) {
                return;
            }
            tooltip.innerHTML = create_recipe_tooltip_content({category, subcategory, recipe_id, components});
    } else {
        console.error(`No such crafting subcategory as "${subcategory}"`);
    }
}

function create_recipe_tooltip_content({category, subcategory, recipe_id, material, components}) {
    const recipe = recipes[category][subcategory][recipe_id];
    const station_tier = current_location?.crafting?.tiers[category] || 1;
    let tooltip = "";
    if(subcategory === "items") {
        const success_chance = Math.round(100*recipe.get_success_chance(station_tier));
        tooltip += `Success chance: <b><span style="color:${success_chance > 74?"lime":success_chance>49?"yellow":success_chance>24?"orange":"red"}">${success_chance}%</span></b><br><br>Materials required:<br>`;
        for(let i = 0; i < recipe.materials.length; i++) {
            if(recipe.materials[i].material_id) {
                const key = item_templates[recipe.materials[i].material_id].getInventoryKey();
                if(character.inventory[key]?.count >= recipe.materials[i].count) {
                    tooltip += `<span style="color:lime"><b>${item_templates[recipe.materials[i].material_id].getName()} x${character.inventory[key]?.count || 0}/${recipe.materials[i].count}</b></span><br>`;
                } else {
                    tooltip += `<span style="color:red"><b>${item_templates[recipe.materials[i].material_id].getName()} x${character.inventory[key]?.count || 0}/${recipe.materials[i].count}</b></span><br>`;
                }
            } else if(recipe.materials[i].material_type) {
                //check if mat type available, grab all that fit

                let mats = [];
                Object.keys(character.inventory).forEach(key => {
                    if(character.inventory[key].item.material_type === recipe.materials[i].material_type) {
                        mats.push(character.inventory[key]);
                    }
                });

                mats = mats.sort((a,b) => a.item.getBaseValue()-b.item.getBaseValue());
                let any_available = false;
                let mat_list = "";
                for(let j = 0; j < mats.length; j++) {
                    if(mats[j].count >= recipe.materials[i].count) {
                        any_available = true;
                        mat_list += `<span style="color:lime"><b>${mats[j].item.getName()} x${mats[j].count || 0}/${recipe.materials[i].count}</b></span><br>`;
                    } else {
                        mat_list  += `<span style="color:red"><b>${mats[j].item.getName()} x${mats[j].count || 0}/${recipe.materials[i].count}</b></span><br>`;
                    }
                }

                if(mats.length > 0) {
                    if(any_available) {
                        tooltip+=`<span style="color:lime"><b>Any ${recipe.materials[i].material_type} x${recipe.materials[i].count}:</b></span><br>`;
                    } else {
                        tooltip+=`<span style="color:red"><b>Any ${recipe.materials[i].material_type} x${recipe.materials[i].count}:</b></span><br>`;
                    }
                    tooltip+=`<div class="crafting_tooltip_mat_list">${mat_list}</div>`;

                } else {
                    tooltip+=`<span style="color:red"><b>Any ${recipe.materials[i].material_type} x${recipe.materials[i].count}:</b></span><br>`;
                }
            }
        }
        const xp_val_1 = get_recipe_xp_value({category, subcategory, recipe_id});
        tooltip += `<br>XP value: ${xp_val_1}`;
        tooltip += `<br>Result:<br><div class="recipe_result">${create_item_tooltip_content({item: item_templates[recipe.getResult().result_id], options: {skip_quality: true, anchor_tooltip: true}})}</div>`;
    } else if(subcategory === "components"  || recipe.recipe_type === "component") {
        //some component

        tooltip += `Material required:<br>`;
        if(character.inventory[item_templates[material.material_id].getInventoryKey()]?.count >= material.count) {
            tooltip += `<span style="color:lime"><b>${item_templates[material.material_id].getName()} x${character.inventory[item_templates[material.material_id].getInventoryKey()]?.count || 0}/${material.count}</b></span><br>`;
        } else {
            tooltip += `<span style="color:red"><b>${item_templates[material.material_id].getName()} x${character.inventory[item_templates[material.material_id].getInventoryKey()]?.count || 0}/${material.count}</b></span><br>`;
        }

        const quality_range = recipe.get_quality_range(station_tier - item_templates[material.result_id].component_tier);

        const xp_val_1 = get_recipe_xp_value({category, subcategory, recipe_id, material_count: material.count, result_tier: item_templates[material.result_id].component_tier, rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[0])]});
        const xp_val_2 = get_recipe_xp_value({category, subcategory, recipe_id, material_count: material.count, result_tier: item_templates[material.result_id].component_tier, rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[1])]});

        tooltip += `<br>XP value: ${xp_val_1} - ${xp_val_2}<br>`;
        tooltip += `<br>Result:<br><div class="recipe_result">${create_item_tooltip_content({item: item_templates[material.result_id], options: {quality: quality_range}})}</div>`;
    } else if(subcategory === "equipment") {
        if(!components) {
            //it's a componentless equipment recipe
            tooltip += `Material required:<br>`;
            if(character.inventory[item_templates[material.material_id].getInventoryKey()]?.count >= material.count) {
                tooltip += `<span style="color:lime"><b>${item_templates[material.material_id].getName()} x${character.inventory[item_templates[material.material_id].getInventoryKey()]?.count || 0}/${material.count}</b></span><br>`;
            } else {
                tooltip += `<span style="color:red"><b>${item_templates[material.material_id].getName()} x${character.inventory[item_templates[material.material_id].getInventoryKey()]?.count || 0}/${material.count}</b></span><br>`;
            }

            const quality_range = recipe.get_quality_range(station_tier - item_templates[material.result_id].item_tier);
            const xp_val_1 = get_recipe_xp_value({category, subcategory, recipe_id, material_count: material.count, result_tier: item_templates[material.result_id].item_tier, rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[0])]});
            const xp_val_2 = get_recipe_xp_value({category, subcategory, recipe_id, material_count: material.count, result_tier: item_templates[material.result_id].item_tier, rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[1])]});
            tooltip += `<br>XP value: ${xp_val_1} - ${xp_val_2}<br>`;
            tooltip += `<br>Result:<br><div class="recipe_result">${create_item_tooltip_content({item: item_templates[material.result_id], options: {quality: quality_range}})}</div>`;
        } else if(components.length < 2) {
            tooltip += `Result:<br><div class="recipe_result">Select one component from each category</div>`;
        } else if(components.length == 2) {
            let item = "";
            
            if(recipe.item_type === "Weapon") {
                item = new Weapon(
                    {
                        components: {
                            head: components[0].item.id,
                            handle: components[1].item.id,
                        },
                    }
                );
            } else if(recipe.item_type === "Armor") {
                item = new Armor(
                    {
                        components: {
                            internal: components[0].item.id,
                            external: components[1].item.id,
                        },
                    }
                );
            } else if(recipe.item_type === "Shield") {
                item = new Shield(
                    {
                        components: {
                            shield_base: components[0].item.id,
                            handle: components[1].item.id,
                        },
                    }
                );
            } else {
                throw new Error(`Recipe "${category}" -> "${subcategory}" -> "${recipe_id}" has an incorrect item type "${recipe.item_type}"`)
            }
            const quality_range = recipe.get_quality_range(recipe.get_component_quality_weighted(components[0].item, components[1].item), (station_tier-Math.max(components[0].item.component_tier, components[1].item.component_tier)) || 0);
            const xp_val_1 = get_recipe_xp_value({category, subcategory, recipe_id, selected_components: [item_templates[components[0].item.id], item_templates[components[1].item.id]], rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[0])]});
            const xp_val_2 = get_recipe_xp_value({category, subcategory, recipe_id, selected_components: [item_templates[components[0].item.id], item_templates[components[1].item.id]], rarity_multiplier: rarity_multipliers[getItemRarity(quality_range[1])]});
            tooltip += `<br>XP value: ${xp_val_1} - ${xp_val_2}<br>`;
            tooltip += `Result:<br><div class="recipe_result">${create_item_tooltip_content({item, options: {quality: quality_range}})}</div>`;
        } else {
            throw new Error(`Somehow recipe "${category}" -> "${subcategory}" -> "${recipe_id}" received more components than there should be (${components.length} instead of 2)`)
        }
    } else {
        console.error(`No such crafting subcategory as "${subcategory}"`);
    }

    return tooltip;
}

/**
 * updates the list of selectable components for equipment crafting;
 * generally called for the recipe that was just used
 * component_keys is used for automatically selecting two comps
 */
function update_displayed_component_choice({category, recipe_id, component_keys = {}}) {
    const recipe_div = crafting_pages[category]["equipment"].querySelector(`[data-recipe_id="${recipe_id}"]`);
    const recipe = recipes[category]["equipment"][recipe_id];

    const component_selections_div = crafting_pages[category]["equipment"].querySelector(`[data-recipe_id='${recipe_id}']`).children[1].children;
    
    component_selections_div[0].children[1].innerHTML = "";
    component_selections_div[1].children[1].innerHTML = "";

    const components = [];
    components.push(Object.values(character.inventory).filter(item=>{
        return recipe.components[0] === item.item.component_type;
    }));

    components.push(Object.values(character.inventory).filter(item=>{
        return recipe.components[1] === item.item.component_type;
    }));

    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < components[i].length; j++) {
            const item_div = document.createElement("div");
            item_div.innerHTML = `<i class="material-icons icon selected_component_icon"> check </i>${components[i][j].item.name}, ${components[i][j].item.quality}%, x${components[i][j].count}`;
            item_div.classList.add("selectable_component");
            item_div.dataset.item_key = components[i][j].item.getInventoryKey();
            item_div.dataset.item_quality = components[i][j].item.quality;
            item_div.dataset.item_name = components[i][j].item.getName();
            item_div.dataset.component_tier = components[i][j].item.component_tier;
            item_div.appendChild(create_item_tooltip(components[i][j].item, {class_name: "recipe_tooltip"}));
            
            item_div.addEventListener("click", ()=>{
                toggle_exclusive_class({element: item_div, siblings_only: true, class_name: "selected_component"});
                const components = [];
                const component_1_key = recipe_div.children[1].children[0].children[1].querySelector(".selected_component")?.dataset.item_key;
                if(component_1_key) {
                    components.push(character.inventory[component_1_key]);
                }

                const component_2_key = recipe_div.children[1].children[1].children[1].querySelector(".selected_component")?.dataset.item_key;
                if(component_2_key) {
                    components.push(character.inventory[component_2_key]);
                }
                update_recipe_tooltip({category, subcategory: "equipment", recipe_id, components});
            });
                
            component_selections_div[i].children[1].appendChild(item_div);

            if(component_keys[item_div.dataset.item_key]) {
                item_div.click();
            }
        }
    }
    if(!is_element_above_x(recipe_div.querySelector(".recipe_creation_button"), document.getElementById("exit_crafting_button"))) {
        recipe_div.querySelector(".recipe_creation_button").scrollIntoView({block: "end", inline: "nearest"});
    }
    
    for(let i = 0; i < 2; i++) {
        [...component_selections_div[i].children[1].children].sort((a,b) => {
            if(Number.parseInt(a.dataset.component_tier) > Number.parseInt(b.dataset.component_tier)) {
                return -1;
            } else if (Number.parseInt(a.dataset.component_tier) < Number.parseInt(b.dataset.component_tier)) {
                return 1;
            } else if(a.dataset.item_name > b.dataset.item_name) {
                return 1;
            } else if(a.dataset.item_name < b.dataset.item_name) {
                return -1;
            } else if(Number.parseInt(a.dataset.item_quality) > Number.parseInt(b.dataset.item_quality)) {
                return -1;
            } else {
                return 1;
            }

        }).forEach(node=>component_selections_div[i].children[1].appendChild(node));
    }
}

/**
 * updates the list of selectable materials for component crafting;
 * displays only the materials available in inventory; those that are in too low number are grayed out and unselectable
 */
function update_displayed_material_choice({category, subcategory, recipe_id, refreshing}) {
    const recipe = recipes[category][subcategory][recipe_id];

    const material_selections_div = crafting_pages[category][subcategory].querySelector(`[data-recipe_id='${recipe_id}']`).children[1];
    
    material_selections_div.innerHTML = "";

    const materials = Object.values(character.inventory).filter(item=>{
        return recipe.materials.filter(material => material.material_id === item.item?.id).length > 0;
    });

    for(let i = 0; i < materials.length; i++) {
        const material_recipe = recipe.materials.filter(material => material.material_id === materials[i].item.id)[0];
        const item_div = document.createElement("div");
        const name_span = document.createElement("span");
        name_span.innerHTML = `<i class="material-icons icon selected_material_icon"> check </i>${item_templates[material_recipe.result_id].getName()}`;
        name_span.classList.add("recipe_comp_name");
        item_div.append(name_span);
        item_div.classList.add("selectable_material");
        item_div.dataset.item_key = materials[i].item.getInventoryKey();

        if(material_recipe.count <= materials[i].count) {
            item_div.addEventListener("click", (event)=>{
                item_div.classList.add("selected_material");
                if(event.target.classList.contains("selectable_material")) {
                    window.useRecipe(event.target.parentNode);
                } else if(!event.target.classList.contains("craft_ammount_button")) {
                    window.useRecipe(event.target.parentNode.parentNode);
                } else{
                    window.useRecipe(event.target.parentNode.parentNode.parentNode, Number(event.target.dataset.craft_ammount));
                }
                item_div.classList.remove("selected_material"); //this is so stupid
            });
        } else {
            item_div.classList.add("recipe_unavailable");
        }

        const craft_ammount_buttons = document.createElement("div");
        craft_ammount_buttons.classList.add("craft_ammount_buttons");
        
        const button_5 = document.createElement("div");
        button_5.innerHTML = "5";
        button_5.dataset.craft_ammount = 5;
        button_5.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_5);

        const button_10 = document.createElement("div");
        button_10.innerHTML = "10";
        button_10.dataset.craft_ammount = 10;
        button_10.classList.add("craft_ammount_button");
        craft_ammount_buttons.append(button_10);

        const button_all = document.createElement("div");
        button_all.innerHTML = "all";
        button_all.dataset.craft_ammount = Infinity;
        button_all.classList.add("craft_ammount_button");

        craft_ammount_buttons.append(button_all);

        item_div.append(craft_ammount_buttons);

        item_div.append(create_recipe_tooltip({category, subcategory, recipe_id, material: material_recipe}));
        material_selections_div.appendChild(item_div);
    }
    if(!refreshing) {
        material_selections_div.lastChild?.scrollIntoView();
    }
}

function update_item_recipe_visibility() {
    Object.keys(recipes).forEach(recipe_category => {
        Object.keys(recipes[recipe_category]).forEach(recipe_subcategory => {
            if(recipe_subcategory !== "items") {
                //no need to deal with other recipe types as they would be folded and will be reloaded on unfolding
                return;
            }
            Object.keys(recipes[recipe_category][recipe_subcategory]).forEach(recipe => {
                if(!recipes[recipe_category][recipe_subcategory][recipe].is_unlocked) {
                    return;
                }
                const recipe_div = crafting_pages[recipe_category][recipe_subcategory].querySelector(`[data-recipe_id="${recipe}"`);
                if(!recipes[recipe_category][recipe_subcategory][recipe].get_availability().available_ammount) {
                    recipe_div.classList.add("recipe_unavailable");
                } else {
                    recipe_div.classList.remove("recipe_unavailable");
                }
            });
        })
    });
}

function create_location_action_tooltip(location_action) {
    const action_tooltip = document.createElement("div");
    action_tooltip.id = "location_action_tooltip";
    action_tooltip.classList.add("job_tooltip");
    action_tooltip.innerHTML = location_action.description;

    return action_tooltip;
}

/**
 * 
 * @param {LocationActivity} location_activity 
 */
function create_gathering_tooltip(location_activity) {
    const gathering_tooltip = document.createElement("div");
    gathering_tooltip.classList.add("job_tooltip");
    gathering_tooltip.dataset.job_tooltip = location_activity.activity_id;

    const {gathering_time_needed, gained_resources} = location_activity.getActivityEfficiency();

    let skill_names = "";
    for(let i = 0; i < activities[location_activity.activity_name].base_skills_names.length; i++) {
        skill_names += skills[activities[location_activity.activity_name].base_skills_names[i]].name();
    }

    if(location_activity.gained_resources.scales_with_skill) {
        gathering_tooltip.innerHTML = `<span class="activity_efficiency_info">Efficiency scaling:<br>"${skill_names}" skill lvl ${location_activity.gained_resources.skill_required[0]} to ${location_activity.gained_resources.skill_required[1]}</span><br><br>`;
    }

    gathering_tooltip.innerHTML += `Every ${format_time({time: {minutes: gathering_time_needed}, round: false})}, chance to find:`;
    for(let i = 0; i < gained_resources.length; i++) {
        const name = item_templates[gained_resources[i].name].getName();
        gathering_tooltip.innerHTML += `<br>x${gained_resources[i].count[0]===gained_resources[i].count[1]?gained_resources[i].count[0]:`${gained_resources[i].count[0]}-${gained_resources[i].count[1]}`} "${name}" at ${Math.round(100*gained_resources[i].chance)}%`;
    }

    return gathering_tooltip;
}

/**
 * Updates gathering tooltip, both for location view and for an ongoing gathering
 * @param {LocationActivity} activity 
 * @returns 
 */
function update_gathering_tooltip(activity) {
    let parent = document.querySelector(`[data-activity="${activity.activity_id}"]`);
    let gathering_tooltip;
    if(parent) {
        gathering_tooltip = parent.getElementsByClassName("job_tooltip")[0];
    } else {
        gathering_tooltip = document.getElementById("gathering_progress_bar_max")?.querySelector(`[data-job_tooltip="${activity.activity_id}"]`);
    }

    if(!gathering_tooltip) {
        return;
    }
    
    const {gathering_time_needed, gained_resources} = activity.getActivityEfficiency();

    let skill_names = "";
    for(let i = 0; i < activities[activity.activity_name].base_skills_names.length; i++) {
        skill_names += skills[activities[activity.activity_name].base_skills_names[i]].name();
    }

    if(activity.gained_resources.scales_with_skill) {
        gathering_tooltip.innerHTML = `<span class="activity_efficiency_info">Efficiency scaling:<br>"${skill_names}" skill lvl ${activity.gained_resources.skill_required[0]} to ${activity.gained_resources.skill_required[1]}</span><br><br>`;
    }
    gathering_tooltip.innerHTML += `Every ${format_working_time(gathering_time_needed)}, chance to find:`;
    for(let i = 0; i < gained_resources.length; i++) {
        gathering_tooltip.innerHTML += `<br>x${gained_resources[i].count[0]===gained_resources[i].count[1]?gained_resources[i].count[0]:`${gained_resources[i].count[0]}-${gained_resources[i].count[1]}`} "${gained_resources[i].name}" at ${Math.round(100*gained_resources[i].chance)}%`;
    }
}

function update_displayed_health() { //call it when using healing items, resting or getting hit
    current_health_value_div.innerText = Math.ceil(character.stats.full.health) + "/" + Math.ceil(character.stats.full.max_health) + " hp";
    current_health_bar.style.width = (character.stats.full.health*100/character.stats.full.max_health).toString() +"%";
}
function update_displayed_stamina() { //call it when eating, resting or fighting
    current_stamina_value_div.innerText = Math.round(character.stats.full.stamina) + "/" + Math.round(character.stats.full.max_stamina) + " stamina";
    current_stamina_bar.style.width = (character.stats.full.stamina*100/character.stats.full.max_stamina).toString() +"%";
}

/**
 * updates displayed stats and their breakdowns (including health and stamina)
 */
function update_displayed_stats() {
    Object.keys(stats_divs).forEach(function(key){
        if(key === "crit_rate" || key === "crit_multiplier") {
            stats_divs[key].innerHTML = `${(character.stats.full[key]*100).toFixed(1)}%`;
        } 
        else if(key === "attack_speed") {
            stats_divs[key].innerHTML = `${(character.get_attack_speed()).toFixed(1)}`;
        }
        else if(key === "attack_power") {
            stats_divs[key].innerHTML = `${(character.get_attack_power()).toFixed(1)}`;
        }
        else {
            stats_divs[key].innerHTML = `${(character.stats.full[key]).toFixed(1)}`;
        }
        update_stat_description(key);
    });

    const attack_stats = document.getElementById("attack_stats");

    const ap = Math.round(character.stats.full.attack_points);
    other_combat_divs.attack_points.innerHTML = `${ap}`;

    if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") { //HAS SHIELD
        const dp = (character.stats.full.block_chance*100).toFixed(1)
        other_combat_divs.defensive_action.innerHTML = "Block :";
        other_combat_divs.defensive_points.innerHTML = `${dp}%`;
        other_combat_divs.defensive_points.parentNode.children[2].children[0].innerHTML = "Chance to block an attack";

        attack_stats.children[3].innerHTML = `Block : ${Math.round(dp)}%`;
    }
    else { //NO SHIELD
        const ep = Math.round(character.stats.full.evasion_points);
        other_combat_divs.defensive_action.innerHTML = "EP : ";
        other_combat_divs.defensive_points.innerHTML = `${ep}`;
        other_combat_divs.defensive_points.parentNode.children[2].children[0].innerHTML = 
        "Evasion points, a total value of everything that contributes to the evasion chance, except for some situational skills and modifiers";

        attack_stats.children[3].innerHTML = `EP: ${Math.round(ep)} `;
    }

    update_stat_description("defensive_points");
    update_stat_description("attack_points");
    update_bar_tooltips();

    let atk = character.get_attack_power();
    if(atk > 100) {
        atk = Math.round(atk);
    } else {
        atk = Math.round(10*atk)/10;
    }
    attack_stats.children[0].innerHTML = `Atk: ${atk}`;
    attack_stats.children[1].innerHTML = `Spd: ${Math.round(character.get_attack_speed()*100)/100}`;
    attack_stats.children[2].innerHTML = `AP:  ${Math.round(ap)}`;
    attack_stats.children[4].innerHTML = `Def: ${Math.round(character.stats.full.defense)} `;
}

function update_stat_description(stat) {
    let target;

    if(stats_divs[stat]){
        target = stats_divs[stat].parentNode.children[2].children[1];
    } else if(other_combat_divs[stat] && stat !== "defensive_action") {
        target = other_combat_divs[stat].parentNode.children[2].children[1]; 
    } else {
        return;
    }

    target.innerHTML = create_stat_breakdown(stat);
    
    return;
}

function update_bar_tooltips(){
    update_health_bar_tooltip();
    update_stamina_bar_tooltip();
    update_xp_bar_tooltip();
}

/**
 * health bar tooltip, max health only
 */
function update_health_bar_tooltip() {
    health_tooltip_div.innerHTML = "<b>Max health:</b> " + Math.round(character.stats.full.max_health) + "<br>";
    health_tooltip_div.innerHTML += create_stat_breakdown("max_health");

    health_tooltip_div.innerHTML += "<br>------------------------<br><b>Health regen (flat):</b> " + Math.round(10*character.stats.full.health_regeneration_flat)/10 + "<br>";
    health_tooltip_div.innerHTML += create_stat_breakdown("health_regeneration_flat");

    health_tooltip_div.innerHTML += "<br>------------------------<br><b>Health regen (%):</b> " + Math.round(10*character.stats.full.health_regeneration_percent)/10 + "<br>";
    health_tooltip_div.innerHTML += create_stat_breakdown("health_regeneration_percent");
}


/**
 * stamina bar tooltip, max and efficiency only
 */
function update_stamina_bar_tooltip() {
    stamina_tooltip_div.innerHTML = "<b>Max stamina:</b> " + Math.round(character.stats.full.max_stamina) + "<br>";
    stamina_tooltip_div.innerHTML += create_stat_breakdown("max_stamina");

    stamina_tooltip_div.innerHTML += "<br>------------------------<br><b>Stamina efficiency:</b> " + Math.round(100*character.stats.full.stamina_efficiency)/100 + "<br>";
    stamina_tooltip_div.innerHTML += create_stat_breakdown("stamina_efficiency");

    stamina_tooltip_div.innerHTML += "<br>------------------------<br><b>Stamina regen (flat):</b> " + Math.round(10*character.stats.full.stamina_regeneration_flat)/10 + "<br>";
    stamina_tooltip_div.innerHTML += create_stat_breakdown("stamina_regeneration_flat");

    stamina_tooltip_div.innerHTML += "<br>------------------------<br><b>Stamina regen (%):</b> " + Math.round(10*character.stats.full.stamina_regeneration_percent)/10 + "<br>";
    stamina_tooltip_div.innerHTML += create_stat_breakdown("stamina_regeneration_percent");
}

function update_xp_bar_tooltip() {

    xp_bar_tooltip_div.innerHTML = "<b>Global xp multiplier:</b> " + Math.round(100*character.xp_bonuses.total_multiplier.all)/100 + "<br>";
    xp_bar_tooltip_div.innerHTML += create_xp_bonus_breakdown("all", false);

    xp_bar_tooltip_div.innerHTML += "<br>------------------------<br><b>Hero xp multiplier:</b> " + Math.round(100*character.xp_bonuses.total_multiplier.hero)/100 
                                    + " (with global: " + Math.round(get_hero_xp_gain()*100)/100 +")<br>";
    xp_bar_tooltip_div.innerHTML += create_xp_bonus_breakdown("hero", false);

    xp_bar_tooltip_div.innerHTML += "<br>------------------------<br><b>Skill xp multiplier:</b> " + Math.round(100*character.xp_bonuses.total_multiplier.all_skill)/100
                                    + " (with global: " + Math.round(get_skills_overall_xp_gain()*100)/100 +")<br>";
    xp_bar_tooltip_div.innerHTML += create_xp_bonus_breakdown("all_skill", false);

}

/**
 * creates full breakdown for provided stat
 * @param {} stat 
 * @returns 
 */
function create_stat_breakdown(stat) {
    let html_string = "";

    if(stat === "attack_power") {
        html_string += 
        `<br>Breakdown:
        <br>Base value (weapon * str/10): ${Math.round(100* character.stats.total_flat.attack_power)/100}`;
    } else if (stat === "attack_points"){
        html_string += 
        `<br>Breakdown:
        <br>Base value: ${Math.round(100* character.stats.total_flat.attack_points)/100}`;
    } else if(stat === "defensive_points"){
        if(character.equipment["off-hand"] != null && character.equipment["off-hand"].offhand_type === "shield") {
            stat = "block_chance";
        } else {
            stat = "evasion_points";
        }
        html_string += 
            `<br>Breakdown:
            <br>Base value: ${Math.round(100 * character.stats.total_flat[stat])/100}`;
    } else {
       html_string += 
        `<br>Breakdown:
        <br>Base value: ${Math.round(100*character.base_stats[stat])/100}`;
    }

    Object.keys(character.stats.flat).forEach(stat_type => {
        if(character.stats.flat[stat_type][stat] && character.stats.flat[stat_type][stat] !== 0) {
            const sign = character.stats.flat[stat_type][stat]>=0?"+":"";
            html_string +=  `<br>${capitalize_first_letter(stat_type.replace("_"," "))}: ${sign}${Math.round(100*character.stats.flat[stat_type][stat])/100}`;
        }
    });

    Object.keys(character.stats.multiplier).forEach(stat_type => {
        if(character.stats.multiplier[stat_type][stat] && character.stats.multiplier[stat_type][stat] !== 1) {
            html_string +=  `<br>${capitalize_first_letter(stat_type.replace("_"," "))}: x${Math.round(100*character.stats.multiplier[stat_type][stat])/100}`;
        }
    });

    return html_string;
}

/**
 * creates full breakdown for provided bonus category (skill id, skill category, all, all skill, hero)
 * @param {*} bonus 
 * @param {*} include_multipliers 
 * @returns 
 */
function create_xp_bonus_breakdown(bonus, include_multipliers) {
    let html_string = "";
    let xp_bonus_value = 1;

    if(include_multipliers) {
        if(bonus !== "all") {
            if(bonus !== "all_skill" && bonus !== "hero") {
                xp_bonus_value = get_skill_xp_gain_bonus(bonus);
            } else {
                xp_bonus_value *= (character.xp_bonuses.total_multiplier.all || 1);
            }
        }
    }

    html_string += `<br>Breakdown:
        <br>Base value: ${Math.round(100*xp_bonus_value)/100}`;
    
    Object.keys(character.xp_bonuses.multiplier).forEach(bonus_type => {
        if(character.xp_bonuses.multiplier[bonus_type]?.[bonus] && character.xp_bonuses.multiplier[bonus_type]?.[bonus] !== 1) {
            html_string +=  `<br>${capitalize_first_letter(bonus_type.replace("_"," "))}: x${Math.round(100*character.xp_bonuses.multiplier[bonus_type][bonus])/100}`;
        }
    });

    return html_string;
}

function update_displayed_effects() {
    const effect_count = Object.keys(active_effects).length;
    active_effect_count.innerText = effect_count;
    if(effect_count > 0) {
        //effects exist, refresh the whole displayed content
        active_effects_tooltip.innerHTML = '';
        
        Object.values(effect_divs).forEach(eff => {
            eff.remove();
        });

        effect_divs = {};
        Object.values(active_effects).forEach(effect => {
            effect_divs[effect.name] = create_effect_tooltip({effect_name: effect.name, duration: effect.duration, add_bonus: true});
            active_effects_tooltip.appendChild(effect_divs[effect.name]);
        });
    } else {
        //no effects
        active_effects_tooltip.innerHTML = 'No active effects';
        effect_divs = {};
    }
    update_displayed_effect_durations();
}

function update_displayed_effect_durations() {
    Object.keys(effect_divs).forEach(key => {
        if(!active_effects[key]?.duration) {
            effect_divs[key].remove();
            delete effect_divs[key];
        } else {
            effect_divs[key].querySelector(".active_effect_duration").innerHTML = format_time({time: {minutes: active_effects[key].duration}, round: false});
        }
    });
}

function update_displayed_time() {
    let time_of_the_day = current_game_time.getTimeOfDaySimple();

    //color coding like it used to be done with icon?

    time_field.innerHTML = current_game_time.toString() + ", <b>" + time_of_the_day + "</b>";
}

function update_displayed_temperature() {
    const temperature = get_current_temperature_smoothed();
    let displayed_temperature = options.use_uncivilised_temperature_scale?celsius_to_fahrenheit(temperature):temperature;

    const temperature_unit = options.use_uncivilised_temperature_scale?"°F":"°C";

    //whether temperature is low enough to give any cold effect
    const is_cold = temperature < (cold_status_temperatures[0]-get_character_cold_tolerance())?true:false;
    let temperature_class = "normal_temperature";
    if(is_cold) {
        temperature_class = "cold_temperature";
    }

    displayed_temperature = displayed_temperature.toString();
    if(!displayed_temperature.includes(".")) {
        //checks if there's a decimal, adds a trailing zero if not
        displayed_temperature += ".0";
    }

    if(current_location.is_under_roof) {
        weather_field.innerHTML = displayed_temperature +temperature_unit;
    } else {
        if(is_raining()) {
            if(temperature > 0) {
                //rain/clouds
                weather_field.innerHTML = `<span class="material-icons icon">cloud</span><span class="${temperature_class}">` + displayed_temperature +temperature_unit+"</span>";
            } else {
                //snow
                weather_field.innerHTML = `<span class="material-icons icon">ac_unit</span><span class="${temperature_class}">` + displayed_temperature +temperature_unit+"</span>";
            }
        } else {
            //normal weather, no icon
            weather_field.innerHTML = `<span class="${temperature_class}">` + displayed_temperature +temperature_unit+"</span>";
        }
    }

    weather_field.appendChild(create_temperature_tooltip());
}

function create_temperature_tooltip() {
    const tooltip = document.createElement("div");

    tooltip.id = "temperature_tooltip";
    if(!options.use_uncivilised_temperature_scale) {
         tooltip.innerHTML = `Lowest tolerable temperature: <strong>${Math.round(10*(lowest_tolerable_temperature - get_character_cold_tolerance()))/10}</strong>`;
        tooltip.innerHTML += `<br>(<strong>${lowest_tolerable_temperature}</strong> base minus <strong>${Math.round(10*get_character_cold_tolerance())/10}</strong> cold protection)<br>`;
        tooltip.innerHTML += create_stat_breakdown("cold_tolerance");
    } else {
        tooltip.innerHTML = `Lowest tolerable temperature: <strong>${Math.round(10*(celsius_to_fahrenheit(lowest_tolerable_temperature - get_character_cold_tolerance())))/10}</strong>`;
        tooltip.innerHTML += `<br>(<strong>${Math.round(10*celsius_to_fahrenheit(lowest_tolerable_temperature))/10}</strong> base minus <strong>${Math.round(10*celsius_to_fahrenheit(get_character_cold_tolerance())-320)/10}</strong> cold protection)<br>`;
        tooltip.innerHTML += create_stat_breakdown("cold_tolerance");
        tooltip.innerHTML += `<br>Scale conversion: x1.8`;
    }

    return tooltip;
}

/** 
 * formats money to a nice string in form x..x G xx S xx C (gold/silver/copper) 
 * @param {Number} num value to be formatted
 * @param {Boolean} round if the value should be rounded a bit
 */
function format_money(num) {
    let value;
    const sign = num >= 0 ? '' : '-';
    num = Math.abs(num);
    
    if(num > 0) {
        value = (num%10 != 0 ? `${num%10}<span class="coin coin_wood">W</span>` : '');

        if(num > 9) {
            value = (Math.floor(num/10)%100 != 0?`${Math.floor(num/10)%100}<span class="coin coin_copper">C</span>${value?" ":""}` :'') + value;
            if(num > 999) {
                value = (Math.floor(num/1000)%100 != 0?`${Math.floor(num/1000)%100}<span class="coin coin_silver">S</span>${value?" ":""}` :'') + value;
                if(num > 99999) {
                    value = `${Math.floor(num/100000)}<span class="coin coin_gold">G</span>${value?" ":""}` + value;
                }
            
            }  
        }

        return sign + value;

    } else {
        return 'nothing';
    }
}

function update_displayed_character_xp(did_level = false) {
    /*
    character_xp_div
        character_xp_bar_max
            character_xp_bar_current
        charaxter_xp_value
    */
    character_xp_div.children[0].children[0].style.width = `${100*character.xp.current_xp/character.xp.xp_to_next_lvl}%`;
    character_xp_div.children[1].innerText = `${expo(character.xp.current_xp)} / ${expo(character.xp.xp_to_next_lvl)} xp`;

    if(did_level) {
        character_level_div.innerText = `Level: ${character.xp.current_level}`;
        update_displayed_health();
    }
}

function update_displayed_xp_bonuses() {
    update_xp_bar_tooltip();
}

function update_displayed_stamina_efficiency() {
    update_stamina_bar_tooltip();
}

/**
 * updates displayed reputation, only showing regions where value is > 0
 */
function update_displayed_reputation() {
    data_entry_divs.reputation.innerHTML = "";

    Object.keys(character.reputation).forEach(reputation_region => {
        if(character.reputation[reputation_region] > 0) {
            const rep_div = document.createElement("div");
            const rep_name_span = document.createElement("span");
            const rep_value_span = document.createElement("span");
            rep_div.classList.add("data_entry");
            rep_name_span.classList.add("data_entry_name");
            rep_value_span.classList.add("data_entry_value");

            rep_name_span.innerHTML = capitalize_first_letter(reputation_region) + " reputation";
            rep_value_span.innerHTML = character.reputation[reputation_region];

            rep_div.appendChild(rep_name_span);
            rep_div.appendChild(rep_value_span);

            data_entry_divs.reputation.appendChild(rep_div);
        }
    });
}

/**
 * 
 * @param {String} dialogue_key 
 * @param {Object} textlines that still belong to the dialogue, but are to be displayed alone for some reason (i.e. because they are from dialogue branching)
 * @param {String} origin - the key of textline that created a dialogue branch, ignored if textlines is not passed
 */
function update_displayed_dialogue({dialogue_key, textlines, origin}) {
    const dialogue = dialogues[dialogue_key];
    
    clear_action_div();
    const dialogue_name_div = document.createElement("div");
    dialogue_name_div.innerHTML = capitalize_first_letter(dialogues[dialogue_key].name);
    dialogue_name_div.id = "dialogue_name_div";
    action_div.appendChild(dialogue_name_div);

    const dialogue_answer_div = document.createElement("div");
    dialogue_answer_div.id = "dialogue_answer_div";
    action_div.appendChild(dialogue_answer_div);
    if(!textlines) {
        Object.keys(dialogue.textlines).forEach(key => { //add buttons for textlines
            if(dialogue.textlines[key].is_unlocked && !dialogue.textlines[key].is_finished && !dialogue.textlines[key].is_branch_only && process_conditions(dialogue.textlines[key].display_conditions, character)) { 
                //do only if text_line is not unavailable and not a branch
                if(dialogue.textlines[key].required_flags) {
                    if(dialogue.textlines[key].required_flags.yes && !Array.isArray(dialogue.textlines[key].required_flags.yes) || dialogue.textlines[key].required_flags.no && !Array.isArray(dialogue.textlines[key].required_flags.no)) {
                        console.error(`Textline "${key}" in dialogue "${dialogue_key}" has required flag passed as a single value but it should be an array!`)
                    }
                    if(dialogue.textlines[key].required_flags.yes) {
                        for(let i = 0; i < dialogue.textlines[key].required_flags.yes.length; i++) {
                            
                            if(!global_flags[dialogue.textlines[key].required_flags.yes[i]]) {
                                return;
                            }
                        }
                    }
                    if(dialogue.textlines[key].required_flags.no) {
                        for(let i = 0; i < dialogue.textlines[key].required_flags.no.length; i++) {
                            if(global_flags[dialogue.textlines[key].required_flags.no[i]]) {
                                return;
                            }
                        }
                    }
                }
                
                const textline_div = document.createElement("div");
                textline_div.innerHTML = `"${translationManager.getText(language,dialogue.textlines[key].name)}"`;
                textline_div.classList.add("dialogue_textline");
                textline_div.setAttribute("data-textline", key);
                textline_div.setAttribute("onclick", `start_textline(this.getAttribute('data-textline'))`);
                action_div.appendChild(textline_div);
            }
        });

        Object.keys(dialogue.actions).forEach(key => { //add buttons for actions
            if(dialogue.actions[key].is_unlocked && !dialogue.actions[key].is_finished && dialogue.actions[key].can_be_displayed(character)) { 
                const dialogue_action_div = document.createElement("div");
                dialogue_action_div.innerHTML = `${translationManager.getText(language,dialogue.actions[key].starting_text)}`;
                dialogue_action_div.classList.add("dialogue_textline");
                dialogue_action_div.setAttribute("data-location_action", key);
                dialogue_action_div.setAttribute("onclick", `start_game_action(this.getAttribute('data-location_action'), event)`);
                action_div.appendChild(dialogue_action_div);
            }
        });

        if(dialogue.trader) {
            const trade_div = document.createElement("div");
            trade_div.innerHTML = `<i class="material-icons">storefront</i>  ` + traders[dialogue.trader].trade_text;
            trade_div.classList.add("dialogue_trade")
            trade_div.setAttribute("data-trader", dialogue.trader);
            trade_div.setAttribute("onclick", "startTrade(this.getAttribute('data-trader'))")
            action_div.appendChild(trade_div);
        }

        const end_dialogue_div = document.createElement("div");

        end_dialogue_div.innerHTML = "<i class='material-icons'>arrow_back</i> " + dialogue.ending_text;
        end_dialogue_div.classList.add("end_dialogue_button");
        end_dialogue_div.setAttribute("onclick", "end_dialogue()");

        action_div.appendChild(end_dialogue_div);
    } else {
        //textlines are passed, use only them instead of all the dialogue has (minus branches)
        for(let i = 0; i < textlines.length; i++) {
            const key = textlines[i];
            //get key from passed array, read relevant entry from dialogue
            if(dialogue.textlines[key].is_unlocked && !dialogue.textlines[key].is_finished && process_conditions(dialogue.textlines[key].display_conditions, character)) { //do only if text_line is not unavailable
                if(dialogue.textlines[key].required_flags) {
                    if(dialogue.textlines[key].required_flags.yes && !Array.isArray(dialogue.textlines[key].required_flags.yes) || dialogue.textlines[key].required_flags.no && !Array.isArray(dialogue.textlines[key].required_flags.no)) {
                        console.error(`Textline "${key}" in dialogue "${dialogue_key}" has required flag passed as a single value but it should be an array!`)
                    }
                    if(dialogue.textlines[key].required_flags.yes) {
                        for(let i = 0; i < dialogue.textlines[key].required_flags.yes.length; i++) {
                            
                            if(!global_flags[dialogue.textlines[key].required_flags.yes[i]]) {
                                return;
                            }
                        }
                    }
                    if(dialogue.textlines[key].required_flags.no) {
                        for(let i = 0; i < dialogue.textlines[key].required_flags.no.length; i++) {
                            if(global_flags[dialogue.textlines[key].required_flags.no[i]]) {
                                return;
                            }
                        }
                    }
                }
                
                const textline_div = document.createElement("div");
                textline_div.innerHTML = `"${translationManager.getText(language,dialogue.textlines[key].name)}"`;
                textline_div.classList.add("dialogue_textline");
                textline_div.setAttribute("data-textline", key);
                textline_div.setAttribute("onclick", `start_textline(this.getAttribute('data-textline'), ${origin})`); //additional param compared to when there's no textlines passed
                action_div.appendChild(textline_div);
            }
        }

        const backstep_dialogue_div = document.createElement("div");

        backstep_dialogue_div.innerHTML = "<i class='material-icons'>arrow_back</i> " + default_dialogue_return_text;
        backstep_dialogue_div.classList.add("backstep_dialogue_button");
        backstep_dialogue_div.setAttribute("onclick", `start_dialogue("${dialogue_key}")`);

        action_div.appendChild(backstep_dialogue_div);
    }
}

function update_displayed_textline_answer({text, is_description}) {
    text = translationManager.getText(language, text);
    
    if(is_description) {
        document.getElementById("dialogue_answer_div").innerHTML =  "*"+text+"*";
    } else {
        document.getElementById("dialogue_answer_div").innerHTML = '<i>"' + text + '"</i>';
    }
}

function exit_displayed_trade() {
    action_div.style.display = "";
    trade_div.style.display = "none";
}

function start_activity_display(current_activity) {
    clear_action_div();
    const action_status_div = document.createElement("div");
    action_status_div.innerText = activities[current_activity.activity_name].action_text;
    action_status_div.id = "action_status_div";
    const action_xp_div = document.createElement("div");
    if(activities[current_activity.activity_name].base_skills_names) {

        const percent_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.round(10000*skills[activities[current_activity.activity_name].base_skills_names].current_xp/skills[activities[current_activity.activity_name].base_skills_names].xp_to_next_lvl)/100}%`
        const curr_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.floor(skills[activities[current_activity.activity_name].base_skills_names].current_xp)}`;
        const needed_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.ceil(skills[activities[current_activity.activity_name].base_skills_names].xp_to_next_lvl)}`;

        if(activities[current_activity.activity_name].type !== "GATHERING") {
            action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} base xp per in-game minute to `;
        } else {
            action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} base xp per gathering cycle to `;
        }
        
        if(curr_xp !== "Max") {
            action_xp_div.innerText += ` ${skills[activities[current_activity.activity_name].base_skills_names].name()} (${percent_xp}  [${expo(curr_xp)} / ${expo(needed_xp)}])`;
        } else {
            action_xp_div.innerText += ` ${skills[activities[current_activity.activity_name].base_skills_names].name()} (Maxxed out!)`;
        }

        if(activities[current_activity.activity_name].type !== "GATHERING") {
            const time_needed = Math.ceil((needed_xp-curr_xp)/(current_activity.skill_xp_per_tick*get_skill_xp_gain(skills[activities[current_activity.activity_name].base_skills_names].skill_id)));
            if(!isNaN(time_needed)) {
                action_xp_div.innerHTML += `<br>Next level in ${format_reading_time(time_needed)} (${format_time({time: {minutes: time_needed/60}, long_names: true})}realtime)`;
            }
        } else {
            const time_needed = Math.ceil(current_activity.gathering_time_needed * (needed_xp-curr_xp)/(current_activity.skill_xp_per_tick*get_skill_xp_gain(skills[activities[current_activity.activity_name].base_skills_names].skill_id)));
            if(!isNaN(time_needed)) {
                action_xp_div.innerHTML += `<br>Next level in ${format_reading_time(time_needed)} (${format_time({time: {minutes: time_needed/60}, long_names: true})}realtime)`;
            }
        }
            
    } else {
        console.warn(`Activity "${current_activity.activity_name}" has no skills assigned!`);
    }
    action_xp_div.id = "action_xp_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_activity()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Finish ${current_activity.activity_name}`;
    action_end_text.id = "action_end_text";


    action_end_div.appendChild(action_end_text);

    if(activities[current_activity.activity_name].type === "JOB") {
        const action_end_earnings = document.createElement("div");
        action_end_earnings.innerHTML = `(earnings: ${format_money(0)})`;
        action_end_earnings.id = "action_end_earnings";

        action_end_div.appendChild(action_end_earnings);
    }

    action_div.appendChild(action_status_div);
    action_div.appendChild(action_xp_div);

    if(current_activity.gained_resources) {
        const action_progress_bar_max = document.createElement("div");
        const action_progress_bar = document.createElement("div");
        action_progress_bar_max.appendChild(action_progress_bar);
        action_progress_bar.id = "gathering_progress_bar";
        action_progress_bar.style.width = 385*current_activity.gathering_time/current_activity.gathering_time_needed+"px";
        action_progress_bar_max.id = "gathering_progress_bar_max";
        action_div.appendChild(action_progress_bar_max);
        action_progress_bar_max.appendChild(create_gathering_tooltip(current_activity));
    }
    
    action_div.appendChild(action_end_div);

    if(activities[current_activity.activity_name].type === "JOB") 
    {
        const time_info_div = document.createElement("div");
        time_info_div.id = "time_for_earnings_div";

        if(!enough_time_for_earnings(current_activity)) {
            time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
        }
        else {
            time_info_div.innerHTML = `Next earnings in: ${format_working_time(current_activity.working_period - current_activity.working_time)}`;
        }
        action_div.insertBefore(time_info_div, action_div.children[2]);
    }

    start_activity_animation();
}

function update_displayed_ongoing_activity(current_activity, is_job){
    if(is_job) {
        document.getElementById("action_end_earnings").innerHTML = `(earnings: ${format_money(current_activity.earnings)})`
        const time_info_div = document.getElementById("time_for_earnings_div");
        
        if(!enough_time_for_earnings(current_activity)) {
            time_info_div.innerHTML = `There's not enough time left to earn more, but ${character.name} might still learn something...`;
        } else {
            time_info_div.innerHTML = `Next earnings in: ${format_working_time(current_activity.working_period - current_activity.working_time%current_activity.working_period)}`;
        }
    }
    const action_xp_div = document.getElementById("action_xp_div");
    if(!action_xp_div) {
        console.warn(`Failed to find htmlElement with id "action_xp_div" for activity "${current_activity.activity_id}"`);
        return;
    }

    const percent_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.round(10000*skills[activities[current_activity.activity_name].base_skills_names].current_xp/skills[activities[current_activity.activity_name].base_skills_names].xp_to_next_lvl)/100}%`
    const curr_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.floor(skills[activities[current_activity.activity_name].base_skills_names].current_xp)}`;
    const needed_xp = get_total_skill_level(activities[current_activity.activity_name].base_skills_names) == skills[activities[current_activity.activity_name].base_skills_names].max_level? "Max": `${Math.ceil(skills[activities[current_activity.activity_name].base_skills_names].xp_to_next_lvl)}`;
    
    if(activities[current_activity.activity_name].type !== "GATHERING") {
        action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} base xp per in-game minute to `;
    } else {
        action_xp_div.innerText = `Getting ${current_activity.skill_xp_per_tick} base xp per gathering cycle to `;
    }

    if(curr_xp !== "Max") {
        action_xp_div.innerText += ` ${skills[activities[current_activity.activity_name].base_skills_names].name()} (${percent_xp}  [${expo(curr_xp)} / ${expo(needed_xp)}])`;
    } else {
        action_xp_div.innerText += ` ${skills[activities[current_activity.activity_name].base_skills_names].name()} (Maxxed out!)`;
    }

    if(activities[current_activity.activity_name].type !== "GATHERING") {
        const time_needed = Math.ceil((needed_xp-curr_xp)/(current_activity.skill_xp_per_tick*get_skill_xp_gain(skills[activities[current_activity.activity_name].base_skills_names].skill_id)));
        if(!isNaN(time_needed)) {
            action_xp_div.innerHTML += `<br>Next level in ${format_reading_time(time_needed)} (${format_time({time: {minutes: time_needed/60}, long_names: true})}realtime)`;
        }
    } else {
        const time_needed = Math.ceil(current_activity.gathering_time_needed * (needed_xp-curr_xp)/(current_activity.skill_xp_per_tick*get_skill_xp_gain(skills[activities[current_activity.activity_name].base_skills_names].skill_id)));
        if(!isNaN(time_needed)) {
            action_xp_div.innerHTML += `<br>Next level in ${format_reading_time(time_needed)} (${format_time({time: {minutes: time_needed/60}, long_names: true})}realtime)`;
        }
    }

    if(current_activity.gained_resources) {
        document.getElementById("gathering_progress_bar").style.width = 385*current_activity.gathering_time/current_activity.gathering_time_needed+"px";
    }
}

function start_game_action_display(dialogue_key, action_key) {
    clear_action_div();

    let action;
    if(dialogue_key) {
        action = dialogues[dialogue_key].actions[action_key];
    } else {
        action = current_location.actions[action_key];
        
    }
    const action_status_div = document.createElement("div");
    action_status_div.innerText = action.action_text;
    action_status_div.id = "action_status_div";
    action_div.appendChild(action_status_div);

    const action_progress_bar_max = document.createElement("div");
    const action_progress_bar = document.createElement("div");
    action_progress_bar_max.appendChild(action_progress_bar);
    action_progress_bar.id = "action_progress_bar";
    action_progress_bar.style.width = "0px";
    action_progress_bar_max.id = "action_progress_bar_max";
    action_div.appendChild(action_progress_bar_max);

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_game_action()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Give up for now`;
    action_end_text.id = "action_end_text";


    action_end_div.appendChild(action_end_text);
    action_div.appendChild(action_end_div);


    start_activity_animation();
}

function update_game_action_progress_bar(percent) {
    document.getElementById("action_progress_bar").style.width = 385*percent+"px";
}

function set_game_action_finish_text(text) {
    document.getElementById("action_status_div").innerHTML = text;
}

function update_game_action_finish_button() {
    document.getElementById("action_end_div").innerHTML = "Finish";
}

/**
 * Pseudo-generalized function for updating displayed content
 * @param {*} param0 
 */
function fill_action_box({content_type, data}) {

    let text = '';
    if(data.special?.upstack_result_message) {
        text = data.special.upstack_result_message;
    }

    if(content_type === "dialogue") {
        update_displayed_dialogue({dialogue_key: data.dialogue_key});
        if(!text) {
            text = dialogues[data.dialogue_key].getDescription();
        }
        //if(!document.getElementById("dialogue_answer_div").innerHTML) { //probably pointless to check?
        update_displayed_textline_answer({text, is_description: true});
        //}
    } else if(content_type === "dialogue_answer") {
        update_displayed_dialogue({dialogue_key: data.dialogue_key});
        if(!text) {
            text = data.text;
        }
        update_displayed_textline_answer({text});
    } else if(content_type === "dialogue_branch") {
        update_displayed_dialogue({dialogue_key: data.dialogue_key, textlines: data.textlines});
        if(!text) {
            text = data.text;
        }
        update_displayed_textline_answer({text});
    } else if(content_type === "action") {
        start_game_action_display(data.dialogue_key, data.action_key);
    } else if(content_type === "activity") {
        start_activity_display(data.activity);
    } else {
        throw new Error(`Error on filling action box content: no such content type as "${content_type}"`);
    }

    //call stack addition in starting dialogues / textlines / actions / activities
    //pass proper data as param
    //do whatever is needed, like setting 'current_x' values
    //then call fill_action_box with proper data
}

function start_sleeping_display(){
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
}

function start_reading_display(title) {
    clear_action_div();

    const action_status_div = document.createElement("div");
    action_status_div.innerText = `Reading the book, ${format_reading_time(item_templates[title].getRemainingTime())} left`;
    action_status_div.id = "action_status_div";

    const action_end_div = document.createElement("div");
    action_end_div.setAttribute("onclick", "end_reading()");
    action_end_div.id = "action_end_div";


    const action_end_text = document.createElement("div");
    action_end_text.innerText = `Stop reading for now`;
    action_end_text.id = "action_end_text";

    action_end_div.appendChild(action_end_text);

    action_div.appendChild(action_status_div);
    action_div.appendChild(action_end_div);
    start_activity_animation({book_title: title});
}

/**
 * //creates new skill bar
 * @param {Skill} skill 
 */
function create_new_skill_bar(skill) {
    if(!skill_bar_divs[skill.category]) {
        skill_bar_divs[skill.category] = {};

        const skill_category_div = document.createElement("div");
        skill_category_div.innerHTML = `<i class="material-icons icon skill_dropdown_icon"> keyboard_double_arrow_down </i>${skill.category} skills`;
        skill_category_div.dataset.skill_category = skill.category;
        skill_category_div.classList.add("skill_category_div");

        //add reordering buttons
        const btn_up = document.createElement('a');
        btn_up.className = "material-icons icon";
        btn_up.style.float = 'right';
        btn_up.innerHTML = 'keyboard_arrow_up';
        btn_up.addEventListener("click", (event) => {
            let idx = skill_category_order.indexOf(skill.category);
            if (idx > 0) {
                [skill_category_order[idx], skill_category_order[idx - 1]] = [skill_category_order[idx - 1], skill_category_order[idx]];
                sort_displayed_skill_categories();
                update_skill_category_order();
            }
        });
        const btn_down = document.createElement('a');
        btn_down.className = "material-icons icon";
        btn_down.style.float = 'right';
        btn_down.innerHTML = 'keyboard_arrow_down';
        btn_down.addEventListener("click", (event) => {
            let idx = skill_category_order.indexOf(skill.category);
            if (idx < skill_category_order.length - 1) {
                [skill_category_order[idx], skill_category_order[idx + 1]] = [skill_category_order[idx + 1], skill_category_order[idx]];
                sort_displayed_skill_categories();
                update_skill_category_order();
            }
        });
        skill_category_div.appendChild(btn_up);
        skill_category_div.appendChild(btn_down);

        const skill_category_skills = document.createElement("div");
        skill_category_skills.dataset.skill_category_skills = true;
        skill_category_div.appendChild(skill_category_skills);
        
        skill_list.appendChild(skill_category_div);

        skill_category_div.addEventListener("click", (event)=>{
            if(event.target.classList.contains("skill_category_div")) {
                event.target.classList.toggle("skill_category_expanded");
            } else if(event.target.classList.contains("skill_dropdown_icon")) {
                event.target.parentNode.classList.toggle("skill_category_expanded");
            }
        })

        if(skill_category_order.indexOf(skill.category) == -1) {
            skill_category_order.push(skill.category);
        }
    }
    if(skill_bar_divs[skill.category][skill.skill_id]) {
        console.trace(`Tried to create a skillbar for skill "${skill.skill_id}", but it already has one!`);
        return;
    }
    skill_bar_divs[skill.category][skill.skill_id] = document.createElement("div");

    const skill_bar_max = document.createElement("div");
    const skill_bar_current = document.createElement("div");
    const skill_bar_text = document.createElement("div");
    const skill_bar_name = document.createElement("div");
    const skill_bar_xp = document.createElement("div");

    const skill_tooltip = document.createElement("div");
    const tooltip_xp = document.createElement("div");
    const tooltip_xp_gain = document.createElement("div");
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

    tooltip_xp_gain.classList.add("skill_xp_gain");

    skill_tooltip.appendChild(tooltip_xp);
    skill_tooltip.appendChild(tooltip_xp_gain);
    skill_tooltip.appendChild(tooltip_desc);
    skill_tooltip.appendChild(tooltip_effect); 
    skill_tooltip.appendChild(tooltip_milestones);
    skill_tooltip.appendChild(tooltip_next);

    tooltip_desc.innerHTML = `<span class="skill_id">id: "${skill.skill_id}"</span><br><br>${skill.description}<br>`;
    if(skill.flavour_text) {
        tooltip_desc.innerHTML += `<br><span class="skill_flavour_text">"${skill.flavour_text}"</span>`;
    }

    if(skill.parent_skill) {
        tooltip_desc.innerHTML += `<br>Parent skill: ${skill.parent_skill}<br><br>`; 
    }
    
    skill_bar_max.appendChild(skill_bar_text);
    skill_bar_max.appendChild(skill_bar_current);
    skill_bar_max.appendChild(skill_tooltip);

    skill_bar_divs[skill.category][skill.skill_id].appendChild(skill_bar_max);
    skill_bar_divs[skill.category][skill.skill_id].setAttribute("data-skill", skill.skill_id);
    skill_bar_divs[skill.category][skill.skill_id].classList.add("skill_div");
    skill_list.querySelector(`[data-skill_category=${skill.category}]`).querySelector("[data-skill_category_skills]").appendChild(skill_bar_divs[skill.category][skill.skill_id]);

    //sorts skill_list div alphabetically
    sort_displayed_skills({});
    sort_displayed_skill_categories();
    update_displayed_skill_xp_gain(skill);
}

/**
 * 
 * @param {Skill} skill 
 * @param {Boolean} leveled_up 
 * @returns 
 */
function update_displayed_skill_bar(skill, leveled_up=true) {
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
                    tooltip_xp_gain,
                    tooltip_desc,
                    tooltip_effect,
                    tooltip_milestones,
                    tooltip_next
    */

    if(!skill_bar_divs[skill.category][skill.skill_id]) {
        return;
    }

    update_displayed_skill_level(skill);

    if (skill.current_xp !== "Max") {
        skill_bar_divs[skill.category][skill.skill_id].children[0].classList.remove("skill_bar_capped");
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[0].children[1].innerHTML = `${100*Math.floor(skill.current_xp/skill.xp_to_next_lvl*1000)/1000}%`;
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[0].innerHTML = `${expo(skill.current_xp)} / ${expo(skill.xp_to_next_lvl)}`;

    } else {
        skill_bar_divs[skill.category][skill.skill_id].children[0].classList.add("skill_bar_capped");
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[0].children[1].innerHTML = `Max!`;
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[0].innerHTML = `Maxed out!`;
    }
    //skill_bar_xp && tooltip_xp

    skill_bar_divs[skill.category][skill.skill_id].children[0].children[1].style.width = `${100*skill.current_xp/skill.xp_to_next_lvl}%`;
    //skill_bar_current

    if(get_unlocked_skill_rewards(skill.skill_id)) {
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[4].innerHTML  = `<br>${get_unlocked_skill_rewards(skill.skill_id)}`;
    }

    if(typeof get_next_skill_milestone(skill.skill_id) !== "undefined") {
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[5].innerHTML  = `lvl ${get_next_skill_milestone(skill.skill_id)}: ???`;
    } else {
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[5].innerHTML = "";
    }

    if(typeof skill.get_effect_description !== "undefined") {
        skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[3].innerHTML = `${skill.get_effect_description()}`;
        //tooltip_effect
    }
    
    if(leveled_up) {
        sort_displayed_skills({sort_by: skill_sorting}); //in case of a name change on levelup
    }
}

function update_displayed_skill_level(skill) {
    if(!skill_bar_divs[skill.category]?.[skill.skill_id]) {
        return;
    }

    skill_bar_divs[skill.category][skill.skill_id].children[0].children[0].children[0].innerHTML = `${skill.name()} : level ${skill.current_level}/${skill.max_level}`;
    const bonus = character.bonus_skill_levels.full[skill.skill_id];
    if(bonus != 0) {
        if(bonus > 0) {
            skill_bar_divs[skill.category][skill.skill_id].children[0].children[0].children[0].innerHTML += ` <b>[+${bonus}]</b>`;
        } else {
            skill_bar_divs[skill.category][skill.skill_id].children[0].children[0].children[0].innerHTML += ` <b>[${bonus}]</b>`;
        }
    }
}

function update_displayed_skill_description(skill) {
    if(!skill_bar_divs[skill.category][skill.skill_id]) {
        return;
    }
    skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[3].innerHTML = `${skill.get_effect_description()}`;
}

function update_displayed_skill_xp_gain(skill) {
    if(!skill_bar_divs[skill.category] || !skill_bar_divs[skill.category][skill.skill_id]){
        return;
    }
    const xp_gain = Math.round(100*skill.get_parent_xp_multiplier()*get_skill_xp_gain(skill.skill_id))/100 || 1;
    skill_bar_divs[skill.category][skill.skill_id].children[0].children[2].children[1].innerHTML = `XP gain: x${xp_gain}<br><span>XP cost scaling: x${skill.xp_scaling}</span>`;
}

function update_all_displayed_skills_xp_gain(){
    Object.keys(skill_bar_divs).forEach(category => {
        Object.keys(skill_bar_divs[category]).forEach(skill_id => {
            update_displayed_skill_xp_gain(skills[skill_id]);
        });
    });
}

function sort_displayed_skills({sort_by="name", change_direction=false}) {
    if(change_direction){
        if(sort_by && sort_by === skill_sorting) {
            if(skill_sorting_direction === "asc") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        } else {
            if(sort_by === "level") {
                skill_sorting_direction = "desc";
            } else {
                skill_sorting_direction = "asc";
            }
        }
    }

    skill_sorting = sort_by;

    let plus = skill_sorting_direction=="asc"?1:-1;
    let minus = skill_sorting_direction==="asc"?-1:1;
    for(let i = 0; i < skill_list.children.length; i++) {
        
        [...skill_list.children[i].querySelector("[data-skill_category_skills]").children].sort((a,b) => {
            let elem_a;
            let elem_b;
            if (sort_by === "level") {
                skill_sorting = sort_by;
                elem_a = skills[a.getAttribute("data-skill")].current_level;
                elem_b = skills[b.getAttribute("data-skill")].current_level;
            } else if (sort_by === "progress") {
                if (isNaN(skills[a.getAttribute("data-skill")].current_xp)) return 1;
                if (isNaN(skills[b.getAttribute("data-skill")].current_xp)) return -1;

                elem_a = -skills[a.getAttribute("data-skill")].current_xp / skills[a.getAttribute("data-skill")].xp_to_next_lvl;
                elem_b = -skills[b.getAttribute("data-skill")].current_xp / skills[b.getAttribute("data-skill")].xp_to_next_lvl ;
            } else {
                elem_a = skills[a.getAttribute("data-skill")].name();
                elem_b = skills[b.getAttribute("data-skill")].name();
                skill_sorting = "name";
            }
    
            if(elem_a > elem_b) {
                return plus;
            } else {
                return minus;
            }
    
    
        }).forEach(node=>skill_list.children[i].querySelector("[data-skill_category_skills").appendChild(node));
    }
}

/**
 * sorts displayed skill categories alphabeticaly
 */
function sort_displayed_skill_categories() {
    [...skill_list.children].sort((a, b) => {

        let pos_a = skill_category_order.indexOf(a.dataset.skill_category);
        let pos_b = skill_category_order.indexOf(b.dataset.skill_category);

        if (pos_a == -1 || pos_b == -1) {
            //if it doesn't have a specific position assigned, place it alphabetically
            return a.dataset.skill_category > b.dataset.skill_category ? 1 : -1;
        }
        else {
            return pos_a > pos_b ? 1 : -1;
        }
    }).forEach(node=>skill_list.appendChild(node));
}

function update_skill_category_order() {
    skill_category_order.length = 0;
    [...skill_list.children].forEach((elem, idx) => {
        skill_category_order[idx] = elem.dataset.skill_category;
    });
}

/**
 * @description updates the list of stances, 
 */
function update_displayed_stance_list(stances, current_stance, fav_stances) {
    while(stance_list.firstChild) {
        stance_list.removeChild(stance_list.lastChild);
    }
    Object.keys(stance_bar_divs).forEach(bar => {
        delete stance_bar_divs[bar];
    })

    stance_list.innerHTML = 
    `<tr class="stance_list_entry stance_list_header">
        <th class="stance_list_header stance_list_header_fav">Fav</th>
        <th class="stance_list_header stance_list_header_select">Select</th>
        <th class="stance_list_header stance_list_header_name">Name</th>
    </tr>`

    Object.keys(stances).forEach(stance => {
        if(stances[stance].is_unlocked) {
            stance_bar_divs[stance] = document.createElement("tr");
            stance_bar_divs[stance].classList.add("stance_list_entry");
            stance_bar_divs[stance].dataset.stance = stance;

            const fav_selection = `<td class="stances_button stances_button_checkbox"><input type="checkbox" id="stances_fav_${stance}" name="stance_fav_selection" onclick="fav_stance('${stance}')"></td>`;
            const stance_selection = `<td class="stances_button stances_button_radio"><input type="radio" id="stances_select_${stance}" name="stance_list_selection" onclick="select_stance('${stance}')"></td>`;
            const stance_info = 
                `<td class="stances_name"><label for="stances_select_${stance}">${stances[stance].name}</td>`

            stance_bar_divs[stance].innerHTML = fav_selection;
            stance_bar_divs[stance].innerHTML += stance_selection;
            stance_bar_divs[stance].innerHTML += stance_info
            
            const stance_tooltip_row = document.createElement("td");
            
            stance_tooltip_row.appendChild(create_stance_tooltip(stances[stance]));
            stance_bar_divs[stance].appendChild(stance_tooltip_row);
            stance_list.append(stance_bar_divs[stance]);
        }
    });

    //different stamina cost: cheaper first; same stamina cost: sort alphabetically
    [...stance_list.children].sort((a,b)=>{
        const stance_a = stances[a.getAttribute("data-stance")];
        const stance_b = stances[b.getAttribute("data-stance")];
        if(!stance_b) {
            return 1;
        } else if(!stance_a) {
            return -1;
        }

        if(!stance_a || !stance_b || !stance_a.is_unlocked || !stance_b.is_unlocked) {
            console.error(`No such stance as either '${stance_a}' or '${stance_b}', or at least one of them is not yet unlocked!`);
        }
        
        if(stance_a.stamina_cost < stance_b.stamina_cost) {
            return -1;
        } else if(stance_a.stamina_cost > stance_b.stamina_cost) {
            return 1;
        } else {
            if(stance_a.name > stance_b.name) {
                return 1;
            } else {
                return -1;
            }
        }
    }).forEach(node=>stance_list.appendChild(node));

    update_displayed_stance(current_stance);
    update_displayed_faved_stances(fav_stances);
}

function create_stance_tooltip(stance) {
    const tooltip_div = document.createElement("div");
    tooltip_div.classList.add("stance_tooltip");
    tooltip_div.innerHTML = 
    `<div>${stance.name}</div><br>
    <div>${stance.getDescription()}</div><br>
    <div>Stamina cost: ${stance.stamina_cost}</div>
    <div class='stance_tooltip_stats'>${create_stance_tooltip_stats(stance)}</div`;

    let target_count = stance.target_count;
    if(target_count > 1 && stance.related_skill) {
        target_count = target_count + Math.round(target_count * get_total_skill_level(stance.related_skill)/skills[stance.related_skill].max_level);
    }

    if(target_count > 1) {
        tooltip_div.innerHTML += `
        <br><div class='stance_tooltip_hitcount'>${stance.randomize_target_count?"Randomly hits up to":"Hits up to"} ${target_count} enemies</div>`;
    }

    return tooltip_div;
}

function create_stance_tooltip_stats(stance) {
    let desc = "";
    const stats = stance.getStats()
    Object.keys(stats).forEach(stat => {
        desc += `<br>x${Math.round(100*stats[stat])/100} ${stat_names[stat]}`;
    });

    return desc;
}

function update_stance_tooltip(stance) {
    stance_bar_divs[stance.id].querySelector(".stance_tooltip_stats").innerHTML = create_stance_tooltip_stats(stance);

    let target_count = stance.target_count;
    if(target_count > 1){
        if(stance.related_skill) {
            target_count = target_count + Math.round(target_count * get_total_skill_level(stance.related_skill)/skills[stance.related_skill].max_level);
        }
        stance_bar_divs[stance.id].querySelector(".stance_tooltip_hitcount").innerHTML = `${stance.randomize_target_count?"Randomly hits up to":"Hits up to"} ${target_count} enemies</div>`;
    } 
}

/**
 * 
 * @param {Stance} stance current stance 
 */
function update_displayed_stance(stance) {
    stance_bar_divs[stance.id].children[1].children[0].checked = true;
    document.getElementById("character_stance_name").children[0].innerHTML = stance.name;

    const selection = document.getElementById("character_stance_selection");

    if(selection.children) {
        if(selection.querySelector(`[data-stance='${stance.id}']`)) {
            selection.querySelector(`[data-stance='${stance.id}']`).children[0].checked = true;
        } else if(!faved_stances[stance.id] && selection.querySelector('[data-stance] :checked')) {
            selection.querySelector('[data-stance] :checked').checked = false;
        }
    }
}

function update_displayed_faved_stances(stances) {
    
    const list = document.getElementById("character_stance_selection");
    list.innerHTML = "";
    Object.keys(faved_stances).forEach(stance => {
        stance_bar_divs[stance].children[0].children[0].checked = true;

        const node = 
        `<div data-stance="${stance}"><input type="radio" id="stances_quick_select_${stance}" name="stance_quick_selection" onclick="select_stance('${stance}')">
         <label for="stances_quick_select_${stance}">${stances[stance].name}</div>`;
        list.innerHTML += node;
    });

    //different stamina cost: cheaper first; same stamina cost: sort alphabetically
    [...list.children].sort((a,b)=>{
        const stance_a = stances[a.getAttribute("data-stance")];
        const stance_b = stances[b.getAttribute("data-stance")];

        if(!stance_a || !stance_b) {
            console.error(`No such stance as either '${stance_a}' or '${stance_b}'!`);
        }
        
        if(stance_a.stamina_cost < stance_b.stamina_cost) {
            return -1;
        } else if(stance_a.stamina_cost > stance_b.stamina_cost) {
            return 1;
        } else {
            if(stance_a.name > stance_b.name) {
                return 1;
            } else {
                return -1;
            }
        }
    }).forEach(node=>list.appendChild(node));

    //mark selected stance as checked in quick selection

    const selection = document.getElementById("character_stance_selection");
    if(selection.children && selection.querySelector(`[data-stance='${selected_stance}']`)) {
        selection.querySelector(`[data-stance='${selected_stance}']`).children[0].checked = true;
    }
}

/**
 * creates a new bestiary entry;
 * called when a new enemy is killed (or, you know, loading a save)
 * @param {String} enemy_name 
 */
function create_new_bestiary_entry(enemy_name) {
    const enemy = enemy_templates[enemy_name];
    bestiary_entry_divs[enemy_name] = document.createElement("div");
    
    bestiary_entry_divs[enemy_name].innerHTML = create_bestiary_entry_content(enemy_name);

    bestiary_entry_divs[enemy_name].setAttribute("data-bestiary_rank", enemy.rank);
    bestiary_entry_divs[enemy_name].classList.add("bestiary_entry_div");
    bestiary_list.appendChild(bestiary_entry_divs[enemy_name]);

    //sorts bestiary_list div by enemy rank
    [...bestiary_list.children].sort((a,b)=>parseInt(a.getAttribute("data-bestiary_rank")) - parseInt(b.getAttribute("data-bestiary_rank")))
                                .forEach(node=>bestiary_list.appendChild(node));
}

function create_bestiary_entry_content(enemy_name) {
    const entry_div = document.createElement("div");

    const name_div = document.createElement("div");
    name_div.innerHTML = enemy_name;
    name_div.classList.add("bestiary_entry_name");
    const kill_counter = document.createElement("div");
    kill_counter.innerHTML = enemy_killcount[enemy_name];
    kill_counter.classList.add("bestiary_entry_kill_count");
    
    entry_div.appendChild(name_div);
    entry_div.appendChild(kill_counter);
    entry_div.appendChild(create_bestiary_entry_tooltip(enemy_name));
    return entry_div.innerHTML;
}

function create_bestiary_entry_tooltip(enemy_name) {
    const enemy = enemy_templates[enemy_name];
    const bestiary_tooltip = document.createElement("div");
    bestiary_tooltip.classList.add("bestiary_entry_tooltip");

    const tooltip_xp = document.createElement("div"); //base xp enemy gives
    tooltip_xp.innerHTML = `<br>Base xp value: ${enemy.xp_value} <br><br>`;
    const tooltip_desc = document.createElement("div"); //enemy description
    tooltip_desc.innerHTML = enemy.description;

    const tooltip_tags = document.createElement("div"); //enemy description

    Object.keys(enemy.tags).forEach(tag => {
        tooltip_tags.innerHTML += `[${tag}] `
    });
    tooltip_tags.innerHTML += "<br><br>";

    const tooltip_stats = document.createElement("div"); //base enemy stats
    tooltip_stats.innerHTML = "Stats: <br>"

    const stat_line_0 = document.createElement("div");
    stat_line_0.classList.add("grid_container");
    stat_line_0.append(create_bestiary_stat_entry(enemy, "Health"), create_bestiary_stat_entry(enemy, "Defense"));

    const stat_line_2 = document.createElement("div");
    stat_line_2.classList.add("grid_container");
    stat_line_2.append(create_bestiary_stat_entry(enemy, "Attack power"), create_bestiary_stat_entry(enemy, "Attack speed"));

    const stat_line_4 = document.createElement("div");
    stat_line_4.classList.add("grid_container");
    stat_line_4.append(create_bestiary_stat_entry(enemy, "AP"), create_bestiary_stat_entry(enemy, "EP"));
    
    tooltip_stats.appendChild(stat_line_0);
    tooltip_stats.appendChild(stat_line_2);
    tooltip_stats.appendChild(stat_line_4);

    const tooltip_drops = document.createElement("div"); //enemy drops
    tooltip_drops.classList.add("loot_slots_div");
    if(enemy.loot_list.length > 0) {
        tooltip_drops.appendChild(create_bestiary_loot_line());
    }

    for(let i = 0; i < enemy.loot_list.length; i++) {
        tooltip_drops.appendChild(create_bestiary_loot_line(enemy, enemy.loot_list[i]));
    }
    
    bestiary_tooltip.appendChild(tooltip_desc);
    bestiary_tooltip.appendChild(tooltip_xp);
    bestiary_tooltip.appendChild(tooltip_tags);
    bestiary_tooltip.appendChild(tooltip_stats);
    bestiary_tooltip.appendChild(tooltip_drops);

    return bestiary_tooltip;
}

function update_bestiary_entry_tooltip(enemy_name) {
    const tooltip = bestiary_entry_divs[enemy_name].querySelector(".bestiary_entry_tooltip");
    tooltip.replaceWith(create_bestiary_entry_tooltip(enemy_name));
}


/**
 * updates the entire bestiary entry of an enemy
 * @param {String} enemy_name 
 */
function update_bestiary_entry(enemy_name) {
    bestiary_entry_divs[enemy_name].innerHTML = create_bestiary_entry_content(enemy_name);
}

/**
 * @param {String} enemy_name 
 */
function update_bestiary_entry_killcount(enemy_name) {
    bestiary_entry_divs[enemy_name].children[1].innerHTML = enemy_killcount[enemy_name];
}

function create_bestiary_loot_line(enemy, loot) {
    const loot_line = document.createElement("div");
    const loot_name = document.createElement("div");
    const loot_chance = document.createElement("div");
    const loot_chance_base = document.createElement("div");
    const loot_chance_current = document.createElement("div");

    loot_line.classList.add("loot_slot_div");
    loot_name.classList.add("loot_name");
    loot_chance.classList.add("loot_chance");
    loot_chance_base.classList.add("loot_chance_base");
    loot_chance_current.classList.add("loot_chance_current");

    if(enemy) {
        //create based on data passed
        loot_name.innerHTML = `${loot.item_name}`;
        loot_chance_base.innerHTML = `[${loot.chance*100}%]`;
        loot_chance_current.innerHTML = `${Math.round(10000*loot.chance*enemy.get_droprate_modifier())/100}%`;
        loot_chance.append(loot_chance_current, loot_chance_base);
        loot_line.append(loot_name, loot_chance);
    } else {
        //create a header line
        loot_name.innerHTML = `Item name`;
        loot_chance_base.innerHTML = `base %`;
        loot_chance_current.innerHTML = `current %`;
        loot_chance.append(loot_chance_current, loot_chance_base);
        loot_line.append(loot_name, loot_chance);
    }

    return loot_line;
}

function create_bestiary_stat_entry(enemy, stat_name) {
    const stat_entry = document.createElement("div");
    const stat_name_div = document.createElement("div");
    const stat_value_div = document.createElement("div");

    stat_entry.classList.add("stat_slot_div");
    stat_name_div.classList.add("stat_name");
    stat_value_div.classList.add("stat_value");


    switch(stat_name) {
        case "Health": 
            stat_name_div.innerHTML = "Health:";
            stat_value_div.innerHTML = `${enemy.stats.health}`;
            stat_entry.append(stat_name_div, stat_value_div);
        break;
        case "Defense":
            stat_name_div.innerHTML = `Defense:`;
            stat_value_div.innerHTML = `${enemy.stats.defense}`;
            stat_entry.append(stat_name_div, stat_value_div);
        break;
        case "Attack power":
            stat_name_div.innerHTML = "Attack power:";
            stat_value_div.innerHTML = `${enemy.stats.attack}`;
            if(enemy.stats.attack_count > 1) {
                stat_value_div.innerHTML += `x${enemy.stats.attack_count}`;
            }
            stat_entry.append(stat_name_div, stat_value_div);
        break;
        case "Attack speed":
            stat_name_div.innerHTML = `Attack speed:`;
            stat_value_div.innerHTML = `${enemy.stats.attack_speed}`;
            stat_entry.append(stat_name_div, stat_value_div);
        break;
        case "AP":
            stat_name_div.innerHTML = "AP:";
            stat_value_div.innerHTML = `${Math.round(enemy.stats.dexterity * Math.sqrt(enemy.stats.intuition || 1))}`;
            stat_entry.append(stat_name_div, stat_value_div);
        break;
        case "EP":
            stat_name_div.innerHTML = "EP:";
            stat_value_div.innerHTML = `${Math.round(enemy.stats.agility * Math.sqrt(enemy.stats.intuition || 1))}`;
            stat_entry.append(stat_name_div, stat_value_div);
        break;
    }

    return stat_entry;
}

function clear_bestiary() {
    Object.keys(bestiary_entry_divs).forEach((enemy) => {
        delete bestiary_entry_divs[enemy];
    });
}

/**
 * creates a new booklist entry;
 * called when a new enemy is killed (or, you know, loading a save)
 * @param {String} enemy_name 
 */
function create_new_booklist_entry(book_name) {
    booklist_entry_divs[book_name] = document.createElement("div");
    
    let book = item_templates[book_name];

    let name_div = document.createElement("div");
    name_div.innerHTML = book_name;
    name_div.classList.add("anthology_entry_name");

    let tooltip = create_item_tooltip(book);//document.createElement("div");
    tooltip.classList.add("anthology_entry_tooltip")
    //tooltip.appendChild(create_item_tooltip(book));

    booklist_entry_divs[book_name].appendChild(name_div);
    booklist_entry_divs[book_name].appendChild(tooltip);
    booklist_entry_divs[book_name].setAttribute("data-book", book_name);
    booklist_entry_divs[book_name].classList.add("anthology_entry_div");

    booklist_list.appendChild(booklist_entry_divs[book_name]);

    //sorts booklist_list div by book title
    [...booklist_list.children].sort((a,b)=>a.getAttribute("data-book") - b.getAttribute("data-book"))
                                .forEach(node=>booklist_list.appendChild(node));
}

/**
 * updates the anthology entry of a book (style and tooltip);
 * @param {String} book_name 
 */
function update_booklist_entry(book_name, read) {
    if(!booklist_entry_divs[book_name]) {
        create_new_booklist_entry(book_name);
    }

    booklist_entry_divs[book_name].children[1].innerHTML = create_item_tooltip_content({item: item_templates[book_name]});
    booklist_entry_divs[book_name].style.display = read ? "flex" : "none";
}

function clear_booklist() {
    Object.keys(booklist_entry_divs).forEach((book) => {
        delete booklist_entry_divs[book];
    });
}

function clear_skill_list(){
    while(skill_list.firstChild) {
        skill_list.removeChild(skill_list.lastChild);
    } //remove skill bars from display

}

function update_enemy_attack_bar(enemy_id, num) {
    enemies_div.children[enemy_id].querySelector(".enemy_attack_bar").style.width = `${Math.min(num*100,100)}%`;
}

function do_enemy_onhit_animation(enemy_id) {
    const enemy_div = enemies_div.children[enemy_id];
    enemy_animations[enemy_id]?.cancel(); //almost certainly unnecessary
    enemy_animations[enemy_id] = enemy_div.animate(onhitAnimation, onhitAnimationTiming);
}

function remove_enemy_onhit_animation(enemy_id) {
    enemy_animations[enemy_id]?.cancel();
}

function do_enemy_onstart_animation(enemy_id) {
    const enemy_div = enemies_div.children[enemy_id];
    enemy_animations[enemy_id]?.cancel(); //almost certainly unnecessary
    enemy_animations[enemy_id] =  enemy_div.animate(onstartAnimation, onstartAnimationTiming);
}

function update_character_attack_bar(num) {
    character_attack_bar.style.width = `${Math.min(num*100,100)}%`;
}

/**
 * Adds quest to display
 * @param {String} quest_id 
 * @returns 
 */
function add_quest_to_display(quest_id) {
    if(quest_entry_divs[quest_id]) {
        console.warn(`Tried to add quest "${quest_id}" to display, but it's already there!`);
        return;
    } else if(quests[quest_id].is_hidden) {
        //do not display hidden quests (that's the whole point)
        console.warn(`Tried to add quest "${quest_id}" to display, but it's a hidden quest!`);
        return;
    }

    const quest = quests[quest_id];

    const quest_div = create_displayed_quest_content(quest_id);
    quest_entry_divs[quest_id] = quest_div;
    quest_list.appendChild(quest_div);

    if(quest.is_finished) {
        quest_div.classList.add("quest_finished");
    }

    sort_displayed_quests();
}

/**
 * updates name, description and task list
 * @param {*} quest_id 
 * @returns 
 */
function update_displayed_quest(quest_id) {
    
    if(quests[quest_id].is_hidden) {
        console.warn(`Tried to update display of quest "${quest_id}", but it's a hidden quest!`);
        console.trace()
        return;
    } else if(!quest_entry_divs[quest_id]) {
        console.warn(`Tried to update display of quest "${quest_id}", but it's not in display!`);
        return;
    }

    const quest = quests[quest_id];

    const quest_div = document.querySelector(`[data-quest_id="${quest_id}"]`);
    const quest_name_div = quest_div.querySelector(".quest_name_div");
    quest_name_div.innerHTML = quest.getQuestName();

    const quest_description_div = quest_div.querySelector(".quest_description_div");
    quest_description_div.innerHTML = quest.getQuestDescription() ?? "";

    if(quest.is_finished) {
        quest_div.classList.add("quest_finished");
    }
    
    update_displayed_quest_tasks(quest_id);

    sort_displayed_quests();
}

function sort_displayed_quests() {
        [...quest_list.children].sort((a,b) => {
            let quest_a = quests[a.getAttribute("data-quest_id")];
            let quest_b = quests[b.getAttribute("data-quest_id")];
            if(quest_a.is_finished && !quest_b.is_finished) {
                return 1;
            } else if(!quest_a.is_finished && quest_b.is_finished) {
                return -1;
            } else {
                if(quest_a.display_priority !== quest_b.display_priority) {
                    return quest_a.display_priority - quest_b.display_priority;
                } else {
                    if(quest_a.getQuestName() > quest_b.getQuestName()) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
            }
    
        }).forEach(node=>quest_list.appendChild(node));
    
}

/**
 * Creates and returns a quest div to be used by other functions
 * @param {String} quest_id 
 * @returns {HTMLDivElement}
 */
function create_displayed_quest_content(quest_id) {

    const quest = quests[quest_id];

    const quest_div = document.createElement("div");
    quest_div.dataset.quest_id = quest_id;
    const quest_description_div = document.createElement("div");
    const quest_name_div = document.createElement("div");
    quest_div.classList.add("quest_div");
    //add an icon to show whether finished or active
    //add a dropdown icon

    quest_name_div.innerHTML = quest.getQuestName();
    quest_name_div.classList.add("quest_name_div");

    quest_description_div.innerHTML = quest.getQuestDescription();
    quest_description_div.classList.add("quest_description_div");

    quest_div.appendChild(quest_name_div);
    quest_div.appendChild(quest_description_div);
    quest_div.appendChild(create_displayed_quest_tasks_content(quest_id));

    quest_div.addEventListener("click", (event) => {
        if(event.target.classList.contains("quest_name_div")) {
            quest_div.classList.toggle("quest_div_expanded");
        }
    });

    return quest_div;
}

function create_displayed_quest_tasks_content(quest_id) {
    const quest = quests[quest_id];
    const quest_tasks_div = document.createElement("div");
    quest_tasks_div.classList.add("quest_task_list_div");
    //put task description and tasks into it
    //set color based on completion status

    let unfinished_index = quest.quest_tasks.findIndex(x => !x.is_finished);
    unfinished_index = unfinished_index==-1?quest.quest_tasks.length:unfinished_index;

    for(let i = 0; i < unfinished_index; i++) {
        if(!quest.quest_tasks[i].is_hidden) {
            quest_tasks_div.appendChild(create_displayed_quest_task(quest_id, i));
        }
    }

    if(unfinished_index !== quest.quest_tasks.length) {
        //there should still be an unfinished task left, add it do display as well
        if(!quest.quest_tasks[unfinished_index].is_hidden) {
            quest_tasks_div.appendChild(create_displayed_quest_task(quest_id, unfinished_index));
        }
    }

    return quest_tasks_div;
}

function create_displayed_quest_task(quest_id, task_index) {
    const task = quests[quest_id].quest_tasks[task_index];
    const task_div = document.createElement("div");
    task_div.classList.add("quest_task_div");

    const task_status_icon_span = document.createElement("span");
    task_status_icon_span.classList.add("task_status_icon");
    if(task.is_finished) {
        task_div.classList.add("task_finished");
        task_status_icon_span.innerHTML = '<i class="material-icons">check_box</i>';
    } else {
        task_status_icon_span.innerHTML = '<i class="material-icons">check_box_outline_blank</i>';
    }

    const task_desc_div = document.createElement("div");
    task_desc_div.classList.add("task_description_div");
    task_desc_div.innerHTML = task.task_description;

    const task_conditions_div = document.createElement("div");

    /*
    task_group (any/all): {
        task_type (kill/kill_any/clear/something_else?): { <- quest_event_type
            task_target_id (some related id): { <- quest_event_target
                target: Number,
                current: Number,
                requirements: [], //additional triggers needed, like "weapon_unarmed"
    */
    //goes through the properties and sets up display
    let total_tasks = 0;
    Object.keys(task.task_condition).forEach(task_group => {
        if(Object.keys(task.task_condition[task_group]).length) {
            const task_condition_div = document.createElement("div");
            task_condition_div.classList.add("task_condition_div");
            task_condition_div.innerHTML += task_group + ":";
            Object.keys(task.task_condition[task_group]).forEach(task_type => {
                const task_type_div = document.createElement("div");
                task_type_div.classList.add("task_type_div");
                task_type_div.innerHTML += task_type_names[task_type] +":";
                Object.keys(task.task_condition[task_group][task_type]).forEach(task_target_id => {
                    const task_target_div = document.createElement("div");
                    task_target_div.classList.add("task_target_div");
                    task_target_div.innerHTML += task_target_id + ": " + task.task_condition[task_group][task_type][task_target_id].current +"/"+task.task_condition[task_group][task_type][task_target_id].target;
                    task_type_div.appendChild(task_target_div);
                    total_tasks++;
                });
                task_condition_div.appendChild(task_type_div);
            });

            task_conditions_div.appendChild(task_condition_div);
        }
    });
    
    if(total_tasks == 1) {
        //hides the "any"/"all" texts if there's only 1 task, as there's no point in displaying them in this specific case
        const divs = task_conditions_div.getElementsByClassName("task_condition_div");
        for(let i = 0; i < divs.length; i++) {
            divs.item(i).innerHTML = divs.item(i).innerHTML.replace("any:","").replace("all:","");
        }
    }

    task_div.appendChild(task_status_icon_span);
    task_div.appendChild(task_desc_div);
    task_div.appendChild(task_conditions_div);
    return task_div;
}

function update_displayed_quest_task(quest_id, task_index) {
    const quest = quests[quest_id];
    if(quest.quest_tasks[task_index].is_hidden || quest.is_hidden) {
        return;
    }

    const quest_div = document.querySelector(`[data-quest_id="${quest_id}"]`);
    const quest_task_list_div = quest_div.querySelector(".quest_task_list_div");
    const task_div = quest_task_list_div.children.item(task_index) || quest_task_list_div.children.item(task_index-1);

    task_div.replaceWith(create_displayed_quest_task(quest_id, task_index));
}

function update_displayed_quest_tasks(quest_id) {
    const quest_div = document.querySelector(`[data-quest_id="${quest_id}"]`);
    const tasks_div = quest_div.querySelector(".quest_task_list_div");
    tasks_div.replaceWith(create_displayed_quest_tasks_content(quest_id)); //replace task list
    tasks_div.remove();
    //might need to go deeper with tasks if their content becomes foldable
}

function start_rain_animation() {
    start_background_animation("rain");
}

function start_snow_animation() {
    start_background_animation("snow");
}


function start_stars_animation() {
    start_background_animation("stars");
}

function start_background_animation(type) {
    
    
    stop_background_animation();

    let particle_class;
    switch(type) {
        case "snow":
            particle_class = SnowParticle;
            canvas = document.getElementById("foreground_canvas");
            break;
        case "rain":
            particle_class = RainParticle;
            canvas = document.getElementById("foreground_canvas");
            break;
        case "stars":
            particle_class = PointyStarParticle;
            canvas = document.getElementById("background_canvas");
            break;
        default:
            break;
    }

    
    context = canvas.getContext("2d");
    canvas.width = context.canvas.clientWidth;
    
    canvas.height = context.canvas.clientHeight;
    background_animation_particles = [];
    for(let i = 0; i < Math.ceil((canvas.width*canvas.height)/5000); i++) {
        background_animation_particles.push(new particle_class({canvas}));
    }

    do_background_animation();
}

function stop_background_animation() {
    canvas = canvas || document.getElementById("foreground_canvas");
    context = context || canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    cancelAnimationFrame(background_animation);
    clearTimeout(background_animation_timeout);
}

function do_background_animation() {
    background_animation_timeout = setTimeout(() => {
        background_animation = requestAnimationFrame(do_background_animation);
        context.clearRect(0,0,canvas.width, canvas.height);
        for(let i = 0; i < background_animation_particles.length; i++) {
            background_animation_particles[i].draw();
        }
    }, 1000/60);
}

function update_export_button_tooltip(time_passed, time_until_reward) {
    if(time_passed > time_until_reward) {
        //just say reward is available
        export_button_tooltip.innerHTML = "Reward available!";
    } else {
        //calculate irl time needed until reward
        let time_needed = time_until_reward - time_passed;
        time_needed /= 1000;
        const seconds = Math.floor(time_needed%60);
        time_needed = Math.floor(time_needed/60);
        const minutes = Math.floor(time_needed%60);
        time_needed = Math.floor(time_needed/60);
        const hours = time_needed;

        export_button_tooltip.innerHTML = `Reward available in: ${hours}:${minutes}:${seconds} real time`;
    }
}

function update_backup_load_button(date_string){
    if(date_string) {
        backup_load_button.innerText = `Load the backup autosave [${date_string.replaceAll("_",":")}]`;
        backup_load_button.style["background-image"] = `var(--options_gradient);`;
        backup_load_button.style["background-color"] = "transparent";
        backup_load_button.style.color = "white";
        backup_load_button.style.cursor = "pointer";
    } else {
        backup_load_button.style["background-image"] = "none";
        backup_load_button.style["background-color"] = "#181818";
        backup_load_button.style.color = "gray";
        backup_load_button.style.cursor = "not-allowed";
    }
}

function update_other_save_load_button(date_string, is_dev) {
    if(is_dev) {
        other_save_load_button.innerText = `Import save from main version`;
    } else {
        other_save_load_button.innerText = `Import save from dev version`;
    }
    if(date_string !== undefined) {
        other_save_load_button.style["background-image"] = `var(--options_gradient);`;
        other_save_load_button.style["background-color"] = "transparent";
        other_save_load_button.style.color = "white";
        other_save_load_button.style.cursor = "pointer";
        if(date_string) {
            other_save_load_button.innerText += ` [${date_string.replaceAll("_",":")}]`;
        } else {
            other_save_load_button.innerText += ` [unknown date]`;
        }
    } else {
        other_save_load_button.style["background-image"] = "none";
        other_save_load_button.style["background-color"] = "#181818";
        other_save_load_button.style.color = "gray";
        other_save_load_button.style.cursor = "not-allowed";
    }
    
}

function hide_loading_screen() {
    document.getElementById("loading_screen").style.visibility = "hidden";
}

function set_loading_screen_versions(save_version) {
    const loading_screen = document.getElementById("loading_screen_version_info");
    const current_version = get_game_version();
    loading_screen.innerHTML = 
    `Save game version: ${save_version || "none"}<br>
 Current game version: ${current_version}<br>`;
    if(save_version) {
      if(save_version === current_version) {
        loading_screen.innerHTML += "<div class='top_border'>No changes since the last time you played~</div>"
        } else if(is_a_older_than_b(save_version, current_version)) {
            loading_screen.innerHTML += "<div class='top_border'>Game has been updated since the last time you played, check the changelog for more details</div>";
        } else {
            loading_screen.innerHTML += "<div class='top_border'>Your save is from a newer version of the game. Continuing is likely to lead to multiple issues!</div>";
        }
    }
}

function set_loading_screen_progress(message) {
    loading_progress_div.innerHTML = message;
}

function hide_loading_text() {
    document.getElementById("loading_screen_loading_text").classList.add("fade");
}

function set_loading_screen_errors_warning() {
    const loading_screen_errors_field = document.getElementById("loading_screen_status");
    loading_screen_errors_field.classList.remove('loading_screen_status_warnings');
    loading_screen_errors_field.classList.add('loading_screen_status_errors');

    loading_screen_errors_field.innerHTML = 'An error has occured on loading! Please open the browser console to check for details and then let the developer know!';
}

function set_loading_screen_warnings_warning() {
    const loading_screen_errors_field = document.getElementById("loading_screen_status");
    loading_screen_errors_field.classList.add('loading_screen_status_warnings');
    loading_screen_errors_field.innerHTML = "A potential issue has occured on loading. Please open the browser console to check for details.";
}

function show_play_button() {
    const play_button = document.getElementById("loading_screen_play_button");
    play_button.classList.remove("none_display");
    play_button.classList.add("fade_in");
}

function set_play_button_text(text) {
    const play_button = document.getElementById("loading_screen_play_button");
    play_button.innerText = text;
}

/**
 * Toggles a specificed class for target 'element', removing it from any other element that might have had it.
 * If 'siblings_only' is true, class will be removed only from siblings
 * @param {Object} params
 * @param {HTMLElement} params.element
 * @param {Boolean} [params.siblings_only]
 * @param {String} params.class_name
 */
function toggle_exclusive_class({element, siblings_only=false, class_name}) {
    const elems = siblings_only?element.parentNode.querySelectorAll(`.${class_name}`):document.getElementsByClassName(class_name);
    const has_class = element.classList.contains(class_name);
    for(let i = 0; i < elems.length; i++) {
        elems[i].classList.remove(class_name);
    }

    if(!has_class) {
        element.classList.add(class_name);
    }
}
function remove_class_from_all(class_name) {
    const elems = document.getElementsByClassName(class_name);
    while(elems.length > 0) {
        elems.item(0).classList.remove(class_name);
    }
}

function is_element_above_x(element, x) {
    const rect = element.getBoundingClientRect();
    const rect2 = x.getBoundingClientRect();

    return rect.bottom <= rect2.top;
}

export {
    fill_action_box,
    start_activity_animation, end_activity_animation,
    update_displayed_trader, update_displayed_trader_inventory, update_displayed_character_inventory, sort_displayed_inventory,
    create_item_tooltip,
    update_displayed_money,
    log_message,
    clear_action_div,
    update_displayed_enemies, update_displayed_health_of_enemies, update_displayed_normal_location, update_displayed_combat_location,
    log_loot,
    update_displayed_equipment, update_displayed_health, update_displayed_stamina, update_displayed_stats, update_displayed_effects, update_displayed_effect_durations,
    capitalize_first_letter,
    format_money,
    update_displayed_time, update_displayed_temperature,
    update_displayed_character_xp,
    update_displayed_dialogue, update_displayed_textline_answer,
    exit_displayed_trade,
    start_activity_display, start_sleeping_display,
    create_new_skill_bar, update_displayed_skill_bar, update_displayed_skill_description, update_displayed_skill_level,
    update_displayed_skill_xp_gain,
    update_all_displayed_skills_xp_gain,
    clear_skill_bars,
    update_displayed_ongoing_activity,
    clear_skill_list,
    update_character_attack_bar,
    clear_message_log,
    update_enemy_attack_bar, 
    do_enemy_onhit_animation, remove_enemy_onhit_animation, do_enemy_onstart_animation,
    remove_fast_travel_choice,
    create_new_bestiary_entry, update_bestiary_entry, update_bestiary_entry_killcount, clear_bestiary, update_bestiary_entry_tooltip,
    start_reading_display,
    sort_displayed_skills,
    update_displayed_xp_bonuses, update_displayed_stance_list, update_displayed_stamina_efficiency, 
    update_displayed_stance, update_displayed_faved_stances, update_stance_tooltip,
    update_gathering_tooltip,
    update_displayed_location_types,
    open_crafting_window, close_crafting_window,
    switch_crafting_recipes_page, switch_crafting_recipes_subpage,
    create_displayed_crafting_recipes, 
    update_displayed_component_choice, update_displayed_material_choice, 
    update_recipe_tooltip, update_displayed_crafting_recipes,
    update_item_recipe_visibility, update_item_recipe_tooltips,
    update_displayed_book,
    update_backup_load_button, update_other_save_load_button,
    start_game_action_display,
    set_game_action_finish_text,
    update_game_action_progress_bar, update_game_action_finish_button,
    update_displayed_storage, exit_displayed_storage, update_displayed_storage_inventory,
    update_location_icon,
    skill_list,
    update_booklist_entry, booklist_entry_divs,
    add_quest_to_display, update_displayed_quest, update_displayed_quest_task, 
    start_rain_animation, start_snow_animation, start_stars_animation, stop_background_animation,
    update_displayed_total_price,
    skill_category_order,
    update_export_button_tooltip,
    update_displayed_reputation,
    hide_loading_screen, set_loading_screen_versions, set_loading_screen_errors_warning, 
    set_loading_screen_progress, hide_loading_text, show_play_button, set_loading_screen_warnings_warning, set_play_button_text,
    create_floating_effect
}