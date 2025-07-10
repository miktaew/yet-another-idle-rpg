"use strict";

class BackgroundParticle {
    constructor({type = "rain", canvas, context = canvas.getContext("2d")}) {
        if(type === "rain") {
            this.size = Math.random()*2 + 2;
            this.fall_speed = 10;
        } else if(type === "snow") {
            this.size = Math.random()*2 + 2;
            this.fall_speed = Math.random() * 1.5 + 0.5;
        }
        this.x = Math.random() * (canvas.width - this.size - 1) + this.size + 1;
        this.starting_x = this.x;
        this.distance = Math.random()*50 + 1;
        this.opacity = Math.random() * 0.5 + 0.5;
        this.radians = Math.random() * Math.PI * 2;
        this.y = Math.random() * (canvas.height - this.size - 1) + this.size + 1;

        this.draw = () => {
            if(this.y > canvas.height + this.size) {
                this.y = - this.size; //go back to top after reaching bottom
            } else {
                this.y += this.fall_speed;
            }

            if(type === "snow") {
                this.radians += 0.02;
                this.x = this.starting_x + this.distance * Math.sin(this.radians);
                context.fillStyle = `rgba(255,255,255,${this.opacity})`;
            } else {
                this.x = this.starting_x + this.distance;
                context.fillStyle = `rgba(128,128,255, ${this.opacity})`;
            }
            context.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

export {BackgroundParticle};
