const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `      cachedAccessToken = null;
      cachedGoogleUser = null;`,
  `      cachedAccessToken = null;
      cachedGoogleUser = null;
      searchStateCache = null;`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
