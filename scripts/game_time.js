function Game_time(year, month, day, hour, minute) {
	this.year = year;
	this.month = month;
	this.day = day;
	this.hour = hour;
	this.minute = minute;
	this.day_count = 1;
	//only hours and minutes should be allowed to be 0
	//day_count is purely for calculating day of the week, by default it always start at monday
	//might be a wrong approach

	this.go_up = function () {
		this.minute += 1;
		if(this.minute > 60) 
		{
			this.minute = 0;
			this.hour +=1;
		}
	
		if(this.hour > 24) 
		{
			this.hour = 0;
			this.day +=1; 
			this.day_count +=1;
		}
	
		if(this.day > 30) 
		{
			this.day = 1;
			this.month += 1;
		}
	
		if(this.month > 12) 
		{
			this.month = 1;
			this.year += 1;
		}
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
				break;
			case 1: 
				return "Monday";
				break;
			case 2:
				return "Tuesday";
				break;
			case 3: 
				return "Wednesday";
				break;
			case 4:
				return "Thursday";
				break;
			case 5:
				return "Friday";
				break;
			case 6:
				return "Saturday";
				break;
			default:
				return x;
		}
	}	

}

Game_time.prototype.toString = function() {
	var date_string = this.get_day_of_the_week() + " ";
	date_string += this.day>9?this.day:`0${this.day}` + "/";
	date_string += this.month>9?this.month:`0${this.month}` + "/";
	date_string += this.year + " ";
	date_string += this.hour>9?this.hour:`0${this.hour}` + ":";
	date_string += this.minute>9?this.minute:`0${this.minute}`;
	return date_string;
}

export {Game_time};