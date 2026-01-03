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

            "crab rumors": new Textline({		//needs to be unlocked to start the expansion content, stat check should be the unlock trigger
                name: "elder crab rumors",
                text: "elder crab rumors answ",
                is_unlocked: true,			//set to false when quest integration is worked out and can unlock it
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["crab where"]}],
                },
                locks_lines: ["crab rumors"],
            }),
            "crab where": new Textline({
                name: "elder crab where",
                text: "elder crab where answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["crab hunt"]}],
                },
                locks_lines: ["crab where"],
            }),
            "crab hunt": new Textline({
                name: "elder crab hunt",
                text: "elder crab hunt answ",
                is_unlocked: false,
                rewards: {
                    actions: [{location: "Village", action: "hike down river"}],
                    //quest_progress: [{quest_id: "Giant Enemy Crab", task_index: 1}],      //for when Giant Enemy Crab quest is properly implemented
                },
                locks_lines: ["crab hunt", "ask to leave 4"], //removes the final "Can I leave the village?" question. This will leave the elder with no default dialog.
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
                    textlines: [{dialogue: "village millers", lines: ["kiss more", "how2"]}],
                }
            }),
            "reject mean": new Textline({
                is_branch_only: true,
                name: "millers reject mean",
                text: "millers reject mean answ",
                locks_lines: ["kiss"],
                rewards: {
                    textlines: [{dialogue: "village millers", lines: ["kiss more", "how2"]}],
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
	    dialogues["swampland chief"] = new Dialogue({
        //tbd, aggressive and proud
        name: "swampland chief",
        textlines: {
            "swampchief meet": new Textline({		//quest should technically start when entering tribe with a nag to talk to the "village elder?", this starts it "properly"
                name: "swampchief meet",
                text: "swampchief meet answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief explain"]}],
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 0}],
                },
                locks_lines: ["swampchief meet"],
            }),
            "swampchief explain": new Textline({
                name: "swampchief explain",
                text: "swampchief explain answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief help"]}],
                },
                locks_lines: ["swampchief explain"],
            }),
            "swampchief help": new Textline({
                name: "swampchief help",
                text: "swampchief help answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief mid help"]}],
                    dialogues: ["swampland cook"],                                              //this isn't unlocking the cook for some reason, stopping the quest from progressing
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 1}],
                },
                locks_lines: ["swampchief help"],
            }),
            "swampchief mid help": new Textline({
                name: "swampchief mid help",
                text: "swampchief mid help answ",
                is_unlocked: false,
            }),
//  /*
            "swampchief report": new Textline({
                name: "swampchief report",
                text: "swampchief report answ",
                is_unlocked: false,
                display_conditions: {
                    reputation: {village: 50},
                }, 
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief confirm"]}],
                },
                locks_lines: (["swampchief report"], ["swampchief mid help"]),
            }),
            "swampchief confirm": new Textline({
                name: "swampchief confirm",
                text: "swampchief confirm answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief accept"]}],
                },
                locks_lines: ["swampchief confirm"],
            }),
            "swampchief accept": new Textline({
                name: "swampchief accept",
                text: "swampchief accept answ",
                is_unlocked: true,      //swapped for testing, change to false
                rewards: {
                    textlines: [{dialogue: "swampland chief", lines: ["swampchief generic"]}],
                    locations: [{location: "Longhouse"}],
                    items: ["Snake fang ring"],
                    //items_by_id: {"Snake fang ring": {count: 1}},       //reward for completing the quest; not given because I don't know the proper syntax
                    //activities: [{location: "Swampland tribe", activity: "crafting"}],      //unsure of how to swap the crafting station in the tribe from locked to unlocked
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 9}],		//finishes the quest
                },
                locks_lines: ["swampchief accept"],
            }),
            "swampchief generic": new Textline({
                name: "swampchief generic",
                text: "swampchief generic answ",
                is_unlocked: false,
            }),
