import {Game_time} from "./game_time.js";
import { locations } from "./locations.js";


//current idea for starting stats, probably a bit too low, but might give some items before first fight
//var character = {name: "You", titles: {}, stats: {health: 10, strength: 2, agility: 2, magic: 0, attack_speed: 1}};

var character = {name: "Hero", titles: {}, stats: {health: 100, strength: 2, agility: 10, magic: 0, attack_speed: 2}};

var current_enemy = null;
var additional_hero_attacks = 0;
var additional_enemy_attacks = 0;
var current_location = locations["Infested field"];

var name_field = document.getElementById("character_name_field");
name_field.value = character.name;

var message_log = document.getElementById("message_log_div");
var time_field = document.getElementById("time_div");

const current_game_time = new Game_time(954, 4, 1, 8, 5);


// button testing cuz yes
document.getElementById("test_button").addEventListener("click", test_button);
function test_button() {
	//log_message(character.name);
	//log_loot(enemies_dict["Wolf"].get_loot());
}


name_field.addEventListener("change", () => character.name = name_field.value.toString().trim().length>0?name_field.value:"Nameless Hero");

//single tick of fight
function do_combat() {
	if(current_enemy === null) {
		current_enemy = current_location.get_next_enemy();
	}


	//todo: separate formulas for physical and magical weapons
	//and also need weapons before that...

	var hero_hit_chance = Math.max(0.2, (character.stats.agility/current_enemy.agility)*0.5);
	//so 100% if at least twice more agility, 50% if same, and never less than 20%
	var hero_evasion_chance = Math.min(0.95, (character.stats.agility/current_enemy.agility)*0.5);
	//so up to 95% if at least twice more agility, 50% if same, can go down to 0%
	//todo: make it 0% when using shield, only blocking will be possible with it

	var hero_base_damage = character.stats.strength; // + weapon and then multiplied by bonus from weapon skill and bonus from magic enchantment if learned

	var enemy_base_damage = current_enemy.strength;

	var damage_dealt;

	var hero_defense = 0; //will be a sum of armor from worn equipment + maybe a bonus from some magic stuff

	// and also crit attacks?
	// maybe flat 10% chance with 200% dmg for enemies, that can then be reduced with hero skills? (both chance and dmg) 

	if(character.stats.attack_speed > current_enemy.attack_speed) {
		additional_hero_attacks += (character.stats.attack_speed/current_enemy.attack_speed - 1);
		additional_enemy_attacks = 0;
	} else if (character.stats.attack_speed < current_enemy.attack_speed) {
		additional_enemy_attacks += (current_enemy.attack_speed/character.stats.attack_speed - 1);
		additional_hero_attacks = 0;
	}
	
	for(var i = 0; i <= additional_hero_attacks; i++) {
		if(i > 0) {
			additional_hero_attacks -= 1;
		}
		if(hero_hit_chance > Math.random()) {
			//hero's attack hits
			//proper combat skill goes up a tiny bit

			damage_dealt = Math.round(hero_base_damage * (1.2 - Math.random() * 0.4));
			//so it would then get multiplied by crit (if it happens)
			
			damage_dealt = Math.max(damage_dealt - current_enemy.defense, 1);

			current_enemy.health -= damage_dealt;
			log_message(current_enemy.name + " was hit for " + damage_dealt + " dmg", "enemy_attacked");

			if(current_enemy.health <= 0) {
				log_message(character.name + " has defeated " + current_enemy.name, "enemy_defeated");
				log_loot(current_enemy.get_loot());
				current_enemy = null;
				additional_enemy_attacks = 0;
				return;
			}
		} else {
			log_message(character.name + " has missed");
		}
	}

	for(var i = 0; i <= additional_enemy_attacks; i++)
	{
		if(i > 0) {
			additional_enemy_attacks -= 1;
		}
		if(hero_evasion_chance < Math.random()) {
			//hero gets hit (unless also has shield, then )
			damage_dealt = Math.round(enemy_base_damage * (1.2 - Math.random() * 0.4));
			//so it would then get multiplied by crit (if it happens)

			damage_dealt = Math.max(damage_dealt - hero_defense, 1);

			character.stats.health -= damage_dealt;
			log_message(character.name + " was hit for " + damage_dealt + " dmg", "hero_attacked");

			if(character.stats.health <= 0) {
				log_message(character.name + " has lost consciousness", "hero_defeat");
				additional_hero_attacks = 0;
				current_enemy = null;
				// leave combat zone, zeroing additional attacks can be maybe as part of changing the zone?
			}
		} else {
			log_message(current_enemy.name + " has missed");
			// evasion skill goes up
		}
	}
	/* 
	 enemy is in a global variable
	 if killed, uses method of Location object to assign a random new enemy (of ones in Location) to that variable;
	 

	 todo: give xp
	 and also on each move, if character manages to hit/evade/block or gets hit (so basically however enemy's move goes,
	 except for when it dies and doesn't do anything), add xp to proper skills;
	 
	 attack dmg either based on strength + weapon stat, or some magic stuff?
	 maybe some weapons will be str based and will get some small bonus from magic if player has proper skill unlocked
	 (something like "weapon aura"), while others (wands and staffs) will be based purely on magic
	 single stat "magic" + multiple related skills?
	 also should offer a bit better scaling than strength, so worse at beginning but later on gets better?
	 also a magic resistance skill for player

	 block chance only when using shield, based on skill (40% at 0 skill, 80% at max) but only if dmg is lower than shield strength
	 if it's higher, then block chance reduced to 10%-50% and defender take dmg equal to atk dmg - shield str?
	 also shield require some strength to use
	 */

}


