"use strict";

import { skills } from "./skills.js";


const speed_modifiers_from_skills = {};
const default_travel_skill = "Running";
const default_travel_time = 60; //realistically shouldn't be relied upon, try to define travel times for every connection
const max_modifier_from_skill = 4;

class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    add_to_queue(location_element) {
        this.queue.push(location_element);
        this.queue.sort((a,b) => a[0] - b[0]);
    }
    
    shift_from_queue() {
        if(this.is_queue_empty()) {
            return "Queue is empty";
        } 

        return this.queue.shift();
    }

    is_queue_empty() {
        return this.queue.length == 0;
    }
}

class Pathfinder {
    constructor() {
        this.adjacent = {};
        this.vertice_count = 0;
    }

    /**
     * Creates connection from 1 to 2 with provided travel time. Does it one way only, as travel times can be assymetrical
     * @param {*} loc1 
     * @param {*} loc2 
     * @param {*} distance 
     */
    add_connection(loc1, loc2, travel_time) {

        if(!this.adjacent[loc1]) {
            this.adjacent[loc1] = [];
        }

        this.adjacent[loc1].push([loc2,travel_time]);
    }

    update_time_skill_modifiers() { //probably useless
        Object.keys(speed_modifiers_from_skills).forEach(skill_id => {
            speed_modifiers_from_skills[skill_id] = 1/(max_modifier_from_skill**(skills[skill_id].current_level/skills[skill_id].max_level));
        });
    }

    /**
     * Updates travel time modifier from given skill, as to not calculate it repeatedly for every possible connection
     * @param {*} skill_id 
     */
    update_time_skill_modifier(skill_id) {
        speed_modifiers_from_skills[skill_id] = 1/(max_modifier_from_skill**(skills[skill_id].current_level/skills[skill_id].max_level));
    }

    /**
     * 
     * @param {Array} used_skills 
     * @returns total speed modifier from provided skills, calculated via geometric average 
     */
    get_total_skills_modifier(used_skills) {
        let skill_modifier = 1;
        for(let j = 0; j < used_skills.length; j++) {
            if(!(used_skills[j] in speed_modifiers_from_skills)) {
                this.update_time_skill_modifier(used_skills[j]);
            }
            skill_modifier *= speed_modifiers_from_skills[used_skills[j]];
        }

        return skill_modifier ** used_skills.length;
    }

    /**
     * fills in connections for all locations and calculates direct travel times depending on relevant skills
     * @param {*} locations 
     */
    fill_connections(locations) {
        Object.values(locations).forEach(location => {
            if(location.is_unlocked && !location.is_finished) { //don't bother if it's unavailable
                if(location.parent_location) {
                    
                    const travel_time_to_here = location.parent_location.connected_locations.find(x => x.location === location).travel_time ?? default_travel_time;

                    const used_skills = location.parent_location.connected_locations.find(x => x.location === location).travel_time_skills || [default_travel_skill];

                    const skill_modifier = this.get_total_skills_modifier(used_skills);

                    this.add_connection(location.id, location.parent_location.id, travel_time_to_here*skill_modifier);
                } else {
                    for(let i = 0; i < location.connected_locations.length; i++) {
                        if(location.connected_locations[i].location.is_unlocked && !location.connected_locations[i].location.is_finished) { //check if the connected one is available

                            const used_skills = location.connected_locations[i].travel_time_skills || [default_travel_skill];
                            
                            const skill_modifier = this.get_total_skills_modifier(used_skills);

                            this.add_connection(location.id, location.connected_locations[i].location.id, (location.connected_locations[i].travel_time ?? default_travel_time)*skill_modifier);
                        }
                    }
                }
            }
        });
    }

    /**
     * Finds shortest paths from starting location to all using Dijkstra with priority queue; 
     * as of v0.5 it's a bit too much as there's only a single connection between any given A and B, but routes are likely to become more complicated in future
     * @param {String} starting_location location id
     */
    find_shortest_paths(starting_location) {
        const priority_queue = new PriorityQueue();
        const distance = {};

        priority_queue.add_to_queue([0,starting_location]);
        distance[starting_location] = 0;

        while(!priority_queue.is_queue_empty()) {
            const [, loc1] = priority_queue.shift_from_queue();
            if(this.adjacent[loc1]) { //a minor check for that singular case of having only 1 location, therefore no adjacents, which would throw an error in next line
                for(const [loc2, weight] of this.adjacent[loc1]) {

                    if(distance[loc1] == undefined) distance[loc1] = Infinity;
                    if(distance[loc2] == undefined) distance[loc2] = Infinity;

                    if(distance[loc2] > distance[loc1] + weight) {
                        distance[loc2] = distance[loc1] + weight;
                        priority_queue.add_to_queue([distance[loc2], loc2]);
                    }
                }
            }
        }

        Object.keys(distance).forEach(target => {
            distance[target] = Math.round(distance[target]);
        });
        return distance;
    } 
}

export {Pathfinder, speed_modifiers_from_skills};
