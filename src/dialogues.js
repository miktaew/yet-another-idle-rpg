"use strict";

import { GameAction } from "./actions.js";

const dialogues = {};

class Dialogue {
    constructor({ 
        name,
        id,
        starting_text = `Talk to the ${name}`,
        ending_text = `Go back`,
        is_unlocked = true,
        is_finished = false,
        textlines = {},
        actions = {},
        description = "",
        getDescription = ()=>{return this.description;},
        location_name
    })  {
        this.name = name; //displayed name, e.g. "Village elder"
        this.id = id || this.name;
        this.starting_text = starting_text;
        this.ending_text = ending_text; //text shown on option to finish talking
        this.is_unlocked = is_unlocked;
        this.is_finished = is_finished; //separate bool to remove dialogue option if it's finished
        this.textlines = textlines; //all the lines in dialogue
        this.actions = actions;
        this.description = description;
        this.getDescription = getDescription;

        this.location_name = location_name; //this is purely informative and wrong value shouldn't cause any actual issues

        //definitions use .locks_lines property instead of doing it through rewards because it's just simpler, but it's actually handled through rewards so it gets moved there
        Object.keys(this.textlines).forEach(textline_key => {
            const textline = this.textlines[textline_key];
            if(textline.locks_lines) {
                if(!textline.rewards.locks.textlines[this.id]) {
                    textline.rewards.locks.textlines[this.id] = [];
                }
                textline.rewards.locks.textlines[this.id].push(...textline.locks_lines);
            }
        });
    }
}

class Textline {
    constructor({name,
                 text,
                 getText,
                 is_unlocked = true,
                 is_finished = false,
                 is_branch_only = false,
                 rewards = {textlines: [],
                            locations: [],
                            dialogues: [],
                            traders: [],
                            stances: [],
                            flags: [],
                            items: [],
                            locks: {textlines: {}}, //for lines to be locked in diferent dialogues and possibly for other stuff
                            //reputation reward from textlines is currently not supported
                            },
                branches_into = [],
                locks_lines = [], //for lines to be locked in same dialogue
                otherUnlocks,
                required_flags,
                display_conditions = [],
            }) 
    {
        this.name = name; // displayed option to click, don't make it too long
        this.text = text; // what's shown after clicking
        this.getText = getText || function(){return this.text;};
        this.otherUnlocks = otherUnlocks || function(){return;};
        this.is_unlocked = is_unlocked;
        this.is_finished = is_finished;
        this.is_branch_only = is_branch_only; //if true, textline won't be displayed in overall view and instead will only be available as a branch dialogue
        this.rewards = rewards || {};
        this.branches_into = branches_into;
        
        this.rewards.textlines = rewards.textlines || [];
        this.rewards.locations = rewards.locations || [];
        this.rewards.dialogues = rewards.dialogues || [];
        this.rewards.traders = rewards.traders || [];
        this.rewards.stances = rewards.stances || [];
        this.rewards.flags = rewards.flags || [];
        this.rewards.items = rewards.items || [];
        
        this.display_conditions = [display_conditions];
        this.required_flags = required_flags;

        this.locks_lines = locks_lines;

        this.rewards.locks = rewards.locks || {};
        if(!this.rewards.locks.textlines) {
            this.rewards.locks.textlines = {};
        }
        //related text lines that get locked; might be itself, might be some previous line 
        //e.g. line finishing quest would also lock line like "remind me what I was supposed to do"
        //should be alright if it's limited only to lines in same Dialogue
        //just make sure there won't be Dialogues with ALL lines unavailable
    }
}

class DialogueAction extends GameAction {
    constructor(data) {
        super(data);
        this.giveup_text = data.giveup_text;
        this.floating_click_effects = data.floating_click_effects;
    }
}

