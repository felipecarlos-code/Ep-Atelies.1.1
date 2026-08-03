const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

const targetLoader = `                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Estamos varrendo o arquivo com a IA do Gemini para localizar assinaturas, validades, escopo e status do contrato.
                    </p>`;

const newTargetLoader = `                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Estamos varrendo o arquivo com a IA do Gemini para localizar assinaturas, validades, escopo e status do contrato.
                      <br/><span className="text-amber-600 font-medium">Nota: Documentos longos (ex: PDFs com muitas páginas) podem levar até 60 segundos.</span>
                    </p>`;

code = code.replace(targetLoader, newTargetLoader);
fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
