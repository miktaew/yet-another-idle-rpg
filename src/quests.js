"use strict";

import { add_quest_to_display, update_displayed_quest, update_displayed_quest_task } from "./display.js";

const quests = {};
const active_quests = {};

class QuestTask {
    constructor({
        task_description = "", //optional
        task_condition = {}, 
        //conditions for task to be completed; can be skipped if it's meant to be achieved via some rewards object  
        task_rewards = {}, //generally skipped in favour of quest reward but could sometimes have something?
        is_hidden = false, //keep it false most of the time, but could be used as a fake way of making quests with no visible requirement for progress
        is_finished = false,
    })
    {
        this.task_description = task_description;
        this.task_condition = task_condition;
        if(!this.task_condition.any) {
            this.task_condition.any = {};
        }
        if(!this.task_condition.all) {
            this.task_condition.all = {};
        }
        this.task_rewards = task_rewards;
        this.is_hidden = is_hidden;
        this.is_finished = is_finished;

        Object.keys(this.task_condition).forEach(task_group => {
            Object.keys(this.task_condition[task_group]).forEach(task_type => {
                    Object.keys(this.task_condition[task_group][task_type]).forEach(task_target_id => {
                        this.task_condition[task_group][task_type][task_target_id].current = 0;
                    });
            });
        });
    }
}

class Quest {
    constructor({
                quest_name, //for display, can be skipped if getQuestName covers all possibilites
                quest_id, 
                quest_description, // -||-
                questline, //questline for grouping or something, skippable
                quest_tasks = [], //an array of tasks that need to be completed one by one
                quest_condition, //conditions for task to be completed; can be skipped if it's meant to be achieved via some rewards object; works the same as in QuestTask
                quest_rewards, //may include a new quest to automatically start
                is_hidden = false, //hidden quests are not visible and are meant to function as additional unlock mechanism; name and description are skipped
                is_finished = false,
                is_repeatable = false, //true => doesn't get locked after completion and can be gained again
                getQuestName = ()=>{return this.quest_name;},
                getQuestDescription = ()=>{return this.quest_description;},
    }) {
        this.quest_name = quest_name;
        this.quest_id = quest_id || quest_name;
        this.questline = questline;
        this.quest_tasks = quest_tasks;
        this.quest_description = quest_description;
        this.quest_reward = quest_rewards || {};
        this.is_hidden = is_hidden;
        this.is_finished = is_finished;
        this.is_repeatable = is_repeatable;
        this.quest_condition = quest_condition;
        this.getQuestName = getQuestName;
        this.getQuestDescription = getQuestDescription;
    }

    getCompletedUniqueTaskCount(){
        if(this.quest_tasks.length == 0) {
            return 0;
        } else {
            return this.quest_tasks.filter(task => task.is_finished).length;
        }
    }

    getCompletedTaskCount(){
        if(this.quest_tasks.length == 0) {
            return 0;
        } else {
            return this.quest_tasks.filter(task => task.is_finished).length;
        }
    }
}

