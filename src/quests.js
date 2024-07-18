"use strict";


const quests = {};
const active_quests = [];

class QuestTask {
    constructor({
        task_description = "", //optional
        task_condition, //an array of conditions for task to be completed; completing any of them finishes the task
        task_progress,
        task_rewards = {}, //generally skipped but could sometimes have something?
        is_hidden = false, //keep it false most of the time, but could be used as a fake way of making quests with no visible requirement for progress
        is_finished = false,
    })
    {
        this.task_description = task_description;
        this.task_condition = task_condition;
        this.task_progress = task_progress;
        this.task_rewards = task_rewards;
        this.is_hidden = is_hidden;
        this.is_finished = is_finished;
    }
}

class Quest {
    constructor({
                quest_name, //for display, can be skipped if getQuestName covers all possibilites
                quest_id, 
                quest_description, // -||-
                questline, //questline for grouping or something, skippable
                quest_tasks = [], //an array of tasks that need to be completed one by one
                quest_condition, //an array of conditions for the quest to be completed; completing any of them completes the quest
                quest_progress, //both this and quest_condition can be skipped if there's quest_tasks, or can stay to allow completing the quest without fulfilling them all
                quest_rewards, //may include a new quest to automatically start
                is_hidden = false, //hidden quests are not visible and are meant to function as additional unlock mechanism; name and description are skipped
                is_finished = false,
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
        this.quest_condition = quest_condition;
        this.quest_progress = quest_progress;
        this.getQuestName = getQuestName;
    }
    qetCompletedTaskCount(){
        if(this.quest_tasks.length == 0) {
            return 0;
        } else {
            return this.quest_tasks.filter(task => task.is_finished).length;
        }
    }
}

const QuestManager = {
    startQuest(quest_id) {
        active_quests.push(quests[quest_id]);
    },

    finishQuest(quest_index) {
        active_quests.splice(quest_index, 1);
    },

    doQuestEvent(quest_event_type, target) {
        for(let i = 0; i < active_quests.length; i++) {

        }
    }
};

quests["Lost memory"] = new Quest({
    quest_name: "???",
    qetQuestName: ()=>{
        const completed_tasks = this.getCompletedtaskCount();
        if(completed_tasks == 0) {
            return "???";
        } else {
            return "The Search";
        }
    },
    getQuestDescription: ()=>{
        const completed_tasks = this.getCompletedtaskCount();
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
                    clear: "Infested field",
                }
            },
        }),
    ]
});

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