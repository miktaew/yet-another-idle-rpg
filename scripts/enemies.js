var enemies_dict = {};
//should be the best way to do it

function Enemy(enemy_data) {
	this.name = enemy_data.name;
	this.xp_value = enemy_data.xp_value;
	this.loot_list = enemy_data.loot_list;
	//{item object, drop chance, {min_count, max_count}
	this.health = enemy_data.health;
	this.strength = enemy_data.strength;
	this.agility = enemy_data.agility;
	this.magic = enemy_data.magic;
	this.attack_speed = enemy_data.attack_speed;

	this.get_loot = function() {
		// goes through items and calculates drops
		// result is in form [{item: Item, count: item_count}, {...}, {...}]
		var loot = []
		var item;
		for (var i =0; i < this.loot_list.length; i++) {
			item = this.loot_list[i];
			if(item["chance"] >= Math.random()) {
				// checks if it should drop
				var item_count = 1;
				if("count" in item) {
					item_count = Math.round(Math.random() * (item["count"]["max"] - item["count"]["min"]) + item["count"]["min"]);
					// calculates how much drops (from range min-max, both inclusive)
				} 
				loot.push({"item": item["item"], "count": item_count});
			}
		}

		return loot;
	}
}

//creating example enemies
enemies_dict["Starving wolf rat"] = new Enemy({
	name: "Starving wolf rat", xp_value: 1, loot_list: [], health: 10, strength: 1, agility: 4, magic: 0, attack_speed: 1
	});
enemies_dict["Wolf rat"] = new Enemy({
	name: "Wolf rat", xp_value: 1, loot_list: [], health: 12, strength: 5, agility: 5, magic: 0, attack_speed: 1.1
	});
enemies_dict["Wolf"] = new Enemy({
	name: "Wolf", xp_value: 3, loot_list: [
	{"item": "Wolf tooth", "chance": 0.1, "count": {"min": 1, "max": 4}},
	{"item": "Wolf pelt", "chance": 0.01}], 
	health: 25, strength: 10, agility: 10, magic: 0, attack_speed: 1.4
});

export {Enemy, enemies_dict};