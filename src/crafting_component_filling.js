"use strict";
import { Armor, ArmorComponent, item_log, item_templates, ShieldComponent, WeaponComponent } from "./items.js";
import { capitalize_first_letter } from "./display.js";

/*
    GENERATES CRAFTING COMPONENTS BASED ON PROVIDED PROPERTIES AND PARAMETERS
    EACH MATERIAL CAN SPECIFY WHICH COMPONENT TYPES TO CREATE, USE THAT TO SKIP ONES YOU WANT TO FILL YOURSELF
    DOES NOT (YET?) SUPPORT CUSTOM DESCRIPTIONS FOR EACH TYPE

    DOES NOT AUTO-FILL CRAFTING RECIPES, DO IT MANUALLY AND MAKE SURE NAMES MATCH

    PROVIDED DATA HAS NO DIRECT RELATION TO MATERIALS DEFINED IN items.js, ALLOWING SLIGHTLY INCREASED DEGREE OF FREEDOM,
    e.g. YOU CAN SPLIT SOME MATERIAL INTO MULTIPLE SEPARATE ENTRIES USED FOR DIFFERENT COMPONENTS

    CAPES ARE SKIPPED, AS THEY ARE EXPECTED TO BE MUCH MORE VARIED IN STATS

    THIS IS ONLY A TOOL TO MAKE ADDING NEW MATERIALS TAKE LESS WORK,
    IF NEEDED ANYTHING CAN BE SKIPPED IN FAVOUR OF ADDING IT MANUALLY IN items.js

    STATS:
        tier - affects multiple stats and value
        weight - affects weapon dmg, attack speed (negatively), and shield block
        strength - affects weapon dmg and shield block
        handling - affects dexterity on clothing
        warmth - affects cold resistance

    "name": {
        tier: Number,
        weight: Number,
        strength: Number,
        warmth: Number,
        handling: Number,
        types: Array,
        additional_stats: {
            stat_name: {
                stat bonus type (multiplier/flat): Number,
            }
        }
    },
*/



const base_value = 35; // * tier * mat_count

const component_types = {
    SHORT_BLADE: "short blade",
    LONG_BLADE: "long blade",
    AXE_HEAD: "axe head",
    HAMMER_HEAD: "hammer head",

    SHORT_HANDLE: "short handle",
    MEDIUM_HANDLE: "medium handle",
    LONG_HANDLE: "long handle",
    
    SHIELD_HANDLE: "shield handle",
    SHIELD_BASE: "shield base",

    HELMET_INTERIOR: "helmet interior",
    CHESTPLATE_INTERIOR: "chestplate interior",
    LEG_ARMOR_INTERIOR: "leg armor interior",
    SHOE_INTERIOR: "shoes interior",
    GLOVE_INTERIOR: "glove interior",

    HELMET_EXTERIOR: "helmet exterior",
    CHESTPLATE_EXTERIOR: "chestplate exterior",
    LEG_ARMOR_EXTERIOR: "leg armor exterior",
    SHOE_EXTERIOR: "shoes exterior",
    GLOVE_EXTERIOR: "glove exterior",
};

const ALL_WEAPON_HEADS = [component_types.SHORT_BLADE, component_types.LONG_BLADE, component_types.AXE_HEAD, component_types.HAMMER_HEAD];
const ALL_WEAPON_HANDLES = [component_types.SHORT_HANDLE, component_types.MEDIUM_HANDLE, component_types.LONG_HANDLE];
const ALL_SHIELD_COMPS = [component_types.SHIELD_HANDLE, component_types.SHIELD_BASE];

const ALL_INTERIORS = [component_types.HELMET_INTERIOR, component_types.CHESTPLATE_INTERIOR, component_types.LEG_ARMOR_INTERIOR, component_types.SHOE_INTERIOR, component_types.GLOVE_INTERIOR];
const ALL_EXTERIORS = [component_types.HELMET_EXTERIOR, component_types.CHESTPLATE_EXTERIOR, component_types.LEG_ARMOR_EXTERIOR, component_types.SHOE_EXTERIOR, component_types.GLOVE_EXTERIOR];