//  */
        },
        getDescription: ()=>{
            if(dialogues["swampland chief"].textlines["swampchief confirm"].is_finished) {
                return "swampchief description 3";
            } else if (dialogues["swampland chief"].textlines["swampchief help"].is_finished) {
                return "swampchief description 2";
            } else {
                return "swampchief description 1";
            }}
        });
	    dialogues["swampland cook"] = new Dialogue({
        //tbd, an outlander to the tribe. Slips foreign terms in dialogue. Speaks in odd, short sentences ending with exclamation marks
        name: "swampland cook",
        is_unlocked: true,          //swapped for testing, change to false
        textlines: {
            "swampcook greeting1": new Textline({
                name: "swampcook greeting1",
                text: "swampcook greeting1 answ",
                is_unlocked: true,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook greeting2"]},
                    {dialogue: "swampland cook", lines: ["swampcook obaru"]}
            ]
            },
                locks_lines: ["swampcook greeting1"],
            }),
            "swampcook greeting2": new Textline({
                name: "swampcook greeting2",
                text: "swampcook greeting2 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook help"]}]
            },
                locks_lines: ["swampcook greeting2"],
            }),
            "swampcook help": new Textline({
                name: "swampcook help",
                text: "swampcook help answ",
                is_unlocked: false,
                rewards: 
                    {textlines: [
                        {dialogue: "swampland cook", lines: ["swampcook sosso"]},
                    ],
                    actions: [
                        {dialogue: "swampland cook", action: "swampcook deliver"}
                    ],
                },
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 2}],
                locks_lines: ["swampcook help"],
            }),
            "swampcook know": new Textline({
                name: "swampcook know",
                text: "swampcook know answ",
                is_unlocked: false,
                rewards: {
                    textlines:[
                    {dialogue: "swampland cook", lines: ["swampcook yeslore"]},
                    {dialogue: "swampland cook", lines: ["swampcook nolore"]},
                ]},
                locks_lines: ["swampcook know"],
            }),
            "swampcook yeslore": new Textline({
                name: "swampcook yeslore",
                text: "swampcook yeslore answ",
                is_unlocked: false,
                rewards: {
                    textlines: [
                        {dialogue: "swampland cook", lines: ["swampcook history"]},
                        {dialogue: "swampland cook", lines: ["swampcook surround"]},
                        {dialogue: "swampland cook", lines: ["swampcook chief"]},
                        {dialogue: "swampland cook", lines: ["swampcook people"]}
                    ]
                },
                    recipes: [
                        {category: "cooking", subcategory: "items", recipe_id: "Alligator jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Turtle jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Snake jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Swampland skewer"},
                    ],
                locks_lines: ["swampcook yeslore", "swampcook nolore"],
            }),
            "swampcook history": new Textline({
                name: "swampcook history",
                text: "swampcook history answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook history1"]},
                    {dialogue: "swampland cook", lines: ["swampcook historyend"]},
                ]
            },
                locks_lines: ["swampcook history"],
            }),
            "swampcook history1": new Textline({
                name: "swampcook history1",
                text: "swampcook history1 answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook history2"]},
                    {dialogue: "swampland cook", lines: ["swampcook zalgo"]}
                ]
            },
                locks_lines: ["swampcook history1"],
            }),
            "swampcook history2": new Textline({
                name: "swampcook history2",
                text: "swampcook history2 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook history3"]}]
            },
                locks_lines: ["swampcook history2"],
            }),
            "swampcook history3": new Textline({
                name: "swampcook history3",
                text: "swampcook history3 answ",
                is_unlocked: false,
                locks_lines: ["swampcook history3"],
            }),
            "swampcook historyend": new Textline({
                name: "swampcook historyend",
                text: "swampcook historyend answ",
                is_unlocked: false,
                locks_lines: ["swampcook history1", "swampcook history2", "swampcook history3", "swampcook historyend"],
            }),
            "swampcook surround": new Textline({
                name: "swampcook surround",
                text: "swampcook surround answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook surround1"]},
                    {dialogue: "swampland cook", lines: ["swampcook surround2"]},
                    {dialogue: "swampland cook", lines: ["swampcook surround3"]},
                    {dialogue: "swampland cook", lines: ["swampcook surround4"]},
                    {dialogue: "swampland cook", lines: ["swampcook surroundend"]}
                ]
            },
                locks_lines: ["swampcook surround"],
            }),
            "swampcook surround1": new Textline({
                name: "swampcook surround1",
                text: "swampcook surround1 answ",
                is_unlocked: false,
                locks_lines: ["swampcook surround1"],
            }),
            "swampcook surround2": new Textline({
                name: "swampcook surround2",
                text: "swampcook surround2 answ",
                is_unlocked: false,
                locks_lines: ["swampcook surround2"],
            }),
            "swampcook surround3": new Textline({
                name: "swampcook surround3",
                text: "swampcook surround3 answ",
                is_unlocked: false,
                locks_lines: ["swampcook surround3"],
            }),
            "swampcook surround4": new Textline({
                name: "swampcook surround4",
                text: "swampcook surround4 answ",
                is_unlocked: false,
                locks_lines: ["swampcook surround4"],
            }),
            "swampcook surroundend": new Textline({
                name: "swampcook surroundend",
                text: "swampcook surroundend answ",
                is_unlocked: false,
                locks_lines: ["swampcook surround1", "swampcook surround2", "swampcook surround3", "swampcook surround4", "swampcook surroundend"],
            }),
            "swampcook chief": new Textline({
                name: "swampcook chief",
                text: "swampcook chief answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook chief1"]},
                    {dialogue: "swampland cook", lines: ["swampcook chiefend"]}
                ]
            },
                locks_lines: ["swampcook chief"],
            }),
            "swampcook chief1": new Textline({
                name: "swampcook chief1",
                text: "swampcook chief1 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook chief2"]}]
            },
                locks_lines: ["swampcook chief1"],
            }),
            "swampcook chief2": new Textline({
                name: "swampcook chief2",
                text: "swampcook chief2 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook chief3"]}]
            },
                locks_lines: ["swampcook chief2"],
            }),
            "swampcook chief3": new Textline({
                name: "swampcook chief3",
                text: "swampcook chief3 answ",
                is_unlocked: false,
                locks_lines: ["swampcook chief3"],
            }),
            "swampcook chiefend": new Textline({
                name: "swampcook chiefend",
                text: "swampcook chiefend answ",
                is_unlocked: false,
                locks_lines: ["swampcook chief1", "swampcook chief2", "swampcook chief3", "swampcook chiefend"],
            }),
            "swampcook people": new Textline({
                name: "swampcook people",
                text: "swampcook people answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook cook"]},
                    {dialogue: "swampland cook", lines: ["swampcook trader"]},
                    {dialogue: "swampland cook", lines: ["swampcook fangs"]}
                ]
            },
                locks_lines: ["swampcook people"],
            }),
            "swampcook cook": new Textline({
                name: "swampcook cook",
                text: "swampcook cook answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook cook2"]}]
            },
                locks_lines: ["swampcook cook"],
            }),
            "swampcook cook2": new Textline({
                name: "swampcook cook2",
                text: "swampcook cook2 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook zalgo"]}]
            },
                locks_lines: ["swampcook2 cook"],
            }),
            "swampcook trader": new Textline({
                name: "swampcook trader",
                text: "swampcook trader answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook trader1"]},
                    {dialogue: "swampland cook", lines: ["swampcook traderend"]}
                ]
            },
                locks_lines: ["swampcook trader"],
            }),
            "swampcook trader1": new Textline({
                name: "swampcook trader1",
                text: "swampcook trader1 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook trader2"]}]
            },
                locks_lines: ["swampcook trader1"],
            }),
            "swampcook trader2": new Textline({
                name: "swampcook trader2",
                text: "swampcook trader2 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook trader3"]}]
            },
                locks_lines: ["swampcook trader2"],
            }),
            "swampcook trader3": new Textline({
                name: "swampcook trader3",
                text: "swampcook trader3 answ",
                is_unlocked: false,
                locks_lines: ["swampcook trader3"],
            }),
            "swampcook traderend": new Textline({
                name: "swampcook traderend",
                text: "swampcook traderend answ",
                is_unlocked: false,
                locks_lines: ["swampcook trader1", "swampcook trader2", "swampcook trader3", "swampcook traderend"],
            }),
            "swampcook fangs": new Textline({
                name: "swampcook fangs",
                text: "swampcook fangs answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook tailor"]},
                    {dialogue: "swampland cook", lines: ["swampcook tanner"]}
                ]
            },
                locks_lines: ["swampcook fangs"],
            }),
            "swampcook tailor": new Textline({
                name: "swampcook tailor",
                text: "swampcook tailor answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook tailor1"]},
                    {dialogue: "swampland cook", lines: ["swampcook tailorend"]}
                ]
            },
                locks_lines: ["swampcook tailor"],
            }),
            "swampcook tailor1": new Textline({
                name: "swampcook tailor1",
                text: "swampcook tailor1 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook tailor2"]}]
            },
                locks_lines: ["swampcook tailor1"],
            }),
            "swampcook tailor2": new Textline({
                name: "swampcook tailor2",
                text: "swampcook tailor2 answ",
                is_unlocked: false,
                locks_lines: ["swampcook tailor2"],
            }),
            "swampcook tailorend": new Textline({
                name: "swampcook tailorend",
                text: "swampcook tailorend answ",
                is_unlocked: false,
                locks_lines: ["swampcook tailor1", "swampcook tailor2", "swampcook tailorend"],
            }),
            "swampcook tanner": new Textline({
                name: "swampcook tanner",
                text: "swampcook tanner answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook tanner1"]},
                    {dialogue: "swampland cook", lines: ["swampcook tannerend"]}
            ]
            },
                locks_lines: ["swampcook tanner"],
            }),
            "swampcook tanner1": new Textline({
                name: "swampcook tanner1",
                text: "swampcook tanner1 answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook tanner2"]}]
            },
                locks_lines: ["swampcook tanner1"],
            }),
            "swampcook tanner2": new Textline({
                name: "swampcook tanner2",
                text: "swampcook tanner2 answ",
                is_unlocked: false,
                locks_lines: ["swampcook tanner2"],
            }),
            "swampcook tannerend": new Textline({
                name: "swampcook tannerend",
                text: "swampcook tannerend answ",
                is_unlocked: false,
                locks_lines: ["swampcook tannerend1", "swampcook tannerend2", "swampcook tannerend"],
            }),
            "swampcook peopleend": new Textline({
                name: "swampcook peopleend",
                text: "swampcook peopleend answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook whycrab"]},
                    {dialogue: "swampland cook", lines: ["swampcook tumana"]}
            ], 
                    dialogues: ["swampland tailor"],
            },
                locks_lines: ["swampcook history", "swampcook history1", "swampcook history2", "swampcook history3", "swampcook historyend", "swampcook surround",  "swampcook surround1", "swampcook surround2", "swampcook surround3", "swampcook surround4", "swampcook surroundend", "swampcook chief", "swampcook chief1", "swampcook chief2", "swampcook chief3", "swampcook chiefend", "swampcook people", "swampcook cook", "swampcook cook2", "swampcook trader", "swampcook trader1", "swampcook trader2", "swampcook trader3", "swampcook traderend", "swampcook tailor",  "swampcook tailor1", "swampcook tailor2", "swampcook tailorend", "swampcook tanner", "swampcook tannerend1", "swampcook tannerend2", "swampcook tannerend", "swampcook peopleend"], //should close all previous dialogue trees
            }),
            "swampcook whycrab": new Textline({
                name: "swampcook whycrab",
                text: "swampcook whycrab answ",
                is_unlocked: false,
                rewards: {textlines: [
                    {dialogue: "swampland cook", lines: ["swampcook whycrabpress"]},
                    {dialogue: "swampland cook", lines: ["swampcook whycrabdrop"]}
                ]
            },
                locks_lines: ["swampcook whycrab"],
            }),
            "swampcook whycrabpress": new Textline({
                name: "swampcook whycrabpress",
                text: "swampcook whycrabpress answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook liked"]}]
            },
                locks_lines: ["swampcook whycrabpress", "swampcook whycrabdrop"],
            }),
            "swampcook whycrabdrop": new Textline({
                name: "swampcook whycrabdrop",
                text: "swampcook whycrabdrop answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook liked"]}]
            },
                locks_lines: ["swampcook whycrabpress", "swampcook whycrabdrop"],
            }),
            "swampcook nolore": new Textline({
                name: "swampcook nolore",
                text: "swampcook nolore answ",
                is_unlocked: false,
                rewards: {
                    textlines:[
                    {dialogue: "swampland cook", lines: ["swampcook liked"]},
                    {dialogue: "swampland cook", lines: ["swampcook noloreteach"]},
                    {dialogue: "swampland cook", lines: ["swampcook tumana"]}
                ],
                    dialogues: ["swampland tailor"],
            },
                locks_lines: ["swampcook yeslore", "swampcook nolore"]
            }),
            "swampcook liked": new Textline({
                name: "swampcook liked",
                text: "swampcook liked answ",
                is_unlocked: false,
                rewards: {textlines: [{dialogue: "swampland cook", lines: ["swampcook menaka"]}]
            },
            }),
            "swampcook noloreteach": new Textline({
                name: "swampcook noloreteach",
                text: "swampcook noloreteach answ",
                is_unlocked: false,
                rewards: {
                    recipes: [
                        {category: "cooking", subcategory: "items", recipe_id: "Alligator jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Turtle jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Snake jerky"},
                        {category: "cooking", subcategory: "items", recipe_id: "Swampland skewer"},
                    ],
                },  
                locks_lines: ["swampcook noloreteach"],
            }),
            "swampcook obaru": new Textline({
                name: "swampcook obaru",
                text: "swampcook obaru answ",
                is_unlocked: false,
                locks_lines: ["swampcook obaru"],
            }),
            "swampcook kazoku": new Textline({
                name: "swampcook kazoku",
                text: "swampcook kazoku answ",
                is_unlocked: false,
                locks_lines: ["swampcook kazoku"],
            }),
            "swampcook sosso": new Textline({
                name: "swampcook sosso",
                text: "swampcook sosso answ",
                is_unlocked: false,
                locks_lines: ["swampcook sosso"],
            }),
            "swampcook zalgo": new Textline({
                name: "swampcook zalgo",
                text: "swampcook zalgo answ",
                is_unlocked: false,
                locks_lines: ["swampcook zalgo"],
            }),
            "swampcook menaka": new Textline({
                name: "swampcook menaka",
                text: "swampcook menaka answ",
                is_unlocked: false,
            }),
            "swampcook tumana": new Textline({
                name: "swampcook tumana",
                text: "swampcook tumana answ",
                is_unlocked: false,
                locks_lines: ["swampcook tumana"],
            }),
        },
        actions: {
            "swampcook deliver": new DialogueAction({
                action_id: "swampcook deliver",
                starting_text: "swampcook deliver",
                description: "",
                action_text: "",
                success_text: "swampcook deliver answ",
                repeatable: false,
                failure_texts: {
                    unable_to_begin: ["swampcook deliver not"],
                },
                required: {
                    items_by_id: {"Crab meat": {count: 60, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 3}], 
                    textlines: [
                        {dialogue: "swampland cook", lines: ["swampcook know"]},
                        {dialogue: "swampland cook", lines: ["swampcook kazoku"]}
                ],
                },
                locks_lines: ["swampcook deliver", "swampcook obaru"],
            }),
        getDescription: ()=>{
            if(dialogues["swampland cook"].actions["swampcook deliver"].is_finished) {
                return "swampchief description 3";
            } else if (dialogues["swampland cook"].textlines["swampcook help"].is_finished) {
                return "swampcook description 2";
            } else {
                return "swampcook description 1";
            }}
        }
});
    dialogues["swampland tailor"] = new Dialogue({
        //tbd, speaks in verbose diatribes
        name: "swampland tailor",
        is_unlocked: false,
        textlines: {
            "swamptailor interrupt": new Textline({     //breaks the loop, moves forward
                name: "swamptailor interrupt",
                text: "swamptailor interrupt answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor cookword"]}],
                },
                locks_lines: ["swamptailor interrupt", "swamptailor listen1", "swamptailor listen2", "swamptailor listen3", "swamptailor listen4", "swamptailor listen5", "swamptailor listen6", "swamptailor listen7", "swamptailor listen8"],
            }),
            "swamptailor listen1": new Textline({       //loop beginning
                name: "swamptailor listen1",
                text: "swamptailor listen1 answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen2"]}],
                },
                locks_lines: ["swamptailor listen1"],
            }),
            "swamptailor listen2": new Textline({
                name: "swamptailor listen2",
                text: "swamptailor listen2 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen3"]}],
                },
                locks_lines: ["swamptailor listen2"],
            }),
            "swamptailor listen3": new Textline({
                name: "swamptailor listen3",
                text: "swamptailor listen3 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen4"]}],
                },
                locks_lines: ["swamptailor listen3"],
            }),
            "swamptailor listen4": new Textline({
                name: "swamptailor listen4",
                text: "swamptailor listen4 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen5"]}],
                },
                locks_lines: ["swamptailor listen4"],
            }),
            "swamptailor listen5": new Textline({
                name: "swamptailor listen5",
                text: "swamptailor listen5 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen6"]}],
                },
                locks_lines: ["swamptailor listen5"],
            }),
            "swamptailor listen6": new Textline({
                name: "swamptailor listen6",
                text: "swamptailor listen6 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen7"]}],
                },
                locks_lines: ["swamptailor listen6"],
            }),
            "swamptailor listen7": new Textline({
                name: "swamptailor listen7",
                text: "swamptailor listen7 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen8"]}],
                },
                locks_lines: ["swamptailor listen7"],
            }),
            "swamptailor listen8": new Textline({       //loop point
                name: "swamptailor listen8",
                text: "swamptailor listen8 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor listen1"]}],
                },
                locks_lines: ["swamptailor listen8"],
            }),
            "swamptailor cookword": new Textline({
                name: "swamptailor cookword",
                text: "swamptailor cookword answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor help"]}],
                },
                locks_lines: ["swamptailor cookword"],
            }),
            "swamptailor help": new Textline({
                name: "swamptailor help",
                text: "swamptailor help answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor flax"]}],
                },
                locks_lines: ["swamptailor help"],
            }),
            "swamptailor flax": new Textline({
                name: "swamptailor flax",
                text: "swamptailor flax answ",
                is_unlocked: false,
                rewards: {
                    actions: [{dialogue: "swampland tailor", action: "swamptailor deliver"}],
                    activities: [{location: "Riverbank", activity: "herbalism"}],
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 4}],
                },
                locks_lines: ["swamptailor flax"],
            }),
            "swamptailor liked": new Textline({
                name: "swamptailor liked",
                text: "swamptailor liked answ",
                is_unlocked: false,
            }),
        },
        actions: {
            "swamptailor deliver": new DialogueAction({
                action_id: "swamptailor deliver",
                starting_text: "swamptailor deliver",
                description: "",
                action_text: "",
                success_text: "swamptailor deliver answ",
                repeatable: false,
                failure_texts: {
                    unable_to_begin: ["swamptailor deliver not"],
                },
                required: {
                    items_by_id: {"Flax": {count: 200, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 5}], 
                    textlines: [{dialogue: "swampland tailor", lines: ["swamptailor liked"]}],
                    recipes: [{category: "Crafting", subcategory: "items", recipe_id: "Linen cloth"}],
                    dialogues: ["swampland tanner"],
                },
                locks_lines: ["swamptailor deliver"],
            }),
        getDescription: ()=>{
            if(dialogues["swampland tailor"].actions["swamptailor deliver"].is_finished) {
                return "swampchief description 3";
            } else if (dialogues["swampland tailor"].textlines["swamptailor interrupt"].is_finished) {
                return "swamptailor description 2";
            } else {
                return "swamptailor description 1";
            }}
        }
});
    dialogues["swampland tanner"] = new Dialogue({
        //tbd, speaks in short sentences
        name: "swampland tanner",
        is_unlocked: false,
        textlines: {
            "swamptanner unknown": new Textline({
                name: "swamptanner unknown",
                text: "swamptanner unknown answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland tanner", lines: ["swamptanner help"]}],
                },
                locks_lines: ["swamptanner unknown"],
            }),
            "swamptanner help": new Textline({
                name: "swamptanner help",
                text: "swamptanner help answ",
                is_unlocked: true,
                rewards: {
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 6}], 
                    actions: [{dialogue: "swampland tanner", action: "swamptanner deliver 1"}],
                },
                locks_lines: ["swamptanner help"],
            }),
            "swamptanner known": new Textline({
                name: "swamptanner known",
                text: "swamptanner known answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland tanner", action: ["swamptanner deliver 2"]}],
                },
                locks_lines: ["swamptailor known"],
            }),
            "swamptanner liked": new Textline({
                name: "swamptanner liked",
                text: "swamptanner liked answ",
                is_unlocked: false,
            }),
        },
        actions: {
            "swamptanner deliver 1": new DialogueAction({
                action_id: "swamptanner deliver 1",
                starting_text: "swamptanner deliver 1",
                description: "",
                action_text: "",
                success_text: "swamptanner deliver 1 answ",
                repeatable: false,
                failure_texts: {
                    unable_to_begin: ["swamptanner deliver 1 not"],
                },
                required: {
                    items_by_id: {"Alligator skin": {count: 60, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 7}], 
                    actions: [{dialogue: "swampland tanner", lines: ["swamptanner known"]}],
                },
                locks_lines: ["swamptanner deliver 1"],
            }),
            "swamptanner deliver 2": new DialogueAction({
                action_id: "swamptanner deliver 2",
                starting_text: "swamptanner deliver 2",
                description: "",
                action_text: "",
                success_text: "swamptanner deliver 2 answ",
                repeatable: false,
                failure_texts: {
                    unable_to_begin: ["swamptanner deliver 2 not"],
                },
                required: {
                    items_by_id: {"Giant snake skin": {count: 60, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
                rewards: {
                    //quest_progress: [{quest_id: "In Times of Need", task_index: 8}], //need to find some way to tie back to the chief since I can't make the quest work. locking the turn-in dialogue to rep could work, but I don't know how to implement questlines to give rep either, and rep rewards don't work in dialogue yet. maybe just disabling him after accepting the quest and enabling a new chief after this step?
                    textlines: [{dialogue: "swampland tanner", lines: ["swamptanner liked"]}],
                    recipes: [
                        {category: "Butchering", subcategory: "items", recipe_id: "Piece of alligator leather"},
                        {category: "Butchering", subcategory: "items", recipe_id: "Piece of snakeskin leather"},
                        {category: "Butchering", subcategory: "items", recipe_id: "Turtle shellplate"},
                    ],
                },
                locks_lines: ["swamptanner deliver 2"],
            }),
        },
        getDescription: ()=>{ 
            if(dialogues["swampland tanner"].actions["swamptanner deliver 2"].is_finished) {
                return "swampchief description 3";
            } else if (dialogues["swampland tanner"].actions["swamptanner deliver 1"].is_finished) {
                return "swamptanner description 2";
            } else {
                return "swamptanner description 1";
            }}
        });

	dialogues["swampland scout"] = new Dialogue({
        //tbd, speaks in rambling run-on sentences with long pauses
        name: "swampland scout",
        textlines: {
            "swampscout meet": new Textline({
                name: "swampscout meet",
                text: "swampscout meet answ",
                is_unlocked: true,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore1"]}],
                },
                locks_lines: ["swampscout meet"],
            }),
            "swampscout lore1": new Textline({
                name: "swampscout lore1",
                text: "swampscout lore1 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore2"]}],
                },
                locks_lines: ["swampscout lore1"],
            }),
            "swampscout lore2": new Textline({
                name: "swampscout lore2",
                text: "swampscout lore2 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore3"]}],
                },
                locks_lines: ["swampscout lore2"],
            }),
            "swampscout lore3": new Textline({
                name: "swampscout lore3",
                text: "swampscout lore3 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore4"]}],
                },
                locks_lines: ["swampscout lore3"],
            }),
            "swampscout lore4": new Textline({
                name: "swampscout lore4",
                text: "swampscout lore4 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore5"]}],
                },
                locks_lines: ["swampscout lore4"],
            }),
            "swampscout lore5": new Textline({
                name: "swampscout lore5",
                text: "swampscout lore5 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore6"]}],
                },
                locks_lines: ["swampscout lore5"],
            }),
            "swampscout lore6": new Textline({
                name: "swampscout lore6",
                text: "swampscout lore6 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore7"]}],
                },
                locks_lines: ["swampscout lore6"],
            }),
            "swampscout lore7": new Textline({
                name: "swampscout lore7",
                text: "swampscout lore7 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout lore8"]}],
                },
                locks_lines: ["swampscout lore7"],
            }),
            "swampscout lore8": new Textline({
                name: "swampscout lore8",
                text: "swampscout lore8 answ",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout generic"]}],
                    textlines: [{dialogue: "swampland scout", lines: ["swampscout foraging"]}],
                },
                locks_lines: ["swampscout lore8"],
            }),
            "swampscout generic": new Textline({
                name: "swampscout generic",
                text: "swampscout generic answ",
                is_unlocked: false,
            }),
            "swampscout foraging": new Textline({
                name: "swampscout foraging",
                text: "swampscout foraging answ",
                is_unlocked: false,
                rewards: {
                    actions: [{location: "Longhouse", action: "learn forage"}],
                },
                locks_lines: ["swampscout foraging"],
            }),
        },
        actions: {
            "swampscout help": new DialogueAction({
                action_id: "swampscout help",
                starting_text: "swampscout help",
                description: "",
                action_text: "",
                success_text: "swampscout help answ",
                repeatable: true,
                failure_texts: {
                    unable_to_begin: ["swampscout help not"],
                },
                required: {
                    items_by_id: {"Healing potion": {count: 1, remove_on_success: true}},
                },
                attempt_duration: 0,
                success_chances: [1],
            }),
        },
        getDescription: ()=>{
            if(dialogues["swampland scout"].textlines["swampscout help"].is_finished) {
                return "swampscout description 4";
            } else if (dialogues["swampland scout"].textlines["swampscout foraging"].is_finished) {
                return "swampscout description 3";
            } else if (dialogues["swampland scout"].textlines["swampscout meet"].is_finished) {
                return "swampscout description 2";
            } else {
                return "swampscout description 1";
            }}
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