import {Game_time} from "./game_time.js";
import {Enemy, enemies_dict} from "./enemies.js";

var character_name = "You";
var name_field = document.getElementById("character_name_field");
name_field.value = character_name;

var message_log = document.getElementById("message_log_div");
var time_field = document.getElementById("time_div");

const current_game_time = new Game_time(954, 4, 1, 8, 5);


// button testing cuz yes
document.getElementById("test_button").addEventListener("click", test_button);
function test_button() {
	//log_message(character_name);
	log_loot(enemies_dict["Wolf"].get_loot());
}


name_field.addEventListener("change", () => character_name = name_field.value.toString().trim().length>0?name_field.value:"Nameless Hero");

//single tick of fight
function do_combat() {
	

}


//writes message to the message log
function log_message(message_to_add, message_type) {
	//todo: add classes to message div, depending on message type (mainly for coloring)

	if(typeof message_to_add === 'undefined') {
		return;
	}

	var message = document.createElement("div");
	message.classList.add("message_default");
	//add switch for adding message style classes

	message.innerHTML = message_to_add + "<div class='message_border'> </>";

	//removes first position if there's too many messages
	if(message_log.children.length > 37) 
	{
		message_log.removeChild(message_log.children[0]);
	}

	message_log.appendChild(message);
	message_log.scrollTop = message_log.scrollHeight;
}

function log_loot(loot_list) {
	
	if(loot_list.length == 0) {
		return;
	}

	var message = "Looted " + loot_list[0]["count"] + "x " + loot_list[0]["item"];
	if(loot_list.length > 1) {
		for (var i = 1; i < loot_list.length; i++) {
			message += (", " + loot_list[i]["count"] + "x " + loot_list[i]["item"] + " ");
		}
	}
	//this looks terrible

	log_message(message, "combat loot");
	
}


function update_timer() {
	time_field.innerHTML = current_game_time.toString();
	current_game_time.go_up();
}
//updates time div

function tick(tickrate, time_variance) {
	return new Promise(resolve => setTimeout(resolve, (1000 - time_variance)/tickrate));

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
	//best leave it at 1, as less is rather slow, and more makes ticks noticably unstable

	var time_variance = 0;
	//how much deviated was duration of tick
	var accumulator = 0;
	//accumulates deviations

	var start_date;
	var end_date;

	while(true){
		start_date = new Date();

		await tick(tickrate, accumulator);
		//uses value from accumulator (instead of time_variance) for more precise overall stabilization
		//(instead of only stabilizing relative to previous tick, it now stabilizes relative to sum of deviations)
		update();
		end_date = new Date();

		time_variance = (end_date - start_date) - 1000/tickrate;
		accumulator += time_variance;

		//console.log((end_date - start_date).toString() + " : " + accumulator.toString());
	}
}
run();
