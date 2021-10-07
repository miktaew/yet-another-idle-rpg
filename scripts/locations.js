import {enemy_templates, Enemy} from "./enemies.js";
var locations = {};
//will contain all the locations


function Location(location_data) {
	/* always safe,

	*/
		this.name = location_data.name;
		this.description = location_data.description; //try to keep it short
		this.connected_locations = location_data.connected_locations; //this will be a list

		// Activities, maybe make a special object type for actions (passive_activities ?), like sleeping/training/learning 
		// => or make it only one action per "location_action", similarly to combat_zone (except no child zones)?,
		// or "location_actions" (a list/dict)
		// either way, leaving the location should automatically stop it

		// is_unlocked; //quests and combat_zones and stuff can have something like "unlocks: Location"
		//or maybe "rewards: {"locations": X, "stats": X, "items": X, "quests"}}" or something like that?"
		// something for conversations
		// conversation with "person" could be a small location that has options that mostly log some messages or give/unlock stuff/quests/etc
}

function Combat_zone(location_data) {
	/* action is to go back or to go forward (after defeating enemies), 
	after clearing, may permanently unlock a single, harder zone (meaning also more xp/loot), from where the only way is back;
	always hostile

	*/
	this.name = location_data.name;
	this.description = location_data.description;
	this.is_unlocked = location_data.is_unlocked;
	this.enemies_list = location_data.enemies_list;
	this.enemy_count = location_data.enemy_count;
	this.enemies_killed = 0; //TODO: increase after each kill, if it reaches enemy_count then give rewards and possibly unlock a new combat zone
	this.reset_kills_on_leaving = location_data.reset_kills_on_leaving;
	this.parent_location = location_data.parent_location;

	this.get_next_enemy = function() {
		var enemy = this.enemies_list[Math.floor(Math.random() * this.enemies_list.length)];
		return new Enemy({
			name: enemy.name, description: enemy.description, xp_value: enemy.xp_value, 
			stats: {health: Math.round(enemy.stats.health * (1.1 - Math.random() * 0.2)),
					strength: Math.round(enemy.stats.strength * (1.1 - Math.random() * 0.2)), agility: Math.round(enemy.stats.agility * (1.1 - Math.random() * 0.2)),
					magic: Math.round(enemy.stats.magic * (1.1 - Math.random() * 0.2)), attack_speed: Math.round(enemy.stats.attack_speed * (1.1 - Math.random() * 0.2)*100)/100,
					defense: Math.round(enemy.stats.defense * (1.1 - Math.random() * 0.2))}, 
			loot_list: enemy.loot_list
			//up to 10% deviation for each stat
			//attack speed is the only one allowed to not be integer
		});;
		//creates and returns a new enemy based on template
		//maybe add some location-related loot?
	}
}

locations["Village"] = new Location({ 
	name: "Village", description: "Medium-sized village surrounded by many fields, some of them infested by rats. Other than that, there's nothing interesting around.", 
	connected_locations: [],
});

locations["Infested field"] = new Combat_zone({
	name: "Infested field", description: "Field infested with rats.", is_unlocked: true, 
	enemies_list: [enemy_templates["Starving wolf rat"], enemy_templates["Wolf rat"]],
	enemy_count: 20, reset_kills_on_leaving: false, parent_location: locations["Village"]
});
locations["Village"].connected_locations.push(locations["Infested field"]);
//remember to always add it like that, otherwise travel will be possible only in one direction and location might not even be reachable


export {locations};
