const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function main() {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\F02 - REF. 02.26.pdf';
    const password = '31130';
    
    console.log("Reading file...");
    const buffer = fs.readFileSync(filePath);
    
    try {
        console.log("Parsing text with pdf-parse...");
        const data = await pdfParse(buffer, { max: 1 });
        console.log("Text length (without password):", data.text.length);
    } catch (e) {
        console.error("Error without password:", e.message);
    }

    try {
        console.log("Parsing text with pdf-parse and password...");
        // pdf-parse might not accept password natively or maybe it uses options.password? Let's try.
        const data = await pdfParse(buffer, { max: 1, password: password });
        console.log("Text length (with password):", data.text.length);
        console.log(data.text.substring(0, 500));
    } catch (e) {
        console.error("Error with password:", e.message);
    }
}

main();
