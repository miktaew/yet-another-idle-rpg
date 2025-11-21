"use strict";


//For now, translations are only used for dialogues

const translationManager = {
    getText: (language, text_id) => {
        if(!translations[language]?.[text_id]) {
            //no text
            if(language.startsWith("mofu")) {
                //it's fluffy => use non-fluffy instead if present, otherwise use english
                if(translations[language.replace("mofu_","")]?.[text_id]) {
                    language = language.replace("mofu_","");
                } else {
                    language = "english";
                }
            } else {
                //it's non-english => use english instead
                language = "english";
            }
        }
        if(!translations[language][text_id]) {
            //still nothing, meaning there's no english either
            //should be covered via verifier instead
            return "text not found, id: " +text_id;
        }
        return translations[language][text_id];
    }
};


const translations = {
    english: {
        "elder description": "You see an older man with white hair, but with a still strong posture as if still ready to fight if need be. He eyes you with curiosity.",
        "elder hello": "Hello?",
        "elder hello answ": "Hello. Glad to see you got better",
        "elder head hurts": "My head hurts.. What happened?",
        "elder head hurts answ": `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
        "elder where": "Where am I?",
        "elder where answ": `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
        "elder remember": "I don't remember how I got here, what happened?",
        "elder remember answ": `Some of our people found you unconscious in the forest, wounded and with nothing but pants and an old sword, so they brought you to our village. `
                + `It would seem you were on your way to a nearby town when someone attacked you and hit you really hard in the head.`,
        "elder who": "Who are you?",
        "elder who answ": "I'm the unofficial leader of this village. If you have any questions, come to me",
        "elder leave 1": "Great... Thank you for help, but I think I should go there then. Maybe it will help me remember more.",
        "elder leave 1 answ": "Nearby lands are dangerous and you are still too weak to leave. Do you plan on getting ambushed again?",
        "elder need to": "But I want to leave",
        "elder need to answ": `You first need to recover, to get some rest and maybe also training, as you seem rather frail... Well, you know what? Killing a few wolf rats could be a good exercise. `
                        +`You could help us clear some field of them, how about that?`,
        "elder eq": "Is there any way I could get a weapon and proper clothes?",
        "elder eq answ": `We don't have anything to spare, but you can talk with our trader. He should be somewhere nearby. `
                        +`If you need money, try selling him some rat remains. Fangs, tails or pelts, he will buy them all. I have no idea what he does with this stuff...`,
        "elder leave 2": "Can I leave the village?",
        "elder leave 2 answ":  "We talked about this, you are still too weak",
        "elder money": "Are there other ways to make money?",
        "elder money answ": "You could help us with some fieldwork. I'm afraid it won't pay too well.",
        "elder rats": "Are wolf rats a big issue?",
        "elder rats answ": `Oh yes, quite a big one. Not literally, no, though they are much larger than normal rats... `
                        +`They are a nasty vermin that's really hard to get rid of. And with their numbers they can be seriously life-threatening. `
                        +`Only in a group though, single wolf rat is not much of a threat`,
        "elder cleared 1":  "I cleared the field, just as you asked me to",
        "elder cleared 1 answ": `You did? That's good. How about a stronger target? Nearby cave is just full of this vermin. `
                        +`Before that, maybe get some sleep? Some folks prepared that shack over there for you. It's clean, it's dry, and it will give you some privacy. `
                        +`Oh, and before I forget, our old craftsman wanted to talk to you.`,
        "elder leave 3": "Can I leave the village?",
        "elder leave 3 answ":  "You still need to get stronger.",
        "elder cave clear":  "I cleared the cave. Most of it, at least",
        "elder cave clear answ": `Then I can't call you "too weak" anymore, can I? You are free to leave whenever you want, but still, be careful. You might also want to ask the guard for some tips about the outside. He used to be an adventurer.`,
        "elder leave 4": "Can I leave the village?",
        "elder leave 4 answ": "You are strong enough, you can leave and come whenever you want.",
        "elder tunnel": "I found an even deeper tunnel in the cave",
        "elder tunnel answ": "The what? I have a very bad feeling about this... You better avoid it until you get better equipment and some solid shield, I can bet it's gonna be a lot more dangerous.",
        "elder training": "I think I went far enough with basic training, do you have any other suggestions?",
        "elder training answ 1": "You did? Well, let me think... You could try swimming in the river nearby if you haven't done that yet, just remember not to do it in cold weather. Or you could try some wall climbing, but be sure to start with low heights to be safe.",
        "elder training answ 2": "You did? Well, let me think... Swimming in the river nearby would be a good exercise, but it's mostly frozen now in winter. You could try some wall climbing though, but be sure to start with low heights to be safe.",
        //
        "craftsman description": "You see an old man who clearly experienced a lot in life. He's wearing some handmade accessories. Despite his age, his fingers seem exceptionally nimble.",
        "craftsman hello": "Hello, I heard you wanted to talk to me?",
        "craftsman hello answ": "Ahh, good to see you traveler. I just thought of a little something that could be of help for someone like you. See, young people this days "+
                "don't care about the good old art of crafting and prefer to buy everything from the store, but I have a feeling that you just might be different. "+
                "Would you like a quick lesson?",
        "craftsman learn": "Sure, I'm in no hurry.",
        "craftsman learn answ": "Ahh, that's great. Well then... \n*[Old man spends some time explaining all the important basics of crafting and providing you with tips]*\n"+
                "Ahh, and before I forget, here, take these. They will be helpful for gathering necessary materials.",
        "craftsman leave": "I'm not interested.",
        "craftsman leave answ": "Ahh, I see. Maybe some other time then, when you change your mind, hmm?",
        "craftsman remind 1": "Could you remind me how to create equipment for myself?",
        "craftsman remind 1 answ":  "Ahh, of course. Unless you are talking about something simple like basic clothing, then you will first need to create components that can then be assembled together. "+
                "For weapons, you generally need a part that you use to hit an enemy and a part that you hold in your hand. For armor, you will need some actual armor and then something softer to wear underneath, "+
                "which would mostly mean some clothes.",
        "craftsman remind 2": "Could you remind me how to improve my creations?",
        "craftsman remind 2 answ": "Ahh, that's simple, you just need more experience. This alone will be a great boon to your efforts. For equipment, you might also want to start with better components. "+
                "After all, even with the most perfect assembling you can't turn a bent blade into a legendary sword.",
        "craftsman remind 3": "Could you remind me how to get crafting materials?",
        "craftsman remind 3 answ": "Ahh, there's multiple ways of that. You can gain them from fallen foes, you can gather them around, or you can even buy them if you have some spare coin.",
        "craftsman remind 4": "How do I get better at crafting?",
        "craftsman remind 4 answ": "Ahh, there aren't any secrets, you just need to keep practicing it. Just don't spend your entire life working on same louse materials, try to work on stronger stuff when you feel confident. There's a limit to how much you can learn by working with rat leather, isn't there?",
        //

    },
    mofu_english: {
        "elder description": "You see an older man with curly white hair and dull, heavy horns. Despite his years, he stands with a strong posture, ready to ram any threat to the village. He eyes you with curiosity.",
        "craftsman description": "You see an old man with a medium length white tail, who clearly experienced a lot in life. His hair is composed of a black and a white part, with the former very dulled by age. He's wearing some handmade accessories. Despite his age and his massive hands, his fingers seem exceptionally nimble.",
        "craftsman learn answ": "Ahh, that's great. Well then... \n*[Old man spends some time explaining all the important basics of crafting and providing you with tips, his large fingers proving to be as nimble as they seemed]*\n"+
                "Ahh, and before I forget, here, take these. They will be helpful for gathering necessary materials.",
    }
}


export { translationManager };
