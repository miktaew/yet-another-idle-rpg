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
        return `${time/60} hours`;
    }
    else if(time >= 60) {
        return '1 hour';
    }
    else {
        return `${time} minutes`;
    }
}


export { expo, format_reading_time };