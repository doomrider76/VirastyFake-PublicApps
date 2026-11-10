// ============================================================
// auth.js — ورود / ثبت‌نام با شماره موبایل (نسخه‌ی فیک)
// بعد از features.js لود می‌شود.
// - اولین اجرای برنامه (وقتی هیچ حسابی شماره ندارد) صفحه‌ی ورود تمام‌صفحه نمایش داده می‌شود
// - کد تأیید واقعی نیست؛ خود برنامه آن را به شکل یک پیامک فیک نشان می‌دهد
// - هر حساب با «شماره موبایل» شناسایی می‌شود (a.phone) و یک «آیدی» یکتا دارد (a.handle)
// - اگر شماره قبلا ثبت شده باشد، بعد از تأیید کد وارد همان حساب می‌شود
// - از تنظیمات > «افزودن اکانت جدید» هم همین صفحه (با دکمه‌ی بستن) باز می‌شود
// ============================================================
(() => {
'use strict';
const $ = id => document.getElementById(id);

const CODE_LEN = 5;
const CODE_TTL = 120 * 1000;
const RESEND_AFTER = 60 * 1000;
const MAX_TRIES = 5;
const SMS_DELAY = 1500;

// ---------- ابزارها ----------
const toEn = s => String(s || '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const toFa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

function normPhone(raw, c) {
    c = c || COUNTRY;
    let s = toEn(raw).replace(/[\s\-().]/g, '');
    if (s.startsWith('+') || s.startsWith('00')) {            // شماره‌ی بین‌المللی کامل
        const d = s.replace(/^\+|^00/, '');
        if (!/^\d{8,15}$/.test(d)) return null;
        if (/^98\d{10}$/.test(d)) return '0' + d.slice(2);    // ایران: همان قالب 09...
        return '+' + d;
    }
    if (c.cc === 'IR') {
        if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
        else if (/^9\d{9}$/.test(s)) s = '0' + s;
        return /^09\d{9}$/.test(s) ? s : null;
    }
    const n = s.replace(/^0/, '');
    if (!/^\d{5,12}$/.test(n)) return null;
    const full = c.dial + n;
    return full.length >= 8 && full.length <= 15 ? '+' + full : null;
}
const maskPhone = p => p.startsWith('09') ? p.slice(0, 4) + ' ••• ' + p.slice(-4) : p.slice(0, 4) + ' ••• ' + p.slice(-3);

const owners = () => [state.user, ...(state.accounts || [])].filter(Boolean);
const findByPhone = p => owners().find(a => a.phone === p);
const needsGate = () => !owners().some(a => a.phone);

function handleTaken(h, ignoreHandle) {
    const l = h.toLowerCase();
    if (ignoreHandle && ignoreHandle.toLowerCase() === l) return false;
    if ((state.bannedUsers || []).some(b => String(b).toLowerCase() === l)) return 'banned';
    const pool = [
        ...owners().map(a => a.handle),
        ...(state.posts || []).map(p => p.handle),
        ...(state.aiPosts || []).map(p => p.handle)
    ];
    return pool.some(x => x && String(x).toLowerCase() === l) ? 'taken' : false;
}
const validId = id => /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(id);

function genCode() {
    const a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return String(a[0] % Math.pow(10, CODE_LEN)).padStart(CODE_LEN, '0');
}
const PALETTE = ['#1d9bf0', '#7856ff', '#f91880', '#00ba7c', '#ff7a00', '#e0245e', '#17bf63', '#794bc4'];
const colorFor = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };

// ---------- کشورها: [کد ISO, نام فارسی, نام انگلیسی, کد تلفن] ----------
const COUNTRIES = [
 ['IR','ایران','Iran','98'],['AF','افغانستان','Afghanistan','93'],['IQ','عراق','Iraq','964'],['TR','ترکیه','Turkey','90'],
 ['AZ','جمهوری آذربایجان','Azerbaijan','994'],['AM','ارمنستان','Armenia','374'],['TM','ترکمنستان','Turkmenistan','993'],
 ['UZ','ازبکستان','Uzbekistan','998'],['TJ','تاجیکستان','Tajikistan','992'],['KZ','قزاقستان','Kazakhstan','7'],['KG','قرقیزستان','Kyrgyzstan','996'],
 ['PK','پاکستان','Pakistan','92'],['IN','هند','India','91'],['BD','بنگلادش','Bangladesh','880'],
 ['AE','امارات','United Arab Emirates','971'],['SA','عربستان سعودی','Saudi Arabia','966'],['QA','قطر','Qatar','974'],['KW','کویت','Kuwait','965'],
 ['BH','بحرین','Bahrain','973'],['OM','عمان','Oman','968'],['JO','اردن','Jordan','962'],['LB','لبنان','Lebanon','961'],['SY','سوریه','Syria','963'],['YE','یمن','Yemen','967'],
 ['EG','مصر','Egypt','20'],['LY','لیبی','Libya','218'],['TN','تونس','Tunisia','216'],['DZ','الجزایر','Algeria','213'],['MA','مراکش','Morocco','212'],['SD','سودان','Sudan','249'],
 ['DE','آلمان','Germany','49'],['AT','اتریش','Austria','43'],['CH','سوئیس','Switzerland','41'],['FR','فرانسه','France','33'],['IT','ایتالیا','Italy','39'],
 ['ES','اسپانیا','Spain','34'],['PT','پرتغال','Portugal','351'],['NL','هلند','Netherlands','31'],['BE','بلژیک','Belgium','32'],['LU','لوکزامبورگ','Luxembourg','352'],
 ['GB','بریتانیا','United Kingdom','44'],['IE','ایرلند','Ireland','353'],['SE','سوئد','Sweden','46'],['NO','نروژ','Norway','47'],['DK','دانمارک','Denmark','45'],
 ['FI','فنلاند','Finland','358'],['IS','ایسلند','Iceland','354'],['PL','لهستان','Poland','48'],['CZ','چک','Czechia','420'],['SK','اسلواکی','Slovakia','421'],
 ['HU','مجارستان','Hungary','36'],['RO','رومانی','Romania','40'],['BG','بلغارستان','Bulgaria','359'],['GR','یونان','Greece','30'],['CY','قبرس','Cyprus','357'],
 ['HR','کرواسی','Croatia','385'],['RS','صربستان','Serbia','381'],['SI','اسلوونی','Slovenia','386'],['BA','بوسنی و هرزگوین','Bosnia and Herzegovina','387'],
 ['UA','اوکراین','Ukraine','380'],['RU','روسیه','Russia','7'],['BY','بلاروس','Belarus','375'],['GE','گرجستان','Georgia','995'],
 ['EE','استونی','Estonia','372'],['LV','لتونی','Latvia','371'],['LT','لیتوانی','Lithuania','370'],
 ['US','آمریکا','United States','1'],['CA','کانادا','Canada','1'],['MX','مکزیک','Mexico','52'],['BR','برزیل','Brazil','55'],['AR','آرژانتین','Argentina','54'],
 ['CL','شیلی','Chile','56'],['CO','کلمبیا','Colombia','57'],['PE','پرو','Peru','51'],['VE','ونزوئلا','Venezuela','58'],
 ['AU','استرالیا','Australia','61'],['NZ','نیوزیلند','New Zealand','64'],['JP','ژاپن','Japan','81'],['KR','کره‌ی جنوبی','South Korea','82'],['CN','چین','China','86'],
 ['HK','هنگ‌کنگ','Hong Kong','852'],['SG','سنگاپور','Singapore','65'],['MY','مالزی','Malaysia','60'],['TH','تایلند','Thailand','66'],['VN','ویتنام','Vietnam','84'],
 ['ID','اندونزی','Indonesia','62'],['PH','فیلیپین','Philippines','63'],['ZA','آفریقای جنوبی','South Africa','27'],['NG','نیجریه','Nigeria','234'],
 ['KE','کنیا','Kenya','254'],['ET','اتیوپی','Ethiopia','251'],['GH','غنا','Ghana','233']
].map(([cc, fa, en, dial]) => ({ cc, fa, en, dial }));
let COUNTRY = COUNTRIES[0];

// پرچم‌ها از flags.js (داخل خود برنامه) خوانده می‌شوند؛ اگر پرچمی نبود کد دوحرفی نشان داده می‌شود
const FLAGS = window.VIRASTY_FLAGS || {}, FRATIO = window.VIRASTY_FLAG_RATIO || {};
function flagHTML(cc, h) {
    h = h || 18;
    const src = FLAGS[cc];
    if (!src) return `<span class="au-fl-t" style="height:${h}px;min-width:${Math.round(h * 1.4)}px">${cc}</span>`;
    const r = FRATIO[cc] || 1.5, w = Math.min(Math.round(h * 1.7), Math.round(h * r)), hh = Math.round(w / r);
    return `<img class="au-fl" src="${src}" alt="" width="${w}" height="${hh}">`;
}

// ---------- استایل ----------
const css = document.createElement('style');
css.textContent = `
.au-root{position:fixed;inset:0;z-index:5000;background:var(--bg-color);display:none;overflow-y:auto;-webkit-overflow-scrolling:touch}
.au-root.show{display:block;animation:auFade .25s ease}
.au-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.au-bg::before,.au-bg::after{content:"";position:absolute;width:340px;height:340px;border-radius:50%;filter:blur(80px);opacity:.25}
.au-bg::before{background:#1d9bf0;top:-130px;right:-110px}
.au-bg::after{background:#7856ff;bottom:-150px;left:-130px}
.au-card{position:relative;max-width:420px;min-height:100%;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;
  padding:calc(env(safe-area-inset-top,0px) + 12px) 22px calc(env(safe-area-inset-bottom,0px) + 24px)}
.au-top{display:flex;align-items:center;justify-content:space-between;height:44px;flex-shrink:0}
.au-icon{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:var(--text-primary);display:flex;align-items:center;justify-content:center;cursor:pointer}
.au-icon:active{background:var(--accent-soft)}
.au-icon svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.au-icon.hid{visibility:hidden}
.au-dots{display:flex;gap:6px}
.au-dots i{width:7px;height:7px;border-radius:50%;background:var(--border-color);transition:all .3s}
.au-dots i.on{width:22px;border-radius:4px;background:var(--accent-color)}
.au-step{display:none;flex:1;flex-direction:column}
.au-step.on{display:flex;animation:auSlide .32s ease}
.au-logo{width:84px;height:84px;border-radius:24px;margin:18px auto 22px;display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:linear-gradient(135deg,#1d9bf0,#7856ff);box-shadow:0 12px 32px rgba(29,155,240,.35)}
.au-logo img{width:100%;height:100%;object-fit:cover}
.au-logo span{display:none;color:#fff;font-size:44px;font-weight:800}
.au-h{font-size:26px;font-weight:800;color:var(--text-primary);text-align:center;margin:0 0 8px}
.au-p{font-size:15px;color:var(--text-secondary);text-align:center;line-height:1.9;margin:0 0 24px}
.au-p b{color:var(--text-primary);direction:ltr;unicode-bidi:isolate}
.au-lbl{font-size:13px;color:var(--text-secondary);font-weight:600;margin:0 4px 8px}
.au-field{display:flex;align-items:center;gap:10px;background:var(--card-bg);border:1.5px solid var(--border-color);border-radius:14px;padding:0 14px;height:56px;
  box-sizing:border-box;transition:border-color .2s,box-shadow .2s;margin-bottom:6px}
.au-field:focus-within{border-color:var(--accent-color);box-shadow:0 0 0 4px var(--accent-soft)}
.au-field.ltr{direction:ltr}
.au-field input{flex:1;min-width:0;background:transparent!important;border:none!important;outline:none!important;color:var(--text-primary);font-family:inherit;font-size:18px;padding:0!important;height:100%}
.au-field input::placeholder{color:var(--text-secondary);opacity:.6}
.au-cc{display:flex;align-items:center;gap:6px;padding-right:10px;border-right:1px solid var(--border-color);color:var(--text-primary);font-weight:700;font-size:16px;white-space:nowrap;height:26px}
.au-cc.hid{display:none}
.au-cc{background:none;border:none;border-right:1px solid var(--border-color);font-family:inherit;cursor:pointer;padding-left:0}
.au-cc svg.chev{width:14px;height:14px;stroke:var(--text-secondary);fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.au-fl{border-radius:3px;box-shadow:0 0 0 1px rgba(128,128,128,.3);flex-shrink:0;display:block}
.au-fw{width:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.au-fl-t{display:inline-flex;align-items:center;justify-content:center;border-radius:3px;padding:0 4px;box-sizing:border-box;background:var(--border-color);color:var(--text-primary);font-size:10px;font-weight:800;flex-shrink:0}
.au-sheet{position:fixed;inset:0;z-index:5100;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}
.au-sheet.show{display:flex;animation:auFade .2s}
.au-sheet-box{width:100%;max-width:460px;height:78%;background:var(--bg-color);border-radius:22px 22px 0 0;display:flex;flex-direction:column;border:1px solid var(--border-color);animation:auUp .3s ease}
.au-sheet-h{display:flex;align-items:center;justify-content:space-between;padding:10px 10px 4px;font-weight:800;color:var(--text-primary);font-size:17px}
.au-clist{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 6px calc(env(safe-area-inset-bottom,0px) + 10px)}
.au-crow{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;border-bottom:1px solid var(--divider,var(--border-color));padding:13px 14px;font-family:inherit;color:var(--text-primary);font-size:16px;cursor:pointer;text-align:right}
.au-crow:active{background:var(--accent-soft)}
.au-crow .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.au-crow .d{direction:ltr;color:var(--text-secondary);font-weight:600}
.au-crow.sel .d,.au-crow.sel .n{color:var(--accent-color);font-weight:800}
.au-empty{text-align:center;color:var(--text-secondary);padding:30px 10px;font-size:14px}
@keyframes auUp{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
.au-at{color:var(--text-secondary);font-size:18px;font-weight:700}
.au-hint{font-size:13px;color:var(--text-secondary);min-height:20px;margin:2px 4px 14px;line-height:1.7}
.au-hint.ok{color:#00ba7c}.au-hint.bad{color:#f4212e}
.au-err{font-size:13px;color:#f4212e;min-height:20px;margin:0 4px 10px;text-align:center}
.au-grow{flex:1;min-height:16px}
.au-btn{height:54px;border:none;border-radius:16px;background:var(--accent-color);color:#fff;font-family:inherit;font-size:17px;font-weight:800;width:100%;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;transition:opacity .2s,transform .1s;flex-shrink:0}
.au-btn:disabled{opacity:.4;cursor:default}
.au-btn:not(:disabled):active{transform:scale(.98)}
.au-spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:auSpin .7s linear infinite;display:none}
.au-btn.load .au-spin{display:block}
.au-note{font-size:12px;color:var(--text-secondary);text-align:center;margin-top:14px;line-height:1.8}
.au-otp{display:flex;gap:10px;direction:ltr;justify-content:center;margin:8px 0 14px}
.au-otp input{width:52px;height:62px;box-sizing:border-box;border-radius:14px;border:1.5px solid var(--border-color);background:var(--card-bg);color:var(--text-primary);
  font-family:inherit;font-size:26px;font-weight:800;text-align:center;outline:none;padding:0;transition:border-color .2s,box-shadow .2s}
.au-otp input:focus{border-color:var(--accent-color);box-shadow:0 0 0 4px var(--accent-soft)}
.au-otp input.f{border-color:var(--accent-color)}
.au-otp.err input{border-color:#f4212e;animation:auShake .4s}
.au-status{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:var(--text-secondary);min-height:22px;margin-bottom:6px}
.au-status .au-spin{border-color:var(--border-color);border-top-color:var(--accent-color);display:block;width:14px;height:14px;border-width:2px}
.au-status.done{color:#00ba7c}
.au-status.done .au-spin{display:none}
.au-pill{background:var(--accent-soft);color:var(--accent-color);font-size:13px;font-weight:700;border-radius:12px;padding:10px 14px;text-align:center;margin:0 0 14px;line-height:1.8}
.au-link{background:none;border:none;color:var(--accent-color);font-family:inherit;font-size:15px;font-weight:700;padding:8px;cursor:pointer;align-self:center}
.au-link:disabled{color:var(--text-secondary);font-weight:500;cursor:default}
.au-avatar{width:96px;height:96px;border-radius:50%;margin:10px auto 22px;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:800;color:#fff;
  background:#1d9bf0;transition:background .3s;box-shadow:0 10px 26px rgba(0,0,0,.25)}
.au-sms{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:12px;right:12px;max-width:440px;margin:0 auto;z-index:6000;
  background:var(--card-bg);border:1px solid var(--border-color);border-radius:18px;padding:12px 14px;display:flex;gap:12px;align-items:center;
  transform:translateY(-160%);transition:transform .4s cubic-bezier(.2,.9,.3,1.1);cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.au-sms.show{transform:translateY(0)}
.au-sms-ic{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#1d9bf0,#7856ff);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800;font-size:20px}
.au-sms-t{font-size:12px;color:var(--text-secondary);display:flex;justify-content:space-between}
.au-sms-b{font-size:15px;color:var(--text-primary);font-weight:600;margin-top:3px;line-height:1.7}
.au-sms-b b{letter-spacing:2px;color:var(--accent-color);font-size:17px}
.au-phone{display:block;direction:ltr;text-align:right;font-size:12px;color:var(--text-secondary);margin-top:1px}
@keyframes auFade{from{opacity:0}to{opacity:1}}
@keyframes auSlide{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes auSpin{to{transform:rotate(360deg)}}
@keyframes auShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
`;
document.head.appendChild(css);

// ---------- DOM ----------
const ROOT = document.createElement('div');
ROOT.className = 'au-root';
ROOT.id = 'au-root';
ROOT.innerHTML = `
<div class="au-bg"></div>
<div class="au-card">
  <div class="au-top">
    <button type="button" class="au-icon" id="au-back"></button>
    <div class="au-dots" id="au-dots"><i></i><i></i><i></i></div>
    <span style="width:40px"></span>
  </div>

  <div class="au-step" id="au-s-phone">
    <div class="au-logo"><img src="Logo.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span>و</span></div>
    <h1 class="au-h">به ویراستی خوش آمدید</h1>
    <p class="au-p">برای ورود یا ساخت حساب، شماره موبایلتان را وارد کنید. یک کد تأیید برایتان ارسال می‌شود.</p>
    <div class="au-lbl">شماره موبایل</div>
    <div class="au-field ltr">
      <button type="button" class="au-cc" id="au-cc" aria-label="انتخاب کشور"><span id="au-cc-fl"></span><span id="au-cc-d">+98</span><svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
      <input type="tel" id="au-phone" inputmode="tel" autocomplete="tel" placeholder="912 345 6789">
    </div>
    <div class="au-err" id="au-e-phone"></div>
    <div class="au-grow"></div>
    <button type="button" class="au-btn" id="au-b-phone" disabled><span class="au-spin"></span><span>دریافت کد تأیید</span></button>
    <div class="au-note">با ادامه دادن، با قوانین ویراستی موافقت می‌کنید.</div>
  </div>

  <div class="au-step" id="au-s-code">
    <div class="au-logo" style="width:72px;height:72px;border-radius:20px;font-size:34px"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 8 8 6 8-6"/></svg></div>
    <h1 class="au-h">کد تأیید را وارد کنید</h1>
    <p class="au-p" id="au-code-p"></p>
    <div class="au-pill" id="au-pill" style="display:none">این شماره قبلا ثبت شده است. بعد از تأیید کد، وارد حساب خودتان می‌شوید.</div>
    <div class="au-otp" id="au-otp"></div>
    <div class="au-status" id="au-status"><span class="au-spin"></span><span id="au-status-t"></span></div>
    <div class="au-err" id="au-e-code"></div>
    <button type="button" class="au-link" id="au-resend"></button>
    <button type="button" class="au-link" id="au-edit-phone" style="font-weight:500">شماره اشتباه است؟ ویرایش</button>
    <div class="au-grow"></div>
    <button type="button" class="au-btn" id="au-b-code" disabled><span class="au-spin"></span><span>تأیید</span></button>
  </div>

  <div class="au-step" id="au-s-profile">
    <div class="au-avatar" id="au-avatar">؟</div>
    <h1 class="au-h">پروفایل خود را بسازید</h1>
    <p class="au-p">شماره‌ی شما تأیید شد. نام و آیدی یکتای خود را انتخاب کنید.</p>
    <div class="au-lbl">نام نمایشی</div>
    <div class="au-field"><input type="text" id="au-name" placeholder="مثلا مهدی" maxlength="40" autocomplete="name"></div>
    <div style="height:10px"></div>
    <div class="au-lbl">آیدی (نام کاربری)</div>
    <div class="au-field ltr"><span class="au-at">@</span><input type="text" id="au-handle" placeholder="user_name" maxlength="20" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
    <div class="au-hint" id="au-hint">۳ تا ۲۰ کاراکتر؛ حروف انگلیسی، عدد و _ ؛ باید با حرف شروع شود.</div>
    <div class="au-err" id="au-e-profile"></div>
    <div class="au-grow"></div>
    <button type="button" class="au-btn" id="au-b-profile" disabled><span class="au-spin"></span><span>ورود به ویراستی</span></button>
  </div>
</div>`;
document.body.appendChild(ROOT);

const sms = document.createElement('div');
sms.className = 'au-sms';
sms.innerHTML = `<div class="au-sms-ic">و</div><div style="flex:1;min-width:0"><div class="au-sms-t"><span>پیامک · ویراستی</span><span>همین الان</span></div><div class="au-sms-b" id="au-sms-b"></div></div>`;
document.body.appendChild(sms);

const sheet = document.createElement('div');
sheet.className = 'au-sheet';
sheet.id = 'au-sheet';
sheet.innerHTML = `<div class="au-sheet-box">
  <div class="au-sheet-h"><button type="button" class="au-icon" id="au-sheet-x"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button><span>انتخاب کشور</span><span style="width:40px"></span></div>
  <div class="au-field" style="margin:6px 16px 8px"><input type="text" id="au-csearch" placeholder="جستجوی کشور یا کد..." autocomplete="off"></div>
  <div class="au-clist" id="au-clist"></div>
</div>`;
document.body.appendChild(sheet);

const otpWrap = $('au-otp');
for (let i = 0; i < CODE_LEN; i++) {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = i === 0 ? 'one-time-code' : 'off';
    otpWrap.appendChild(inp);
}
const otp = [...otpWrap.querySelectorAll('input')];

const ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>';

// ---------- وضعیت ----------
const S = { step: 'phone', phone: null, code: null, exp: 0, tries: 0, resendAt: 0, existing: null, tick: null, smsT: null, hideT: null, dismissible: false, busy: false };
const STEPS = ['phone', 'code', 'profile'];

const err = (step, m) => { const e = $('au-e-' + step); if (e) e.textContent = m || ''; };
const setLoad = (id, on) => { const b = $(id); b.classList.toggle('load', !!on); b.dataset.busy = on ? '1' : ''; if (on) b.disabled = true; };

function showSms(code) {
    $('au-sms-b').innerHTML = `کد تأیید ویراستی: <b>${toFa(code)}</b><br><span style="font-size:12px;color:var(--text-secondary);font-weight:400">این کد را به کسی ندهید.</span>`;
    sms.classList.add('show');
    clearTimeout(S.hideT);
    S.hideT = setTimeout(() => sms.classList.remove('show'), 20000);
}
sms.addEventListener('click', () => {
    sms.classList.remove('show');
    if (S.step === 'code' && S.code) fill(S.code, 0);
});

function setStatus(done) {
    const s = $('au-status');
    s.classList.toggle('done', !!done);
    $('au-status-t').textContent = done ? 'کد برای شما ارسال شد ✓' : 'در حال ارسال پیامک...';
}

function sendCode() {
    S.code = genCode();
    S.exp = Date.now() + CODE_TTL;
    S.tries = 0;
    S.resendAt = Date.now() + RESEND_AFTER;
    clearTimeout(S.smsT);
    setStatus(false);
    const c = S.code;
    S.smsT = setTimeout(() => { if (S.code === c) { showSms(c); setStatus(true); } }, SMS_DELAY);
}

function startTick() {
    clearInterval(S.tick);
    const upd = () => {
        const b = $('au-resend'); if (!b) return;
        const left = Math.ceil((S.resendAt - Date.now()) / 1000);
        if (left > 0) {
            const t = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
            b.disabled = true; b.textContent = 'ارسال مجدد کد تا ' + toFa(t);
        } else { b.disabled = false; b.textContent = 'ارسال مجدد کد'; }
    };
    upd(); S.tick = setInterval(upd, 500);
}

function refreshBtn() {
    if (!$('au-b-phone').dataset.busy) $('au-b-phone').disabled = !normPhone($('au-phone').value);
    $('au-b-code').disabled = otpVal().length !== CODE_LEN;
    $('au-b-profile').disabled = !($('au-name').value.trim() && validId($('au-handle').value.trim().replace(/^@/, '')) && !handleTaken('@' + $('au-handle').value.trim().replace(/^@/, '')));
}

function go(step) {
    S.step = step;
    STEPS.forEach(s => $('au-s-' + s).classList.toggle('on', s === step));
    [...$('au-dots').children].forEach((d, i) => d.classList.toggle('on', i === STEPS.indexOf(step)));
    const back = $('au-back');
    if (step === 'phone') { back.innerHTML = ICON_CLOSE; back.classList.toggle('hid', !S.dismissible); }
    else { back.innerHTML = ICON_BACK; back.classList.remove('hid'); }
    clearInterval(S.tick);
    if (step === 'phone') setTimeout(() => $('au-phone').focus(), 80);
    if (step === 'code') {
        $('au-code-p').innerHTML = `کد ${toFa(CODE_LEN)} رقمی به شماره‌ی <b>${toFa(S.phone)}</b> ارسال شد.`;
        $('au-pill').style.display = S.existing ? 'block' : 'none';
        otpClear(); startTick(); err('code', '');
    }
    if (step === 'profile') setTimeout(() => $('au-name').focus(), 80);
    ROOT.scrollTop = 0; refreshBtn();
}

function open(dismissible) {
    Object.assign(S, { phone: null, code: null, exp: 0, tries: 0, existing: null, dismissible: !!dismissible });
    $('au-phone').value = ''; $('au-name').value = ''; $('au-handle').value = '';
    COUNTRY = COUNTRIES[0]; renderChip(); closeSheet(); $('au-cc').classList.remove('hid'); $('au-avatar').textContent = '؟'; $('au-avatar').style.background = '';
    err('phone', ''); err('profile', ''); setLoad('au-b-phone', false);
    $('au-hint').textContent = '۳ تا ۲۰ کاراکتر؛ حروف انگلیسی، عدد و _ ؛ باید با حرف شروع شود.'; $('au-hint').className = 'au-hint';
    ROOT.classList.add('show'); go('phone');
}
function close() {
    ROOT.classList.remove('show');
    clearInterval(S.tick); clearTimeout(S.smsT); clearTimeout(S.hideT);
    sms.classList.remove('show'); S.code = null;
}

// ---------- کادر کد ----------
const otpVal = () => otp.map(i => i.value).join('');
function otpClear() { otp.forEach(i => { i.value = ''; i.classList.remove('f'); }); otpWrap.classList.remove('err'); setTimeout(() => otp[0].focus(), 80); refreshBtn(); }
function fill(digits, from) {
    const d = toEn(digits).replace(/\D/g, '').slice(0, CODE_LEN - from);
    [...d].forEach((ch, k) => { otp[from + k].value = ch; otp[from + k].classList.add('f'); });
    otp[Math.min(from + d.length, CODE_LEN - 1)].focus();
    afterOtp();
}
function afterOtp() { err('code', ''); refreshBtn(); if (otpVal().length === CODE_LEN) verifyCode(); }
otp.forEach((inp, i) => {
    inp.addEventListener('input', () => {
        const d = toEn(inp.value).replace(/\D/g, '');
        if (d.length > 1) { fill(d, i); return; }
        inp.value = d; inp.classList.toggle('f', !!d);
        if (d && i < CODE_LEN - 1) otp[i + 1].focus();
        afterOtp();
    });
    inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && i > 0) { otp[i - 1].value = ''; otp[i - 1].classList.remove('f'); otp[i - 1].focus(); refreshBtn(); }
    });
    inp.addEventListener('focus', () => inp.select());
});

