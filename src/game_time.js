"use strict";

function Game_Time(new_time) {
    this.year = new_time.year;
    this.month = new_time.month;
    this.day = new_time.day;
    this.hour = new_time.hour;
    this.minute = new_time.minute;
    this.day_count = new_time.day_count ?? 1;
    //only hours and minutes should be allowed to be 0
    //day_count is purely for calculating day of the week, by default it always start at monday (so day_count = 1)

    this.goUp = function(how_much) {
        this.minute += how_much ?? 1;
        if(this.minute >= 60) {
            const m = this.minute % 60;
            const h = Math.floor(this.minute/60);
            this.minute = m;
            this.hour += h;
        }
    
        if(this.hour >= 24) {
            const h = this.hour % 24;
            const d = Math.floor(this.hour/24);
            this.hour = h;
            this.day += d;
            this.day_count += d;
        }
    
        if(this.day > 30) {
            const d = this.day % 30;
            const m = Math.floor(this.day/30);
            this.day = d;
            this.month += m;
        }
    
        if(this.month > 12) {
            const m = this.month % 12;
            const y = Math.floor(this.month/12);
            this.month = m;
            this.year += y;
        }
    }

    this.goUp(0); 
    //just in case someone passes a value that's not exactly correct, in a situation where it won't ever get incremented so it won't automatically fix
    //e.g. in weather when grabbing date for next weather, as a change in month would not be reflected and adding a manual recalculation there would be just stupid

    this.loadTime = function(new_time) {
        this.year = new_time.year;
        this.month = new_time.month;
        this.day = new_time.day;
        this.hour = new_time.hour;
        this.minute = new_time.minute;
        this.day_count = new_time.day_count;
    }

    /**
     * 
     * @param {Number} day_count for how far in future to check, leaving at 0 will just return the current season
     * @returns 
     */
    this.getSeason = function(day_count) {
        let month;
        if(day_count) {
            month = this.month + Math.floor((this.day + day_count)/30);
        } else {
            month = this.month;
        }

        if(month > 9) return seasons[3];
        else if(month > 6) return seasons[2];
        else if(month > 3) return seasons[1];
        else return seasons[0];
    }

    this.getTimeOfDay = function() {
        if (this.hour >= 21 || this.hour < 4) return "Night";
        else if(this.hour >= 4 && this.hour < 8) return "Dawn";
        else if(this.hour >= 8 && this.hour < 18) return "Day";
        else return "Dusk";
    }
    
    this.getTimeOfDaySimple = function() {
        //changing this also requires changing values in get_current_temperature_smoothed() in weather.js
        if (this.hour >= 21 || this.hour < 4) return "Night";
        else return "Day";
    }

    this.getDayOfTheWeek = function() {
        switch(this.day_count % 7) {
            case 0:
                return "Sun";
            case 1: 
                return "Mon";
            case 2:
                return "Tue";
            case 3: 
                return "Wed";
            case 4:
                return "Thu";
            case 5:
                return "Fri";
            case 6:
                return "Sat";
        }
    }	
}

Game_Time.prototype.toString = function() {
    let date_string = ((this.day>9?this.day:`0${this.day}`) + "/");
    date_string += ((this.month>9?this.month:`0${this.month}`) + "/");
    date_string += (this.year + " ");
    date_string += ((this.hour>9?this.hour:`0${this.hour}`) + ":");
    date_string += (this.minute>9?this.minute:`0${this.minute}`) + ", ";
    date_string += this.getSeason() + ", " + this.getDayOfTheWeek();
    return date_string;
}

/**
 * 
 * @param {Object} data 
 * @param {Object} data.time {minutes, hours, days, months, years}
 * @param {Boolean} [data.long_names] if it should use "minutes", "hours", etc instead of "m","h"
 * @returns 
 */
function format_time({time, long_names, round=true}) { //{time, long_names?}
    if(!time) {
        throw "No time passed in arguments!";
    }

    time.minutes = Math.ceil(time.minutes);

    if(round) {
        if(time.minutes >= 60) {
            time.hours = time.hours + Math.floor(time.minutes/60) || Math.floor(time.minutes/60);
            time.minutes = time.minutes % 60;
        }
        if(time.hours >= 24) {
            time.days = time.days + Math.floor(time.hours/24) || Math.floor(time.hours/24);
            time.hours = time.hours % 24;
        }
        if(time.days > 30) {
            time.months = time.months + Math.floor(time.days/30) || Math.floor(time.days/30);
            time.days = time.days % 30;
        }
        if(time.months > 12) {
            time.years = time.years + Math.floor(time.months/12) || Math.floor(time.months/12);
            time.months = time.months % 12;
        }
    }

    let formatted_time = '';
    if(time.years > 0) {
        const used_term = time.years == 1?"year":"years";
        formatted_time += long_names? `${time.year} ${used_term} ` : `${time.year}Y`;
    }
    if(time.months > 0) {
        const used_term = time.months == 1?"month":"months";
        formatted_time += long_names? `${time.months} ${used_term} ` : `${time.months}M`;
    }
    if(time.days > 0) {
        const used_term = time.days == 1?"day":"days";
        formatted_time += long_names? `${time.days} ${used_term} ` : `${time.days}D`;
    }
    if(time.hours > 0) {
        const used_term = time.hours == 1?"hour":"hours";
        formatted_time += long_names? `${time.hours} ${used_term} ` : `${time.hours}h`;
    }
    if(time.minutes > 0) {
        const used_term = time.minutes == 1?"minute":"minutes";
        formatted_time += long_names? `${time.minutes} ${used_term} ` : `${time.minutes}m`;
    }

    return formatted_time;
}

function is_night(time) {
    time = time || current_game_time;
    return (time.hour >= 20 || time.hour < 4);
}

const seasons = ["Spring","Summer","Autumn","Winter"];

const current_game_time = new Game_Time({year: 999, month: 4, day: 1, hour: 8, minute: 0, day_count: 1});

export {current_game_time, format_time, is_night, seasons, Game_Time};