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
	"elder crab rumors": "I had overheard some villagers talking about an enormous crab nest nearby.", //crab start
	"elder crab rumors answ": "That seems to have become the rumor of the week. Somebody found a fisherman unconscious in the forest a few weeks ago. He's recovering even now. "
        	+"His wounds weren't too severe, but they must have gotten infected, because he's been in a fever ever since we found him. In his delirium, he was murmuring something about enormous crab nests. We haven't seen anything nearby, but... "
        	+"This isn't the first I've heard of crab infestations along the river. Every few decades, their population undergoes a great boom, only to recede the following year.",
	"elder crab where": "The fisherman was found in the forest?",
	"elder crab where answ": "The river that you see flowing through our village spans a great deal of the forest, and some of the fishermen swear they have better catches out in the woods where it's quieter. "
        	+"As I understand it, the fisherman was found by a farmhand taking one of the horses out for a ride in the woods. The farmhand didn't mention seeing any rivers nearby, so we don't know if that's where he was injured.",
	"elder crab hunt": "I want to search for this enormous crab nest, they could be a danger to the village.",
	"elder crab hunt answ": "The guards can handle any crabs that get near the village. And beside, you... "
                +"\n*[The village elder trails off while looking you over, silently staring for a moment before speaking]*\n " //The elder is realizing that this isn't about protecting the village, it's about exploring the world and finding their place in it
	        +"It's clear you are much stronger than when you were first brought to recover under my care. "
        	+"I will not try to convince you otherwise, I can see the determination in your eyes. You have my blessing. But know this: there are dangers in the wilderness that no training can ready you for. "
                +"If your current weapon, armor, or method of attack isn't working, it's much better to run away, reassess, and recover your strength instead of unnecessarily risking your life. "
        	+"Please, be cautious. And consider checking with the village market to get some medicine and supplies. There's no telling how long your journey will take, or what challenges you will face on it. "
        	+"No matter how far you go, just remember that you always have a home in this village.",
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
        "millers young answ": "Nope, we are both adults, but we will take that as a compliment~ <br> *[They both smirk as they say that, apparently happy with their looks]*",
        "millers sure": "Sure, I can deal with them.",
        "millers sure answ": "[Red] Ehehe, thank you~ <br> [Gray] We will get you some reward for it later. <br> [Red] A bit of money, and maybe a kiss or two~",
        "millers cleared": "I cleared out your storehouse",
        "millers cleared answ": "[Red] Nice job! <br>[Gray] Now where is that grain? <br> [Red] Oh right, it was supposed to be delivered by now. <br>[Gray] Could you search the village for a cart loaded with bags of grain that's 'supposed' to be heading our way?",
        "millers delivered": "Your delivery has arrived.",
        "millers delivered answ": "[Red] Thanks <br>[Gray] Thank you! <br>[Red] And here's your reward.",
        "millers kiss": "",
        "millers kiss answ": "",
        "millers kiss mouse": "",
        "millers kiss mouse answ": "",
        "millers kiss cat": "",
        "millers kiss cat answ": "",
        "millers kiss both": "",
        "millers kiss both answ": "",
        "millers reject nice": "",
        "millers reject nice answ": "",
        "millers reject mean": "",
        "millers reject mean answ": "",
        "millers kiss more": "",
        "millers kiss more answ": "",
        "millers how2": "",
        "millers how2 answ": "",
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
        "sup description": "You see a well dressed man with a notebook on his belt and a hat on his head. Despite seeming more like a scribe, he's buff and tanned.",
        //
        "swampchief description 1": "Looking around the encampment, you see a large hut framed by banners and lit torches. You approach the hut, calling out in greeting, but getting no response. As you step closer, you see a large man in thick scaly armor wielding a great trident emerge. He points the trident at you as he takes a firm stance.",
        "swampchief description 2": "The chief stands outside his hut, watching you as you move about the encampment with an inscrutable gaze.", //description changes upon accepting In Times of Need
        "swampchief description 3": "The chief stands outside his hut. He nods at you as your eyes meet.", //description changes again upon finishing In Times of Need
	"swampchief meet": "Hel-",
        "swampchief meet answ": "Intruder! How bold of you to walk so brashly through our grounds! Bold and foolish! To so bluntly insult the honor of the chief of the Snake Fang Tribe! Raise your blade! There is no sport in killing an unarmed foe!",
        "swampchief explain": "Wait! I'm not your enemy! I was passing through the swamp and saw the fortifications!",
        "swampchief explain answ": "\n[*The chief holds for a moment, before relaxing his stance and raising his trident away]*\n "
			+"A fool in shoddy garb. You aren't even worth bloodying my spear for. Begone from my sight. We have nothing to offer you, no quarter to give, and no supply to barter. Leave us, and do not return.",
        "swampchief help": "Perhaps you don't have anything to offer, but maybe I can offer to help your people?",
        "swampchief help answ": "And for what would we need the help of a stranger from the beyond the bog? Feh! If you wish to pay fealty to our strength, we'll take your tribute. Now begone from my sight.",
        "swampchief mid help": "I'm going to ask around and see how I can-",
        "swampchief mid help answ": "I did not ask, stranger. Be gone from my sight before I change my mind.",
        "swampchief report": "I've been helping out around the tribe.",
        "swampchief report answ": "Yes. I've been watching you run about. I have heard nothing but high praises of your efforts, even from my more cantankerous charges.",
        "swampchief confirm": "Times are hard, and this land is dangerous. I've just been trying to give what help I can.",
        "swampchief confirm answ": "Ever the fool, you are. "
			+"\n*[The chief smiles at you]*\n "
			+"But fools seem to be in high supply right now, and rarely have I seen one as capable as you. I should know. I'm reminded every time I... " //"every time I see myself."
			+"\n*[The chief breaks his gaze, before taking a ring off and presenting it to you]*\n "
			+"You have given tribute to the Snake Fang Tribe, graciously and beyond all reason. I would be the greatest of fools to disrespect that. Please, accept this as token of my heartfelt gratitude, and with it, my friendship.",
        "swampchief accept": "You honor me with your gift.",
        "swampchief accept answ": "Perhaps if we had allies such as you... I would be humbled if you would become one of our den kin -- that is, consider yourself among my charges. "
			+"I will send word that our artisans are to share their workhuts with you, if you wish to avail yourself to them. "
			+"You are welcome to rest in our longhouse. I would only ask that you be mindful of the young woman resting within.",
	"swampchief generic": "How are things among the tribe?",
        "swampchief generic answ": "Challenging, honored friend, in these harsh and dangerous times. But maybe we can make it through if we all band together.",
	//
        "swampcook description 1": "As you get closer to the cook's workhut, you're met with a distinctive tune bellowed loudly and an acrid smell emanating from inside. Bracing your nose, you approach to find a short fellow nearly obscured by hanging meats, moving between a rack larger than he is housing thin cuts suspended between grated slats and a large cauldron build into a workbench covered in large slabs of rough leather in various stages of processing. You're surprised to find that he was the source of the singing. Noticing your approach, he stops his song and turns to address you with a smile on his face.", //before accepted task
        "swampcook description 2": "You approach the cooks's workhut, finding him standing outside next to a small smokehouse in between splitting logs. As before, you can both smell the leather the cook is processing and hear the song that he is singing long before you see him.", //before finishing delivery
        "swampcook description 3": "As you approach the workhut, you absentmindedly sing along to the cook's song. He notices your singing before turning to you and giving a big nod with a toothy grin before resuming his work.", //after finishing delivery
	"swampcook greeting1": "Hello. I'm trying to find ways to... pay tribute?",
        "swampcook greeting1 answ": "A-ha~! Tribute! Ha-ha~! Very funny, obaru! There is no need to pay tribute to a snake's fangs!", //"Obaru" - in this context means child; stranger; person with no relevance
        "swampcook greeting2": "Not tribute, then. I'm just looking for ways to help out around here.",
        "swampcook greeting2 answ": "Ahh, help? A-ha~! Snake's fangs are slow to sharpen! But if obaru wants to help, then I will be happy to judge! Now what would I ask of you...! Oh, a-ha~! Yes! Rock meat!",
        "swampcook help": "Rock meat...? Are you sure you need meat? It looks like you have plenty already.",
        "swampcook help answ": "Sosso! Obaru has eyes but no ears! I need different meat! You have seen those large walking rocks near the falling water, yes? Crack those rocks and bring me the meat from inside! A-ha~! If I am right, I will need no less than three score rock meat! Bring them to me! And I shall help you to sharpen the snake's fangs!", //"Sosso" - in this context means a foolish person
        "swampcook deliver": "I've got 60 of those, um, 'rock meats' you wanted.",
        "swampcook deliver answ": "A-ha~! Good job! If kazoku could do this, maybe kazoku can sharpen the snake's fangs! But first, you must know the snake! Only then can you sharpen it's fangs!", //"Kazoku" - in this context means community member, helpful person
	"swampcook deliver not": "A-ha~! Sosso obaru! I think you may want to check again!",
        "swampcook know": "Know the snake? Sharpen it's fangs? Are you saying that if I am to help out, I need to know more about who I'm helping?",
        "swampcook know answ": "Ha-ha~! There are two who could stand to be sharpened! But before kazoku can know of a part, we must talk of the whole! "
			+"Come, grab a piece of meat! We shall work while we talk! You may even learn something!",
        "swampcook yeslore": "What can you tell me about, uh, the `whole of the snake?`",
        "swampcook yeslore answ": "Ah~! It's heart! It's soul! It's head! It's body! What would you like to know?!",
        "swampcook history": "Tell me about the... heart of the snake?",
        "swampcook history answ": "Haa~! Heart of the snake lies in it's first head! A strong man! Fierce man! It is said he wore the head of snakes on his fist! It is why we are the snake's fangs!",
        "swampcook history1": "Okay... so what?",
        "swampcook history1 answ": "Ahh~! That heart! That drove the next head! And the next! More strong! More fierce! Snake must be bigger! Must be stronger!",
        "swampcook history2": "So what happened?",
        "swampcook history2 answ": "The snake grew big, as did it's fangs! But! The prey didn't! The prey grew smaller, until all that was left was snakes! And now!? The zalgo bite at our soul.",
        "swampcook history3": "I still don't understand what you're trying to say.",
        "swampcook history3 answ": "Ah~?! Tribe grew too big! Swamp too dangerous now! Now tribe grows small! And danger only stronger!",
        "swampcook historyend": "I've learned all I think I'm going to about the history of the Snake Fang tribe.",
        "swampcook historyend answ": "A-ha~! Lesson to be learned! What else would you like to know?!",
	"swampcook surround": "Tell me about... the soul of the snake?",
        "swampcook surround answ": "Ahh~! The lands! They are the soul! But it used to be larger! The mountain! The plains! The woods! The bay! All used to be with the snake's soul!",
        "swampcook surround1": "Oh, I actually came from the mountains.",
        "swampcook surround1 answ": "Ha-ha~! Then you know already! Northwest, where the walking rocks and falling water are!",
        "swampcook surround2": "There are plains around here?",
        "swampcook surround2 answ": "Ahh~! Yes! Southeast! The snake would hunt! But the snake split! And now no snakes go to the plains!", //There is a second tribe, of survivors who left the Snake Fang Tribe, and any who go there are banished
        "swampcook surround3": "You're going to have to be a ~lot~ more specific about what woods you're referring to.",
        "swampcook surround3 answ": "Ha~! You are right! South of the falling water! The wet woods! That was where we gathered! But now?! It is just home of the walking rocks!",
        "swampcook surround4": "What do you mean, `the bay`?",
        "swampcook surround4 answ": "A-ha~! Far to the north! Many spice and meat and metal and leather come from there! From very far away! It good place to go! To leave!",
        "swampcook surroundend": "I've learned enough about the ares surrounding the swamplands.",
        "swampcook surroundend answ": "A-ha~! Maybe you will see those lands some day!",
	"swampcook chief": "What can you tell me about the head of the snake?",
        "swampcook chief answ": "A-ha~! Very strong! Very agressive! Quick to bite!",
        "swampcook chief1": "Are you ~just~ telling me about snakes?",
        "swampcook chief1 answ": "Ha~! Silly kazoku! No! Snake's head used to be calmer! But now a new head!",
        "swampcook chief2": "A... new head? What happened to the `old` head, then?",
        "swampcook chief2 answ": "Ha-ha~! The same thing that happens to every head! But the snake laid no eggs! The kin becomes the head!",
        "swampcook chief3": "So the old, less aggressive chief died? And because they had no children, a sibiling became the new chief?",
        "swampcook chief3 answ": "Haa~! Kazoku has ears! Yes! And old problems are new again! But the head of the snake just bites back!",
        "swampcook chiefend": "Okay. I've learned all I think I can understand about the tribe's chief",
        "swampcook chiefend answ": "Ha~! A dramatic tragedy! But that is life!",
	"swampcook people": "What can you tell me about the body of the snake...?",
        "swampcook people answ": "A-ha~! That is me! You! All of us! Maybe you have already seen our bartermaster?! Or would you rather just learn of the unsharpened fange?!",
	"swampcook cook": "Tell me about yourself.",
        "swampcook cook answ": "A-ha~! I am an open book! But you've already helped me! It would be better to learn of someone else!",
	"swampcook cook2": "Can you at least tell me where you get your meat from?",
        "swampcook cook2 answ": "We kill zalgo! Turtle when we can! Alligator when we must! We do not seek snake! We kill that zalgo that comes! They always do...!"
	        +"\n*[The cook abruptly stops talking, then clears his throat and hums questioningly at you]*\n", //"Zalgo" - in this context means dangerous thing
	"swampcook trader": "What can you tell me about the... bartermaster?",
        "swampcook trader answ": "Ahh, she runs the stall near the front of the camp! I give her many meat to barter with! And in return she gives me the local wild to use!",
        "swampcook trader1": "Most people would just call that a merchant or trader, especially if they're just selling what they were given.",
        "swampcook trader1 answ": "Ah~, no! Her son gets the wild! Her son didn't have an eye for it! But anyone can learn! He gives some to me! They sell the rest!",
        "swampcook trader2": "But why, though? It seems to me that you're getting a bad deal. What do you get for giving her so much free meat?",
        "swampcook trader2 answ": "Ha~! Because we are kazoku! And oh-! When she finds something special! For my eyes first, she says!",
        "swampcook trader3": "What? How often does the trader find anything special?",
        "swampcook trader3 answ": "Sometimes! Ha~!",
        "swampcook traderend": "Thanks... I guess I've learned enough about the trader.",
        "swampcook traderend answ": "A-ha~! What else can I tell you of?!",
        "swampcook fangs": "Who are the unsharpened fangs you keep referring to?",
        "swampcook fangs answ": "Ahh, one would be the leatherworker next door! But first! Across the hutfield is our clothier! He is the first one you should sharpen! The old woman is more likely to break than sharpen, a-ha~!",
	"swampcook tailor": "What do I need to know about the clothier?",
        "swampcook tailor answ": "Ha~! Very stressed man! He makes the cloth!",
        "swampcook tailor1": "Okay, so you just mean a tailor.",
        "swampcook tailor1 answ": "Ahh, making cloth is very hard! And he is more than that! He mends, too! ", //mends people, i.e., is the tribe's doctor
        "swampcook tailor2": "I... see. Is there anything more you think I should know, for some reason?",
        "swampcook tailor2 answ": "He has been many things! Very skilled man! He scouted for years! Then used what he learned to make the cloth! But now?! Too much to do! Not enough hands anymore! Not since he taught his family to leave!",
        "swampcook tailorend": "I think that's helpful? Maybe? I probably know enough about the tailor, at any rate.",
        "swampcook tailorend answ": "Ahh?! Maybe I am not telling right?!",
	"swampcook tanner": "You had said there's things I should know about the leatherworker?",
        "swampcook tanner answ": "Ah~! Old woman works skin to leather!",
        "swampcook tanner1": "I would have just called her a tanner, but okay. What about her?",
        "swampcook tanner1 answ": "She is hurt! Worn! Breaking! Inside and out! Heart and hands! Age has been cruel! In many ways!",
        "swampcook tanner2": "That's rough, buddy. Is that why you help process leather for her?", //reference to Avatar, the Last Airbender
        "swampcook tanner2 answ": "Ha~! Yes! Every piece of bad leather makes her feel bad! I can help! But only so much! ",
        "swampcook tannerend": "Alright. I think I might have an idea of how I can help the tanner.",
        "swampcook tannerend answ": "A-ha~! Good kazoku! But remember! Help the clothier first!",
	"swampcook peopleend": "I think I've learned all I need to about the people of the Snake Fang tribe.",
        "swampcook peopleend answ": "Ha~! If you are sure! Then I shall tell you no more! Go across the hutfield! Speak to the clothier! Tell him `tumana`! He should listen then! I will talk to the leatherworker! For you!",
        "swampcook whycrab": "There's just one thing I don't understand, though. How does crab-erm, rock meat help you? There's plenty of cured meats around already.",
        "swampcook whycrab answ": "A-ha~! A man must have some secrets! A-ha-ha~!",
        "swampcook whycrabpress": "Oh, knock it off with the fake laughter! Be honest with me, for once! Tell me what's going on!",
        "swampcook whycrabpress answ": "*\n[The cook stops smiling and lowers his voice]\n*"
                +"I do not lie. Not with laughter. Not with help. I choose to be here. Now. Living. Helping. If I run away, I am not living. If I am not laughing, I am not living. If I am not helping, I am not living. And if I die here? Die helping? Die laughing? Then I die living. So now you be honest? Not to me. To you. What do you live for? What do you laugh for? What will you die for? I wonder. Will you run away? Or will you smile?",
	"swampcook whycrabdrop": "Fine. I doubt I'd understand what you were saying anyway.",
	"swampcook whycrabdrop answ": "A-ha~?!",
        "swampcook nolore": "I really don't think I want to know about whatever it is you're talking about. Can you please just tell me who I can help next?",
        "swampcook nolore answ": "Sosso! Sad kazoku! But okay! The first is the clothier across the hutfield! Tell them `tumana`! After helping, go to the old woman in the hut next door!",
        "swampcook liked": "How are things going for you?",
        "swampcook liked answ": "Menaka kazoku! I am good! For you sharpen the snake's fangs! That is all I need!", //"Menaka" - in this context means cute, precious
        "swampcook noloreteach": "Do you think you could teach me how to make the cured meats I've seen hanging around the workhut?", //for learning the jerky recipes if the player skips lore
        "swampcook noloreteach answ": "A-ha~! Happily, kazoku! Grab a piece! And do as I do!"
                +"\n[*The cook's odd phrases, loud voice, bizarre cadence, and constant singing make it hard to understand what he's saying, but by following along with his actions, you pick up on how to make jerkies from the meats of the swampland cratures.*]\n",
        "swampcook obaru": "Uh... obaru? What is obaru?",
        "swampcook obaru answ": "Ha~! You are obaru! Silly obaru!",
        "swampcook kazoku": "Okay, what is kazoku",
        "swampcook kazoku answ": "A-ha~! We are kazoku! Silly kazoku!",
        "swampcook sosso": "Are you just going to keep saying words at me I don't understand? What does sosso mean?",
        "swampcook sosso answ": "Ha~! Okay! In your tongue, sosso means...! Fool?! Yes! Fool! You are being the fool!",
        "swampcook zalgo": "Are the `zalgo` usually a threat?",
        "swampcook zalgo answ": "Ahh~, yes! That is what zalgo means! A threat! We must always be ready! But it's harder now! Not that it was ever easy! Ha-ha~!",
        "swampcook menaka": "Should I even bother trying to ask what menaka means?",
        "swampcook menaka answ": "A-ha-ha~! Is good thing!",
        "swampcook tumana": "And just what, pray tell, is tumana?",
        "swampcook tumana answ": "Tumana! Yes! Tell it to the clothier!",
	//
        "swamptailor description 1": "Approaching the tailor's workhut, you glance inside to see an fidgety man quickly moving between multple tasks. He seems to be talking to somebody in hushed tones, but as you get closer, you realize there's nobody else around.", //setup description for the initial dialogue
        "swamptailor description 2": "As you approach the tailor's workhut, you see he's already putting down whatever task he was working on and moving outside to meet with you.", //for in between the initial dialogue and completing his portion of the quest
        "swamptailor description 3": "You approach the tailor's workhut, knocking loudly at the door to get his attention over his relentless fretting about the place.", //for after completing his portion of the quest
	"swamptailor interrupt": "*knock on the workhut door*", //the tailor will winge to himself until the player makes their presence known
        "swamptailor interrupt answ": "-and how am I- "
			+"\n[*Upon realising you're there, the tailor drops what they were doing and dives behind a nearby table, knocking it's contents to the floor. They slowly scramble to their feet while reaching futilely for some sort of weapon]*\n "
			+"What? Who are you! Why are you here! How did you get here!",
        "swamptailor listen1": "\n*[Wait for the tailor to notice you]*\n", //start of the winge loop
        "swamptailor listen1 answ": "-boil the linen, he says, as if that'll- " //"Just boil the linen, he says, as if that'll solve the problem"
			+"\n*[The tailor puts down some sewing tools and moves to futz with a bubbling pot near the fireplace]*\n",
        "swamptailor listen2": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen2 answ": "-if she think's it's so easy why doesn't she-", //"If she thinks it's so easy why doesn't she take care of the scout's wounds?"
        "swamptailor listen3": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen3 answ": "-I'm a tailor, not a doctor, for- "	//reference to McCoy's catchphrase in Star Trek: The Original Series
			+"\n*[The tailor moves away from the pot and to a table where they begin stripping old cloth]*\n",
        "swamptailor listen4": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen4 answ": "-not my fault that they-", //"It's not my fault that they got ambushed"
        "swamptailor listen5": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen5 answ": "-if they had better- " //"Maybe if they had better armor, they would have survived"
			+"\n*[The tailor stops mid-cut to paw through a bundle of plants before turning back around to the pot near the fireplace]*\n",
        "swamptailor listen6": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen6 answ": "-think I can just fix- ", //"Do they think I can just fix her wounds because bandages are made of cloth?"
        "swamptailor listen7": "\n*[Wait for the tailor to notice you]*\n",
        "swamptailor listen7 answ": "-the others made sure she got- " //"At least the others made sure she got away"
                        +"\n*[The tailor turns away from the pot, grabbing some loose nearly strips of cloth and a needle and thread begins trying to stitch them together]*\n",
        "swamptailor listen8": "\n*[Wait for the tailor to notice you]*\n", //loop point, just force interrupt at this point if the loop breaks dialogue
        "swamptailor listen8 answ": "-need some fresh cloth, or else-", //"We need some fresh cloth, or else the wounds will just get worse"
        "swamptailor cookword": "Sorry! The cook sent me! He told me to tell you `tumana`!",
        "swamptailor cookword answ": "Well did he also tell you to scare me half to death!? "
			+"\n*[The tailor stops flailing and warily steps out from behind the knocked over table]*\n "
			+"Strange ken dressed strange, smells strange. Just who even are you!? Are you ken of the cook's?",
	"swamptailor help": "His... ken? Not at all. Honestly, it was hard to even understand anything he was telling me half the time, but he said that you'd listen to me if I said that.",
        "swamptailor help answ": "\n*[The tailor exhales a deep sigh]*\n "
                +"Oh course he had to do it like this... I have no reason to trust you, but `tumana` means fertile grounds in his tongue, and even if you knew that, there's no reason you'd say that to me. So if I had to guess, I'd think he was trying use that to tell me in his own way that not only has he vetted you and found you at least passingly capable, but that you're going to be the one getting flax for me. Two hundred bundles should be enough to get started on the bare minimum of what I need. Now go on, off with you now, shoo, time is bleeding out.", //reference to the Adult Swim Infomercial "Broomshakalaka"
        "swamptailor flax": "Wait a second! What is flax, and why am I getting it for you?",
        "swamptailor flax answ": "\n*[The tailor exhales another deep sigh]*\n "
                +"You break my concentration, put me in a panic, make a mess of my workspace, and now you're saying you don't even know one of the most valuable naturally-growing plants on the upper side of the great river basin? Of course. Why would I expect ~competent~ help. Especially from an outsider like you. Look- "
                +"\n*[The tailor bends down and picks up a long thin plant with blue flowers]*\n "
                +"-THIS is flax. Go up in the mountains, find more, and bring it to me. Two hundred bundles. Thank you goodbye.",
        "swamptailor deliver": "I've managed to collect all 200 bundles of flax plants that you wanted.",
        "swamptailor deliver answ": "You did? I... I'm sorry, it was unkind of me, the way I spoke to you before. Please understand, these plants are going to be used to make fresh bandages, and without them... I'm not sure I would have been able to do much of anything trying to reuse fraying rags. I can only hope you were quick enough. I know it's untoward of me to even consider asking this of you after you've already done the hardest part, but could you spare some additional time and help me being to process these into usable linen cloth? Even if you don't know what do to, which I'm fairly certain you don't, an extra pair of hands makes all the difference in the world, and you might be able to make linen yourself afterwards too. "
                +"\n*[The tailor teaches you how to process flax into linen cloth]*\n",
	"swamptailor deliver not": "You did? Where are they, then? Please, I ~need~ those plants. Every hour counts.",
        "swamptailor liked": "Is there anything I can do to help you out today?",
        "swamptailor liked answ": "No, friend, although I appreciate your patience and your concern. As full as my hands are, as full as they always are, I know your time and skills are better spent elsewhere.",
	//
        "swamptanner description 1": "You approach the tanner's workhut to find the old woman with a scowl on her face standing next to a rack stretching drying leather. Her hands are visibly shaking, an apparent sign of wear and old age, as she goes about her work.", //before completing the first delivery.
        "swamptanner description 2": "You approach the tanner's workhut, finding her with meticulously fleshing the alligator skins you brought her earlier. In spite of her clear and deliberate effort, her unsteady hands make deep gouges in the hide like that of an amateur first learning how to clean the skin.", //for after completing the first part of the delivery
        "swamptanner description 3": "You approach the tanner's workhut. The old woman is sitting down, rubbing her knuckles with a grimace on her face. Piles of partially-processed skins litter the hut, rotting untreated in the heat. As she looks up at you, her expression softens, as if trying to hide her pain.", //description changes after making the second delivery and finishing her part of In Times of Need
	"swamptanner unknown": "Excuse me, are you the leatherworker? I was told that I should come see you.",
        "swamptanner unknown answ": "Yes. That would be me. And I know of you -- but I do not know you, nor do I want your help. I need not the blood of the young on my conscience.",
        "swamptanner help": "I'm sure I can handle whatever tasks you need of me.",
        "swamptanner help answ": "Were the young always so eager to die? Fine. If you shan't be wary, then be the fool. Skin five dozen alligators, or feed the bog trying.",
        "swamptanner deliver 1": "I've got the 60 alligator skins you requested.",
        "swamptanner deliver 1 answ": "You did!? Ah... " 
                +"*[The old woman stands up, and with shaky yet strong hands, takes the alligator skins from you, staring at you as she does]* "
                +"My eyes are not as good as they used to be. But now that I see you... You have a strength within. A courageous spirit burning bright; a warrior's heart beating strong. She does too.",
	"swamptanner deliver 1 not": "My eyes may not be as good as they used to be, but I can still count. This is not five dozen, child.",
        "swamptanner known": "Who is `she`?",
        "swamptanner known answ": "The person I needed these skins for. She needs new armor if she's going to survive out there, next time. I will be honest, child: if I am to make her new armor, I am in need of more; these hides can protect, but not alone. I will need the skins of five dozen snakes as well. But I cannot ask you to go and risk your life again for them. I have seen too many children already...", //"already die trying."
        "swamptanner deliver 2": "You don't need to worry any longer. I have the 60 snake skins you need.",
        "swamptanner deliver 2 answ": "Child... You truly have a mighty soul." 
                +"*[The old woman stands up, and with ever shaky hands, takes the giant snake skins from you, staring at you as she does]* "
                +"My eyes are not as good as they used to be. But now that I see your armor... I know not how you survived such brutal attacks. Come. I will teach you how to process the skins you've brought. Surely they will be stronger than whatever it is you're wearing. I may even have some old turtle shells you could practice with. Their shells are very tough, but difficult to... "
                +"*[The old woman teaches you what you need to know in order to process alligator and giant snake skins, as well as turtle shells]*",
	"swamptanner deliver 2 not": "Child... It is okay, you need not lie nor risk your life. You have done enough already. We will manage. We always have.",
        "swamptanner liked": "Just checking in. Is there anything more I can do to help you?",
        "swamptanner liked answ": "Ahh, you are a good child, and a strong warrior. Warriors such as you need not concern yourself with the worries of an old woman.",
	//
        "swampscout description 1": "You see a young woman lying in a cot near the door. Her chest is covered in worn bandages stained with old blood, her arms covered in cuts and abrasions, and her lower half obscured by a blanket. The smell of rot gets stronger as you approach her.",
        "swampscout description 2": "You see the scout lying in a cot near the door. Her chest is covered in worn bandages stained with fresh blood, her arms covered in cuts and abrasions, and her lower half obscured by a blanket. The smell of rot gets stronger as you approach her.", //description changes after meeting her
        "swampscout description 3": "You see the scout lying in a cot near the door. Her chest is covered in fresh bandages stained with fresh blood, her arms covered in bruises and scars, and her lower half partially obscured by a blanket, revealing empty space where her right leg used to be.", //description changes after she teaches the player foraging
        "swampscout description 4": "You see the scout lightly sleeping in a cot near the door. Better to just let her rest.",
	"swampscout meet": "Hello? Sorry to bother you, I just wanted to introduce myself.",
        "swampscout meet answ": "*[The young woman listlessly turns her head and smiles meekly at you]* "
                +"I've heard of you already. Our leader said we may have a new den kin joining our ranks. It's been a while since... I last saw it happen. I was just a kid then. And now look... at him, trying to help everyone even now...",
        "swampscout lore1": "Are you alright?",
        "swampscout lore1 answ": "Forgive me if my speech is unclear or absurd. I've been in a state of limbo since... I don't even know how long ago it was. It feels like yesterday. But it also feels... like it was years ago. Like I've been living in this cot forever...", //refernce to Pathologic
        "swampscout lore2": "What happened?",
        "swampscout lore2 answ": "Oh. I figured you must had heard... "
                +"*[The young woman listlessly turns her head away and stares off into the distance]* "
                +"It had been a rough few years: the amount of good... huntable meat in the swamps was dwindling. Natural herbs and vegetables were growing more scarce... every year. And the snakes were... creeping into the camp more often. We had posted guards, but they were so fast and quiet, we... often wouldn't notice they were gone until the sun rose.",
        "swampscout lore3": "*[Let her continue]*",
        "swampscout lore3 answ": "Our current chief, the brother... to our last chieftan's bondmate and at the former... huntmaster, decided that the best option was to sent hunting parties out into the... swamp, to find the snake's den, so that we could stop their... attacks in the middle of the night. The snake attacks had been... intensifying under his time as huntmaster, and he considered it his destiny to... drive them from the swamp.",
        "swampscout lore4": "*[Let her continue]*",
        "swampscout lore4 answ": "Weeks went by, with our supplies... dwindling with them. Groups that should've been gathering or... scouting new hunting spots were searching for snake dens that didn't exist, and deaths... became an almost daily occurance from unskilled scouts pushed to explore past their bounds. No snakes that big could hide... their nest in a bog this small anyway. We tried to tell him, but no, we dare not... challenge the chief's honor by questioning his rule. It didn't take long before some people started talking about... leaving for the great plains southeast of here.",
        "swampscout lore5": "*[Let her continue]*",
        "swampscout lore5 answ": "The chief was angry. He... banished the lot of them, saying they'd be better off... as bog feed than weakening the tribe. And so we were split. Many artisans, scouts, and... warriors went that night. My brother went with them, as did our... doctor, our blacksmith, and the tailor's sister. Even though I'm just... a scout, I had wanted to be a warrior. I was fully loyal to... our chief's vision, at the time. I thought might made right, that force made security. I wonder... if they survived, if they made something new down there... I wonder what life I could have lived...",
        "swampscout lore6": "*[Let her continue]*",
        "swampscout lore6 answ": "Well, with so much of our... people gone, there were less eyes to watch the gate, less hand to hold the... spears, less ears to the ground. It became necessary to... scale everything down, pull the walls in, and turtle up. Everyone had double- and triple-duty. And yet the hunt... for the snakes continued. A hunt across the bog with naught but ghosts to watch over us... ...as the snakes bore down on us...",
        "swampscout lore7": "I'm sorry all that happened.",
        "swampscout lore7 answ": "I thought myself strong. I thought that... to live meant to be strong. To stand up to... death. But now... Everything that lives is destined to end. To live in pain, in... a neverending spiral of life and death...", //reference to the opening of Nier: Automata
        "swampscout lore8": "Wow...",
        "swampscout lore8 answ": "*[The scout listlessly turns her head towards you]* "
                +"I'm sorry. I just met you and I'm rambling about... this of all things. We can talk about something... else. I've spent a lot of time in the... swamps, there's some interesting things... growing out there.",
        "swampscout generic": "Is there anything I can do for you?",
        "swampscout generic answ": "No... No, time is the only help for me at this... point. But sitting and talking with me... helps. Thank you.",
        "swampscout help": "Here, I brought you something to help ease your pain.",
        "swampscout help answ": "Oh... Thank you. Hopefully this'll... help me get some sleep.",
        "swampscout help not": "I'm sorry, can you... show me what you're giving me?",
        "swampscout foraging": "I would actually be really interested in hearing about what things are growing in the swamp.",
        "swampscout foraging answ": "Alright... Sit down on the bed, and I'll tell you... about what I've seen over the years.",
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
