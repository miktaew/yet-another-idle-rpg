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
        "elder eq answ": `We don't have anything to spare, but you can check out our market. Just go over there *[points a direction]*, then turn right. It's nowhere near what you can find in a town, but people always have some gear, food, and other useful stuff to sell. `
                        +`If you need money, try selling some rat remains there. Fangs, tails or pelts, people will buy them all. I have no idea what they do with this stuff...`,
        "elder leave 2": "Can I leave the village?",
        "elder leave 2 answ":  "We talked about this, you are still too weak",
        "elder money": "Are there other ways to make money?",
        "elder money answ": "You could help us with some fieldwork. I'm afraid it won't pay too well.",
        "elder rats": "Are wolf rats a big issue?",
        "elder rats answ": `Oh yes, quite a big one. Not literally, no, though they are much larger than normal rats... `
                        +`They are a nasty vermin that's really hard to get rid of. And with their numbers they can be seriously life-threatening. `
                        +`Only in a group though, single wolf rat is not much of a threat`,
        "elder cleared 1":  "I cleared the field, just as you asked me to",
        "elder cleared 1 answ": `You did? That's good. How about a stronger target? Nearby cave is just full of this vermin. Try yourself against whatever occupies the frontal room, and then also the deeper parts. `
                        +`Before that, maybe get some sleep? Some folks prepared that shack over there for you. It's clean, it's dry, and it will give you some privacy. `
                        +`Oh, and before I forget, our old craftsman wanted to talk to you.`,
        "elder leave 3": "Can I leave the village?",
        "elder leave 3 answ":  "You still need to get stronger.",
        "elder room clear": "I dealt with some rats in the cave, but is there anything else to help with?",
        "elder room clear answ": "Ahh, good to hear you are making progress. Let me think... Could you check on the eastern mill? I'm a bit worried if the two kids running it can manage everything by themselves.",
        "elder cave clear":  "I cleared the cave. Most of it, at least",
        "elder cave clear answ": `Then I can't call you "too weak" anymore, can I? You are free to leave whenever you want, but still, be careful. You might also want to ask the guard for some tips about the outside. She used to be an adventurer.`,
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
        "guard description": "You see a woman in light armor, with a spear in her hand and two daggers on her belt. There's a scar across her face.",
        "guard hello": "Hello?",
        "guard hello answ": "Hello. I see you are finally leaving, huh?",
        "guard job": "Do you maybe have any jobs for me?",
        "guard job answ": "You are somewhat combat capable now, so how about you help me and the boys on patrolling? Not much happens, but it pays better than working on fields",
        "guard tips": "Can you give me any tips for the journey?",
        "guard tips answ": `First and foremost, don't rush. It's fine to spend some more time here, to better prepare yourself. `
                +`There's a lot of dangerous animals out there, much stronger than those damn rats, and in worst case you might even run into some bandits. `
                +`If you see something that is too dangerous to fight, try to run away. There's no shame in staying alive to fight on another day, when chances of survival become better, and it would be a pity if someone with your looks were to die~`,
        "guard teach": "Could you maybe teach me something that would be of use?",
        "guard teach answ":  `Lemme take a look... Yes, it looks like you know some basics. Do you know any proper techniques? No? I thought so. I could teach you the most standard three. `
                +`They might be more tiring than fighting the "normal" way, but if used in a proper situation, they will be a lot more effective. Two can be easily presented through `
                + `some sparring, so let's start with it. The third I'll just have to explain. How about that?`,
        "guard quick": "So about the quick stance...",
        "guard quick answ": `It's usually called "quick steps". As you have seen, it's about being quick on your feet. `
                        +`While power of your attacks will suffer, it's very fast, making it perfect against more fragile enemies`,
        "guard heavy":  "So about the heavy stance...",
        "guard heavy answ": `It's usually called "crushing force". As you have seen, it's about putting all your strength in attacks. ` 
                        +`It will make your attacks noticeably slower, but it's a perfect solution if you face an enemy that's too tough for normal attacks`,
        "guard wide": "What's the third technique?",
        "guard wide answ": `It's usually called "broad arc". Instead of focusing on a single target, you make a wide swing to hit as many as possible. ` 
                +`It might work great against groups of weaker enemies, but it will also significantly reduce the power of your attacks and will be even more tiring than the other two stances.`,
        "guard hi": "Hi again, how's it going?",
        "guard hi answ": "Hey there. I heard you've been helping around a lot, good job cutie~\n *[As she says that, she bends forward and pats your head a few times with a surprisingly gentle touch]*",
        "guard serious": "Can we try a more serious fight?",
        "guard serious answ": "Ohhh, someone wants to impress the cute guard lady? Sorry, but I'm way too strong for you~",
        //
        "millers description": "You see two teenagers with mischievous looks on their faces. It's only with great deal of effort that you manage to recognize them both as males. One of them has red hair, the other gray.",
        "millers hello": "Hello there",
        "millers hello answ": "[Red] Hi~! <br> [Gray]: Hello",
        "millers how": "Are you doing alright? Elder asked me to check on you.",
        "millers how answ": "[Gray] We are fine, mostly. <br> [Red] Except for rats in the storehouse, especially since we are about to have grain delivery. <br> [Gray] The big rats, like on the fields... <br> [Red] So if you could help us with them, it would be great!",
        "millers young": "Aren't you two a bit too young to have a job?",
        "millers young answ": "Nope, we are both adults, even if barely, but we will take that as a compliment~ <br> *[They both smirk as they say that, apparently happy with their looks]*",
        "millers sure": "Sure, I can deal with them.",
        "millers sure answ": "[Red] Ehehe, thank you~ <br> [Gray] We will get you some reward for it later. <br> [Red] A bit of money, and maybe a kiss or two~",
        "millers cleared": "I cleared out your storehouse",
        "millers cleared answ": "[Red] Nice job! <br>[Gray] Now where is that grain? <br> [Red] Oh right, it was supposed to be delivered by now. <br>[Gray] Could you search the village for a cart loaded with bags of grain that's 'supposed' to be heading our way?",
        "millers delivered": "Your delivery has arrived.",
        "millers delivered answ": "[Red] Thanks <br>[Gray] Thank you! <br>[Red] And here's your reward.",
        "millers kiss": "So about that kiss you promised...",
        "millers kiss answ": "[Red] Yes? Which one of us do you want it from?",
        "millers kiss mouse": "How about... your gray-haired friend?",
        "millers kiss mouse answ": "*[Gray-haired teen slowly approaches you from the side and gives you a gentle smooch on your cheek, then steps back with a slightly shy smile]*",
        "millers kiss cat": "How about... you?",
        "millers kiss cat answ": "*[Red-haired teen slowly approaches you from the side and gives a gentle smooch on your cheek, then steps back with a smirk]*",
        "millers kiss both": "How about... both of you?",
        "millers kiss both answ": "*[The two slowly approach you from both sides and you receive two simultanous gentle smooches, one of each of your cheek, after which they take a step back]*",
        "millers reject nice": "I appreciate the offer, but I'm not interested in that kind of thing",
        "millers reject nice answ": "[Red] Oh well, that's a pity~",
        "millers reject mean": "Ewww, it's a terrible idea.",
        "millers reject mean answ": "[Red] Whatever you say~",
        "millers kiss more": "Can I get one more kiss?",
        "millers kiss more answ": "[Red] Hmmm... should we? <br>[Gray] Maybe some other time. <br>[Red] You heard him~",
        "millers how2": "So, how's it going?",
        "millers how2 answ": "[Red] Kinda boring, but at least company is good. <br>[Gray] What he said.",
        //
        "g guard description": "You see a massive man in a steel chainmail, with a spear in his hand and a sword on his belt.",
        "g guard hello": "Hello, can I get in?",
        "g guard hello answ": "The town is currently closed to everyone who isn't a citizen or a merchant guild's member. No exceptions.",
        //
        "sus description 1": "You see a young man in shabby clothes and with messy hair, who keeps looking around. He appears to have some nervous ticks, or maybe he's just really stressed. He notices you and stares.",
        "sus description 2": "You see a young man in shabby clothes and with messy hair, who keeps calmly looking around. The moment he notices you, he appears to get calmer.",
        "sus hello": "Hello? Why are you looking at me like that?",
        "sus hello answ": "Y-you! You should be dead! *the man pulls out a dagger*",
        "sus defeated": "What was that about?",
        "sus defeated answ": "I... We... It was my group that robbed you. I thought you came back from your grave for revenge... Please, I don't know anything. "
                +"If you want answers, ask my ex-boss. He's somewhere in the town.",
        "sus behave": "Are you behaving yourself?",
        "sus behave answ": "Y-yes, boss! Please don't beat me again!",
        "sus boss": "Stop calling me 'boss'",
        "sus boss answ": "Yes, boss! Sorry, boss!",
        "sus situation": "By the way, how are things in this slum?",
        "sus situation answ": "A-as you can see and hear boss, it's pretty b-bad, but it can't be helped without taking out the g-gang...",
        "sus gang": "What gang?",
        "sus gang answ": "It's j-just a gang, they don't have any name, boss. Their hideout is over t-there, you should stay away from it. Almost every k-killer and thug around t-the slum is a part of their group...",
        "sus gang defeated": "That gang you mentioned? I dealt with them.",
        "sus gang defeated answ":  "I know boss, we all heard the commotion! You're the best! I think the local trader already pulled out some gear he was hiding from them, you should check it out! <br><strong>*Pauses for a moment*</strong> I wish I had shown you my defensive tricks before that, it might have made your job easier...",
        "sus behave 2": "Are you behaving yourself?",
        "sus behave 2 answ": "Y-yes, I didn't do anything bad since the last time, boss!",
        "sus behave 3": "Are you behaving yourself?",
        "sus behave 3 answ": "Of course boss!",
        "sus tricks": "You said something about defensive tricks? Show me",
        "sus tricks answ": "Sure, boss! So, it's really about focusing on your legs to either jump away faster or to better brace the shield, and... <strong>*He continues explaining for a while*</strong>",
        "sus headpat": "[Pat his head]",
        //line above: not reachable without mofu mofu, but needs to be provided here
        "sus headpat answ": "[He smiles like a little puppy]",
        //line above: theoretically reachable if someone disables mofu mofu while in dialogue?
        //
        "old description 1": "With some safety returned to the area, more folk are now out on the streets. One of them, an elderly lady, is looking at you.",
        "old description 2": "You see a gentle elderly lady with warm look in her eyes",
        "old hello": "[Let her approach you.]",
        "old hello answ": "Hello young warrior. I understand it is you who we have to thank for freeing us from those thugs. Few these days have the gumption, and even fewer the strength to take them on. Well done! Such heroism deserves a reward, and while none of us have much to offer as you can see, but the least I can do is make sure our hero doesn't go hungry. Would you care to join me for dinner?",
        "old dinner": "[Accept the offer.]",
        "old dinner answ": "[You join the woman in her shack for a humble, yet satisfying meal. While the main ingredients are simple, they are well flavoured and garnished with herbs.]",
        "old ingredients": "[Compliment the food and ask where she gets ingredients.]",
        "old ingredients answ": "Surprised? Live here long enough, and you learn how to get by without a lot of pricey things. No, I'm not talking about stealing - I may be poor, but I still have my pride! No, I'm talking about the plants that grow all around. Most people pass them by, without realizing how useful they can be. Ha! Maybe there IS another way I can reward you! I can teach you what to look for, if you're interested.",
        //
        "sup hello": "Hello",
        "sup hello answ": "Hello stranger",
        "sup work":  "Do you have any work with decent pay?",
        "sup work answ": "We sure could use more hands. Feel free to help my boys on the fields whenever you have time!",
        "sup anything": "Is there anything I can help you with?",
        "sup anything answ": "I don't think so, nothing aside from normal work... Actually there is one thing. We're in a dire need of 50 packs of bonemeal and lost our supplier on top of that, so I'm willing to pay you a triple price. Bad news is, you will have to bring all 50 in a single delivery.",
        "sup bonemeal": "More bonemeal, you say?",
        "sup bonemeal answ": "Absolutely! I know the lower price might not be the most appealing, but at least it's stable, unlike the market, and at times might be a lot better than what any trader would pay you for it.",
        "sup animals": "Do you sell anything?",
        "sup animals answ": "Sorry, I'm not allowed to. However if you were to help us produce something, I could let you take part of it. It just so happens our sheep need shearing, if you're interested in some free wool.",
        "sup fight0": "Do you have any task that requires some good old violence?",
        "sup fight0 answ": "I kinda do, but you don't seem strong enough for that. I'm sorry.",
        "sup fight": "Do you have any task that requires some good old violence?",
        "sup fight answ": "Actually yes. There's that annoying group of boars that keep destroying our fields. "
                + "They don't do enough damage to cause any serious problems, but I would certainly be calmer if someone took care of them. "
                + "Go to the forest and search for a clearing in north, that's where they usually roam when they aren't busy eating our crops. "
                + "I will of course pay you for that. 4 silver coins is most I can offer, I'm running on a strict budget here.",
        "sup things": "How are things around here?",
        "sup things answ": "Nothing to complain about. Trouble is rare, pay is good, and the soil is as fertile as my wife!",
        "sup defeated boars": "I took care of those boars",
        "sup defeated boars answ": "Really? That's great! Here, this is for you.",
        "sup troubled": "You look troubled",
        "sup troubled answ": "Troubled? I'm fuming, I'm going insane here! Those damn accursed ants, they keep destroying crops by eating their roots over and over again!"
                    + " If I could, I would drop everything, grab a sword and a shovel and go find their damn nests, and then slaughter every last one of them! Not just soldiers and workers, but queens and larvae too!"
                    + " Destroy their nests for me and you will have my gratitude, I will even pay you out of my own pocket!... Oh, and you can borrow a shovel from the farm if you don't have your own.",
        "sup eliminated": "The ants are gone, though there are some trails leading to the forest",
        "sup eliminated answ": "That's just... thank you, thank you so much! Here, take this, you earned it! As for the forest, I don't really care, as long as they don't come back.",
        "sup deliver": "[Deliver the bonemeal]",
        "sup deliver answ": "Thank you very much, here's your money! If you ever want to make more deliveries of this size, we will gladly take them, although it will have to be for the regular price",
        "sup deliver not": "I'm sorry, but that's not enough",
        "sup deliver 2": "[Deliver the bonemeal]",
        "sup deliver 2 answ": "Thank you very much, here's your money! We will gladly take more, whenever you have it!",
        "sup deliver 2 not": "I'm sorry, but that's not enough",
        "sup description": "You see a well dressed man with a notebook on his belt and a hat on his head. Despite seeming more like a scribe, he's buff and tanned."
    },
    mofu_english: {
        "elder description": "You see an older man with curly white hair and dull, heavy horns. Despite his years, he stands with a strong posture, ready to ram any threat to the village. He eyes you with curiosity.",
        //
        "craftsman description": "You see an old man with a medium length white tail, who clearly experienced a lot in life. His hair is composed of a black and a white part, with the former very dulled by age. He's wearing some handmade accessories. Despite his age and his massive hands, his fingers seem exceptionally nimble.",
        //
        "craftsman learn answ": "Ahh, that's great. Well then... \n*[Old man spends some time explaining all the important basics of crafting and providing you with tips, his large fingers proving to be as nimble as they seemed]*\n"+
                "Ahh, and before I forget, here, take these. They will be helpful for gathering necessary materials.",
        //
        "guard description": "You see a tall woman in light armor, with a spear in her hand and two daggers on her belt. Her sharp fuzzy ears rotate every now and then towards any new sound, while her fluffy tail remains motionless. There's a scar across her face. When she spots you, she looks at you as if you were a prey, but then adopts a more neutral expression",
        "guard hi answ": "Hey there. I heard you've been helping around a lot, good job cutie~\n *[As she says that, she bends forward and pats your head a few times with a surprisingly gentle touch, her tail slightly wagging]*",
        "guard serious answ": "Ohhh, someone wants to impress the cute fluffy wolf lady? Sorry, but I'm way too strong for you~",
        //
        //
        "millers description": "You see two teenagers with mischievous looks on their faces. One has cat ears and a fluffy tail, the other mouse ears and a tail with barely any hair on it. It's only with great deal of effort that you manage to recognize them both as males. The cat has red hair, the mouse gray.",
        "millers hello answ": "[Cat] Hi~! <br> [Mouse]: Hello",
        "millers how answ": "[Mouse] We are fine, mostly. <br> [Cat] Except for rats in the storehouse, especially since we are about to have grain delivery. <br> [Mouse] The big rats, like on the fields... <br> [Cat] I would prefer mice, at least those are cute. <br> [Mouse] Shut up. <br> [Cat] So if you could help us with them, it would be great!",
        "millers sure answ": "[Cat] Ehehe, thank you~ <br> [Mouse] We will get you some reward for it later. <br> [Cat] A bit of money, and maybe a kiss or two~",
        "millers cleared answ": "[Cat] Nice job! <br>[Mouse] Now where is that grain? <br> [Cat] Oh right, it was supposed to be delivered by now. <br>[Mouse] Could you search the village for a cart loaded with bags of grain that's 'supposed' to be heading our way?",
        "millers delivered answ": "[Cat] Thanks <br>[Mouse] Thank you! <br>[Cat] And here's your reward.",
        "millers kiss answ": "[Cat] Yes? Which one of us do you want it from?",
        "millers kiss mouse answ": "*[Mouse teen slowly approaches you from the side and gives you a gentle smooch on your cheek with his tail brushing against your legs, then steps back with a slightly shy smile]*",
        "millers kiss cat answ": "*[Cat teen slowly approaches you from the side and gives a gentle smooch on your cheek with his tail brushing against your legs, then steps back with a smirk]*",
        "millers kiss both answ": "*[The two slowly approach you from both sides and you receive two simultanous gentle smooches, one of each of your cheek  with their tails brushing against your legs, after which they take a step back]*",
        "millers reject nice answ": "[Cat] Oh well, that's a pity~",
        "millers reject mean answ": "[Cat] Whatever you say~",
        "millers kiss more answ": "[Cat] Hmmm... should we? <br>[Mouse] Maybe some other time. <br>[Mouse] You heard him~",
        "millers how2 answ": "[Cat] Kinda boring, but at least company is good. <br>[Mouse] What he said.",
        //
        "g guard description": "You see a massive, hairy man with round ears and a tiny tail. He's clad in a steel chainmail, with a spear in his hand and an axe on his belt.",
        //
        "sus description 1": "You see a young man in shabby clothes and with messy hair, who keeps looking around. He appears to have some nervous ticks, or maybe he's just really stressed. Both his doggy ears and his tail are lowered and not moving. He notices you and stares.",
        "sus description 2": "You see a young man in shabby clothes and with messy hair, who keeps calmly looking around, with ears straight up and occasionally turning towards new sounds. The moment he notices you, he appears to get calmer and his tail starts slowly wagging.",
        //
        "sus headpat answ": "[He smiles like a little puppy, his tail wagging a lot faster]",
        //
        "old description 1": "With some safety returned to the area, more folk are now out on the streets. One of them, an elderly tanuki lady, is looking at you.",
        "old description 2": "You see a gentle elderly tanuki lady with warm look in her eyes",
        //
        "sup description": "You see a well dressed man with a notebook on his belt and a hat on his head, awkwardly placed between a pair of antlers. Despite seeming more like a scribe, he's buff and tanned."
    }
}


export { translationManager, translations };
