/*
    Not in use yet, currently just references for rewards objects; will be reworked into class later on (probably)
*/

/*  REWARDS:
    {
        money: Number //flat value that will be given to player

        xp: Number //flat value that will be given to player

        skill_xp: {
            "skill_id": Number //flat value
        }

        locations: [
            {
                location: String, //location key
                skip_message: Boolean //to NOT log an unlock message, useful in some fringe cases but generally should be ignored
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

        traders: [
            {
                trader: String,  //trader key
                skip_message: Boolean //to NOT log an unlock message
        ] 

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

        recipes: [
            {
                category: String, 
                subcategory: String, 
                recipe_id: String
            } 
        ] 
        
        reputation: {
            "region": Number //flat value of rep gained
        }

        locks: {
            locations: [String] //an array with location keys
            textlines: {
                "dialogue_key": [String] //an array with textline keys
            },
            traders: [String] //an array with trader keys
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

/*
    REWARDS WITH REQUIRED CLEARS
    same format, except for
    
    [
        { 
            required_clear_count: Number
            ...Rewards // just the standard rewards, all fields on same depth as required_clear_count is
        },   
    ]
    it's also processed only once
    
*/