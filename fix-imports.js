const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'screens');

fs.readdir(directoryPath, function (err, files) {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    files.forEach(function (file) {
        if (file.endsWith('.tsx')) {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Remove safe area context import completely
            content = content.replace(/import\s*{\s*SafeAreaView\s*}\s*from\s*['"]react-native-safe-area-context['"];\n?/g, '');
            
            // Add SafeAreaView to react-native import if not already there
            if (content.includes("from 'react-native'") && !content.includes("SafeAreaView") && !content.match(/import\s*.*?SafeAreaView.*?from\s*['"]react-native['"]/)) {
                content = content.replace(/(import\s*{[^}]*)(\s*}\s*from\s*['"]react-native['"])/, "$1, SafeAreaView$2");
            }
            
            fs.writeFileSync(filePath, content);
        }
    });
    console.log("Imports fixed in all files.");
});
