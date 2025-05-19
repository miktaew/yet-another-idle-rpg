"use strict";

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
        this.description = description;
        this.getDescription = getDescription;

        this.location_name = location_name; //this is purely informative and wrong value shouldn't cause any actual issues

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
                 rewards = {textlines: [],
                            locations: [],
                            dialogues: [],
                            traders: [],
                            stances: [],
                            flags: [],
                            items: [],
                            locks: {textlines: {}}, //for lines to be locked in diferent dialogues and possibly for other stuff
                            },
                locks_lines = [], //for lines to be locked in same dialogue
                otherUnlocks,
                required_flags,
            }) 
    {
        this.name = name; // displayed option to click, don't make it too long
        this.text = text; // what's shown after clicking
        this.getText = getText || function(){return this.text;};
        this.otherUnlocks = otherUnlocks || function(){return;};
        this.is_unlocked = is_unlocked;
        this.is_finished = is_finished;
        this.rewards = rewards || {};
        
        this.rewards.textlines = rewards.textlines || [];
        this.rewards.locations = rewards.locations || [];
        this.rewards.dialogues = rewards.dialogues || [];
        this.rewards.traders = rewards.traders || [];
        this.rewards.stances = rewards.stances || [];
        this.rewards.flags = rewards.flags || [];
        this.rewards.items = rewards.items || [];
        
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

(function(){
    dialogues["village elder"] = new Dialogue({
        name: "village elder",
        textlines: {
            "hello": new Textline({
                name: "Hello?",
                text: "Hello. Glad to see you got better",
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["what happened", "where am i", "dont remember", "about"]}],
                },
                locks_lines: ["hello"],
            }),
            "what happened": new Textline({
                name: "My head hurts.. What happened?",
                text: `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                },
            }),
            "where am i": new Textline({
                name: "Where am I?",
                text: `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                },
            }),
            "dont remember": new Textline({
                name: "I don't remember how I got here, what happened?",
                text: `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
                is_unlocked: false,
                locks_lines: ["what happened", "where am i", "dont remember"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 1"]}],
                },
            }),
            "about": new Textline({
                name: "Who are you?",
                text: "I'm the unofficial leader of this village. If you have any questions, come to me",
                is_unlocked: false,
                locks_lines: ["about"]
            }),
            "ask to leave 1": new Textline({
                name: "Great... Thank you for help, but I think I should go there then. Maybe it will help me remember more.",
                text: "Nearby lands are dangerous and you are still too weak to leave. Do you plan on getting ambushed again?",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["need to"]}],
                },
                locks_lines: ["ask to leave 1"],
            }),
            "need to": new Textline({
                name: "But I want to leave",
                text: `You first need to recover, to get some rest and maybe also training, as you seem rather frail... Well, you know what? Killing a few wolf rats could be a good exercise. `
                        +`You could help us clear some field of them, how about that?`,
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["rats", "ask to leave 2", "equipment"]}],
                    locations: [{location: "Infested field"}],
                    activities: [{location:"Village", activity:"weightlifting"}, {location:"Village",activity:"running"}],
                },
                locks_lines: ["need to"],
            }),
            "equipment": new Textline({
                name: "Is there any way I could get a weapon and proper clothes?",
                text: `We don't have anything to spare, but you can talk with our trader. He should be somewhere nearby. `
                        +`If you need money, try selling him some rat remains. Fangs, tails or pelts, he will buy them all. I have no idea what he does with this stuff...`,
                is_unlocked: false,
                locks_lines: ["equipment"],
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["money"]}],
                    traders: [{trader: "village trader"}]
                }
            }),
            "money": new Textline({
                name: "Are there other ways to make money?",
                text: "You could help us with some fieldwork. I'm afraid it won't pay too well.",
                is_unlocked: false,
                locks_lines: ["money"],
                rewards: {
                    activities: [{location: "Village", activity: "fieldwork"}],
                }
            }),
            "ask to leave 2": new Textline({
                name: "Can I leave the village?",
                text: "We talked about this, you are still too weak",
                is_unlocked: false,
            }),
            "rats": new Textline({
                name: "Are wolf rats a big issue?",
                text: `Oh yes, quite a big one. Not literally, no, though they are much larger than normal rats... `
                        +`They are a nasty vermin that's really hard to get rid of. And with their numbers they can be seriously life-threatening. `
                        +`Only in a group though, single wolf rat is not much of a threat`,
                is_unlocked: false,
            }),
            "cleared field": new Textline({ //will be unlocked on clearing infested field combat_zone
                name: "I cleared the field, just as you asked me to",
                text: `You did? That's good. How about a stronger target? Nearby cave is just full of this vermin. `
                        +`Before that, maybe get some sleep? Some folks prepared that shack over there for you. It's clean, it's dry, and it will give you some privacy. `
                        +`Oh, and before I forget, our old craftsman wanted to talk to you.`,
                is_unlocked: false,
                rewards: {
                    locations: [{location: "Nearby cave"}, {location: "Infested field"}, {location: "Shack"}],
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 3"]}],
                    dialogues: ["old craftsman"],
                },
                locks_lines: ["ask to leave 2", "cleared field"],
            }),
            "ask to leave 3": new Textline({
                name: "Can I leave the village?",
                text: "You still need to get stronger.",
                rewards: {
                    locations: [{location: "Nearby cave"}, {location: "Infested field"}],
                    dialogues: ["old craftsman"],
                },
                is_unlocked: false,
            }),
            "cleared cave": new Textline({
                name: "I cleared the cave. Most of it, at least",
                text: `Then I can't call you "too weak" anymore, can I? You are free to leave whenever you want, but still, be careful. You might also want to ask the guard for some tips about the outside. He used to be an adventurer.`,
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "village elder", lines: ["ask to leave 4"]}],
                    locations: [{location: "Forest road"}, {location: "Infested field"}, {location: "Nearby cave"}],
                    dialogues: ["village guard"],
                },
                locks_lines: ["ask to leave 3", "rats", "cleared cave"],
            }),
            "ask to leave 4": new Textline({
                name: "Can I leave the village?",
                text: "You are strong enough, you can leave and come whenever you want.",
                is_unlocked: false,
                rewards: {
                    locations: [{location: "Forest road"}, {location: "Infested field"}, {location: "Nearby cave"}],
                    dialogues: ["village guard", "old craftsman"],
                },
            }),
            "new tunnel": new Textline({
                name: "I found an even deeper tunnel in the cave",
                text: "The what? I have a very bad feeling about this... You better avoid it until you get better equipment and some solid shield, I can bet it's gonna be a lot more dangerous.",
                is_unlocked: false,
                locks_lines: ["new tunnel"],
            }),
        },
        description: "You see an older man who, despite his white hair, still has a strong posture. He eyes you curiously."
    });

    dialogues["old craftsman"] = new Dialogue({
        name: "old craftsman",
        is_unlocked: false,
        textlines: {
            "hello": new Textline({
                name: "Hello, I heard you wanted to talk to me?",
                text: "Ahh, good to see you traveler. I just thought of a little something that could be of help for someone like you. See, young people this days "+
                "don't care about the good old art of crafting and prefer to buy everything from the store, but I have a feeling that you just might be different. "+
                "Would you like a quick lesson?",
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["learn", "leave"]}],
                },
                locks_lines: ["hello"],
            }),
            "learn": new Textline({
                name: "Sure, I'm in no hurry.",
                text: "Ahh, that's great. Well then... \n*[Old man spends some time explaining all the important basics of crafting and providing you with tips]*\n"+
                "Ahh, and before I forget, here, take these. They will be helpful for gathering necessary materials.",
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind1", "remind2", "remind3", "remind4"]}],
                    items: ["Old pickaxe" ,"Old axe", "Old sickle"],
                    flags: ["is_gathering_unlocked", "is_crafting_unlocked"],
                },
                locks_lines: ["learn","leave"],
                is_unlocked: false,
            }),
            "leave": new Textline({
                name: "I'm not interested.",
                text: "Ahh, I see. Maybe some other time then, when you change your mind, hmm?",
                is_unlocked: false,
            }),
            
            "remind1": new Textline({
                name: "Could you remind me how to create equipment for myself?",
                text: "Ahh, of course. Unless you are talking about something simple like basic clothing, then you will first need to create components that can then be assembled together. "+
                "For weapons, you generally need a part that you use to hit an enemy and a part that you hold in your hand. For armor, you will need some actual armor and then something softer to wear underneath, "+
                "which would mostly mean some clothes.",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind2": new Textline({
                name: "Could you remind me how to improve my creations?",
                text: "Ahh, that's simple, you just need more experience. This alone will be a great boon to your efforts. For equipment, you might also want to start with better components. "+
                "After all, even with the most perfect assembling you can't turn a bent blade into a legendary sword.",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind3": new Textline({
                name: "Could you remind me how to get crafting materials?",
                text: "Ahh, there's multiple ways of that. You can gain them from fallen foes, you can gather them around, or you can even buy them if you have some spare coin.",
                is_unlocked: false,
                rewards: {
                    textlines: [{dialogue: "old craftsman", lines: ["remind4"]}],
                },
            }),
            "remind4": new Textline({
                name: "How do I get better at crafting?",
                text: "Ahh, there aren't any secrets, you just need to keep practicing it. Just don't spend your entire life working on same louse materials, try to work on stronger stuff when you feel confident. There's a limit to how much you can learn by working with rat leather, isn't there?",
                is_unlocked: false,
            }),
        },
        description: "You see an old man who clearly experienced a lot in life. His wearing some handmade accessories. Despite his age, his fingers seem exceptionally nimble.",
    });

    dialogues["village guard"] = new Dialogue({
        name: "village guard",
        is_unlocked: false,
        textlines: {
            "hello": new Textline({
                name: "Hello?",
                text: "Hello. I see you are finally leaving, huh?",
                rewards: {
                    textlines: [{dialogue: "village guard", lines: ["tips", "job"]}],
                },
                locks_lines: ["hello"],
            }),
            "job": new Textline({
                name: "Do you maybe have any jobs for me?",
                is_unlocked: false,
                text: "You are somewhat combat capable now, so how about you help me and the boys on patrolling? Not much happens, but it pays better than working on fields",
                rewards: {
                    activities: [{location:"Village", activity:"patrolling"}],
                },
                locks_lines: ["job"],
            }),
            "tips": new Textline({
                name: "Can you give me any tips for the journey?",
                is_unlocked: false,
                text: `First and foremost, don't rush. It's fine to spend some more time here, to better prepare yourself. `
                +`There's a lot of dangerous animals out there, much stronger than those damn rats, and in worst case you might even run into some bandits. `
                +`If you see something that is too dangerous to fight, try to run away.`,
                rewards: {
                    textlines: [{dialogue: "village guard", lines: ["teach"]}],
                },
            }),
            "teach": new Textline({
                name: "Could you maybe teach me something that would be of use?",
                is_unlocked: false,
                text: `Lemme take a look... Yes, it looks like you know some basics. Do you know any proper techniques? No? I thought so. I could teach you the most standard three. `
                +`They might be more tiring than fighting the "normal" way, but if used in a proper situation, they will be a lot more effective. Two can be easily presented through `
                + `some sparring, so let's start with it. The third I'll just have to explain. How about that?`,
                rewards: {
                    locations: [{location: "Sparring with the village guard (quick)"}, {location: "Sparring with the village guard (heavy)"}],
                },
                locks_lines: ["teach"],
            }),
            "quick": new Textline({
                name: "So about the quick stance...",
                is_unlocked: false,
                text: `It's usually called "quick steps". As you have seen, it's about being quick on your feet. `
                +`While power of your attacks will suffer, it's very fast, making it perfect against more fragile enemies`,
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
                name: "So about the heavy stance...",
                is_unlocked: false,
                text: `It's usually called "crushing force". As you have seen, it's about putting all your strength in attacks. ` 
                +`It will make your attacks noticeably slower, but it's a perfect solution if you face an enemy that's too tough for normal attacks`,
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
                name: "What's the third technique?",
                is_unlocked: false,
                text: `It's usually called "broad arc". Instead of focusing on a single target, you make a wide swing to hit as many as possible. ` 
                +`It might work great against groups of weaker enemies, but it will also significantly reduce the power of your attacks and will be even more tiring than the other two stances.`,
                locks_lines: ["wide"],
                rewards: {
                    stances: ["wide"]
                }
            }),
        },
        description: "You see a man in light armor, with a spear in his hand and two daggers on his belt. "
    });

    dialogues["gate guard"] = new Dialogue({
        name: "gate guard",
        textlines: {
            "enter": new Textline({
                name: "Hello, can I get in?",
                text: "The town is currently closed to everyone who isn't a citizen or a guild member. No exceptions.",
            }), 
        },
        description: "You see a man in steel chainmail, with a spear in his hand and a sword on his belt."
    });
    dialogues["suspicious man"] = new Dialogue({
        name: "suspicious man",
        textlines: {
            "hello": new Textline({ 
                name: "Hello? Why are you looking at me like that?",
                text: "Y-you! You should be dead! *the man pulls out a dagger*",
                rewards: {
                    locations: [{location: "Fight off the assailant"}],
                },
                locks_lines: ["hello"],
            }), 
            "defeated": new Textline({ 
                name: "What was that about?",
                is_unlocked: false,
                text: "I... We... It was my group that robbed you. I thought you came back from your grave for revenge... Please, I don't know anything. "
                +"If you want answers, ask my ex-boss. He's somewhere in the town.",
                locks_lines: ["defeated"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["behave", "situation"]}],
                },
            }), 
            "behave": new Textline({ 
                name: "Are you behaving yourself?",
                is_unlocked: false,
                text: "Y-yes, boss! Please don't beat me again!",
                locks_lines: ["defeated"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["situation", "boss"]}],
                },
            }), 
            "boss": new Textline({ 
                name: "Stop calling me 'boss'",
                is_unlocked: false,
                text: "Y-yes, boss! I'm sorry, boss!",
                locks_lines: ["boss"],
            }), 
            "situation": new Textline({
                name: "By the way, how are things in this slum?",
                is_unlocked: false,
                text: "A-as you can see and hear boss, it's pretty b-bad, but it can't be helped without taking out the g-gang...",
                locks_lines: ["situation"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["gang", "boss"]}],
                },
            }),
            "gang": new Textline({
                name: "What gang?",
                is_unlocked: false,
                text: "It's j-just a gang, they don't have any name, boss. Their hideout is over t-there, you should stay away from them.",
                locks_lines: ["gang", "behave"],
                rewards: {
                    textlines: [{dialogue: "suspicious man", lines: ["gang", "behave 2"]}],
                    locations: [
                        {location: "Gang hideout"},
                    ],
                },
            }),
            "defeated gang": new Textline({
                name: "That gang you mentioned? I dealt with them.",
                is_unlocked: false,
                text: "I know boss, we all heard the commotion! You're the best! I think the local trader already pulled out some gear he was hiding from them, you should check it out!",
                locks_lines: ["defeated gang"],
            }),
            "behave 2": new Textline({ 
                name: "Are you behaving yourself?",
                is_unlocked: false,
                text: "Y-yes, I didn't do anything bad since the last time, boss!",
            }),
            "behave 3": new Textline({ 
                name: "Are you behaving yourself?",
                is_unlocked: false,
                text: "Of course boss!",
            }),
        },
        description: "You see a man in shabby clothes and with messy hair, who keeps looking around. He appears to have multiple nervous ticks."
    });
    dialogues["farm supervisor"] = new Dialogue({
        name: "farm supervisor",
        textlines: {
            "hello": new Textline({ 
                name: "Hello",
                text: "Hello stranger",
                rewards: {
                    textlines: [{dialogue: "farm supervisor", lines: ["things", "work", "animals", "fight", "fight0"]}],
                },
                locks_lines: ["hello"],
            }),
            "work": new Textline({
                name: "Do you have any work with decent pay?",
                is_unlocked: false,
                text: "We sure could use more hands. Feel free to help my boys on the fields whenever you have time!",
                rewards: {
                    activities: [{location: "Town farms", activity: "fieldwork"}],
                },
                locks_lines: ["work"],
            }),
            "animals": new Textline({
                name: "Do you sell anything?",
                is_unlocked: false,
                text: "Sorry, I'm not allowed to. I could however let you take some stuff in exchange for physical work, and it just so happens our sheep need shearing.",
                required_flags: {yes: ["is_gathering_unlocked"]},
                rewards: {
                    activities: [{location: "Town farms", activity: "animal care"}],
                },
                locks_lines: ["animals"],
            }),
            "fight0": new Textline({
                name: "Do you have any task that requires some good old violence?",
                is_unlocked: false,
                text: "I kinda do, but you don't seem strong enough for that. I'm sorry.",
                required_flags: {no: ["is_deep_forest_beaten"]},
            }),
            "fight": new Textline({
                name: "Do you have any task that requires some good old violence?",
                is_unlocked: false,
                text: "Actually yes. There's that annoying group of boars that keep destroying our fields. "
                + "They don't do enough damage to cause any serious problems, but I would certainly be calmer if someone took care of them. "
                + "Go to the forest and search for a clearing in north, that's where they usually roam when they aren't busy eating our crops."
                + "I can of course pay you for that, but keep in mind it won't be that much. 4 silver coins is most I can offer, I'm running on a strict budget here.",
                required_flags: {yes: ["is_deep_forest_beaten"]},
                rewards: {
                    actions: [{location: "Forest road", action: "search for boars"}],
                    //locations: [{location: "Forest clearing"}],
                },
                locks_lines: ["fight"],
            }),
            "things": new Textline({
                is_unlocked: false,
                name: "How are things around here?",
                text: "Nothing to complain about. Trouble is rare, pay is good, and the soil is as fertile as my wife!",
                rewards: {
                    textlines: [{dialogue: "farm supervisor", lines: ["animals", "fight", "fight0"]}],
                }
            }), 
            "defeated boars": new Textline({
                is_unlocked: false,
                name: "I took care of those boars",
                text: "Really? That's great! Here, this is for you.",
                locks_lines: ["defeated boars"],
                rewards: {
                    money: 4000,
                }
            }), 
        },
        description: "You see a well dressed man with a notebook on his belt. Despite seeming more like a scribe, he's buff and tanned."
    });

    dialogues["cute little rat"] = new Dialogue({
        name: "cute little rat",
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
                text: "Me name be Ratzor Rathai, the Rat Prince Who Be Promised!",
                rewards: {
                    textlines: [{dialogue: "cute little rat", lines: ["walls"]}],
                },
                locks_lines: ["what"],
            }),
            "who": new Textline({ 
                name: "Promised by who?",
                text: "By my papa, the great Rat God, of course! The He who bring infite rat blessings uppon this dimension!",
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
                name: "And you don't mind that I slaughtered them?",
                text: "Why? It's the rule of the world that the strong kill the weak and papa believe it too! Besides, maybe you be join us one day? Embrace the truth of your inner rat and reject the human shell!",
                locks_lines: ["mind"],
            }),
            "walls": new Textline({ 
                name: "So some of those wall-like things could have once been human?",
                text: "Only in soul. They once be acolytes of papa, but not be worthy so be cast down to guard the path.",
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
        description: "You see a cute little rat. It appears completely harmless. It has a cute litle crown on its cute little head and is sitting on a cute little comfortable pillow."
    });
})();

export {dialogues};