"use strict";

function expo(number, precision = 2)
{
    if(number >= 1000 || number < 0.01) {
        return Number.parseFloat(number).toExponential(precision).replace(/[+-]/g,"");
    } else if(number > 1) {
        return Math.round(number*10)/10;
    } else if(number > 0.1) {
        return Math.round(number*100)/100;
    }
}

function format_reading_time(time) {
    if(time >= 120) {
        return `${Math.floor(time/60)} hours`;
    }
    else if(time >= 60) {
        return '1 hour';
    }
    else {
        return `${time} minutes`;
    }
}

const stat_names = {"strength": "str",
                    "health": "hp",
                    "max_health": "hp", //same as for "health"
                    "max_stamina": "stamina",
                    "agility": "agl",
                    "dexterity": "dex",
                    "magic": "magic",
                    "attack_speed": "atk spd",
                    "crit_rate": "crit rate",
                    "crit_multiplier": "crit dmg",
                    "stamina_efficiency": "stamina efficiency",
                };

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
        result = result**1.92;
    }

    return result;
}

export { expo, format_reading_time, stat_names, get_hit_chance};