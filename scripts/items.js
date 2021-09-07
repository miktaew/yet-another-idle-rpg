/* 
for perishables, if ever added, maybe a certain chance to perish/spoil/whatever every second?
alternatively simply make a time counter for it (with increase per tick being equal to number of items)
*/
var item_templates = {};

function Item(item_data) {

	this.name = item_data.name;
	this.description = item_data.description;
	this.value = item_data.value;
	this.stackable = item_data.stackable; 
	//false currently only for equippables, but might change it in future so let's keep it

	this.can_be_dismantled = item_data.can_be_dismantled; //maybe remove it and simply check if dismantling_materials is not undefined?
	this.dismantling_materials = item_data.dismantling_materials;

	this.item_type = item_data.item_type; // "EQUIPPABLE", "USABLE", "OTHER"
	//check if it has one of allowed values, otherwise throw an error message 
	//for equippables, always add equip_effect, even if empty

	this.equip_stats = item_data.equip_stats;
	// (only bonuses to main stats)
	this.equip_slot = item_data.equip_slot;
	// equipment slot to where item goes
	this.equip_effect = item_data.equip_effect;
	// stats gained by equipping, {stats: {}, stat_multipliers: {}}
	// multipliers probably will only be used for weapon damage
	this.weapon_type = item_data.weapon_type; // "sword", "spear", "blunt", "special", "wand", "staff"

	this.offhand_type = item_data.offhand_type; // "shield", something else?

	this.shield_strength = item_data.shield_strength;


	// if usable, bonus gained on using? (so heal hp, heal hunger, permanently raise max stats, etc)
	// assume it can't be both usable and equippable 


	//crafting?
	//might need something like is_crafting_unlocked (would need to be applied to templates probably)

}


//materials:

item_templates["Rat tail"] = new Item({
	name: "Rat tail", description: "Tail of a huge rat, basically useless", value: 1, stackable: true,
	item_type: "OTHER",
});

item_templates["Rat fang"] = new Item({
	name: "Rat fang", description: "Fang of a huge rat, not very sharp", value: 1, stackable: true,
	item_type: "OTHER",
});

item_templates["Rat pelt"] = new Item({
	name: "Rat pelt", description: "Pelt of a huge rat, terrible quality", value: 5, stackable: true,
	item_type: "OTHER",
});

//equippables:

item_templates["Ratslayer"] = new Item({
	name: "Ratslayer", description: "Test item", value: 1000, stackable: false, 
	item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "special",
	equip_effect: {
		attack: {
			flat_bonus: 10000,
			multiplier: 10,
		}
	}
});

item_templates["Long stick"] = new Item({
	name: "Long stick", description: "Can be used as a simple weapon", value: 3, stackable: false,
	item_type: "EQUIPPABLE", equip_slot: "weapon", weapon_type: "blunt",
	equip_effect: {
		attack: {
			flat_bonus: 5,
			multiplier: 1,
		}
	}
});

item_templates["Crude wooden shield"] = new Item({
	name: "Crude wooden shield", description: "Crude shield made of wood, not very strong", value: 3, stackable: false,
	item_type: "EQUIPPABLE", equip_slot: "offhand", offhand_type: "shield", shield_strength: 1,
	equip_effect: {},
});


export {item_templates, Item};