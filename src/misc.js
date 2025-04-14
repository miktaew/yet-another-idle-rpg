"use strict";

const stat_names = {"strength": "str",
    "health": "hp",
    "max_health": "hp", //same as for "health"
    "health_regenaration_flat": "hp regen",
    "health_regeneration_multiplier": "hp regen",
    "health_loss_flat": "hp loss",
    "health_loss_multiplier": "hp loss",
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
};

function expo(number, precision = 2)
{
    if(number == 0) {
        return 0;
    } else if(number >= 1000 || number < 0.01) {
        return Number.parseFloat(number).toExponential(precision).replace(/[+-]/g,"");
    } else if(number > 10) {
        return Math.round(number);
    } else if(number > 1) {
        return Math.round(number*10)/10;
    } else {
        return Math.round(number*100)/100;
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

export { expo, format_reading_time, format_working_time, stat_names, get_hit_chance, 
        compare_game_version, is_a_older_than_b,
        round_item_price};