// ---------- انتخاب کشور ----------
function renderChip() {
    $('au-cc-fl').innerHTML = flagHTML(COUNTRY.cc, 18);
    $('au-cc-d').textContent = '+' + COUNTRY.dial;
    $('au-phone').placeholder = COUNTRY.cc === 'IR' ? '912 345 6789' : 'شماره‌ی موبایل';
}
const normQ = q => toEn(String(q || '')).toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
function renderCountries(q) {
    q = normQ(q).replace(/^\+/, '');
    const list = COUNTRIES.filter(c => !q || normQ(c.fa).includes(q) || c.en.toLowerCase().includes(q) || c.dial.startsWith(q) || c.cc.toLowerCase() === q);
    $('au-clist').innerHTML = list.length ? list.map(c =>
        `<button type="button" class="au-crow ${c.cc === COUNTRY.cc ? 'sel' : ''}" data-cc="${c.cc}"><span class="au-fw">${flagHTML(c.cc, 20)}</span><span class="n">${c.fa}</span><span class="d">+${c.dial}</span></button>`
    ).join('') : '<div class="au-empty">کشوری پیدا نشد</div>';
}
function openSheet() { $('au-csearch').value = ''; renderCountries(''); sheet.classList.add('show'); setTimeout(() => $('au-csearch').focus(), 120); }
function closeSheet() { sheet.classList.remove('show'); }
$('au-cc').addEventListener('click', openSheet);
$('au-sheet-x').addEventListener('click', closeSheet);
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
$('au-csearch').addEventListener('input', e => renderCountries(e.target.value));
$('au-clist').addEventListener('click', e => {
    const b = e.target.closest('.au-crow'); if (!b) return;
    COUNTRY = COUNTRIES.find(c => c.cc === b.dataset.cc) || COUNTRIES[0];
    renderChip(); closeSheet(); err('phone', ''); refreshBtn();
    setTimeout(() => $('au-phone').focus(), 80);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('show')) closeSheet(); });

