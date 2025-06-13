"use strict";
import { current_game_time } from "./game_time.js";
import { current_location } from "./main.js";

const base_temperature = 20; //in celsius

const seasonal_temperature_modifiers = {
    Winter: -20,
    Spring: -5,
    Summer: 0,
    Autumn: -8,
};

const daytime_temperature_modifiers = {
    Night: -8,
    Dawn: -4,
    Day: 3,
    Dusk: -4,
};


//for additional pseudo-randomization
const daycount_temperature_modifier = {
    0: 0,
    1: -1,
    2: 1,
    3: 2,
    4: 3,
    5: 6,
    6: 1,
    7: -2,
    8: -3, 
    9: -5,
    10: -1,
};


/**
 * @description calculates temperature in a simple deterministic manner, based on time of year, time of day, daycount, and location modifier
 */ 
function get_current_temperature() {
    if(!current_location) {
        return;
    }

    if(current_location.is_temperature_static) {
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

    return base_temperature + current_location.temperature_modifier
                            + location_modifier*(seasonal_temperature_modifiers[current_game_time.getSeason()] 
                                                 + daytime_temperature_modifiers[current_game_time.getTimeOfDay()] 
                                                 + daycount_temperature_modifier[current_game_time.day_count%11]
                                                );
}

export {get_current_temperature};
