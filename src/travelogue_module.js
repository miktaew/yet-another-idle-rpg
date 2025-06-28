"use strict";

import { locations, Location } from "./locations.js";
import { create_location_types_display } from "./display.js";
import { activities } from "./activities.js";
import { dialogues } from "./dialogues.js";
import { traders } from "./traders.js";

const travelogue_parent = document.getElementById("travelogue_list");
const travelogue_divs = {};

export function init_travelogue() {
    Object.values(locations).forEach(location => {
        if (location.is_unlocked) {
            create_travelogue_entry(location);
        }
    });
}

function create_travelogue_entry(location) {
    if (travelogue_divs[location.id]) {
        return;
    }

    //TODO hide undiscovered and completed areas

    let location_div = document.createElement("div");
    location_div.dataset.location_id = location.id;

    //normal area
    if (location.hasOwnProperty("parent_location")) {
        create_travelogue_subentry(location);
        return;
    }

    //TODO get nameplate
    //TODO make tooltip

    location_div.innerHTML = `<i class="material-icons icon dropdown_icon"> keyboard_double_arrow_down </i><span class="location_name_span">${location.name}</span> `;
    location_div.classList.add("location_choice_dropdown");

    //let types_div = document.createElement("div");
    //types_div.classList.add("location_types_div");
    //create_location_types_display(location, types_div);
    //location_div.appendChild(types_div);

    location_div.addEventListener("click", (event) => {
        location_div.classList.toggle("location_choice_dropdown_expanded");
    });

    //TODO features: crafting, shops, rest, activities/training?, actions/harvesting? ...


    if(location.crafting?.is_unlocked) {
        location_div.innerHTML += `<i class="material-icons">construction</i>`;
    }
    if (location.housing?.is_unlocked) { 
        location_div.innerHTML += `<i class="material-icons">bed</i>`;
    }
    if (location.dialogues.some(dialogue => dialogues[dialogue].is_unlocked && !dialogues[dialogue].is_finished)) {
        location_div.innerHTML += `<i class="material-icons">question_answer</i>`;
    }
    if (location.traders.some(trader => traders[trader].is_unlocked && !traders[trader].is_finished)) {
        location_div.innerHTML += `<i class="material-icons">storefront</i>`;
    }
    if (Object.values(location.activities).some(activity => activities[activity.activity_name].type === "JOB" && activity.is_unlocked)) {
        location_div.innerHTML += `<i class="material-icons">work_outline</i>`;
    }
    if (Object.values(location.activities).some(activity => activities[activity.activity_name].type === "TRAINING" && activity.is_unlocked)) {
        location_div.innerHTML += `<i class="material-icons">fitness_center</i>`;
    }
    if (Object.values(location.activities).some(activity => activities[activity.activity_name].type === "GATHERING" && activity.is_unlocked)) {
        location_div.innerHTML += `<i class="material-icons">search</i>`;
    }
    if (Object.values(location.actions).some(action => action.is_unlocked && !action.is_finished)) {
        location_div.innerHTML += `<i class="material-icons">search</i>`;
    }

    travelogue_divs[location.id] = location_div;
    travelogue_parent.appendChild(location_div);
}

function create_travelogue_subentry(location) {
    let location_div = document.createElement("div");
    location_div.classList.add("action_travel");
    location_div.classList.add("location_choice");
    location_div.dataset.location_id = location.id;

    if (!location.is_unlocked) {
        location_div.style.display = 'none';
    }
    if (location.is_finished) {
        location_div.style.textDecoration = 'line-through';
    }

    //TODO make nameplate

    location_div.innerHTML = `<i class="material-icons">warning_amber</i> ${location.name}`;

    //let types_div = document.createElement("div");
    //types_div.classList.add("location_types_div");
    //create_location_types_display(location, types_div);
    //location_div.appendChild(types_div);

    travelogue_divs[location.parent_location.id].appendChild(location_div);
}

function update_travelogue() {
}

//TODO create travelogue

//TODO create entry

//TODO create subentry

//TODO create
//TODO load?