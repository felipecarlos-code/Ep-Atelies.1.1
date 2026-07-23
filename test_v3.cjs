const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

// 1. Partner Logo adjustments
const logoTarget = `{isPartner ? (
                        <img 
                         src={alloc.partner.logoUrl} 
                         alt={alloc.partner.name}
                        className="max-w-[150px] max-h-[120px] object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleLogoError && handleLogoError(e, alloc.partner.name)}
                      />
                    ) : (`;

const logoReplacement = `{isPartner ? (
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

code = code.replace(logoTarget, logoReplacement);

// 2. Card height fix (allow auto grow, reduce vertical padding)
code = code.replace(/h-\[185px\]/g, 'min-h-[185px] h-auto');
code = code.replace(/px-6 py-4 flex flex-col justify-center/g, 'px-6 py-2.5 flex flex-col justify-center');
code = code.replace(/text-\[15px\] leading-relaxed line-clamp-3/g, 'text-[14px] leading-snug line-clamp-4');

// We also should revert the line-clamp if it is currently 4 back to 4 but with snug. Wait, currently it's line-clamp-3 according to my revert script.
code = code.replace(/text-\[15px\] leading-relaxed line-clamp-4/g, 'text-[14px] leading-snug line-clamp-5'); // just in case it was 4

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Applied subtle text and logo changes to V3');
