const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

async function main() {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\F02 - REF. 02.26.pdf';
    const password = '31130';
    const buffer = fs.readFileSync(filePath);
    
    try {
        const data = await pdfParse({ data: buffer, password: password });
        fs.writeFileSync('C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\scratch\\enel_text.txt', data.text);
        console.log("Saved text to enel_text.txt");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
