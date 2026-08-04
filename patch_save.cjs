const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
    } else if (associationType === 'termo') {`,
  `      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    } else if (associationType === 'termo') {`
);

code = code.replace(
  `      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
    }
  };`,
  `      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    }
  };`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
