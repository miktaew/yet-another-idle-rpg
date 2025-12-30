"use strict";

class BackgroundParticle {
    constructor({canvas, size}) {
        this.x = Math.random() * (canvas.width - size - 1) + size + 1;
        this.starting_x = this.x;
        this.distance = Math.random()*50 + 1;
        this.opacity = Math.random() * 0.5 + 0.5;
        this.radians = Math.random() * Math.PI * 2;
        this.y = Math.random() * (canvas.height - size - 1) + size + 1;
    }
}

class RainParticle extends BackgroundParticle {
    constructor({canvas}) {
        const size = Math.random()*2 + 2;

        super({canvas, size});

        this.size = size;

        this.fall_speed = 10;

        this.context = canvas.getContext("2d");

        this.draw = () => {
            if(this.y > canvas.height + this.size) {
                this.y = - this.size; //go back to top after reaching bottom
            } else {
                this.y += this.fall_speed;
            }

            this.x = this.starting_x + this.distance;
            this.context.fillStyle = `rgba(128,128,255, ${this.opacity})`;
            
            this.context.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

class SnowParticle extends BackgroundParticle {
    constructor({canvas}) {
        const size = Math.random()*2 + 2;

        super({canvas, size});

        this.size = size;

        this.fall_speed = Math.random() * 1.5 + 0.5;

        this.context = canvas.getContext("2d");

        this.draw = () => {
            if(this.y > canvas.height + this.size) {
                this.y = - this.size; //go back to top after reaching bottom
            } else {
                this.y += this.fall_speed;
            }

            this.radians += 0.02;
            this.x = this.starting_x + this.distance * Math.sin(this.radians);
            this.context.fillStyle = `rgba(255,255,255,${this.opacity})`;
            
            this.context.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

//not used anywhere
class StarParticle extends BackgroundParticle {
    constructor({canvas}) {
        const size = Math.random()*3 + 1;

        super({canvas, size});

        this.size = size;

        this.context = canvas.getContext("2d");

        this.opacity += 0.3;

        this.draw = () => {
            this.radians += 0.01;

            this.tempX = this.x + Math.sin(Math.random());
            this.tempY = this.y + Math.sin(Math.random());

            this.tempSize = Math.max(1,this.size * Math.abs(Math.sin(this.radians)));

            this.context.fillStyle = `rgba(255,255,100,${this.opacity})`;
            this.context.strokeStyle = "white";
            this.context.beginPath();
            this.context.arc(this.tempX, this.tempY, this.tempSize, 0, 2*Math.PI);
            this.context.fill();
            this.context.stroke();
        }
    }
}

class PointyStarParticle extends BackgroundParticle {
    constructor({canvas}) {
        const size = Math.random()*6 + 6;

        super({canvas, size});

        this.size = size;

        this.context = canvas.getContext("2d");

        let degrees = 45;

        this.draw = () => {
            this.radians += 0.01;

            this.tempSize = Math.max(4,this.size * Math.abs(Math.sin(this.radians)));
            this.tempX = this.x - this.tempSize/2;
            this.tempY = this.y - this.tempSize/2;

            this.context.save();

            this.context.fillStyle = `rgba(255,255,100,${this.opacity})`;
            this.context.fillRect(this.tempX, this.tempY, this.tempSize, this.tempSize);
            
            this.context.translate(this.tempX+this.tempSize/2, this.tempY+this.tempSize/2);
            this.context.rotate(degrees * Math.PI/180);
            this.context.fillStyle = `rgba(255,255,100,${this.opacity})`;
            this.context.fillRect(-this.tempSize/2, -this.tempSize/2, this.tempSize, this.tempSize);

            this.context.restore();
        }
    }
}

export {RainParticle, SnowParticle, StarParticle, PointyStarParticle};
