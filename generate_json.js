const XLSX = require('xlsx');
const fs = require('fs');

console.log('Reading quran.xlsx...');
const workbook = XLSX.readFile('quran.xlsx');

console.log('Sheets found:', workbook.SheetNames);

// Fallbacks in case names differ slightly
const getSheet = (names) => {
    for(const name of names) {
        if(workbook.Sheets[name]) return XLSX.utils.sheet_to_json(workbook.Sheets[name]);
    }
    return undefined;
};

const jsonResult = {
    quiz: getSheet(['القران', 'قرآن', 'Quran', 'Sheet1']) || [],
    sera: getSheet(['سيرة', 'السيرة']) || [],
    sona: getSheet(['فقه', 'الفقه', 'سنن']) || [],
    words: getSheet(['معاني', 'كلمات']) || [],
    kids: getSheet(['اطفال', 'أطفال', 'الاطفال']) || [],
    general: getSheet(['عامة', 'عام']) || []
};

// Check lengths
console.log('Parsed counts:');
for (let key in jsonResult) {
    console.log(key, ':', jsonResult[key] ? jsonResult[key].length : 0);
}

console.log('Writing quran.json...');
fs.writeFileSync('quran.json', JSON.stringify(jsonResult));
console.log('Done! File size:', fs.statSync('quran.json').size);
