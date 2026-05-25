const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\Users\\BRUNO CORDEIRO\\Downloads\\2187483 Co Service.pdf';

if (!fs.existsSync(pdfPath)) {
  console.log("PDF file does not exist at " + pdfPath);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  console.log("=== METADATA ===");
  console.log(data.info);
  console.log("=== TEXT ===");
  console.log(data.text);
}).catch(err => {
  console.error("Error reading PDF:", err);
});
