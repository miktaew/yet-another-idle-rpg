var enemy_templates = {};
//should be the best way to do it

function Enemy(enemy_data) {
	this.name = enemy_data.name;
	this.description = enemy_data.description; //try to keep it shorts
	this.xp_value = enemy_data.xp_value;
	this.health = enemy_data.health;
	this.max_health = enemy_data.health;
	this.strength = enemy_data.strength;
	this.agility = enemy_data.agility;
	this.magic = enemy_data.magic;
	this.attack_speed = enemy_data.attack_speed;
	this.defense = enemy_data.defense;
	this.loot_list = enemy_data.loot_list;

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

//creating example enemy templates

enemy_templates["Starving wolf rat"] = new Enemy({
	name: "Starving wolf rat", description: "Rat with size of a dog, starved and weakened", 
	xp_value: 1, health: 10, strength: 1, agility: 4, magic: 0, attack_speed: 1, defense: 0, loot_list: []
});
enemy_templates["Wolf rat"] = new Enemy({
	name: "Wolf rat", description: "Rat with size of a dog",
	 xp_value: 1, health: 12, strength: 5, agility: 5, magic: 0, attack_speed: 1.1, defense: 0, loot_list: []
});
enemy_templates["Wolf"] = new Enemy({
	name: "Wolf", description: "A large, wild canine", 
	xp_value: 3, health: 25, strength: 10, agility: 10, magic: 0, attack_speed: 1.5, defense: 1, loot_list: [
	{"item": "wolf tooth", "chance": 1, "count": {"min": 1, "max": 4}},
	{"item": "wolf pelt", "chance": 0.5}]
});

export {Enemy, enemy_templates};