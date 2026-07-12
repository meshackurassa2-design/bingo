const fs = require('fs');
const files = ['TermsScreen.tsx', 'SubscriptionScreen.tsx', 'SearchScreen.tsx', 'MyListScreen.tsx', 'HelpScreen.tsx', 'DownloadsScreen.tsx', 'AppSettingsScreen.tsx', 'AdminUploadScreen.tsx'];

files.forEach(f => {
  const path = 'src/screens/' + f;
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/SafeAreaView,\s*/g, '');
  content = content.replace(/(import .* from 'react-native';)/, "$1\nimport { SafeAreaView } from 'react-native-safe-area-context';");
  fs.writeFileSync(path, content);
});
console.log('Done');