/**
 * 100 is a default value for most cases
 * 50 is the minimum weight for weapon handles, going lower will result in heavier components of same material being faster (i.e. long faster than short)
 * 60 is the minimum strength for shield bases
 * 
 * 
 */
const material_properties = {
    "rough wood": {
        tier: 1,
        weight: 60,
        strength: 60,
        name: "simple wooden",
        types: [
            ...ALL_WEAPON_HANDLES,
            ...ALL_SHIELD_COMPS
        ],
    },
    "cheap iron": {
        tier: 1,
        weight: 100,
        strength: 100,
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 35,
    },
    "cheap leather": {
        tier: 1,
        weight: 60,
        strength: 100,
        handling: 50,
        warmth: 110,
        types: [
            component_types.HELMET_INTERIOR, component_types.CHESTPLATE_INTERIOR, component_types.LEG_ARMOR_INTERIOR, component_types.SHOE_INTERIOR
            //no glove, material implied to be too crappy for them
        ]
    },
    "wood": {
        tier: 2,
        weight: 60,
        strength: 60,
        types: [
            ...ALL_WEAPON_HANDLES,
            ...ALL_SHIELD_COMPS,
        ],
        name: "wooden",
    },
    "iron": {
        tier: 2,
        weight: 100,
        strength: 100,
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 80,
    },
    "iron chainmail": {
        tier: 2,
        weight: 100,
        strength: 100,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        base_value: 120,
    },
    "wolf leather": {
        tier: 2,
        weight: 60,
        strength: 60,
        warmth: 100,
        types: [
            ...ALL_EXTERIORS,
        ],
    },
    "leather": { //this is wolf leather too
        tier: 2,
        weight: 60,
        strength: 70,
        warmth: 110,
        handling: 20,
        types: [
            ...ALL_INTERIORS,
        ],
    },
    "wool": {
        tier: 2,
        weight: 40,
        strength: 50,
        warmth: 140,
        handling: 80,
        types: [
            ...ALL_INTERIORS,
        ],
    },
    "ash wood": {
        tier: 3,
        weight: 60,
        strength: 60,
        types: [
            ...ALL_WEAPON_HANDLES,
            ...ALL_SHIELD_COMPS,
        ]
    },
    "weak bone": {
        tier: 3,
        weight: 80,
        strength: 80,
        types: [
            ...ALL_WEAPON_HANDLES,
        ]
    },
    "steel": {
        tier: 3,
        weight: 100,
        strength: 100,
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 120,
    },
    "steel chainmail": {
        tier: 3,
        weight: 100,
        strength: 100,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 240,
    },
    "steel plate": {
        tier: 3,
        weight: 160,
        strength: 160,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 360,
    },
    "boar leather": {
        tier: 3,
        weight: 60,
        strength: 60,
        warmth: 100,
        types: [
            ...ALL_EXTERIORS,
        ]
    },
    "goat leather": {
        tier: 3,
        weight: 60,
        strength: 100,
        warmth: 110,
        handling: 20,
        types: [
            ...ALL_INTERIORS,
        ]
    },
    "hickory": {
        tier: 4,
        weight: 60,
        strength: 60,
        types: [
            ...ALL_WEAPON_HANDLES,
            ...ALL_SHIELD_COMPS
        ]
    },
    "turtleshell": {
        tier: 4,
        weight: 80,
        strength: 80,
        types: [
            ...ALL_WEAPON_HANDLES,
        ],
        additional_stats: {
            attack_points: {
                multiplier: 1.1,
            }
        }
    },
    "turtleshell plate": {
        tier: 4,
        weight: 80,
        strength: 80,
        types: [
            ...ALL_SHIELD_COMPS,
            ...ALL_EXTERIORS,
        ],
        name: "turtleshell"
    },
    "white iron": {
        tier: 4,
        weight: 130,
        strength: 100,
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 160,
    },
    "white iron chainmail": {
        tier: 4,
        weight: 130,
        strength: 100,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 320,
    },
    "white iron plate": {
        tier: 4,
        weight: 200,
        strength: 200,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 480,
    },
    "black iron": {
        tier: 4,
        weight: 80,
        strength: 110,
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 160,
    },
    "black iron chainmail": {
        tier: 4,
        weight: 80,
        strength: 110,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 320,
    },
    "black iron plate": {
        tier: 4,
        weight: 140,
        strength: 180,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 480,
    },
    "bear leather": {
        tier: 4,
        weight: 60,
        strength: 60,
        warmth: 100,
        types: [
            ...ALL_EXTERIORS,
        ]
    },
    "turtle shellplate": {
        tier: 4,
        weight: 100,
        strength: 140,
        warmth: 100,
        types: [
            ...ALL_EXTERIORS,
        ]
    },
    "linen": {
        tier: 4,
        weight: 50,
        strength: 50,
        warmth: 110,
        handling: 80,
        types: [
            ...ALL_INTERIORS,
        ],
    },
    "alchemical wood": {
        tier: 5,
        weight: 60,
        strength: 60,
        types: [
            ...ALL_WEAPON_HANDLES,
            ...ALL_SHIELD_COMPS,
        ]
    },
    "white steel": {
        tier: 5,
        weight: 130,
        strength: 100,
        name: "white",
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 200,
    },
    "white chainmail": {
        tier: 5,
        weight: 100,
        strength: 120,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 400,
    },
    "white plate": {
        tier: 5,
        weight: 200,
        strength: 240,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 600,
    },
    "black steel": {
        tier: 5,
        weight: 80,
        strength: 110,
        name: "black",
        types: [
            ...ALL_WEAPON_HEADS,
            ...ALL_WEAPON_HANDLES,
            component_types.SHIELD_BASE,
        ],
        value: 200,
    },
    "black chainmail": {
        tier: 5,
        weight: 80,
        strength: 110,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 400,
    },
    "black plate": {
        tier: 5,
        weight: 140,
        strength: 180,
        warmth: 80,
        types: [
            ...ALL_EXTERIORS,
        ],
        value: 600
    },
    "alligator": {
        tier: 5,
        weight: 60,
        strength: 60,
        warmth: 90,
        types: [
            ...ALL_EXTERIORS,
        ]
    },
    "snakeskin": {
        tier: 5,
        weight: 60, //a bit heavier than usual but with separate atk spd bonus
        strength: 100,
        warmth: 90,
        handling: 100,
        types: [
            ...ALL_INTERIORS,
        ],
        additional_stats: {
            attack_speed: {
                multiplier: 1.02,
            }
        }
    },
};