// ---------- مرحله ۱: شماره ----------
function submitPhone() {
    const p = normPhone($('au-phone').value);
    if (!p) { err('phone', COUNTRY.cc === 'IR' ? 'شماره‌ی واردشده معتبر نیست. مثال: 09123456789' : 'شماره‌ی واردشده معتبر نیست.'); return; }
    if (S.busy) return; S.busy = true;
    setLoad('au-b-phone', true); err('phone', '');
    S.phone = p; S.existing = findByPhone(p) || null;
    setTimeout(() => { S.busy = false; setLoad('au-b-phone', false); sendCode(); go('code'); }, 700);
}
$('au-phone').addEventListener('input', () => {
    const v = $('au-phone').value;
    $('au-cc').classList.toggle('hid', v.trim().startsWith('+'));
    err('phone', ''); refreshBtn();
});
$('au-phone').addEventListener('keydown', e => { if (e.key === 'Enter') submitPhone(); });
$('au-b-phone').addEventListener('click', submitPhone);

// ---------- مرحله ۲: کد ----------
function verifyCode() {
    const v = otpVal();
    if (v.length !== CODE_LEN) return;
    if (!S.code || Date.now() > S.exp) { err('code', 'کد منقضی شده است. کد جدید بگیرید.'); otpWrap.classList.add('err'); return; }
    if (v !== S.code) {
        S.tries++;
        otpWrap.classList.add('err');
        if (S.tries >= MAX_TRIES) { S.code = null; setTimeout(() => { go('phone'); err('phone', 'تعداد تلاش‌ها زیاد بود. دوباره شماره را وارد کنید.'); }, 450); return; }
        err('code', `کد اشتباه است. (${toFa(MAX_TRIES - S.tries)} تلاش باقی‌مانده)`);
        setTimeout(otpClear, 450); return;
    }
    S.code = null; sms.classList.remove('show');
    if (S.existing) { loginExisting(S.existing); return; }
    go('profile');
}
$('au-b-code').addEventListener('click', verifyCode);
$('au-resend').addEventListener('click', () => { sendCode(); startTick(); otpClear(); err('code', ''); });
$('au-edit-phone').addEventListener('click', () => { S.code = null; sms.classList.remove('show'); go('phone'); });

