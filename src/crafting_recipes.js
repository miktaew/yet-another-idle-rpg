"use strict";

import { add_to_character_inventory, remove_from_character_inventory, character } from "./character.js";
import { item_templates } from "./items.js";
import { skills } from "./skills.js";

const crafting_recipes = {items: {}, components: {}, equipment: {}};
const cooking_recipes = {items: {}};
const smelting_recipes = {items: {}};
const forging_recipes = {items: {}, components: {}};
const alchemy_recipes = {items: {}};

/*
    recipes can be treated differently for display based on if they are in items/components/equipment category

    non-equipment recipes have a success rate (presented with min-max value, where max should be 1) that shall scale with skill level and with crafting station level
    for equipment recipes, there is no success rate in favor of equipment's "quality" property

    resulting quality of equipment is based on component quality; 100% (with slight variation?) with 100% components and required skill, more at higher levels
    
    overal max quality achievable scales with related skills?
    lvl 15/60: 150
    lvl 30/60: 200
    lvl 45/60: 250s
    skills can increase quality of resulting item, but they are more required to keep it from getting lower than the components, as higher tier components = higher skill lvl required?
    

    todo: actually add quality to components!
    should be savegame compatible
*/

class Recipe {
    constructor({
        name,
        id,
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        recipe_type,
        result,
        getResult,
        recipe_level = 0,
        recipe_skill,
    }) {
        this.name = name;
        this.id = id || name;
        this.is_unlocked = is_unlocked;
        this.recipe_type = recipe_type;
        this.result = result;
        this.getResult = getResult || function(){return this.result};
        this.recipe_level = recipe_level;
        this.recipe_skill = recipe_skill;
    }
}

class ItemRecipe extends Recipe {
    constructor({
        name,
        id,
        materials = [], //{name, count}
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        recipe_type,
        result,
        getResult,
        recipe_level,
        recipe_skill,
        success_chance = [1,1],
    }) {
        super({name, id, is_unlocked, recipe_type, result, getResult, recipe_level, recipe_skill});
        this.materials = materials;
        this.success_chance = success_chance;
    }

    get_success_chance(station_bonus=0) {
        const skill_modifier = Math.max(1,((skills[this.recipe_skill].current_level+station_bonus)/this.recipe_level));

        return this.success_chance[0]*(this.success_chance[1]/this.success_chance[0])**skill_modifier;
    }

    get_availability() {
        for(let i = 0; i < this.materials.length; i++) {
            if(!character.inventory[this.materials[i].name] || character.inventory[this.materials[i].name].count < this.materials[i].count) {
                return false;
            }
        }
        return true;
    }

    use_recipe() {
        if(this.get_availability()) {
            let success_chance = this.get_success_chance();
            if(Math.random() < success_chance) {
                for(let i = 0; i < this.materials.length; i++) {
                    remove_from_character_inventory({item_name: this.materials[i].name, item_count: this.materials[i].count});
                }

                const {name, count} = this.getResult();
                add_to_character_inventory([{item: item_templates[name], count: count}]);
            } else {
                //log a message about failing?
            }
        }
    }
}

class ComponentRecipe extends ItemRecipe{
    constructor({
        name,
        id,
        materials = [],
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        result,
        component_type,
        recipe_level,
        recipe_skill,
    }) {
        super({name, id, materials, is_unlocked, recipe_type: "component", result, recipe_level, recipe_skill, getResult: null, success_rate: [1,1]})
        this.component_type = component_type;
        this.getResult = function(){

            //return based on material used
        }
    }

    use_recipe(material) {
        let available = true;
        //todo: do an additional check if enough of selected material is available
        
        if(available) {
            //todo: remove it from inventory

            add_to_character_inventory(this.getResult());
            return true;
        } else {
            return false;
        }
    }
}

class EquipmentRecipe extends Recipe {
    constructor({
        name,
        id,
        components = [], //pair of component types; first letter not capitalized
        is_unlocked = true, //TODO: change to false when unlocking is implemented!
        result = null,
        item_type, //weapon/armor? probably unnecessary
        //no recipe level, difficulty based on selected components
        recipe_skill,
    }) {
        super({name, id, is_unlocked, recipe_type: "equipment", result, getResult: null, recipe_level: 0, recipe_skill: null, success_rate: [1,1]})
        this.components = components;
        this.item_type = item_type;
        this.recipe_skills = [recipe_skill, "Crafting"];
        this.getResult = function(){

            //return based on components used
        
        }
    }

    use_recipe(components) {

        //do an additional check if components are available
        //remove them from inventory
        add_to_character_inventory(this.getResult());
    }
}


//components
(()=>{
    forging_recipes.components["Short blade"] = new ComponentRecipe({
        name: "Short blade",
        materials: [{name: "Low quality iron bar", count: 1}, {name: "Iron bar", count: 1}],
        item_type: "Component",
        recipe_skill: "Forging"
    });
})();

(()=>{
    crafting_recipes.equipment["Spear"] = new EquipmentRecipe({
        name: "Spear",
        components: ["short blade", "long handle"],
        item_type: "Weapon",
        recipe_skills: [],
    });
})();


crafting_recipes.items["Piece of wolf rat leather"] = new ItemRecipe({
    name: "Piece of wolf rat leather",
    id: "Piece of wolf rat leather",
    recipe_type: "material",
    materials: [{name: "Rat pelt", count: 5}], 
    result: {name: "Piece of wolf rat leather", count: 1},
    success_rate: [1,1],
});

crafting_recipes.items["Wolf trophy"] = new ItemRecipe({
    name: "Wolf trophy",
    id: "Wolf trophy",
    recipe_type: "equipment",
    recipe_level: 10,
    materials: [{name: "High quality wolf fang", count: 5}],
    result: {name: "Wolf trophy", count: 1},
    success_rate: [0.5,1],
});





const recipes = {
    crafting: crafting_recipes, 
    cooking: cooking_recipes, 
    smelting: smelting_recipes, 
    forging: forging_recipes, 
    alchemy: alchemy_recipes
}

export {recipes}
