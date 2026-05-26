"use strict";

import { game_options } from "./main.js"

const stat_names = {
    "strength": "str",
    "health": "hp",
    "max_health": "hp", //same as for "health"
    "health_regeneration_flat": "hp regen",
    "health_regeneration_percent": "hp % regen",
    "health_loss_flat": "hp loss",
    "health_loss_percent": "hp % loss",
    "stamina_regeneration_flat": "stam regen",
    "stamina_regeneration_percent": "stam % regen",
    "max_stamina": "stamina",
    "agility": "agl",
    "dexterity": "dex",
    "magic": "magic",
    "attack_speed": "attack speed",
    "attack_power": "attack power",
    "crit_rate": "crit rate",
    "crit_multiplier": "crit dmg",
    "stamina_efficiency": "stamina efficiency",
    "intuition": "int",
    "block_strength": "shield strength",
    "hit_chance": "hit chance",
    "evasion": "EP",
    "evasion_points": "EP",
    "attack_points": "AP",
    "heat_tolerance": "heat resistance",
    "cold_tolerance": "cold resistance",
    "unarmed_power": "unarmed base dmg",
    "armor_penetration": "armor pen",
    "defense": "defense",
};

const task_type_names = {
    "kill": "kill",
    "kill_any": "kill",
    "clear": "clear",
}

//skill-tag mapping for when consumables are used
//also gets used for effects from other sources
const skill_consumable_tags = {
    "Medicine": "medicine",
    "Gluttony": "food",
    "Poison resistance": "poison",
}

//additional skill-tag mapping for crafting
const crafting_tags_to_skills = {
    "medicine": "Medicine",
}

function clamp(x, min, max) {
    return Math.max(Math.min(x, max), min);
}

function random_range(min, max) {
    return Math.floor(Math.random() * (max-min) + min);
}

function slerp(arr, t) {
    return arr[0] * (arr[1] / arr[0]) ** t;
}

function expo(number, precision = 3)
{
    number = Number.parseFloat(number);
    let abs_number = Math.abs(number);

    if(abs_number == 0) {
        return 0;
    } else if(abs_number >= 10**game_options.expo_threshold || abs_number < 0.01) {
        return abs_number.toExponential(precision).replace(/[+-]/g,"");
    } else if(abs_number > 10) {
        return Math.round(number).toLocaleString();
    } else if(abs_number > 1) {
        return (Math.round(number * 10) / 10).toLocaleString();
    } else {
        return (Math.round(number * 100) / 100).toLocaleString();
    }
}

function round_item_price(price) {
    if(price > 19999) {
        return Math.ceil(price/1000)*1000;
    } else if(price > 1999) {
        return Math.ceil(price/100)*100;
    } else if(price > 199){
        return Math.ceil(price/10)*10;
    } else {
        return Math.ceil(price);
    }
}

function format_reading_time(time) {
    if(time >= 120) {
        return `${Math.floor(time/60)} hours`;
    } else if(time >= 60) {
        return '1 hour';
    } else {
        return `${Math.round(time)} minutes`;
    }
}

function format_working_time(time) {
    let formatted = "";
    const hours = Math.floor(time/60);
    const minutes = time%60;

    if(hours > 0) {
        if(hours > 1) {
            formatted += hours + " hours";
        } else {
            formatted += hours + " hour";
        }
    }
    if(minutes > 0) {
        if(hours > 0) {
            formatted += " ";
        }
        if(minutes > 1) {
            formatted += minutes + " minutes";
        } else {
            formatted += minutes + " minute";
        }
    }
    return formatted;
}

function get_hit_chance(attack_points, evasion_points) {
    let result = attack_points/(attack_points+evasion_points);

    if(result >= 0.80) {
        result = 0.971+(result-0.8)**1.4;
    } else if(result >= 0.70) {
        result = 0.846+(result-0.7)**0.9;
    } else if(result >= 0.6) {
        result = 0.688+(result-0.6)**0.8;
    } else if(result >= 0.50) {
        result = 0.53+(result-0.5)**0.8;
    } else if(result >= 0.40) {
        result = 0.331+(result-0.4)**0.7;
    } else if(result >= 0.3) {
        result = 0.173 + (result-0.3)**0.8;
    } else if(result >= 0.20) {
        result = 0.073 + (result-0.2);
    } else if(result >= 0.10) {
        result = 0.01 + (result-0.1)**1.2;
    } else {
        result = 0;
    }

    return result;
}

/**
 * 
 * @returns {String} 1 if a is newer, 0 if both are same, -1 if b is newer
 */
function compare_game_version(version_a, version_b) {
    let a = version_a.replace("v","").split(".");
    let b = version_b.replace("v","").split(".");

    //if length differs, fill shorter with additional zeroes; could just do additional condition in comparison, but this is more fancy
    if(a.length > b.length) {
        b.push(...Array(a.length-b.length).fill("0"));
    } else if(b.length > a.length) {
        a.push(...Array(b.length-a.length).fill("0"));
    }

    //go through the entire length, comparing values until they differ (or until reaching the end, in which case it will return a 0 after the loop)
    for(let i = 0; i < a.length; i++) {
        let temp;
        if(Number.parseInt(a[i]) && Number.parseInt(b[i])) {
            temp = [Number.parseInt(a[i]), Number.parseInt(b[i])] 
        } else {
            temp = [a[i] || 0, b[i] || 0];
        }
        if(temp[0] === temp[1]) {
            continue;
        } else if(temp[0] > temp[1]) {
            return 1;
        } else {
            return -1;
        }
    }

    return 0;
}