const custom_names = {"linen":{}, "wool":{}, "iron chainmail": {}, "steel chainmail": {}, "snakeskin": {}};
custom_names["linen"][component_types.HELMET_INTERIOR] = "Linen bandanna";
custom_names["linen"][component_types.LEG_ARMOR_INTERIOR] = "Linen leggings";
custom_names["wool"][component_types.CHESTPLATE_INTERIOR] = "Wool shirt";
custom_names["iron chainmail"][component_types.CHESTPLATE_EXTERIOR] = "Iron chainmail vest";
custom_names["steel chainmail"][component_types.CHESTPLATE_EXTERIOR] = "Steel chainmail vest";
custom_names["snakeskin"][component_types.LEG_ARMOR_INTERIOR] = "Snakeskin leggings";
custom_names["snakeskin"][component_types.SHOE_INTERIOR] = "Snakeskin boots";


const armor_names = {};
armor_names[component_types.CHESTPLATE_EXTERIOR] = "armor";
armor_names[component_types.GLOVE_EXTERIOR] = "gloves";
armor_names[component_types.HELMET_EXTERIOR] = "helmet";
armor_names[component_types.SHOE_EXTERIOR] = "shoes";
armor_names[component_types.LEG_ARMOR_EXTERIOR] = "armored pants";

/**
 * weight impact on dmg
 */
const weight_impact_per_type = {
    "short handle": 1,
    "medium handle": 3,
    "long handle": 8,

    "short blade": 0,
    "long blade": 0.5,
    "axe head": 5,
    "hammer head": 12,
};

const weight_impact_on_speed_per_type = {
    "short handle": 1,
    "medium handle": 5,
    "long handle": 12,

    "short blade": 0.5,
    "long blade": 2,
    "axe head": 4,
    "hammer head": 5,
};

/**
 * material str impact on damage
 */
const strength_impact_per_type = {
    "short blade": 8,
    "long blade": 7,
    "axe head": 2,
    "hammer head": 1,
}

