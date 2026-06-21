"use strict";
import { current_game_time, Game_Time, is_night, night_time } from "./game_time.js";
import { current_location } from "./main.js";
import { celsius_to_fahrenheit } from "./misc.js";

const base_temperature = 20; //in celsius

let previous_temperature_modifier;

const seasonal_temperature_modifiers = {
    Winter: -20,
    Spring: -5,
    Summer: 0,
    Autumn: -8,
};

const daytime_temperature_modifiers = {
    Plus: 3, //14:00
    Minus: -8, //5:00
};

//for additional pseudo-randomization
const daycount_temperature_modifier = {
    0: 0,
    1: -1,
    2: 0,
    3: -2,
    4: 3,
    5: 6,
    6: 1,
    7: -2,
    8: 0,
    9: -5,
    10: -1,
};

// 0: no rain; other: rain plus temperature modifier
const rain_cycle = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: -1,
    5: -2,
    6: -2,
    7: -2,
    8: 0,
    9: 0,
    10: 0,
    11: -1,
    12: 0,
};

/**
 * 
 * @param {Game_Time} time 
 * @returns {String} just 
 */
function get_temperature_peak_time(time) {
        if (time.hour >= 14 || time.hour < 5) return "Plus";
        else return "Minus";
}

function get_nonlocational_temperature_modifier(time) {    
    return (seasonal_temperature_modifiers[time.getSeason()] 
                            + daytime_temperature_modifiers[get_temperature_peak_time(time)] 
                            + daycount_temperature_modifier[time.day_count%11]
                            + rain_cycle[time.day_count%13]
                        );
}

function get_temperature_at(time) {
    if(!current_location) {
        throw new Error(`Cannot provide temperature when current_location is '${typeof current_location}'!`);
    }

    if(current_location?.is_temperature_static) {
        if(current_location.static_temperature !== null) {
           return current_location.static_temperature;
        } else {
            return base_temperature;
        }
    }
    
    const location_modifier = current_location.temperature_range_modifier; //modifier to how much it differs from base, applied before location's flat modifier

    if(isNaN(location_modifier)) {
        throw new Error(`Temperature modifier for "${current_location.name}" is not a number!`);
    }
        
    let total_modifier = current_location.temperature_modifier
                           + location_modifier*(seasonal_temperature_modifiers[time.getSeason()] 
                                                 + daytime_temperature_modifiers[get_temperature_peak_time(time)] 
                                                 + daycount_temperature_modifier[time.day_count%11]
                                                 + rain_cycle[time.day_count%13]
                                                );

    return base_temperature + total_modifier;
}

/**
 * @description calculates temperature in a simple deterministic manner, based on time of year, time of day, daycount, and location modifier
 */ 
function get_current_temperature() {
    return get_temperature_at(current_game_time);
}

/**
 * 
 * @returns temperature that's "smoothed" based on current temperature, temperature at next change and time between last and next change
 */
function get_current_temperature_smoothed() {

    if(!current_location) {
        return 0;
    }

    if(!previous_temperature_modifier) {
        previous_temperature_modifier = get_nonlocational_temperature_modifier(current_game_time);
    }

    let prev_temperature_time;
    let next_temperature_time;
    let total_minutes_betwen_changes;

    if(current_game_time.hour >= 14) {
        //next change is at 5 next day
        next_temperature_time = {hours: 5, days: 1};
        prev_temperature_time = {hour: 14};
        total_minutes_betwen_changes = 900;
        previous_temperature_modifier = get_nonlocational_temperature_modifier(current_game_time);
    } else if(current_game_time.hour < 5) {
        //next change is at 5 same day
        next_temperature_time = {hours: 5, days: 0};
        prev_temperature_time = {hour: 14};
        total_minutes_betwen_changes = 900;

    } else if(current_game_time.hour >= 5) {
        //next change is at 14
        next_temperature_time = {hours: 14, days: 0};
        prev_temperature_time = {hour: 5};
        total_minutes_betwen_changes = 540;
        previous_temperature_modifier = get_nonlocational_temperature_modifier(current_game_time);
    }

    if(current_location.is_temperature_static) {
        return current_location.static_temperature;
    }

    let minutes_passed;

    if(current_game_time.hour < prev_temperature_time.hour) {
        //day change occured
        minutes_passed = 60*(24-prev_temperature_time.hour + current_game_time.hour) + current_game_time.minute;
    } else {
        //no day change
        minutes_passed = 60*(current_game_time.hour-prev_temperature_time.hour) + current_game_time.minute;
    }

    const ratio = minutes_passed/total_minutes_betwen_changes;
    
    //grab the next temperature modifier at adequately incremented time
    const next_temperature_modifier = get_nonlocational_temperature_modifier(new Game_Time({
                                                        year: current_game_time.year,
                                                        month: current_game_time.month,
                                                        day: current_game_time.day + next_temperature_time.days,
                                                        hour: next_temperature_time.hours,
                                                        minute: 0,
                                                        day_count: current_game_time.day_count+next_temperature_time.days,
                                                    }));


    const location_modifier = current_location.temperature_range_modifier; //modifier to how much it differs from base, applied before location's flat modifier

    if(isNaN(location_modifier)) {
        throw new Error(`Temperature modifier for "${current_location.name}" is not a number!`);
    }

    //calculate from prev, next and how close timewise it is, include location modifiers

    return Math.round(
            10*(
                base_temperature 
                + (current_location.temperature_modifier || 0) 
                + location_modifier
                    * (previous_temperature_modifier
                        +
                        ratio*(next_temperature_modifier - previous_temperature_modifier)
              )))/10;
}

/**
 * based on a simple 13-long cycle
 */
function is_raining() {
    return rain_cycle[current_game_time.day_count%13] < 0;
}

function get_current_light_level() {
    let light_level;
    if(current_location?.types && current_location.types.filter(t => t.type === "dark").length > 0) {
        light_level = get_current_light_level_for_roofed_location();
    } else {
        //calc based on how far it is from night start/end with 30 minute shift (if night ends at 4, calculate from 3:30, reaching max light level at 4:30)

        const time_dif_from_start = night_time.start*60 - (current_game_time.hour*60+current_game_time.minute) + 30;
        const time_dif_from_end = current_game_time.hour*60 + current_game_time.minute - night_time.end*60 + 30;

        let time_difference;
        if(time_dif_from_end > 0 && time_dif_from_end < 60) {
            time_difference = time_dif_from_end;
        } else if(time_dif_from_start > 0 && time_dif_from_start < 60) {
            time_difference = time_dif_from_start;
        } else {
            time_difference = current_game_time.hour >= night_time.start ? 0 : current_game_time.hour >= night_time.end ? 60 : 0;
        }
        light_level = 40 + time_difference; //technically (time_difference/60) * some scaling duration, but that value is currently also 60
    }

    return light_level;
}

function get_current_light_level_for_roofed_location() {
    let light_level = 100;
    let end_loop = false;
    for(let i = 0; i < current_location.types.length; i++) {
        if(end_loop) { 
            break;
        }

        if(current_location.types[i].type === "dark") {
            switch(current_location.types[i].stage) {
                case 1:
                    light_level = 40;
                    end_loop = true;
                    break;
                case 2:
                    light_level = 20;
                    end_loop = true;
                    break;
                case 3:
                    light_level = 0;
                    end_loop = true;
                    break;
                default:
                    light_level = 100;
                    end_loop = true;
                    break;
            }
        }
    }
    return light_level;
}

export {
    get_current_temperature_smoothed, is_raining, get_current_light_level, get_current_light_level_for_roofed_location,
};
