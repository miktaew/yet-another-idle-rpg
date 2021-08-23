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

	this.item_type = item_data.item_type; // "EQUIP", "USE", "OTHER"

	//instead of equippable, make item_type and use this to differentiate between equippables / usables / other?
	//check if it has one of allowed values, otherwise throw an error message 
	this.equip_stats = item_data.equip_stats;
	// (only bonuses to main stats)

	// if usable, bonus gained on using? (so heal hp, heal hunger, permanently raise max stats, etc)
	// assume it can't be both usable and equippable 
	
	//lets just do it like -> usable: {effects }, dismantable: {materials obtained, stuff required}, equippable: {stats}

	//crafting?
	//might need something like is_crafting_unlocked (would need to be applied to templates probably)

}


//materials:

item_templates["Rat tail"] = new Item({
	name: "Rat tail", description: "Tail of a huge rat, basically useless", value: 1, stackable: true,
});

item_templates["Rat fang"] = new Item({
	name: "Rat fang", description: "Tail of a huge rat, not very sharp", value: 1, stackable: true,
});

item_templates["Rat pelt"] = new Item({
	name: "Rat pelt", description: "Pelt of a huge rat, terrible quality", value: 1, stackable: true,
});

item_templates["Ratslayer"] = new Item({
	name: "Ratslayer", description: "Test item", value: 1000, stackable: false,
});

//proper items:






export {item_templates, Item};