# renshuu

"renshuu" is from the Japanese 練習 (れんしゅう, renshū) meaning "practice". It is a simple web and JavaScript project intended for generating custom PDFs for practicing handwriting of the Chinese characters used in Chinese, Japanese, Korean, and Vietnamese. However, it is not restricted to these characters and could be used more broadly.

## Running Locally

Running the server should be as simple as running `npm start` from the root directory and visiting the URL provided.

## Building for Distribution

Running `npm run build` from the root directory will build the project and place the resulting files in `dist/`.

## Future Work

At present, users must supply both their own fonts and lists of characters. I would like to add support for choosing from a list of open source fonts in addition to uploading fonts, selecting a language to ensure that the appropriate glyphs are displayed, and choosing from set lists of characters such as those set for various language tests. I also intend to add support for generating PDFs laid out for A4 paper.

## Limitations

- Shaping and separating of CJKV text into graphemes are simple processes. As such, renshuu operates on single characters only. Without a clear vision of user experience and indication of interest, multi-character grapheme clusters will remain unsupported.

- There are limitations on which font formats can be embedded in a PDF, as well as difficulties in implementing support for font collections. As such, fonts are limited to single-face TrueType (`.ttf`) and OpenType (`.otf`) files.