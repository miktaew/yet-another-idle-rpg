# yet another idle rpg
###### by Miktaew


### Still in development.

Official repo: https://github.com/miktaew/yet-another-idle-rpg  
Official release: https://miktaew.github.io/yet-another-idle-rpg/  
  
  
Dev repo: https://github.com/miktaew/yet-another-idle-rpg-dev  
Dev release: https://miktaew.github.io/yet-another-idle-rpg-dev/  

---
Be warned, the game balance may be not the greatest.
Using the "export" feature every now and then is highly recommended, even on main release, since there's always a risk of some gamebreaking bugs having made it through the testing undetected.

---
To run the project locally, you will need a server - even some basic static server will be enough, as it's only about CORS policy. Npm module 'live-server' works perfectly for this purpose https://www.npmjs.com/package/live-server

Making actual changes in code will require either running the build script after installing esbuild, or simply changing script source in index.html from dist/bundle.js to src/main.js
