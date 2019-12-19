#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {createCanvas, Image} = require('canvas');
const argv = require('yargs').argv;

const outputDir = argv.out;
const fullMakeDirSync = dir => {
    if (!fs.existsSync(dir)) {
        fullMakeDirSync(path.dirname(dir));
        fs.mkdirSync(dir, 0o744);
    }
};

const imagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.src = path.resolve(process.cwd(), argv.png);
    image.addEventListener('load', resolve(image));
})
    .catch(e => console.log(`failed to load image: ${argv.png}: ${e.message}`));
const jsonPromise = new Promise((resolve, reject) => {
    fs.readFile(path.resolve(process.cwd(), argv.json), 'utf8', (err, data) => {
        if (err) reject(err);
        resolve(JSON.parse(data));
    });
})
    .catch(e => console.log(`failed to load JSON data: ${argv.json}: ${e.message}`));

Promise.all([imagePromise, jsonPromise])
    .then(([image, json]) => {
        const {frames} = json;
        // console.log(frames, Object.entries(frames));
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);

        const frameFileNames = (frames.constructor === Array)
            ? frames.map(frame => frame.filename)
            : Object.keys(frames);

        return Promise.all(Object.values(frames)
            .map((frame, frameIndex) => {
                console.log(frame, frameFileNames[frameIndex]);
                const sprite = createCanvas(frame.sourceSize.w, frame.sourceSize.h);
                const spriteCtx = sprite.getContext('2d');
                spriteCtx.clearRect(0, 0, frame.sourceSize.w, frame.sourceSize.h);

                spriteCtx.drawImage(canvas,
                    frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h,
                    frame.spriteSourceSize.x, frame.spriteSourceSize.y, frame.spriteSourceSize.w, frame.spriteSourceSize.h
                );

                const {name: baseName, ext: extName, dir} = path.parse(frameFileNames[frameIndex]);
                const ext = extName || '.png';
                const filePath = path.resolve(process.cwd(), path.join(outputDir, dir));
                console.log('file dir', [outputDir, dir, filePath]);
                if (argv.y) {
                    fullMakeDirSync(filePath);
                }
                const baseFileName = path.resolve(process.cwd(), `${filePath}/${baseName}`);
                const fileName = `${baseFileName}${ext}`;
                console.log(`saving ${fileName} ...`);

                return (argv.v
                    ? Promise.resolve()
                    : new Promise(resolve => {
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
                        stream.on('end', resolve);
                    }))
                    .then(() => console.log(`saved ${fileName}`))
                    .catch(e => console.error(`Cannot save file ${fileName} due to error`, e.message));
            }));
    })
    .catch(e => console.error('sorry but error occured', e.message));
