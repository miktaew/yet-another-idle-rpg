
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { styleText } from 'node:util';
import { get_game_version } from './src/game_version.js';


esbuild
    .build({
        entryPoints: ["src/main.js"],
        bundle: true,
        sourcemap: true,
        minify: true,
        outfile: `dist/bundle.js`,
        platform: "browser",
        target: "es2020",
        format: 'iife',
        logLevel: "debug",
    }).then(() => {
        console.log("Javascript build complete!");
        const htmlPath = 'index.html';
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        if(htmlContent.search(/dist\/bundle\.js\?version=[^&"]+/) == -1) {
            console.log(styleText("red", 'Failed to update the bundle version in .html!'));
            return;
        }

        htmlContent = htmlContent.replace(
            /dist\/bundle\.js\?version=[^&"]+/,
            `dist/bundle.js?version=${get_game_version()}`
        );
        try {
            fs.writeFileSync(htmlPath, htmlContent);
            console.log("Bundle version in .html has been updated!");
        } catch (err) {
            console.log(styleText("red", 'Failed to update the bundle version in .html!'));
            console.error(err);
        }
        
    }).catch(() => process.exit(1));

