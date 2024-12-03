/*
    Not in use, just a reference sheet for some stuff


    REWARDS:
    {
        money: Number //flat value that will be given to player

        xp: Number //flat value that will be given to player

        skill_xp: {
            "skill_id": Number //flat value
        }

        locations: [
            {
                location: String, //location key
                required_clears: Number //only when reward is for combat zones, will make unlock be given only after X full clears instead of first time
                skip_message: Boolean //to NOT log an unlock message, useful in some fringe cases but generally should be skipped
            }
        ]

        flags: [String] //an array with global flag keys

        textlines: [
            {
                lines: [String] //an array with textline keys
                dialogue: String //dialogue key
            }
        ]
        
        dialogues: [String] //an array with dialogue keys

        traders: [String] //an array with trader keys

        housing: [String] //an array with location keys

        activities: [
            {
                activity: String //activity key
                location: String //location key
            }
        ]

        actions: [
            {
                action: String //action key
                location: String //location key
            }
        ]
        
        stances: [String] //an arrays of stance keys

        locks: {
            locations: [String] //an array of location keys
            textlines: [
                {
                    lines: [String] //an array with textline keys
                    dialogue: String //dialogue key
                }
            ]   
        }

        items: [
            {
                item: String //item key
                count: Number //item count
            }
        ]
        
        move_to: {
            location: String //location key
        }
    
    }





*/