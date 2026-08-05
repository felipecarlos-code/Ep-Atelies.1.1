const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /if \(errorMessage\.includes\("quota"\) \|\| errorMessage\.includes\("resource_exhausted"\) \|\| errorMessage\.includes\("429"\)\) \{/g,
  `if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand")) {
        errorMessage = "A inteligência artificial está indisponível ou com alta demanda no momento. Por favor, tente novamente em instantes.";
        return res.status(503).json({ success: false, error: errorMessage });
      }
      if (errorMessage.includes("quota") || errorMessage.includes("resource_exhausted") || errorMessage.includes("429")) {`
);

fs.writeFileSync('./api/app.ts', code);
