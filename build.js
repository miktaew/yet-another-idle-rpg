
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
        htmlContent = htmlContent.replace(
            /<script type="module" src="dist\/bundle\.[^"]*\.js"><\/script>/,
            `<script type="module" src="${output_name}"></script>`
        );
        fs.writeFileSync(htmlPath, htmlContent);
        console.log("Bundle link in HTML has been updated!");
    }).catch(() => process.exit(1));

