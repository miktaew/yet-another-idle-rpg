
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { styleText } from 'node:util';
import { get_game_version } from './src/game_version.js';

const bundle_regex = /dist\/bundle\.js\?version=[^&"]+/;

const style_regex = /style\.css\?version=[^&"]+/;

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

        if(htmlContent.search(bundle_regex) == -1) {
            console.log(styleText("red", 'Failed to update the bundle version in .html!'));
            return;
        }
        if(htmlContent.search(style_regex) == -1) {
            console.log(styleText("red", 'Failed to update the style version in .html!'));
            return;
        }

        htmlContent = htmlContent.replace(
            bundle_regex,
            `dist/bundle.js?version=${get_game_version()}`
        ).replace(
            style_regex,
            `style.css?version=${get_game_version()}`
        );
        try {
            fs.writeFileSync(htmlPath, htmlContent);
            console.log("Bundle and style versions in .html have been updated!");
        } catch (err) {
            console.error(err);
        }
        
    }).catch(() => process.exit(1));

