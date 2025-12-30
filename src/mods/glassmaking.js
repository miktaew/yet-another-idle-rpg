"use strict";

import { locations, LocationActivity } from "../locations.js"
import { Material, Book, BookData, item_templates, book_stats } from "../items.js"
import { inventory_templates, TradeItem } from "../traders.js"
import { recipes, ItemRecipe } from "../crafting_recipes.js"

console.log("Glassmaking mod loaded");

/*

    Originally created by OnonokiNonon

    Incorporated into the code, left as a proof of concept
    
*/

locations["Village"].activities["sand"] = new LocationActivity({
    activity_id: "sand",
    activity_name: "digging",
    infinite: true,
    starting_text: "Dredge up some sand from the riverbed",
    skill_xp_per_tick: 1,
    is_unlocked: false,
    gained_resources: {
        resources: [{ name: "Silica Sand", ammount: [[1, 1], [1, 3]], chance: [0.4, 1.0] }],
        time_period: [120, 60],
        skill_required: [0, 10],
        scales_with_skill: true,
    },
    require_tool: false,
    unlock_text: "You realize that the river near the village might contain the type of sand you need",
});
locations["Village"].activities["sand"].activity_id = "sand";   // needs to be set this way if created outside the core file, which makes it awkward

// items

item_templates["Potash"] = new Material({
    id: "Potash",   // needs to be set explicitly if defined outside the core file
    name: "Potash",
    description: "An alchemical substance derived from plant ash, sought after for production of bleach, soap and glass.",
    value: 25
});

item_templates["Silica Sand"] = new Material({
    id: "Silica Sand",
    name: "Silica Sand",
    description: "Sand made potent by the remains of countless generations of creatures that lived and died in the body of water it was taken from.",
    value: 1
});

item_templates["Raw Glass"] = new Material({
    id: "Raw Glass",
    name: "Raw Glass",
    description: "Molten piece of glass, yet to be shaped into something useful.",
    value: 100
});

item_templates["A Glint On The Sand"] = new Book({
    id: "A Glint On The Sand",
    name: "A Glint On The Sand",
    description: "This books recounts a tale of shipwrecked crew accidentally discovering glassmaking while cooking on a beach. More importantly, it details the processees and materials necessary to manufacture glass.",
    value: 300
});



book_stats["A Glint On The Sand"] = new BookData({
    required_time: 420,
    literacy_xp_rate: 4,
    rewards: {
        recipes: [
            {category: "alchemy", subcategory: "items", recipe_id: "Potash"},
            {category: "smelting", subcategory: "items", recipe_id: "Raw Glass"},
            {category: "crafting", subcategory: "items", recipe_id: "Glass phial"},
        ],
        activities: [{location: "Village", activity: "sand"}]
    }
});


inventory_templates["Basic"].push(new TradeItem({item_name: "A Glint On The Sand", count: [1], chance: 0.4}));
inventory_templates["Basic plus"].push(new TradeItem({item_name: "A Glint On The Sand", count: [1], chance: 0.4}));
inventory_templates["Intermediate"].push(new TradeItem({item_name: "A Glint On The Sand", count: [1], chance: 0.4}));


// recipes

recipes.alchemy.items["Potash"] = new ItemRecipe({
    name: "Potash",
    is_unlocked: false,
    recipe_type: "material",
    materials: [{ material_id: "Charcoal", count: 10}], 
    result: {result_id: "Potash", count: 1},
    success_chance: [0.5,1],
    recipe_level: [10,20],
    recipe_skill: "Alchemy",
});

recipes.smelting.items["Raw Glass"] = new ItemRecipe({
    name: "Raw Glass",
    is_unlocked: false,
    recipe_type: "material",
    materials: [{ material_id: "Silica Sand", count: 2},
                { material_id: "Potash", count: 1}], 
    result: {result_id: "Raw Glass", count: 1},
    success_chance: [0.2,1],
    recipe_level: [10,20],
    recipe_skill: "Smelting",
});

recipes.crafting.items["Glass phial"] = new ItemRecipe({
    name: "Glass phial",
    is_unlocked: false,
    recipe_type: "material",
    materials: [{ material_id: "Raw Glass", count: 1}], 
    result: {result_id: "Glass phial", count: 1},
    success_chance: [0.1,1],
    recipe_level: [15,25],
    recipe_skill: "Crafting",
});