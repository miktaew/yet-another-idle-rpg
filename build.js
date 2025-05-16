
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { get_game_version } from './src/game_version.js';

const output_name = `dist/bundle.${get_game_version()}.js`;

esbuild
    .build({
        entryPoints: ["src/main.js"],
        bundle: true,
        sourcemap: true,
        minify: true,
        outfile: output_name,
        platform: "browser",
        target: "es2020",
        format: 'iife',
        logLevel: "debug",
    }).then(() => {
        console.log("Javascript build complete!");
        const htmlPath = 'index.html';
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        if(!htmlContent.search(/<script type="module" src="dist\/bundle\.[^"]*\.js"><\/script>/)) {
            console.log('Failed to update the bundle link in .html!');
            return;
        }

        htmlContent = htmlContent.replace(
            /<script type="module" src="dist\/bundle\.[^"]*\.js"><\/script>/,
            `<script type="module" src="${output_name}"></script>`
        );
        try {
            fs.writeFileSync(htmlPath, htmlContent);
            console.log("Bundle link in .html has been updated!");
        } catch (err) {
            console.log('Failed to update the bundle link in .html!');
            console.error(err);
        }
        
    }).catch(() => process.exit(1));

