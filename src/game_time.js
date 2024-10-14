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

    this.go_up = function(how_much) {
        this.minute += how_much || 1;
        if(this.minute >= 60) 
        {
            this.minute = this.minute - 60;
            this.hour += 1;
        }
    
        if(this.hour >= 24) 
        {
            this.hour = this.hour - 24;
            this.day += 1; 
            this.day_count += 1;
        }
    
        if(this.day > 30) 
        {
            this.day = this.day - 30;
            this.month += 1;
        }
    
        if(this.month > 12) 
        {
            this.month = this.month - 12;
            this.year += 1;
        }
    }

    this.load_time = function(new_time) {
        this.year = new_time.year;
        this.month = new_time.month;
        this.day = new_time.day;
        this.hour = new_time.hour;
        this.minute = new_time.minute;
        this.day_count = new_time.day_count;
    }

    this.get_season = function() {
        if(this.month > 9) return "Winter";
        else if(this.month > 6) return "Autumn";
        else if(this.month > 3) return "Summer";
        else return "Spring";
    }

    this.get_day_of_the_week = function() {
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
    var date_string = this.get_day_of_the_week() + " ";
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
function format_time(data) { //{time, long_names?}
    if(!data.time) {
        throw "No time passed in arguments!";
    }
    
    if(data.time.minutes >= 60) {
        data.time.hours = data.time.hours + Math.floor(data.time.minutes/60) || Math.floor(data.time.minutes/60);
        data.time.minutes = data.time.minutes % 60;
    }
    if(data.time.hours >= 24) {
        data.time.days = data.time.days + Math.floor(data.time.hours/24) || Math.floor(data.time.hours/24);
        data.time.hours = data.time.hours % 24;
    }
    if(data.time.days > 30) {
        data.time.months = data.time.months + Math.floor(data.time.days/30) || Math.floor(data.time.days/30);
        data.time.days = data.time.days % 30;
    }
    if(data.time.months > 12) {
        data.time.years = data.time.years + Math.floor(data.time.months/12) || Math.floor(data.time.months/12);
        data.time.months = data.time.months % 30;
    }

    let formatted_time = '';
    if(data.time.years > 0) {
        formatted_time += data.long_names? `${data.time.year} years ` : `${data.time.year}Y`;
    }
    if(data.time.months > 0) {
        formatted_time += data.long_names? `${data.time.months} months ` : `${data.time.months}M`;
    }
    if(data.time.days > 0) {
        formatted_time += data.long_names? `${data.time.days} days ` : `${data.time.days}D`;
    }
    if(data.time.hours > 0) {
        formatted_time += data.long_names? `${data.time.hours} hours ` : `${data.time.hours}h`;
    }
    if(data.time.minutes > 0) {
        formatted_time += data.long_names? `${data.time.minutes} minutes ` : `${data.time.minutes}m`;
    }

    return formatted_time;
}

const current_game_time = new Game_time({year: 999, month: 4, day: 1, hour: 8, minute: 0, day_count: 1});

export {current_game_time, format_time};
