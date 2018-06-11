#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const Image = Canvas.Image;
const argv = require('yargs').argv;

const outputDir = argv.out;
if (!fs.existsSync(outputDir) && argv.y) {
    fs.mkdirSync(outputDir, 0o744);
}

const imagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.src = path.resolve(process.cwd(), argv.png);
    image.addEventListener('load', resolve(image));
});
const jsonPromise = new Promise((resolve, reject) => {
    fs.readFile(path.resolve(process.cwd(), argv.json), 'utf8', (err, data) => {
        if (err) reject(err);
        resolve(JSON.parse(data));
    });
});

Promise.all([imagePromise, jsonPromise])
    .then(([image, json]) => {
        const {frames} = json;
        const canvas = new Canvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        return Promise.all(frames
            .map(frame => {
                const sprite = new Canvas(frame.sourceSize.w, frame.sourceSize.h);
                const spriteCtx = sprite.getContext('2d');
                spriteCtx.clearRect(0, 0, frame.sourceSize.w, frame.sourceSize.h);

                spriteCtx.drawImage(canvas,
                    frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h,
                    frame.spriteSourceSize.x, frame.spriteSourceSize.y, frame.spriteSourceSize.w, frame.spriteSourceSize.h
                );

                return new Promise(resolve => {
                    const {name: baseName, ext: extName} = path.parse(frame.filename);
                    const ext = extName || '.png';
                    const baseFileName = path.resolve(process.cwd(), `${outputDir}/${baseName}`);
                    const fileName = `${baseFileName}${ext}`;
                    const out = fs.createWriteStream(fileName);
                    const stream = (() => {
                        switch (ext) {
                            case '.jpg':
                            case '.jpeg':
                                return sprite.jpegStream();
                            default:
                                return sprite.pngStream();
                        }
                    })();

                    stream.on('data', chunk => out.write(chunk));
                    stream.on('end', () => resolve(fileName));
                })
                    .then(fileName => console.log(`saved ${fileName}`))
                    .catch(e => console.error(`Cannot save file ${fileName} due to error`, e.message));
            }));
    })
    .catch(e => console.error('sorry but error occured', e.message));
