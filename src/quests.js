"use strict";

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
                        this.task_condition[task_group][task_type][task_target_id] = {current: 0, target: this.task_condition[task_group][task_type][task_target_id]};
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
                GetQuestName = ()=>{return this.quest_name;},
                GetQuestDescription = ()=>{return this.quest_description;},
    }) {
        this.quest_name = quest_name;
        this.quest_id = quest_id || quest_name;
        this.questline = questline;
        this.quest_tasks = quest_tasks;
        this.quest_description = quest_description;
        this.quest_reward = quest_rewards || {};
        this.is_hidden = is_hidden;
        this.is_finished = is_finished;
        this.quest_condition = quest_condition;
        this.GetQuestName = GetQuestName;
        this.GetQuestDescription = GetQuestDescription;
    }

    GetCompletedUniqueTaskCount(){
        if(this.quest_tasks.length == 0) {
            return 0;
        } else {
            return this.quest_tasks.filter(task => task.is_finished).length;
        }
    }

    GetCompletedTaskCount(){
        if(this.quest_tasks.length == 0) {
            return 0;
        } else {
            return this.quest_tasks.filter(task => task.is_finished).length;
        }
    }
}

const QuestManager = {
    StartQuest(quest_id) {
        const quest = quests[quest_id];
        if((!quest.is_finished || quest.is_repeatable) && !this.IsQuestActive(quest_id)) {
            active_quests[quest_id] = new Quest(quests[quest_id]);
        } else {
            console.error(`Cannot start quest "${quest_id}"; it's either finished and not repeatable, or already active`);
        }
        //todo: update display if quest is not hidden
    },

    IsQuestActive(quest_id) {
        return active_quests[quest_id];
    },

    FinishQuest(quest_id) {
        if(this.IsQuestActive(quest_id)) {
            let quest = quests[quest_id];
            if(!quest.is_repeatable) {
                quest.is_finished = true;
            }
            delete active_quests[quest_id];
            //todo: update display if quest is not hidden
        } else {
            console.warn(`Cannot finish quest "${quest_id}", as it's not a currently active quest!`)
        }
    },

    FinishQuestTask(quest_id, task_index) {
        if(this.IsQuestActive(quest_id)) {
            let quest = quests[quest_id];
            quest.quest_tasks[task_index].is_finished = true;
            //todo: update display if quest is not hidden
        } else {
            console.warn(`Cannot finish task at index ${task_index} for quest "${quest_id}", as it's not a currently active quest!`)
        }
    },

    CatchQuestEvent({quest_event_type, quest_event_target, quest_event_count}) {
        Object.keys(active_quests).forEach(active_quest_id => {
            const current_task_index = active_quests[active_quest_id].quest_tasks.findIndex(task => !task.is_finished); //just get the first unfinished
            const current_task = active_quests[active_quest_id].quest_tasks[current_task_index];

            let is_any_met = false;
            let is_all_met = true;

            //todo: add progress to tasks
            //check same task progress, if value is same or higher as in task condition 


            Object.keys(current_task.task_condition).forEach(task_group => {
                /*
                        task_group (any/all): {
                            task_type (kill/kill_any/clear/something_else?): { <- quest_event_type
                                task_target_id (some related id): { <- quest_event_target
                                    target: Number,
                                    current: Number
                                }
                            }
                        }

                        //

                        any: {
                            kill: {"Wolf rat": { target: 10, current: 0, "Wolf": {target: 5, current: 0}}, //by id
                            kill_any: {"Pest": {}}, //by tags
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

                    if(quest_event_type in current_task.task_condition[task_group] && quest_event_target in current_task.task_condition[task_group][quest_event_type]) {
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
                this.FinishQuestTask(active_quests[active_quest_id].quest_id, current_task_index);
            }

            const remaining_tasks = active_quests[active_quest_id].quest_tasks.filter(task => !task.is_finished);
            if(remaining_tasks.length == 0) { //no more tasks
                this.FinishQuest(active_quest_id);
            }
        });
    }
};

quests["Lost memory"] = new Quest({
    quest_name: "???",
    GetQuestName: ()=>{
        const completed_tasks = QuestManager.GetCompletedtaskCount();
        if(completed_tasks == 0) {
            return "???";
        } else {
            return "The Search";
        }
    },
    GetQuestDescription: ()=>{
        const completed_tasks = QuestManager.GetCompletedtaskCount();
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
        new QuestTask({
            task_description: "Help with the wolf rat infestation",
            task_condition: {
                any: {
                    clear: {
                        "Infested field": 1
                    },
                }
            },
        }),
    ]
});

quests["Test quest"] = new Quest({
    quest_name: "Test quest",
    id: "Test quest",
    quest_description: "This is a test quest",
    quest_tasks: [
        new QuestTask({
            task_description: "blah",
            task_condition: {
                any: {
                    kill: {
                        "Wolf rat": 10,
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

export { quests, active_quests, QuestManager};