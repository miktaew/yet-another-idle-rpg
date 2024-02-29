"use strict";

function expo(number, precision = 2)
{
    if(number >= 1000 || number < 0.01) {
        return Number.parseFloat(number).toExponential(precision).replace(/[+-]/g,"");
    } else if(number > 1) {
        return Math.round(number*10)/10;
    } else {
        return Math.round(number*1000)/1000;
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


export { expo, format_reading_time, stat_names };