const material_count_per_type = {
    "short blade": 2,
    "long blade": 3,
    "axe head": 4,
    "hammer head": 4,

    "short handle": 1,
    "medium handle": 2,
    "long handle": 4,
    
    "shield handle": 4,
    "shield base": 6,

    "helmet interior": 3,
    "chestplate interior": 5,
    "leg armor interior": 3,
    "glove interior": 2,
    "shoes interior": 2,

    "helmet exterior": 3,
    "chestplate exterior": 5,
    "leg armor exterior": 3,
    "glove exterior": 2,
    "shoes exterior": 2,
};

/**
 * exactly what it says
 * @param {*} comp_type 
 * @returns proper name used in items, defaulting to comp type if not needed
 */
const type_to_name = (comp_type)=>{
    switch(comp_type) {
        case "chestplate interior": 
            return "vest";
        case "helmet interior":
            return "hat";
        case "leg armor interior":
            return "pants";
        case "glove interior":
            return "gloves";
        case "shoes interior":
            return "shoes";
        case "chestplate exterior": 
            return "chestplate armor";
        case "helmet exterior":
            return "helmet armor";
        case "leg armor exterior":
            return "greaves";
        case "glove exterior":
            return "glove armor";
        case "shoes exterior":
            return "shoe armor";
        default:
            return comp_type;
    }
}

const base_attack = 3;


/**
 * quickie for adding stats to component_stats
 * @param {*} target component_stats
 * @param {*} properties e.g. {agility: {multiplier: some_value}}
 */
const add_properties = (target, properties) => {
    Object.keys(properties).forEach(property => {
        if(!target[property]) {
            target[property] = {};
        }

        Object.keys(properties[property]).forEach(subproperty => {
            if(!target[property][subproperty]) {
                target[property][subproperty] = properties[property][subproperty];
            } else {
                if(subproperty === "flat") {
                    target[property][subproperty] += properties[property][subproperty];
                } else if(subproperty === "multiplier") {
                    target[property][subproperty] *= properties[property][subproperty];
                }
            }
        });
    });
}