(function(){
    dialogues["village elder"] = new Dialogue({
        //ram
        name: "village elder",
        textlines: {
            "hello": new Textline({
                name: "elder hello",
                text: "elder hello answ",
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["what happened", "where am i", "dont remember", "about"]}],
                },
                locks_lines: ["hello"],
            }),
            "what happened": new Textline({
                name: "elder head hurts",
                text: "elder head hurts answ",
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 0},
                    ]
                },
            }),
            "where am i": new Textline({
                name: "elder where",
                text: "elder where answ",
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 0},
                    ]
                },
            }),
            "dont remember": new Textline({
                name: "elder remember",
                text: "elder remember answ",
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 0},
                    ]
                },
            }),
            "about": new Textline({
                name: "elder who",
                text: "elder who answ",
                is_unlocked: false,
                locks_lines: ["about"]
            }),
            "ask to leave 1": new Textline({
                name: "elder leave 1",
                text: "elder leave 1 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["need to"]}],
                },
                locks_lines: ["ask to leave 1"],
            }),
            "need to": new Textline({
                name: "elder need to",
                text: "elder need to answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["rats", "ask to leave 2", "equipment"]}],
                    locations: [{location: "Infested field"}],
                    activities: [{location:"Village", activity:"weightlifting"}, {location:"Village",activity:"running"}],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 1},
                    ]
                },
                locks_lines: ["need to"],
            }),
            "equipment": new Textline({
                name: "elder eq",
                text: "elder eq answ",
                is_unlocked: false,
                locks_lines: ["equipment"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["money"]}],
                    traders: [{trader: "village trader"}]
                }
            }),
            "money": new Textline({
                name: "elder money",
                text: "elder money answ",
                is_unlocked: false,
                locks_lines: ["money"],
                rewards: {
                    activities: [{location: "Village", activity: "fieldwork"}],
                }
            }),
            "ask to leave 2": new Textline({
                name: "elder leave 2",
                text: "elder leave 2 answ",
                is_unlocked: false,
                rewards: {
                },
            }),
            "rats": new Textline({
                name: "elder rats",
                text: "elder rats answ",
                is_unlocked: false,
            }),
            "cleared field": new Textline({ //will be unlocked on clearing infested field combat_zone
                name: "elder cleared 1",
                text: "elder cleared 1 answ",
                is_unlocked: false,
                rewards: {
                    locations: [{location: "Nearby cave"}, {location: "Infested field"}, {location: "Shack"}],
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 3"]}],
                    dialogues: ["old craftsman"],
                },
                locks_lines: ["ask to leave 2", "cleared field"],
            }),
            "ask to leave 3": new Textline({
                name: "elder leave 3",
                text: "elder leave 3 answ",
                rewards: {
                    locations: [{location: "Nearby cave"}, {location: "Infested field"}],
                    dialogues: ["old craftsman"],
                },
                is_unlocked: false,
            }),
            "cleared room": new Textline({
                name: "elder room clear",
                text: "elder room clear answ",
                is_unlocked: false,
                rewards: {
                    locations: [{location: "Eastern mill"}],
                    quests: ["It won't mill itself"],
                },
                locks_lines: ["cleared room"],
            }),
            "cleared cave": new Textline({
                name: "elder cave clear",
                text: "elder cave clear answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 4"]}],
                    locations: [{location: "Forest road"}, {location: "Infested field"}, {location: "Nearby cave"}],
                    dialogues: ["village guard"],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 2},
                    ]
                },
                locks_lines: ["ask to leave 3", "rats", "cleared cave"],
            }),
            "ask to leave 4": new Textline({
                name: "elder leave 4",
                text: "elder leave 4 answ",
                is_unlocked: false,
                rewards: {
                    locations: [{location: "Forest road"}, {location: "Infested field"}, {location: "Nearby cave"}],
                    dialogues: ["village guard", "old craftsman"],
                },
            }),
            "new tunnel": new Textline({
                name: "elder tunnel",
                text: "elder tunnel answ",
                is_unlocked: false,
                locks_lines: ["new tunnel"],
            }),

            "more training": new Textline({
                name: "elder training",
                getText: (context) => {
                    if(context?.season === "Winter") {
                        return "elder training answ 2";
                    } else {
                        return "elder training answ 1";
                    }
                },
                is_unlocked: false,
                locks_lines: ["more training"],
                rewards: {
                    global_activities: ["swimming", "climbing"],
                    actions: [{location: "Nearby cave", action: "climb the mountain"}],
                    locks: {
                        quests: ["Swimming alternative unlock"]
                    }
                }
            })
        },
        description: "elder description",
    });

    dialogues["old craftsman"] = new Dialogue({
        //badger
        name: "old craftsman",
        is_unlocked: false,
        textlines: {
            "hello": new Textline({
                name: "craftsman hello",
                text: "craftsman hello answ",
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["learn", "leave"]}],
                },
                locks_lines: ["hello"],
            }),
            "learn": new Textline({
                name: "craftsman learn",
                text: "craftsman learn answ",
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind1", "remind2", "remind3", "remind4"]}],
                    items: ["Old pickaxe" ,"Old axe", "Old sickle", "Old shovel"],
                    flags: ["is_gathering_unlocked", "is_crafting_unlocked"],
                },
                locks_lines: ["learn","leave"],
                is_unlocked: false,
            }),
            "leave": new Textline({
                name: "craftsman leave",
                text: "craftsman leave answ",
                is_unlocked: false,
            }),
            
            "remind1": new Textline({
                name: "craftsman remind 1",
                text: "craftsman remind 1 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind2": new Textline({
                name: "craftsman remind 2",
                text: "craftsman remind 2 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind3": new Textline({
                name: "craftsman remind 3",
                text: "craftsman remind 3 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind4": new Textline({
                name: "craftsman remind 4",
                text: "craftsman remind 4 answ",
                is_unlocked: false,
            }),
        },
        description: "craftsman description",
    });

    dialogues["village guard"] = new Dialogue({
        name: "village guard",
        is_unlocked: false,
        textlines: {
            "hello": new Textline({
                name: "guard hello",
                text: "guard hello answ",
                rewards: {
                    textlines: [{dialogue: "village guard", lines: ["tips", "job"]}],
                },
                locks_lines: ["hello"],
            }),
            "job": new Textline({
                name: "guard job",
                is_unlocked: false,
                text: "guard job answ",
                rewards: {
                    activities: [{location:"Village", activity:"patrolling"}],
                },
                locks_lines: ["job"],
            }),
            "tips": new Textline({
                name: "guard tips",
                is_unlocked: false,
                text: "guard tips answ",
                rewards: {
                    textlines: [{dialogue: "village guard", lines: ["teach"]}],
                },
            }),
            "hi": new Textline({
                name: "guard hi",
                is_unlocked: false,
                text: "guard hi answ",
                display_conditions: {
                    reputation: {village: 250},
                },
            }),
            "teach": new Textline({
                name: "guard teach",
                is_unlocked: false,
                text: "guard teach answ",
                rewards: {
                    locations: [{location: "Sparring with the village guard (quick)"}, {location: "Sparring with the village guard (heavy)"}],
                },
                locks_lines: ["teach"],
            }),
            "quick": new Textline({
                name: "guard quick",
                is_unlocked: false,
                text: "guard quick answ",
                otherUnlocks: () => {
                    if(dialogues["village guard"].textlines["heavy"].is_finished) {
                        dialogues["village guard"].textlines["wide"].is_unlocked = true;
                    }
                },
                locks_lines: ["quick"],
                rewards: {
                    stances: ["quick"]
                }
            }),
            "heavy": new Textline({
                name: "guard heavy",
                is_unlocked: false,
                text: "guard heavy answ",
                otherUnlocks: () => {
                    if(dialogues["village guard"].textlines["quick"].is_finished) {
                        dialogues["village guard"].textlines["wide"].is_unlocked = true;
                    }
                },
                locks_lines: ["heavy"],
                rewards: {
                    stances: ["heavy"]
                }
            }),
            "wide": new Textline({
                name: "guard wide",
                is_unlocked: false,
                text: "guard wide answ",
                locks_lines: ["wide"],
                rewards: {
                    stances: ["wide"],
                    textlines: [{dialogue: "village guard", lines: ["serious", "hi"]}],
                }
            }),
            "serious": new Textline({
                name: "guard serious",
                is_unlocked: false,
                text: "guard serious answ",
                locks_lines: ["serious"],
            }),
            
        },
        description: "guard description",
    });

    dialogues["village millers"] = new Dialogue({
        //cat and mouse
        name: "village millers",
        textlines: {
            "hello": new Textline({
                name: "millers hello",
                text: "millers hello answ",
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["how", "young"]}],
                },
                locks_lines: ["hello"],
            }),
            "how": new Textline({
                is_unlocked: false,
                name: "millers how",
                text: "millers how answ",
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["sure"]}],
                },
                locks_lines: ["how"],
            }),
            "sure": new Textline({
                is_unlocked: false,
                name: "millers sure",
                text: "millers sure answ",
                rewards: {
                    quest_progress: [{quest_id: "It won't mill itself", task_index: 0}],
                    locations: [{location: "Eastern storehouse"}],
                },
                locks_lines: ["sure"],
            }),
            "young": new Textline({
                is_unlocked: false,
                name: "millers young",
                text: "millers young answ",
                locks_lines: ["young"],
            }),
            "cleared storage": new Textline({
                is_unlocked: false,
                name: "millers cleared",
                text: "millers cleared answ",
                locks_lines: ["cleared storage"],
                rewards: {
                    quest_progress: [{quest_id: "It won't mill itself", task_index: 1}],
                    actions: [{location: "Village", action: "search for delivery"}],
                },
            }),
            "delivered": new Textline({
                is_unlocked: false,
                name: "millers delivered",
                text: "millers delivered answ",
                locks_lines: ["delivered"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["kiss"]}],
                    quest_progress: [{quest_id: "It won't mill itself", task_index: 2}],
                    actions: [{location: "Village", action: "search for delivery"}],
                },
            }),
            "kiss": new Textline({
                is_unlocked: false,
                name: "millers kiss",
                text: "millers kiss answ",
                branches_into: ["kiss both", "kiss cat", "kiss mouse", "reject nice", "reject mean"],
            }),
            "kiss both": new Textline({
                is_branch_only: true,
                name: "millers kiss both",
                text: "millers kiss both answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["kiss more", "how2"]}],
                }
            }),
            "kiss cat": new Textline({
                is_branch_only: true,
                name: "millers kiss cat",
                text: "millers kiss cat answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["kiss more", "how2"]}],
                }
            }),
            "kiss mouse": new Textline({
                is_branch_only: true,
                name: "millers kiss mouse",
                text: "millers kiss mouse answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["kiss more", "how2"]}],
                }
            }),
            "reject nice": new Textline({
                is_branch_only: true,
                name: "millers reject nice",
                text: "millers reject nice answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["how2"]}],
                }
            }),
            "reject mean": new Textline({
                is_branch_only: true,
                name: "millers reject mean",
                text: "millers reject mean answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["how2"]}],
                }
            }),
            "kiss more": new Textline({
                is_unlocked: false,
                name: "millers kiss more",
                text: "millers kiss more answ",
                locks_lines: ["kiss more"],
            }),
            "how2": new Textline({
                is_unlocked: false,
                name: "millers how2",
                text: "millers how2 answ",
            }),
        },
        description: "millers description",
    });

    dialogues["gate guard"] = new Dialogue({
        name: "gate guard",
        textlines: {
            "enter": new Textline({
                name: "g guard hello",
                text: "g guard hello answ",
            }), 
        },
        description: "g guard description",
    });
    dialogues["suspicious man"] = new Dialogue({
        name: "suspicious man",
        textlines: {
            "hello": new Textline({ 
                name: "sus hello",
                text: "sus hello answ",
                rewards: {
                    locations: [{location: "Fight off the assailant"}],
                },
                locks_lines: ["hello"],
            }), 
            "defeated": new Textline({ 
                name: "sus defeated",
                is_unlocked: false,
                text: "sus defeated answ",
                locks_lines: ["defeated"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["behave", "situation"]}],
                    quest_progress: [
                        {quest_id: "Lost memory", task_index: 3},
                    ]
                },
            }), 
            "behave": new Textline({ 
                name: "sus behave",
                is_unlocked: false,
                text: "sus behave answ",
                locks_lines: ["defeated"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["situation", "boss"]}],
                },
            }), 
            "boss": new Textline({ 
                name: "sus boss",
                is_unlocked: false,
                text: "sus boss answ",
                locks_lines: ["boss"],
            }), 
            "situation": new Textline({
                name: "sus situation",
                is_unlocked: false,
                text: "sus situation answ",
                locks_lines: ["situation"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["gang", "boss"]}],
                },
            }),
            "gang": new Textline({
                name: "sus gang",
                is_unlocked: false,
                text: "sus gang answ",
                locks_lines: ["gang", "behave"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["gang", "behave 2"]}],
                    locations: [
                        {location: "Gang hideout"},
                    ],
                    quest_progress: [{quest_id: "Light in the darkness", task_index: 0}],
                },
            }),
            "defeated gang": new Textline({
                name: "sus gang defeated",
                is_unlocked: false,
                text: "sus gang defeated answ",
                locks_lines: ["defeated gang"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["tricks", "behave 3" ]}],
                    dialogues: ["old woman of the slums"],
                }
            }),
            "behave 2": new Textline({ 
                name: "sus behave 2",
                is_unlocked: false,
                text: "sus behave 2 answ",
            }),
            "behave 3": new Textline({ 
                name: "sus behave 3",
                is_unlocked: false,
                text: "sus behave 3 answ",
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["tricks"]}],
                    dialogues: ["old woman of the slums"],
                    actions: [{dialogue: "suspicious man", action: "headpat"}],
                }
            }),
            "tricks": new Textline({ 
                name: "sus tricks",
                is_unlocked: false,
                text: "sus tricks answ",
                rewards: {
                    stances: ["defensive"],
                },
                locks_lines: ["tricks"],
            }),
        }, 
        getDescription: ()=>{
            if(dialogues["suspicious man"].textlines["defeated gang"].is_finished) {
                return "sus description 2";
            } else {
                return "sus description 1";
            }
        },
        actions: {
            "headpat": new DialogueAction({
                action_id: "headpat",
                is_unlocked: false,
                repeatable: true,
                starting_text: "sus headpat",
                floating_click_effects: ['(* ^ ω ^)	', '<(￣︶￣)>	', '(*≧ω≦*)	', '(ᗒ⩊ᗕ)', '(= ⩊ =)'],
                description: "",
                action_text: "",
                success_text: "sus headpat answ",
                display_conditions: {
                    flags: ["is_mofu_mofu_enabled"],
                },
                attempt_duration: 0,
                success_chances: [1],
            }),
        }
        
    });

    dialogues["old woman of the slums"] = new Dialogue({
        name: "old woman of the slums",
        is_unlocked: false,
        textlines: {
            "hello": new Textline({
                name: "old hello",
                text: "old hello answ",
                locks_lines: ["hello"],
                rewards: {
                    textlines: [{dialogue: "old woman of the slums", lines: ["dinner"]}],
                }
            }),
            "dinner": new Textline({
                name: "old dinner",
                is_unlocked: false,
                text: "old dinner answ",
                locks_lines: ["dinner"],
                rewards: {
                    textlines: [{dialogue: "old woman of the slums", lines: ["ingredients"]}],
                }
            }),
            "ingredients": new Textline({
                name: "old ingredients",
                is_unlocked: false,
                text: "old ingredients answ",
                locks_lines: ["ingredients"],
                rewards: {
                    activities: [{location: "Town outskirts", activity: "herbalism"}],
                }
            }),
        },
        getDescription: ()=>{
            if(dialogues["old woman of the slums"].textlines["hello"].is_finished) {
                return "old description 2";
            } else {
                return "old description 1";
            }
        }
    });

    dialogues["farm supervisor"] = new Dialogue({
        name: "farm supervisor",
        textlines: {
            "hello": new Textline({ 
                name: "sup hello",
                text: "sup hello answ",
                rewards: {
                    textlines: [{dialogue: "farm supervisor", lines: ["things", "work", "animals", "fight", "fight0", "anything"]}],
                },
                locks_lines: ["hello"],
            }),
            "work": new Textline({
                name:"sup work",
                is_unlocked: false,
                text: "sup work answ",
                rewards: {
                    activities: [{location: "Town farms", activity: "fieldwork"}],
                },
                locks_lines: ["work"],
            }),
            "anything": new Textline({
                name: "sup anything",
                is_unlocked: false,
                text: "sup anything answ",
                rewards: {
                    actions: [{dialogue: "farm supervisor", action: "bonemeal1"}],
                    quests: ["Bonemeal delivery"],
                },
                locks_lines: ["anything"],
            }),
            "more bonemeal": new Textline({
                name: "sup bonemeal",
                is_unlocked: false,
                text: "sup bonemeal answ",
                rewards: {
                    actions: [{dialogue: "farm supervisor", action: "bonemeal2"}],
                },
                locks_lines: ["more bonemeal"],
            }),
            "animals": new Textline({
                name: "sup animals",
                is_unlocked: false,
                text: "sup animals answ",
                required_flags: {yes: ["is_gathering_unlocked"]},
                rewards: {
                    activities: [{location: "Town farms", activity: "animal care"}],
                },
                locks_lines: ["animals"],
            }),
            "fight0": new Textline({
                name: "sup fight0",
                is_unlocked: false,
                text: "sup fight0 answ",
                required_flags: {no: ["is_strength_proved"]},
                rewards: {
                    quests: ["Ploughs to swords"],
                }
            }),
            "fight": new Textline({
                name: "sup fight",
                is_unlocked: false,
                text: "sup fight answ",
                required_flags: {yes: ["is_strength_proved"]},
                rewards: {
                    actions: [{location: "Forest road", action: "search for boars"}],
                    //locations: [{location: "Forest clearing"}],
                    quests: ["Ploughs to swords"],
                    quest_progress: [{quest_id: "Ploughs to swords", task_index: 0}],
                },
                locks_lines: ["fight"],
            }),
            "things": new Textline({
                is_unlocked: false,
                name: "sup things",
                text: "sup things answ",
                rewards: {
                    textlines: [{dialogue: "farm supervisor", lines: ["animals", "fight", "fight0", "anything"]}],
                }
            }), 
            "defeated boars": new Textline({
                is_unlocked: false,
                name: "sup defeated boars",
                text: "sup defeated boars answ",
                locks_lines: ["defeated boars"],
                rewards: {
                    money: 4000,
                    quest_progress: [{quest_id: "Ploughs to swords", task_index: 1}],
                    textlines: [{dialogue: "farm supervisor", lines: ["troubled"]}],
                }
            }),
            "troubled": new Textline({
                is_unlocked: false,
                name: "sup troubled",
                text: "sup troubled answ",
                locks_lines: ["troubled"],
                display_conditions: {
                    season: {
                        not: "Winter",
                    }
                },
                rewards: {
                    quest_progress: [{quest_id: "Ploughs to swords", task_index: 2}],
                    actions: [{location: "Town farms", action: "dig for ants 1"}],
                }
            }),
            "eliminated ants": new Textline({
                is_unlocked: false,
                name: "sup eliminated",
                text: "sup eliminated answ",
                locks_lines: ["eliminated ants"],
                rewards: {
                    quest_progress: [{quest_id: "Ploughs to swords", task_index: 3}],
                    //other rewards are from quest itself
                }
            }),
        },
        actions: {
            "bonemeal1": new DialogueAction({
                action_id: "bonemeal1",
                starting_text: "sup deliver",
                description: "",
                action_text: "",
                success_text: "sup deliver answ",
                failure_texts: {
                    unable_to_begin: ["sup deliver not"],
                },
                required: {
                    items_by_id: {"Bonemeal": {count: 50, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    quest_progress: [
                        {
                            quest_id: "Bonemeal delivery",
                            task_index: 0
                        }
                    ], 
                    textlines: [{dialogue: "farm supervisor", lines: ["more bonemeal"]}],
                },
            }),
            "bonemeal2": new DialogueAction({
                action_id: "bonemeal2",
                starting_text: "sup deliver 2",
                description: "",
                action_text: "",
                success_text: "sup deliver 2 answ",
                repeatable: true,
                failure_texts: {
                    unable_to_begin: ["sup deliver 2 not"],
                },
                required: {
                    items_by_id: {"Bonemeal": {count: 50, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    money: 2000,
                },
            }),
        },
        description: "sup description",
    });
    /*
    dialogues["cute little rat"] = new Dialogue({
        name: "cute little rat",
        description: "You see a cute little rat. It appears completely harmless. It has a cute litle crown on its cute little head and is sitting on a cute little comfortable pillow.",
        textlines: {
            "hello": new Textline({ 
                name: "Uhm, hi?",
                text: "Hello, o mighty adventurer!",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["what"]}],
                },
                locks_lines: ["hello"],
            }),
            "what": new Textline({ 
                name: "What... are you?",
                text: "My name be Ratzor Rathai, the Rat Prince Who Be Promised!",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["walls"]}],
                },
                locks_lines: ["what"],
            }),
            "who": new Textline({ 
                name: "Promised by who?",
                text: "By my papa, the great Rat God, of course! The He Who Bring Infite Rat Blessings uppon this dimension!",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["monsters"]}],
                },
                locks_lines: ["who"],
            }),
            "monsters": new Textline({ 
                name: "Are those strange monsters that I fought on the way amonst those 'blessings' you speak of?",
                text: "No no, they don't be blessings, they be the blessed! Creatures of all the creation, who embrace the gift of my papa! Monsters, animals, adventurers, plants, papa accepts all!",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["walls", "kill", "mind"]}],
                },
                locks_lines: ["monsters"],
            }),
            "mind": new Textline({ 
                name: "And you don't mind that I slaughtered so many rats on my way here?",
                text: "Why? It's the rule of the world that the strong kill the weak and papa believe it too! Besides, maybe you be join us one day? Embrace the truth of your inner rat and reject the human shell!",
                locks_lines: ["mind"],
            }),
            "walls": new Textline({ 
                name: "So some of those wall-like things could have once been human?",
                text: "Only in soul. They be given the blessing of papa, but they try to reject but be too weak to really reject so they end up looking funny.",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["walls"]}],
                },
                locks_lines: ["monsters"],
            }),
            "kill": new Textline({ 
                name: "Okay, give me one reason why I shouldn't kill you.",
                text: "I don't mind, if I die my soul be return to papa. But my blood be full of papa power, don't do it unless you want to face him personally.",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["walls"]}],
                },
                locks_lines: ["kill"],
            }),
        },
    });
    */
})();

export {dialogues};