import {Game_time} from "./game_time.js";

var character_name = "You";
var name_field = document.getElementById("character_name_field");
name_field.value = character_name;

var message_log = document.getElementById("message_log_div");
var time_field = document.getElementById("time_div");

const current_game_time = new Game_time(954, 4, 1, 8, 5);


// button testing cuz yes
document.getElementById("test_button").addEventListener("click", test_button);
function test_button() {
	log_message(character_name);
}



name_field.addEventListener("change", () => character_name = name_field.value);

//writes message to the message log
function log_message(message_to_add, message_type = "default") {
	//todo: add classes to message div, depending on message type (mainly for coloring)

	var message = document.createElement("div");
	message.classList.add("message");
	message.innerHTML = message_to_add;

	//removes first position if there's too many messages
	if(message_log.children.length > 37) 
	{
		message_log.removeChild(message_log.children[0]);
	}
	message_log.appendChild(message);
	message_log.scrollTop = message_log.scrollHeight;
}

function update_timer() {
	time_field.innerHTML = current_game_time.toString();
	current_game_time.go_up();
}
//updates time div

function tick(tickrate = 1, time_variance = 0) {
	return new Promise(resolve => setTimeout(resolve, Math.max(1, (1000 - time_variance))/tickrate));
	// hopefully won't ever be over 1000, but better safe than sorry

}

function update() {
	//so technically everything is supposed to be happening in here
	//maybe just a bunch of IFs, checking what character is currently doing and acting properly?
	//i.e. fighting, sleeping, training, mining (if it even becomes a thing)
	//active skills, like eating, probably can be safely calculated outside of this?
	
	update_timer();


	//log_message(character_name);
}

async function run() {
	var tickrate = 1;
	//how many ticks per second

	var time_variance = 0;
	//how much deviated was duration of tick
	var accumulator = 0;
	//accumulates deviations

	var start_date;
	var end_date;

	while(true){
		start_date = new Date();

		await tick(tickrate, accumulator);
		//uses value from accumulator for more precise overall stabilization
		//(instead of only stabilizing relative to previous tick, it now stabilizes relative to sum of deviations)
		update();
		end_date = new Date();

		time_variance = (end_date - start_date) - 1000;
		accumulator += time_variance;

		//console.log((end_date - start_date).toString() + " : " + accumulator.toString());
	}
}
run();