//writes message to the message log
function log_message(message_to_add, message_type) {
	//todo: add classes to message div, depending on message type (mainly for coloring)

	if(typeof message_to_add === 'undefined') {
		return;
	}

	var message = document.createElement("div");
	message.classList.add("message_common");

	var class_to_add = "message_default";

	//selects proper class to add based on argument
	//totally could have just passed class name as argument and use it instead of making this switch
	switch(message_type) {
		case "enemy_defeated":
			class_to_add = "message_victory";
			break;
		case "hero_defeat":
			class_to_add = "message_hero_defeated";
			break;
		case "enemy_attacked":
			class_to_add = "message_enemy_attacked";
			break;
		case "hero_attacked":
			class_to_add = "message_hero_attacked";
			break;
		case "combat_loot":
			class_to_add = "message_items_obtained";
			break;
	}
	message.classList.add(class_to_add);

	message.innerHTML = message_to_add + "<div class='message_border'> </>";


	if(message_log.children.length > 30) 
	{
		message_log.removeChild(message_log.children[0]);
	} //removes first position if there's too many messages

	message_log.appendChild(message);
	message_log.scrollTop = message_log.scrollHeight;
}

function log_loot(loot_list) {
	
	if(loot_list.length == 0) {
		return;
	}

	var message = "Looted " + loot_list[0]["item"] + " x" + loot_list[0]["count"];
	if(loot_list.length > 1) {
		for (var i = 1; i < loot_list.length; i++) {
			message += (", " + loot_list[i]["item"] + " x" + loot_list[i]["count"]);
		}
	} //this looks terrible

	log_message(message, "combat_loot");
	
}


function update_timer() {
	time_field.innerHTML = current_game_time.toString();
	current_game_time.go_up();
} //updates time div

function tick(tickrate, time_variance) {
	return new Promise(resolve => setTimeout(resolve, (1000 - time_variance)/tickrate));
} //ticks

function update() {
	//so technically everything is supposed to be happening in here
	//maybe just a bunch of IFs, checking what character is currently doing and acting properly?
	//i.e. fighting, sleeping, training, mining (if it even becomes a thing)
	//active skills, like eating, probably can be safely calculated outside of this?
	
	update_timer();
	do_combat(); //but only if in combat zone
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
