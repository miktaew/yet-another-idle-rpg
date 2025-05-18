"use strict";

function Game_time(new_time) {
    this.year = new_time.year;
    this.month = new_time.month;
    this.day = new_time.day;
    this.hour = new_time.hour;
    this.minute = new_time.minute;
    this.day_count = new_time.day_count;
    //only hours and minutes should be allowed to be 0
    //day_count is purely for calculating day of the week, by default it always start at monday (so day_count = 1)

    this.goUp = function(how_much) {
        this.minute += how_much || 1;
        if(this.minute >= 60) {
            const m = this.minute % 60;
            const h = Math.floor(this.minute/60);
            this.minute = m;
            this.hour += h;
        }
    
        if(this.hour >= 24) {
            const h = this.hour % 24;
            const d = Math.floor((this.hour-1)/24) + 1;
            this.hour = h;
            this.day += d; 
            this.day_count += d;
        }
    
        if(this.day > 30) {
            const d = (this.day-1) % 30 + 1;
            const m = Math.floor((this.day-1)/30) + 1;
            this.day = d+1;
            this.month += m;
        }
    
        if(this.month > 12) {
            const m = (this.month-1) % 12 + 1;
            const y = Math.floor((this.month-1)/ 12) + 1;
            this.month = m+1;
            this.year += y;
        }
    }

    this.loadTime = function(new_time) {
        this.year = new_time.year;
        this.month = new_time.month;
        this.day = new_time.day;
        this.hour = new_time.hour;
        this.minute = new_time.minute;
        this.day_count = new_time.day_count;
    }

    this.getSeason = function() {
        if(this.month > 9) return "Winter";
        else if(this.month > 6) return "Autumn";
        else if(this.month > 3) return "Summer";
        else return "Spring";
    }

    this.getDayOfTheWeek = function() {
        switch(this.day_count % 7) {
            case 0:
                return "Sunday";
            case 1: 
                return "Monday";
            case 2:
                return "Tuesday";
            case 3: 
                return "Wednesday";
            case 4:
                return "Thursday";
            case 5:
                return "Friday";
            case 6:
                return "Saturday";
        }
    }	

}

Game_time.prototype.toString = function() {
    var date_string = this.getDayOfTheWeek() + " ";
    date_string += ((this.day>9?this.day:`0${this.day}`) + "/");
    date_string += ((this.month>9?this.month:`0${this.month}`) + "/");
    date_string += (this.year + " ");
    date_string += ((this.hour>9?this.hour:`0${this.hour}`) + ":");
    date_string += this.minute>9?this.minute:`0${this.minute}`;
    return date_string;
}

/**
 * 
 * @param {Object} data 
 * @param {Number} data.time {minutes, hours, days, months, years}
 * @param {Boolean} [data.long_names] if it should use "minutes", "hours", etc instead of "m","h"
 * @returns 
 */
function format_time({time, long_names, round=true}) { //{time, long_names?}
    if(!time) {
        throw "No time passed in arguments!";
    }
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
        formatted_time += long_names? `${time.year} years ` : `${time.year}Y`;
    }
    if(time.months > 0) {
        formatted_time += long_names? `${time.months} months ` : `${time.months}M`;
    }
    if(time.days > 0) {
        formatted_time += long_names? `${time.days} days ` : `${time.days}D`;
    }
    if(time.hours > 0) {
        formatted_time += long_names? `${time.hours} hours ` : `${time.hours}h`;
    }
    if(time.minutes > 0) {
        formatted_time += long_names? `${time.minutes} minutes ` : `${time.minutes}m`;
    }

    return formatted_time;
}


function is_night(time) {
    time = time || current_game_time;
    return (time.hour >= 20 || time.hour < 4);
}

const current_game_time = new Game_time({year: 999, month: 4, day: 1, hour: 8, minute: 0, day_count: 1});

export {current_game_time, format_time, is_night};
