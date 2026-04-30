const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function main() {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\F02 - REF. 02.26.pdf';
    const password = '31130';
    
    console.log("Reading file...");
    const buffer = fs.readFileSync(filePath);
    
    console.log("Loading with pdf-lib...");
    try {
        const doc = await PDFDocument.load(buffer, { password });
        console.log("Decrypted! Saving...");
        const unencryptedBytes = await doc.save();
        const unencryptedBuffer = Buffer.from(unencryptedBytes);
        
        console.log("Parsing text with pdf-parse...");
        const data = await pdfParse(unencryptedBuffer, { max: 1 });
        console.log(data.text.substring(0, 500));
        
        fs.writeFileSync('C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\scratch\\decrypted_enel.pdf', unencryptedBuffer);
        console.log("Saved decrypted to scratch.");
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
