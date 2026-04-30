const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function main() {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\F02 - REF. 02.26.pdf';
    const password = '31130';
    
    console.log("Reading file...");
    const buffer = fs.readFileSync(filePath);
    
    try {
        console.log("Parsing text with pdf-parse and object argument...");
        // Pass object to PDFJS.getDocument via pdf-parse
        const data = await pdfParse({ data: buffer, password: password }, { max: 1 });
        console.log("Text length (with password):", data.text.length);
        console.log(data.text.substring(0, 500));
    } catch (e) {
        console.error("Error with password:", e.message);
    }
}

main();