function loginExisting(acc) {
    close();
    if (acc.handle === state.user.handle) { showToast('شما هم‌اکنون وارد این حساب هستید.', 'info'); return; }
    switchAccount(acc.handle);
    showToast(`وارد حساب ${acc.handle} شدید.`, 'success');
}

// ---------- مرحله ۳: پروفایل ----------
function checkHandleLive() {
    const raw = $('au-handle').value.trim().replace(/^@/, '');
    const h = $('au-hint');
    const set = (t, c) => { h.textContent = t; h.className = 'au-hint' + (c ? ' ' + c : ''); };
    if (!raw) { set('۳ تا ۲۰ کاراکتر؛ حروف انگلیسی، عدد و _ ؛ باید با حرف شروع شود.'); return false; }
    if (!validId(raw)) { set('آیدی معتبر نیست (۳ تا ۲۰ کاراکتر، حروف انگلیسی/عدد/_ و شروع با حرف).', 'bad'); return false; }
    const t = handleTaken('@' + raw);
    if (t === 'banned') { set('این آیدی به دلیل نقض قوانین قابل استفاده نیست.', 'bad'); return false; }
    if (t) { set('این آیدی قبلا گرفته شده است.', 'bad'); return false; }
    set('این آیدی آزاد است ✓', 'ok'); return true;
}
$('au-name').addEventListener('input', () => {
    const n = $('au-name').value.trim();
    const av = $('au-avatar');
    av.textContent = n ? [...n][0] : '؟';
    av.style.background = n ? colorFor(n) : '';
    err('profile', ''); refreshBtn();
});
$('au-handle').addEventListener('input', () => { err('profile', ''); checkHandleLive(); refreshBtn(); });
$('au-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('au-handle').focus(); });
$('au-handle').addEventListener('keydown', e => { if (e.key === 'Enter') createAccount(); });
$('au-b-profile').addEventListener('click', createAccount);

function createAccount() {
    const name = $('au-name').value.trim();
    const raw = $('au-handle').value.trim().replace(/^@/, '');
    if (!name) { err('profile', 'نام نمایشی را وارد کنید.'); return; }
    if (!checkHandleLive()) { err('profile', 'آیدی انتخاب‌شده قابل استفاده نیست.'); return; }
    if (findByPhone(S.phone)) { err('profile', 'برای این شماره قبلا حساب ساخته شده است.'); return; }

    const handle = '@' + raw;
    const newUser = {
        name, handle, phone: S.phone, phoneVerifiedAt: Date.now(),
        bio: 'به Virasty خوش آمدید!',
        joinedDate: getCurrentPersianDate(),
        followers: 100, following: 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=400`,
        header: DEFAULT_HEADER, isVerified: false, badgeType: null, followedUsers: [],
        role: 'admin'
    };

    const idx = (state.accounts || []).findIndex(a => a.handle === state.user.handle);
    if (!state.accounts) state.accounts = [];
    if (idx !== -1) state.accounts[idx] = state.user; else state.accounts.push(state.user);

    state.user = newUser;
    saveNow();
    close();
    renderProfile(); renderFeeds(); renderAccountList();
    switchView('home');
    showToast(`خوش آمدید ${name} 🎉`, 'success');
}

// ---------- دکمه‌ی بالا (بستن / بازگشت) ----------
$('au-back').addEventListener('click', () => {
    if (S.step === 'phone') { if (S.dismissible) close(); return; }
    S.code = null; sms.classList.remove('show');
    go('phone');
});

window.openSignup = () => open(true);

// ---------- نمایش شماره‌ی ماسک‌شده در لیست حساب‌ها ----------
if (typeof window.renderAccountList === 'function') {
    const orig = window.renderAccountList;
    window.renderAccountList = function () {
        orig.apply(this, arguments);
        const c = $('account-list'); if (!c) return;
        c.querySelectorAll('.account-details').forEach(d => {
            const hEl = d.querySelector('.account-handle'); if (!hEl) return;
            const acc = owners().find(a => a.handle === hEl.textContent.trim());
            if (acc && acc.phone) {
                const s = document.createElement('span');
                s.className = 'au-phone'; s.textContent = maskPhone(acc.phone);
                hEl.after(s);
            }
        });
    };
    window.renderAccountList();
}

// ---------- جلوگیری از آیدی تکراری هنگام ویرایش پروفایل ----------
const saveBtn = $('btn-save-profile');
if (saveBtn) saveBtn.addEventListener('click', e => {
    const inp = $('edit-username'); if (!inp) return;
    const raw = inp.value.trim().replace(/@/g, '').replace(/\s+/g, '');
    if (!raw) return;
    const t = handleTaken('@' + raw, state.user.handle);
    if (t) {
        e.preventDefault(); e.stopImmediatePropagation();
        showToast(t === 'banned' ? 'این آیدی به دلیل نقض قوانین قابل استفاده نیست.' : 'این آیدی قبلا گرفته شده است.', 'error');
    }
}, true);

// ---------- اولین اجرا: تا حساب با شماره نداریم، صفحه‌ی ورود تمام‌صفحه ----------
if (needsGate()) open(false);

})();