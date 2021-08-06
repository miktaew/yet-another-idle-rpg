
var count = 0;
var tickrate = 1;
var character_name = "You";
var name_field = document.getElementById("character_name_field");
var message_log = document.getElementById("message_log_div");

name_field.value = character_name;

// button testing cuz yes
document.getElementById("test_button").addEventListener("click", test_button);

name_field.addEventListener("change", () => character_name = name_field.value);

//writes message to the message log
function log_message(message_to_add) {
	var message = document.createElement("div");
	message.classList.add("message");
	message.innerHTML = message_to_add;
	if(message_log.children.length > 33) 
	{
		message_log.removeChild(message_log.children[0]);
	}
	message_log.appendChild(message);
}

function test_button() {
	log_message(character_name);
}

function tick() {
	return new Promise(resolve => setTimeout(resolve, 1000/tickrate));
}

function update() {
	//main stuff i guess

	//console.log(character_name);
	// count+=1;
}

async function run() {
	while(true){
		await tick();
		update();
	}
}

run();