const crafting_component_manager = {

    /**
     * Fills components for item_templates; does NOT create crafting recipes
     */
    fill_components: () => {
        Object.keys(material_properties).forEach(material_key => {
            const material = material_properties[material_key];
            
            for(let i = 0; i < material.types.length; i++) {
                let description;
                let component_stats = structuredClone(material.additional_stats) || {};

                const item_id = custom_names[material_key]?.[material.types[i]] || (capitalize_first_letter(material.name || material_key) + " " + type_to_name(material.types[i]));
                let item;

                let material_count = material_count_per_type[material.types[i]];
                const item_value = (material.value ? Math.round(material.value * material_count) : Math.round(material.tier * base_value * material_count))+10;

                switch(material.types[i]) {
                    case component_types.SHORT_BLADE:
                        description = `A short blade made of ${material_key}, perfect for a dagger or a spear`;
                        break;
                    case component_types.LONG_BLADE:
                        description = `A long blade made of ${material_key}, perfect for a sword`;
                        break;
                    case component_types.AXE_HEAD:
                        description = `An axe head made of ${material_key}`;
                        break;
                    case component_types.HAMMER_HEAD:
                        description = `A hammer head made of ${material_key}`;
                        break;       
                }
                
                if(ALL_WEAPON_HEADS.includes(material.types[i])) {
                    //WEAPON HEADS

                    let attack_value = base_attack * (1 + strength_impact_per_type[material.types[i]]*(material.strength/100)) * material.tier * (1 + weight_impact_per_type[material.types[i]]*(material.weight/100))/8;

                    let attack_speed = Math.round(100*
                        (1 + (material.tier-1)/10)/(1 + (weight_impact_on_speed_per_type[material.types[i]]*material.weight)/1000)
                    )/100;

                    if(material.types[i] === component_types.SHORT_BLADE) {
                        //CRIT BONUS FOR SHORT BLADES
                        let crit_bonus = 0.05 * material.tier;
                        if(component_stats.crit_bonus?.flat) {
                            component_stats.crit_bonus.flat += crit_bonus;
                        } else {
                            if(!component_stats.crit_bonus) component_stats.crit_bonus = {};
                            component_stats.crit_bonus.flat = crit_bonus;
                        }
                    } else if(material.types[i] === component_types.LONG_BLADE) {
                        //AP BONUS FOR LONG BLADES 
                        let AP_multi = 1 +  0.05 * material.tier;
                        if(component_stats.attack_points?.multiplier) {
                            component_stats.attack_points.multiplier *= AP_multi;
                        } else {
                            if(!component_stats.attack_points) component_stats.attack_points = {};
                            component_stats.attack_points.multiplier = AP_multi;
                        }

                        //SMALLER CRIT BONUS FOR SHORT BLADES
                        let crit_bonus = 0.02 * material.tier;
                        if(component_stats.crit_bonus?.flat) {
                            component_stats.crit_bonus.flat += crit_bonus;
                        } else {
                            if(!component_stats.crit_bonus) component_stats.crit_bonus = {};
                            component_stats.crit_bonus.flat = crit_bonus;
                        }
                    }
                    
                
                    item = new WeaponComponent({
                        name: item_id,
                        id: item_id,
                        description,
                        component_type: material.types[i],
                        value: item_value,
                        name_prefix: capitalize_first_letter(material.name || material_key),
                        component_tier: material.tier,
                        attack_value: Math.floor(attack_value),
                                    
                        component_stats: {
                            attack_speed: {
                                multiplier: attack_speed,
                            },
                        }
                    });

                } else if(ALL_WEAPON_HANDLES.includes(material.types[i])) {
                    //WEAPON HANDLES
                    
                    let attack_multiplier = Math.floor(100*(
                        1 + (1 + material.tier/20) * (1 + weight_impact_per_type[material.types[i]]*(material.weight - 40))/1000
                    ))/100;

                    let attack_speed = Math.floor(100*(
                        (1 + material.tier/20)/(1 + (weight_impact_on_speed_per_type[material.types[i]]*(material.weight - 50))/1000)
                    ))/100;

                    if(component_stats.attack_speed?.multiplier) {
                        component_stats.attack_speed.multiplier *= attack_speed;
                    } else {
                        if(!component_stats.attack_speed) component_stats.attack_speed = {};
                        component_stats.attack_speed.multiplier = attack_speed;
                    }

                    if(component_stats.attack_power?.multiplier) {
                        component_stats.attack_power.multiplier *= attack_multiplier;
                    } else {
                        if(!component_stats.attack_power) component_stats.attack_power = {};
                        component_stats.attack_power.multiplier = attack_multiplier;
                    }
                    
                    item = new WeaponComponent({ 
                        name: item_id,
                        description,
                        component_type: material.types[i],
                        value: item_value,
                        name_prefix: capitalize_first_letter(material.name || material_key),
                        component_tier: material.tier,
                        component_stats,
                    });
                } else if(material.types[i] === component_types.SHIELD_HANDLE) {
                    item = new ShieldComponent({ 
                        name: item_id,
                        description,
                        component_type: material.types[i],
                        value: item_value,
                        name_prefix: capitalize_first_letter(material.name || material_key),
                        component_tier: material.tier,
                        component_stats: {
                             block_strength: {
                                multiplier: 1+Math.floor((material.tier-1)*0.75*10)/10,
                            }
                        }
                    });
                } else if(material.types[i] === component_types.SHIELD_BASE) {
                    item = new ShieldComponent({ 
                        name: item_id,
                        description,
                        component_type: material.types[i],
                        value: item_value,
                        //name_prefix: capitalize_first_letter(material.name || material_key),
                        component_tier: material.tier,
                        shield_name: capitalize_first_letter(material.name || material_key) + " shield",

                        shield_strength: Math.floor(
                            (1+(material.strength)/50)**2 * (1+(material.tier-1)/4)**2 * (1+(material.tier-2)/10)**2 * (1+(material.weight-30)/150)**2
                            //way too complicated
                        ),
                        component_stats: {
                            attack_speed: {
                                multiplier: Math.min(1,Math.floor(100*(1-((material.weight-50)/200)))/100)
                            },
                            attack_power: Math.min(1,Math.floor(100*(1-((material.weight-50)/250)))/100)
                        }
                    });
                } else if(ALL_INTERIORS.includes(material.types[i])) {

                        let agility_multiplier = 1;
                        let dexterity_multiplier = 1;
                        let attack_speed_multiplier = 1;
                        let cold_tolerance_bonus = 0;

                        if(material.types[i] ===  component_types.SHOE_INTERIOR) {
                            agility_multiplier = 1 + material.tier * 0.05;
                            attack_speed_multiplier = 1.1 + Math.round((material.tier-1)*4)/100;
                        } else {
                            if(material.types[i] ===  component_types.GLOVE_INTERIOR) {
                                dexterity_multiplier = 1 + Math.round(material.tier * 0.05 * material.handling)/100;
                            } else {
                                agility_multiplier = Math.round(100*(1 - (material_count*(material.weight-50))/2500))/100;
                            }
                            attack_speed_multiplier = Math.max(1,(1+(material.tier-1)/100) * (1+(50-material.weight)/500));
                        }

                        cold_tolerance_bonus = (material.warmth-100)/20;

                        if(agility_multiplier !== 1) {
                            add_properties(component_stats, {agility: {multiplier: agility_multiplier}});
                        }
                        if(dexterity_multiplier !== 1) {
                            add_properties(component_stats, {dexterity: {multiplier: dexterity_multiplier}});
                        }
                        if(attack_speed_multiplier !== 1) {
                            add_properties(component_stats, {attack_speed: {multiplier: attack_speed_multiplier}});
                        }
                        if(cold_tolerance_bonus !== 0) {
                            add_properties(component_stats, {cold_tolerance: {flat: cold_tolerance_bonus}});
                        }

                        item = new Armor({
                            name: item_id,
                            description,
                            component_type: material.types[i],
                            value: item_value,
                            name_prefix: capitalize_first_letter(material.name || material_key),
                            component_tier: material.tier,
                            base_defense: Math.floor(material.tier * material_count * (material.strength-50)/100),
                            component_stats,
                        });
                } else if(ALL_EXTERIORS.includes(material.types[i])) {

                        let agility_multiplier = 1;
                        let attack_speed_multiplier = 1;
                        let cold_tolerance_bonus = 0;
                        let stamina_efficiency_multiplier = 1;

                        agility_multiplier = Math.min(1,Math.round(100*(
                                1 - (material_count*(material.weight-50))/2500
                            ))/100);

                        attack_speed_multiplier = Math.min(1,Math.round(100*(
                            1 - (material_count*(material.weight-50))/5000
                        ))/100);

                        stamina_efficiency_multiplier = Math.min(1,Math.round(100*(
                            1 - (material_count*(material.weight-50))/2500
                        ))/100);

                        cold_tolerance_bonus = (material.warmth-100)/20;
                        

                        if(agility_multiplier !== 1) {
                            add_properties(component_stats, {agility: {multiplier: agility_multiplier}});
                        }

                        if(attack_speed_multiplier !== 1) {
                            add_properties(component_stats, {attack_speed: {multiplier: attack_speed_multiplier}});
                        }

                        if(cold_tolerance_bonus !== 0) {
                            add_properties(component_stats, {cold_tolerance: {flat: cold_tolerance_bonus}});
                        }

                        if(stamina_efficiency_multiplier !== 1) {
                            add_properties(component_stats, {stamina_efficiency: {multiplier: stamina_efficiency_multiplier}});
                        }

                        item = new ArmorComponent({
                            name: item_id,
                            description,
                            full_armor_name: capitalize_first_letter(material.name || material_key) + " " + armor_names[material.types[i]],
                            component_type: material.types[i],
                            value: item_value,
                            name_prefix: capitalize_first_letter(material.name || material_key),
                            component_tier: material.tier,
                            defense_value: Math.floor(material.tier * material_count * material.strength/100),
                            component_stats,
                        });
                }

                if(!item_templates[item_id]) {
                    item_templates[item_id] = item;
                } else {
                    console.error(`Item templates already include something with an id of "${item_id}",`
                        + ` please either remove it or remove "${material.types[i]}" from component types for material "${material_key}"`);
                }
            }
        });
    }
};



export { crafting_component_manager };