function is_a_older_than_b(version1, version2) {
    return compare_game_version(version1, version2) < 0;
}

function celsius_to_fahrenheit(num) {
    return 32 + Math.round(10*num*9/5)/10;
}

function hex_to_rgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {};
}

function calculate_luminance({r, g, b}) {
    const red = 0.2126;
    const green = 0.7152;
    const blue = 0.0722;
    const gamma = 2.4;

    let a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, gamma);
        }
    );
    return a[0] * red + a[1] * green + a[2] * blue;
}

function calculate_contrast(color_a, color_b) {
    let luminance_1 = calculate_luminance(hex_to_rgb(color_a));
    let luminance_2 = calculate_luminance(hex_to_rgb(color_b));
    let brightest = Math.max(luminance_1, luminance_2);
    let darkest = Math.min(luminance_1, luminance_2);
    return (brightest + 0.05) / (darkest + 0.05);
}

function select_outline_class(color_hex) {
    const black_outline_class = "outline_black";
    const white_outline_class = "outline_white";

    const contrast_with_black = calculate_contrast(color_hex, "#000000");
    const contrast_with_white = calculate_contrast(color_hex, "#ffffff");
    if(contrast_with_black > contrast_with_white) {
        return black_outline_class;
    } else {
        return white_outline_class;
    }
}

/**
 * for loading older saves
 */
const component_name_mapping = {
    "Simple short wooden hilt" : "Simple wooden short handle",
    "Short wooden hilt" : "Wooden short handle",
    "Short ash wood hilt" : "Ash wood short handle",
    "Short weak bone hilt" : "Weak bone short handle",
    "Cheap short iron hilt" : "Cheap iron wooden short handle",
    "Short iron hilt" : "Iron short handle",
    "Short steel hilt" : "Steel short handle",
    "Turtleshell hilt": "Turtleshell short handle",

    "Simple medium wooden handle": "Simple wooden medium handle",
    "Medium wooden handle": "Wooden medium handle",
    "Medium ash wood handle": "Ash wood medium handle",
    "Medium weak bone handle": "Weak bone medium handle",
    "Cheap medium iron handle": "Cheap iron medium handle",
    "Medium iron handle": "Iron medium handle",
    "Medium steel handle": "Steel medium handle",
    "Turtleshell handle": "Turtleshell medium handle",

    "Simple long wooden shaft": "Simple wooden long handle",
    "Long wooden shaft": "Wooden long handle",
    "Long ash wood shaft": "Ash wood long handle",
    "Long weak bone shaft": "Weak bone long handle",
    "Cheap long iron shaft": "Cheap iron long handle",
    "Long iron shaft": "Iron long handle",
    "Long steel shaft": "Steel long handle",
    "Turtleshell shaft": "Turtleshell long handle",

    "Basic shield handle": "Simple wooden shield handle",
    "Crude wooden shield base": "Simple wooden shield base",
    "Crude iron shield base": "Cheap iron shield base",

    "Cheap short iron blade": "Cheap iron short blade",
    "Short iron blade": "Iron short blade",
    "Short steel blade": "Steel short blade",

    "Cheap long iron blade": "Cheap iron long blade",
    "Long iron blade": "Iron long blade",
    "Long steel blade": "Steel long blade",

    "Turtleshell chestplate": "Turtleshell chestplate armor",
    "Alligator leather helmet armor": "Alligator helmet armor",
    "Alligator leather chestplate armor": "Alligator chestplate armor",
    "Alligator leather greaves": "Alligator greaves",
    "Alligator leather glove armor": "Alligator glove armor",
    "Alligator leather shoe armor": "Alligator shoe armor",
    "Alligator leather armor": "Alligator armor",

    "Iron chainmail shoes": "Iron chainmail shoe armor",
    "Iron chainmail glove": "Iron chainmail glove armor",

    "Steel chainmail shoes": "Steel chainmail shoe armor",
    "Steel chainmail glove": "Steel chainmail glove armor",
};

/**
 * for loading older saves
 */
const item_mapping = {
    "Piece of rough wood": {item_id: "Rough wood log", item_count: 0.2},
    "Piece of wood": {item_id: "Wood log", item_count: 0.2},
    "Piece of ash wood": {item_id: "Ash wood log", item_count: 0.2},
}


/**
 * Translates component names from pre-autofilling to post-autofilling
 * @param {*} name 
 * @returns 
 */
function get_component_name(name) {
    return component_name_mapping[name] || name;
}

function get_item_mapping(item_id) {
    return item_mapping[item_id] || {item_id, item_count: 1};
}

export {
    expo, random_range, clamp, slerp, format_reading_time, format_working_time, 
        get_hit_chance, round_item_price,
        compare_game_version, is_a_older_than_b,
        stat_names, task_type_names, skill_consumable_tags, crafting_tags_to_skills,
        celsius_to_fahrenheit,
        select_outline_class,
        component_name_mapping, get_component_name,
        get_item_mapping
    };
