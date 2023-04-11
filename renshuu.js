/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { jsPDF } from "jspdf";
import opentype from "opentype.js";

const LETTER_PARAMS = {
  format: "letter",
  unit: "pt",

  // All units in points
  margin: 72, // 1 inch margin on each side
  availHorizontal: 468, // Total space between horizontal margins
  availVertical: 648, // Total space between vertical margins
};

const BLACK = "#000000";
const DOTTED_LINE_GREY = "#BBBBBB"; // Color to use for rendering dotted lines inside boxes
const TEXT_GREY = "#888888"; // Color to use for rendering traceable text

function generateBox(pdf, x, y, size) {
  pdf.rect(x, y, size, size);

  pdf.setLineDashPattern([2], 0);
  pdf.setDrawColor(DOTTED_LINE_GREY);

  // Create diagonal dotted lines
  pdf.line(x, y + size / 2, x + size, y + size / 2);
  pdf.line(x + size / 2, y, x + size / 2, y + size);

  // Create horizontal and vertical dotted lines
  pdf.line(x, y, x + size, y + size);
  pdf.line(x + size, y, x, y + size);

  // Reset line style
  pdf.setLineDashPattern([], 0);
  pdf.setDrawColor(BLACK);
}

function generateBoxGrid(pdf, x, y, size, colCount, rowCount) {
  for (let i = 0; i < colCount; i++) {
    for (let j = 0; j < rowCount; j++) {
      generateBox(pdf, x + i * size, y + j * size, size);
    }
  }
}

function placeText(pdf, char, x, y, size, color) {
  pdf.setFontSize(size);
  pdf.setTextColor(color);

  // In order to place the character in the vertical center of the box, we need
  // to find the center of the box and the center of the text line and average
  // them
  const lineHeight = pdf.getLineHeight();
  const adjust = (size + lineHeight) / 4;

  pdf.text(char, x, y + adjust, { baseline: "middle" });
}

function generateCharacterGrid(pdf, x, y, largeBoxDimension, char) {
  // Generate a column of five full-size boxes with the character in black in
  // the first and in grey in the second
  generateBoxGrid(pdf, x, y, largeBoxDimension, 1, 5);
  placeText(pdf, char, x, y, largeBoxDimension, BLACK);
  placeText(pdf, char, x, y + largeBoxDimension, largeBoxDimension, TEXT_GREY);

  // Generate a 2×6 grid of half-size boxes in the second column
  generateBoxGrid(pdf, x + largeBoxDimension, y, largeBoxDimension / 2, 2, 6);
  placeText(
    pdf,
    char,
    x + largeBoxDimension,
    y,
    largeBoxDimension / 2,
    TEXT_GREY
  );

  // Generate a 4×8 grid of quarter-size boxes below the half-size
  generateBoxGrid(
    pdf,
    x + largeBoxDimension,
    y + largeBoxDimension * 3,
    largeBoxDimension / 4,
    4,
    8
  );
  placeText(
    pdf,
    char,
    x + largeBoxDimension,
    y + largeBoxDimension * 3,
    largeBoxDimension / 4,
    TEXT_GREY
  );
}

async function getFontNameFromFile(file) {
  const UNKNOWN_FONT_NAME = "unknown-font";

  // opentype.js takes an ArrayBuffer as input
  const fontBuf = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      resolve(evt.target.result);
    };

    reader.readAsArrayBuffer(file);
  });

  const font = opentype.parse(fontBuf, { lowMemory: true });

  // The opentype.js names API doesn't seem particularly stable or clear, but
  // it seems to serve for now

  // We don't know which platforms the font supports, but we only care that we
  // can get a font name
  const names =
    font.names?.unicode ??
    font.names?.windows ??
    font.names?.macintosh ??
    font.names;
  if (!names) {
    console.warn(`font ${file.name} does not have a valid names table`);
    return UNKNOWN_FONT_NAME;
  }

  // Full name is preferred but font family will serve if it's not available
  const nameSet = names.fullName ?? names.fontFamily;
  if (!nameSet) {
    console.warn(`font ${file.name} has no full name or font family name`);
    return UNKNOWN_FONT_NAME;
  }

  const languages = Object.getOwnPropertyNames(nameSet);
  if (languages.length == 0) {
    console.warn(`font ${file.name} has no languages for names`);
    return UNKNOWN_FONT_NAME;
  }

  // We aren't particular about which language the name comes from
  return nameSet[languages[0]];
}

async function addAndSetFontFromFile(pdf, file) {
  // Get the contents of the font file as a binary string so we can b64encode it
  // for embedding in the PDF
  const fontString = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      resolve(evt.target.result);
    };

    reader.readAsBinaryString(file);
  });

  pdf.addFileToVFS(file.name, btoa(fontString));

  const fontName = await getFontNameFromFile(file);

  pdf.addFont(file.name, fontName, "normal");
  pdf.setFont(fontName);
}

async function generatePdf(fontFile, characters) {
  // For now, only US Letter format is supported
  const paperParams = LETTER_PARAMS;

  // We want four grids per block with each grid twice the width of the largest
  // boxes
  const largeBoxDimension = paperParams.availHorizontal / 8;

  const pdf = new jsPDF({
    unit: paperParams.unit,
    format: paperParams.format,
    putOnlyUsedFonts: true,
    compress: true,
  });

  await addAndSetFontFromFile(pdf, fontFile);

  const gridWidth = largeBoxDimension * 2;
  const gridHeight = largeBoxDimension * 5;

  // Each grid is five times the height of the largest boxes and there are two
  // grid blocks per page
  const gridGap = paperParams.availVertical - gridHeight * 2;

  const blockTopYCoordinates = [0, gridHeight + gridGap];

  for (let i = 0; i < characters.length; i++) {
    // Add a page after rendering every eight characters
    if (i > 0 && i % 8 == 0) {
      pdf.addPage();
    }

    const xBlock = i % 4;

    // Two blocks of grids per page, switching blocks every four characters
    const yBlock = Math.floor(i / 4) % 2;

    generateCharacterGrid(
      pdf,
      xBlock * gridWidth + paperParams.margin,
      blockTopYCoordinates[yBlock] + paperParams.margin,
      largeBoxDimension,
      characters[i]
    );
  }

  pdf.save("renshuu-out.pdf");
}

export { generatePdf };
