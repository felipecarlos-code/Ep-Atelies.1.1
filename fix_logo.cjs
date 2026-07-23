const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const regex = /\{isPartner \? \(\s*<img\s*src=\{alloc\.partner\.logoUrl\}\s*alt=\{alloc\.partner\.name\}\s*className="max-w-\[150px\] max-h-\[120px\] object-contain mix-blend-multiply"\s*referrerPolicy="no-referrer"\s*onError=\{\(e\) => handleLogoError && handleLogoError\(e, alloc\.partner\.name\)\}\s*\/>\s*\) : \(/g;

const replacement = `{isPartner ? (
                      <div className="flex flex-col items-center justify-center gap-2 px-2">
                        <img 
                          src={alloc.partner.logoUrl} 
                          alt={alloc.partner.name}
                          className="max-w-[140px] max-h-[90px] object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleLogoError && handleLogoError(e, alloc.partner.name)}
                        />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight">
                          {alloc.partner.name}
                        </span>
                      </div>
                    ) : (`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
    console.log('Fixed logo');
} else {
    console.log('Logo regex did not match');
}
