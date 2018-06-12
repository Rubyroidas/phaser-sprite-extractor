This is the command line tool for splitting phaser spritesheets into separate images.

# Install
`npm install -g phaser-sprite-extractor`

# Usage:
`phaser-sprite-extractor [-y] --json path/to/spritesheet.json --png path/to/spritesheet.png --out path/to/out/dir`

- `--json`: path to JSON (atlas)
- `--png`: path to PNG (texture)
- `--out`: directory where output files will be saved

If `out` directory doesn't exist, it's been autocreated if `-y` key appears.
Phaser 2 hash and array both supported. Files with folder specified are supported too.
