const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /      <\/div>\n      \)\}\n      \n      \{isFolderBrowserOpen && token && \(/,
  '      </div>\n      \n      {isFolderBrowserOpen && token && ('
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
