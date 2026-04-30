import fs from 'fs';
import { extrairDadosCemigRegex } from '../src/lib/engenharia/faturaRegexParser';

async function main() {
    const filePath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\F02 - REF. 02.26.pdf';
    const password = '31130';
    
    console.log("Reading file...");
    const buffer = fs.readFileSync(filePath);
    
    try {
        const extracted = await extrairDadosCemigRegex(buffer, password);
        console.log("Extraction Result:", JSON.stringify(extracted, null, 2));
    } catch (e) {
        console.error("Extraction Failed:", e);
    }
}

main();