const questManager = {
    startQuest(quest_id) {
        const quest = quests[quest_id];
        if((!quest.is_finished || quest.is_repeatable) && !this.isQuestActive(quest_id)) {
            active_quests[quest_id] = new Quest(quests[quest_id]);
        } else {
            console.error(`Cannot start quest "${quest_id}"; it's either finished and not repeatable, or already active`);
        }

        if(!quest.is_hidden) {
            add_quest_to_display(quest_id);
        }
    },

    isQuestActive(quest_id) {
        return active_quests[quest_id];
    },

    finishQuest(quest_id) {
        if(this.isQuestActive(quest_id)) {
            let quest = quests[quest_id];
            if(!quest.is_repeatable) {
                quest.is_finished = true;
            }
            delete active_quests[quest_id];
            if(!quests[quest_id].is_hidden) {
                update_displayed_quest(quest_id);
            }
        } else {
            console.warn(`Cannot finish quest "${quest_id}", as it's not a currently active quest!`)
        }
    },

    finishQuestTask(quest_id, task_index) {
        if(this.isQuestActive(quest_id)) {
            let quest = quests[quest_id];
            quest.quest_tasks[task_index].is_finished = true;
            if(!quests[quest_id].is_hidden) {
                update_displayed_quest_task(quest_id, task_index);
                update_displayed_quest(quest_id);
            }
        } else {
            console.warn(`Cannot finish task at index ${task_index} for quest "${quest_id}", as it's not a currently active quest!`)
        }
    },

    catchQuestEvent({quest_event_type, quest_event_target, quest_event_count, additional_quest_triggers = []}) {
        Object.keys(active_quests).forEach(active_quest_id => {
            const current_task_index = active_quests[active_quest_id].quest_tasks.findIndex(task => !task.is_finished); //just get the first unfinished
            const current_task = active_quests[active_quest_id].quest_tasks[current_task_index];

            let is_any_met = false;
            let is_all_met = true;

            Object.keys(current_task.task_condition).forEach(task_group => {
                /*
                        task_group (any/all): {
                            task_type (kill/kill_any/clear/something_else?): { <- quest_event_type
                                task_target_id (some related id): { <- quest_event_target
                                    target: Number,
                                    current: Number,
                                    requirements: [], //additional triggers needed, like "weapon_unarmed"
                                }
                            }
                        }

                        //

                        any: {
                            kill: { //by id
                                    "Wolf rat": { target: 10, current: 0, requirements: [],}, 
                                    "Wolf": {target: 5, current: 0, requirements: [],}
                            },
                            kill_any: {"Pest": {requirements: [], target: , current: ,}}}, //by tags
                            clear: {"Infested field": {}} //by id
                        }
                        all:{
                            //same
                        } 
                */

                
                Object.keys(current_task.task_condition[task_group]).forEach(task_type => {
                    Object.keys(current_task.task_condition[task_group][task_type]).forEach(task_target_id => {
                        if(!current_task.task_condition[task_group][task_type][task_target_id].current) {
                            current_task.task_condition[task_group][task_type][task_target_id].current = 0;
                        }
                    });

                    //if event is of proper type, check further conditions, increase the count and check if it's completed
                    if(quest_event_type in current_task.task_condition[task_group] && quest_event_target in current_task.task_condition[task_group][quest_event_type]) {

                        //let requirements_met = true;

                        //return if additional requirements are not met (not present in additional triggers)
                        for(let i = 0; i < current_task.task_condition[task_group][quest_event_type][quest_event_target].requirements?.length; i++) {
                            if(!additional_quest_triggers.includes(current_task.task_condition[task_group][quest_event_type][quest_event_target].requirements[i])) {
                                //requirements_met = false;
                                return;
                            }
                        }

                        current_task.task_condition[task_group][quest_event_type][quest_event_target].current += quest_event_count;

                        //any => set to true after first met, as only one is needed
                        //all => set to false after first not met, as all are needed
                        if(task_group === "any" && current_task.task_condition[task_group][quest_event_type][quest_event_target].current >= current_task.task_condition[task_group][quest_event_type][quest_event_target].target) {
                            is_any_met = true;
                        } else if(task_group === "all" && current_task.task_condition[task_group][quest_event_type][quest_event_target].current < current_task.task_condition[task_group][quest_event_type][quest_event_target].target) {
                            is_all_met = false;
                        }
                    }
                });
            });

            if(is_any_met && is_all_met) { //completed
                this.finishQuestTask(active_quest_id, current_task_index);
            } else {
                update_displayed_quest_task(active_quest_id, current_task_index);
            }

            const remaining_tasks = active_quests[active_quest_id].quest_tasks.filter(task => !task.is_finished);
            if(remaining_tasks.length == 0) { //no more tasks
                this.finishQuest(active_quest_id);
            }
        });
    },
};

quests["Lost memory"] = new Quest({
    quest_name: "???",
    getQuestName: ()=>{
        const completed_tasks = questManager.getCompletedtaskCount();
        if(completed_tasks == 0) {
            return "???";
        } else {
            return "The Search";
        }
    },
    getQuestDescription: ()=>{
        const completed_tasks = questManager.getCompletedtaskCount();
        if(completed_tasks == 0) {
            return "You woke up in some village and you have no idea how you got here or who you are. Just what could have happened?";
        } else if(completed_tasks == 1) {
            return "You lost your memories after being attacked by unknown assailants and were rescued by local villagers.";
        } else {
            return "You lost your memories after being attacked by unknown assailants and were rescued by local villagers. You need to find out who, why, and if possible, how to recover them.";
        }
    },
    questline: "Lost memory",
    quest_tasks: [
        new QuestTask({task_description: "Find out what happened"}),
        new QuestTask({task_description: "Help with the wolf rat infestation"}),
        new QuestTask({task_description: "Continue your search"}), //talk to suspicious guy
        new QuestTask({task_description: "Get into the town"}),
    ]
});

quests["Test quest"] = new Quest({
    quest_name: "Test quest",
    id: "Test quest",
    quest_description: "Raaaaaaaaaaat ratratratratrat rat rat rat",
    quest_tasks: [
        new QuestTask({
            task_description: "task 1 blah blah",
            task_condition: {
                any: {
                    kill: {
                        "Wolf rat": {target: 10}
                    }
                }
            }
        }),
        new QuestTask({
            task_description: "task 2 blah blah",
            is_hidden: true,
        }),
        new QuestTask({
            task_description: "task 3 blah blah",
            task_condition: {
                any: {
                    kill: {
                        "Wolf rat": {target: 20}
                    }
                }
            }
        }),
    ]
})

/*
quests["Infinite rat saga"] = new Quest({
    quest_name: "???",
    id: "Infinite rat saga",
    quest_description: "",
    quest_tasks: [
        new QuestTask({}),
        
    ]
});
*/

export { quests, active_quests, questManager};