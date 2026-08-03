const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /  const renderTabs = \(\) => \(\n      \{\/\* Top connected bar & Tabs \*\/\}/,
  '  const renderTabs = () => (\n    <>\n      {/* Top connected bar & Tabs */}'
);

code = code.replace(
  /        <\/div>\n      <\/div>\n  \);/,
  '        </div>\n      </div>\n    </>\n  );'
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
