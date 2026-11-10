// ============================================================
// features.js — قابلیت‌های جدید ویراستی (بعد از script.js لود می‌شود)
// ============================================================
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const enc = s => encodeURIComponent(s).replace(/'/g, '%27');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const R = []; const reg = f => R.push(f) - 1; window.fxR = (i, ...a) => R[i](...a);
const me = () => state.user.handle;
const all = () => [...state.posts, ...state.aiPosts];
const find = id => all().find(p => p.id == id);
const mine = () => [state.user, ...(state.accounts || []).filter(a => a.handle !== state.user.handle)];
const mineAcc = h => mine().find(a => a.handle === h);
const isAdmin = () => state.user.role === 'admin';
const rnd = a => a[Math.floor(Math.random() * a.length)];
const norm = s => String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const ic = n => `<svg><use href="#i-${n}"/></svg> `;
const emptyHTML = t => `<div class="empty-state"><h3>${t}</h3></div>`;
const pinSort = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.ts || 0) - (a.ts || 0);
const grid = imgs => `<div class="fx-img-grid n${imgs.length}">${imgs.map(s => `<img src="${s}" alt="">`).join('')}</div>`;

let fx = { reports: [], warnings: [] };
try { fx = { ...fx, ...JSON.parse(localStorage.getItem('viraasti_fx') || '{}') }; } catch (e) {}
const fxSave = () => { try { localStorage.setItem('viraasti_fx', JSON.stringify(fx)); } catch (e) {} };

let tempImages = [], composeQuote = null, chatReplyTo = null, fxPin = false;
const fxRes = new Set();

// ---------- مهاجرت داده‌های قدیمی ----------
mine().forEach(a => { a.role = a.role || 'admin'; });
(state.notifications = state.notifications || []).forEach(n => { if (!n.owner) { n.owner = me(); n.read = true; } });

// ---------- ابزارهای UI: منو و شیت ----------
function menu(items) {
    const m = $('post-options-menu');
    m.innerHTML = items.map(i => `<div class="post-option-item ${i.d ? 'danger' : ''}" onclick="closePostOptions();fxR(${reg(i.f)})">${i.t}</div>`).join('')
        + '<div class="post-option-item post-option-cancel" onclick="closePostOptions()">انصراف</div>';
    m.classList.add('show');
}
function sheet(title, html) {
    let m = $('fx-modal');
    if (!m) {
        m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'fx-modal';
        m.innerHTML = `<div class="modal-content"><div class="modal-header"><button type="button" class="icon-btn" onclick="document.getElementById('fx-modal').classList.remove('show')"><svg><use href="#i-close"/></svg></button><span class="modal-title" id="fx-title"></span><span style="width:40px"></span></div><div id="fx-body" style="padding:16px;overflow-y:auto;max-height:70vh"></div></div>`;
        document.body.appendChild(m);
    }
    $('fx-title').textContent = title; $('fx-body').innerHTML = html; m.classList.add('show');
}
const closeSheet = () => $('fx-modal') && $('fx-modal').classList.remove('show');

// ============================================================
// پارس متن: escape + منشن + هشتگ (۷)
// ============================================================
window.parseAll = function (t) {
    if (!t) return '';
    let s = String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(/(^|\s)(@[a-zA-Z0-9_\u0622-\u06CC\u06F0-\u06F9]+)/g, (m, a, b) =>
        `${a}<span class="mention" onclick="event.stopPropagation();openUserProfile(decodeURIComponent('${enc(b)}'))">${b}</span>`);
    s = s.replace(/(^|\s)(#[\w\u0622-\u06CC\u06F0-\u06F9\u200c]+)/g, (m, a, b) =>
        `${a}<span class="hashtag" onclick="event.stopPropagation();openHashtag(decodeURIComponent('${enc(b)}'))">${b}</span>`);
    return s;
};

// ============================================================
// اعلانات (۴، ۵، ۶)
// ============================================================
function updBadges() {
    const b = $('notif-badge'); if (!b) return;
    const n = state.notifications.filter(x => x.owner === me() && !x.read).length;
    b.textContent = n.toLocaleString('fa-IR'); b.style.display = n ? 'block' : 'none';
}
function notify(owner, text, type = 'info', link = null, extra = {}) {
    state.notifications.unshift({ id: uid(), text, type, time: Date.now(), read: false, owner, link, ...extra });
    if (state.notifications.length > 300) state.notifications.length = 300;
    save(); updBadges();
    if (owner === me() && $('view-notifications').classList.contains('active')) renderNotifications();
}
window.addNotification = (text, type = 'info') => notify(me(), text, type, null, { read: true });
function markRead() { state.notifications.forEach(n => { if (n.owner === me()) n.read = true; }); save(); updBadges(); }
function mentions(p) {
    (String(p.text || '').match(/@[a-zA-Z0-9_\u0622-\u06CC]+/g) || []).forEach(h => {
        const a = mineAcc(h); if (a && a.handle !== p.handle) notify(a.handle, `${p.author} شما را منشن کرد`, 'mention', { t: 'post', id: p.id });
    });
}
window.renderNotifications = function () {
    updBadges();
    const c = $('notifications-list'); if (!c) return;
    const l = state.notifications.filter(n => n.owner === me());
    if (!l.length) { c.innerHTML = emptyHTML('هیچ اعلانی ندارید'); return; }
    const icons = { like: 'heart', reply: 'reply', retweet: 'retweet', dm: 'mail', alert: 'alert', post: 'pen', follow: 'user', follow_request: 'user', mention: 'reply' };
    c.innerHTML = l.slice(0, 100).map(n => {
        let acts = '';
        if (n.type === 'follow_request') acts = n.done ? `<div class="fx-sub">${n.done === 'ok' ? 'تأیید شد' : 'رد شد'}</div>`
            : `<div class="fx-acts"><button onclick="event.stopPropagation();fxNReq('${n.id}',true)">تأیید</button><button onclick="event.stopPropagation();fxNReq('${n.id}',false)">رد</button></div>`;
        return `<div class="notification-item ${n.read ? '' : 'fx-unread'}" onclick="fxNotif('${n.id}')"><div class="notification-icon" style="${n.type === 'alert' ? 'background:rgba(249,24,128,.1);color:#f91880;' : ''}"><svg><use href="#i-${icons[n.type] || 'bell'}"/></svg></div><div class="notification-content"><div class="notification-text">${esc(n.text)}</div>${acts}<div class="notification-time">${formatTimeAgo(n.time)}</div></div></div>`;
    }).join('');
};
window.fxNotif = id => {
    const n = state.notifications.find(x => x.id === id); if (!n || !n.link) return; const l = n.link;
    if (l.t === 'post') openPostDetail({ target: document.body }, l.id); else if (l.t === 'user') openUserProfile(l.handle); else if (l.t === 'chat') openChat(l.handle);
};
window.fxNReq = (id, ok) => {
    const n = state.notifications.find(x => x.id === id); if (!n || n.done) return;
    const a = mineAcc(n.to), f = n.from;
    if (a) {
        a.pendingRequests = (a.pendingRequests || []).filter(x => x !== f);
        const fa = mineAcc(f); if (fa) fa.requested = (fa.requested || []).filter(x => x !== a.handle);
        if (ok) {
            a.approvedFollowers = a.approvedFollowers || [];
            if (!a.approvedFollowers.includes(f)) a.approvedFollowers.push(f);
            a.followers = (a.followers || 0) + 1;
            if (fa && !(fa.followedUsers || []).includes(a.handle)) { (fa.followedUsers = fa.followedUsers || []).push(a.handle); fa.following = (fa.following || 0) + 1; }
        }
    }
    n.done = ok ? 'ok' : 'no'; n.read = true; saveNow(); renderFeeds();
};

// ============================================================
// دیده‌شدن پست‌ها: بلاک، میوت، حساب خصوصی (۳۵، ۳۶، ۴۱)
// ============================================================
function fxVisible(p, feedCtx) {
    const u = state.user;
    if ((u.blocked || []).includes(p.handle)) return false;
    if (p.handle !== u.handle) {
        const a = mineAcc(p.handle);
        if (a && a.isPrivate && !(a.approvedFollowers || []).includes(u.handle)) return false;
        if (feedCtx) {
            if ((u.muted || []).includes(p.handle)) return false;
            const t = norm(p.text || '');
            if ((u.mutedWords || []).some(w => w && t.includes(norm(w)))) return false;
        }
    }
    return true;
}
const fxBlock = h => { const u = state.user; (u.blocked = u.blocked || []).includes(h) || u.blocked.push(h);
    if ((u.followedUsers || []).includes(h)) { u.followedUsers = u.followedUsers.filter(x => x !== h); u.following = Math.max(0, (u.following || 0) - 1); }
    save(); showToast(`${h} بلاک شد`, 'success'); renderFeeds(); };
window.fxUnblock = h => { state.user.blocked = (state.user.blocked || []).filter(x => x !== h); save(); showToast('بلاک برداشته شد', 'info'); renderFeeds(); if ($('view-user-profile').classList.contains('active')) openUserProfile(h); };
const fxMute = h => { const u = state.user; u.muted = u.muted || []; const i = u.muted.indexOf(h); i > -1 ? u.muted.splice(i, 1) : u.muted.push(h); save(); showToast(i > -1 ? 'میوت برداشته شد' : `${h} میوت شد`, 'info'); renderFeeds(); };
window.fxMore = h => {
    const u = state.user, b = (u.blocked || []).includes(h), m = (u.muted || []).includes(h);
    menu([{ t: ic('ban') + (b ? 'رفع بلاک' : 'بلاک کردن'), d: !b, f: () => b ? fxUnblock(h) : (fxBlock(h), openUserProfile(h)) },
          { t: ic('close') + (m ? 'رفع میوت' : 'میوت کردن'), f: () => fxMute(h) },
          { t: ic('alert') + 'گزارش کاربر', f: () => report(null, h) }]);
};
function report(postId, handle) {
    const p = postId && find(postId);
    const rs = ['اسپم', 'توهین یا آزار', 'محتوای نامناسب', 'اطلاعات نادرست', 'سایر'];
    sheet('گزارش', rs.map(r => `<button class="fx-btn" onclick="fxR(${reg(() => {
        fx.reports.unshift({ id: uid(), postId: postId || null, handle, preview: p ? String(p.text || '').slice(0, 80) : '', reason: r, by: me(), ts: Date.now(), open: true });
        fxSave(); closeSheet(); showToast('گزارش ثبت شد. ممنون', 'success'); })})">${r}</button>`).join(''));
}
function blocksSheet() {
    const u = state.user, row = (h, fn) => `<div class="fx-row"><span dir="ltr">${esc(h)}</span><button class="fx-btn" style="width:auto;margin:0" onclick="fxR(${reg(fn)})">حذف</button></div>`;
    const sec = (t, l) => `<h4>${t}</h4>` + (l || '<div class="fx-empty">خالی</div>');
    sheet('بلاک‌ها و میوت‌ها',
        sec('بلاک‌شده‌ها', (u.blocked || []).map(h => row(h, () => { fxUnblock(h); blocksSheet(); })).join('')) +
        sec('میوت‌شده‌ها', (u.muted || []).map(h => row(h, () => { fxMute(h); blocksSheet(); })).join('')) +
        sec('کلمات میوت‌شده', (u.mutedWords || []).map(w => row(w, () => { u.mutedWords = u.mutedWords.filter(x => x !== w); save(); renderFeeds(); blocksSheet(); })).join('')) +
        `<div class="fx-row"><input id="fx-word" class="poll-option-input" placeholder="کلمه‌ی جدید..." style="flex:1;margin-left:8px"><button class="fx-btn" style="width:auto;margin:0" onclick="fxR(${reg(() => {
            const v = $('fx-word').value.trim(); if (!v) return; (u.mutedWords = u.mutedWords || []).push(v); save(); renderFeeds(); blocksSheet(); })})">افزودن</button></div>`);
}

// ============================================================
// تنظیمات + نقش‌ها + پنل مدیریت (۳۸، ۳۹، ۴۰)
// ============================================================
function renderFxSettings() {
    let s = $('fx-settings');
    if (!s) { s = document.createElement('div'); s.id = 'fx-settings'; (document.querySelector('#view-settings .set-page') || $('view-settings')).appendChild(s); }
    const u = state.user;
    const chev = '<svg class="set-chev"><use href="#i-back"/></svg>';
    s.innerHTML = `<div class="set-block">
        <div class="set-title">حریم خصوصی و امنیت</div>
        <div class="set-group">
            <div class="set-row static">
                <span class="set-ic c-green"><svg><use href="#i-user"/></svg></span>
                <div class="set-label">حساب خصوصی<small>فقط دنبال‌کننده‌های تأییدشده ویراست‌های ${esc(u.handle)} را می‌بینند</small></div>
                <label class="switch"><input type="checkbox" ${u.isPrivate ? 'checked' : ''} onchange="fxR(${reg(v => { u.isPrivate = v; save(); showToast(v ? 'حساب شما خصوصی شد' : 'حساب شما عمومی شد', 'info'); })},this.checked)"><span class="slider"></span></label>
            </div>
            <button type="button" class="set-row" onclick="fxR(${reg(blocksSheet)})">
                <span class="set-ic c-red"><svg><use href="#i-ban"/></svg></span>
                <span class="set-label">بلاک‌ها و میوت‌ها</span>${chev}
            </button>
        </div>
    </div>
    <div class="set-block">
        <div class="set-title">${isAdmin() ? 'مدیریت' : 'نقش'}</div>
        <div class="set-group">
            ${isAdmin() ? `<button type="button" class="set-row" onclick="fxR(${reg(adminPanel)})">
                <span class="set-ic c-orange"><svg><use href="#i-settings"/></svg></span>
                <span class="set-label">پنل مدیریت</span>${chev}
            </button>` : ''}
            <div class="set-row static">
                <span class="set-ic c-gray"><svg><use href="#i-user"/></svg></span>
                <span class="set-label">نقش این حساب</span>
                <span class="set-value">${isAdmin() ? 'مدیر' : 'کاربر عادی'}</span>
            </div>
        </div>
    </div>`;
}

// ---------- تم برنامه (خودکار / روشن / تیره) ----------
{
    const KEY = 'virasty_theme';
    const get = () => { try { return localStorage.getItem(KEY) || 'dark'; } catch (e) { return 'dark'; } };
    const mark = () => document.querySelectorAll('#theme-seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === get()));
    document.querySelectorAll('#theme-seg button').forEach(b => b.addEventListener('click', () => {
        try { localStorage.setItem(KEY, b.dataset.mode); } catch (e) {}
        window.applyTheme(b.dataset.mode); mark();
    }));
    if (window.matchMedia) {
        const mq = matchMedia('(prefers-color-scheme: light)');
        const onChange = () => { if (get() === 'auto') window.applyTheme('auto'); };
        mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener && mq.addListener(onChange);
    }
    mark();
}
window.fxUnban = h => { state.bannedUsers = state.bannedUsers.filter(x => x !== h); save(); showToast(`بن ${h} برداشته شد`, 'success'); renderFeeds(); if ($('view-user-profile').classList.contains('active')) openUserProfile(h); };
function adminPanel() {
    if (!isAdmin()) return;
    const rep = fx.reports.filter(r => r.open);
    const done = r => { r.open = false; fxSave(); adminPanel(); };
    let h = `<h4>گزارش‌های باز (${rep.length.toLocaleString('fa-IR')})</h4>` + (rep.map(r => `<div class="fx-card"><div><b dir="ltr">${esc(r.handle)}</b> · ${esc(r.reason)}</div><div class="fx-sub">${esc(r.preview)}</div><div class="fx-acts">
        ${r.postId ? `<button onclick="fxR(${reg(() => { deletePost(r.postId); done(r); })})">حذف پست</button>` : ''}
        <button onclick="fxR(${reg(() => { if (!state.bannedUsers.includes(r.handle)) state.bannedUsers.push(r.handle);
            state.posts = state.posts.filter(p => p.handle !== r.handle); state.aiPosts = state.aiPosts.filter(p => p.handle !== r.handle); save(); renderFeeds(); done(r); })})">بن</button>
        <button onclick="fxR(${reg(() => done(r))})">رد گزارش</button></div></div>`).join('') || '<div class="fx-empty">گزارشی نیست</div>');
    h += `<h4>اکانت‌های بن‌شده</h4>` + (state.bannedUsers.map(b => `<div class="fx-row"><span dir="ltr">${esc(b)}</span><button class="fx-btn" style="width:auto;margin:0" onclick="fxR(${reg(() => { fxUnban(b); adminPanel(); })})">رفع بن</button></div>`).join('') || '<div class="fx-empty">خالی</div>');
    h += `<h4>سابقه‌ی اخطارها</h4>` + (fx.warnings.slice(0, 20).map(w => `<div class="fx-card"><b dir="ltr">${esc(w.to)}</b> · ${esc(w.reason)}<div class="fx-sub">${formatTimeAgo(w.ts)}</div></div>`).join('') || '<div class="fx-empty">خالی</div>');
    h += `<h4>نقش حساب‌ها</h4>` + mine().map(a => {
        const setRole = v => {
            if (v === 'user' && a.role === 'admin' && mine().filter(x => x.role === 'admin').length < 2) { showToast('حداقل یک مدیر لازم است', 'error'); return; }
            a.role = v; saveNow(); renderFxSettings(); adminPanel();
        }, i = reg(setRole), ad = a.role === 'admin';
        return `<div class="account-card" style="cursor:default"><div class="account-info"><img src="${a.avatar || DEFAULT_AVATAR}" class="account-avatar" alt=""><div class="account-details"><span class="account-name">${esc(a.name)}${getBadgeHTML(a.badgeType)}</span><span class="account-handle" dir="ltr" style="text-align:right">${esc(a.handle)}</span></div></div>
            <div class="fx-seg"><button type="button" class="${ad ? 'on' : ''}" onclick="fxR(${i},'admin')">مدیر</button><button type="button" class="${ad ? '' : 'on'}" onclick="fxR(${i},'user')">کاربر</button></div></div>`;
    }).join('');
    sheet('پنل مدیریت', h);
}
{ // نقش حساب تازه‌ساخته: کاربر عادی
    $('btn-create-account').addEventListener('click', () => { if (!state.user.role) { state.user.role = 'user'; saveNow(); renderFxSettings(); } });
}
const odp = deletePost;
window.deletePost = function (id) {
    const p = find(id);
    if (p && p.handle !== me() && !isAdmin()) { showToast('اجازه‌ی حذف این ویراست را ندارید', 'error'); return; }
    state.posts = state.posts.filter(x => x.replyTo !== id);
    odp(id);
};

// ============================================================
// منوی سه‌نقطه‌ی پست (۱۵، ۳۵–۴۰)
// ============================================================
window.openPostOptions = function (e, id) {
    e.stopPropagation();
    const p = find(id); if (!p) return;
    const mineP = p.handle === me(), ad = isAdmin(), it = [];
    if (mineP) {
        it.push({ t: ic('pen') + 'ویرایش ویراست', f: () => editPost(p.id) });
        it.push({ t: ic('bookmark') + (p.pinned ? 'برداشتن سنجاق' : 'سنجاق به پروفایل'), f: () => {
            const was = p.pinned; state.posts.forEach(x => { if (x.handle === p.handle) x.pinned = false; }); p.pinned = !was; save(); renderFeeds(); showToast(was ? 'سنجاق برداشته شد' : 'ویراست سنجاق شد', 'success'); } });
        it.push({ t: ic('trash') + 'حذف ویراست', d: 1, f: () => deletePost(p.id) });
    } else {
        it.push({ t: ic('alert') + 'گزارش ویراست', f: () => report(p.id, p.handle) });
        it.push({ t: ic('ban') + 'بلاک ' + esc(p.handle), d: 1, f: () => fxBlock(p.handle) });
        it.push({ t: ic('close') + 'میوت ' + esc(p.handle), f: () => fxMute(p.handle) });
        if (ad) {
            if (!splitBadge(p.badgeType).tick) ['blue', 'yellow', 'green', 'personal'].forEach(b => it.push({ t: `${getBadgeHTML(b)} دادن ${BADGE_TYPES[b].title}`, f: () => giveBadge(p.id, b) }));
            else it.push({ t: `${getBadgeHTML(splitBadge(p.badgeType).tick)} حذف نشان فعلی`, f: () => removeBadge(p.id) });
            it.push({ t: `${getBadgeHTML('star')} ${isPremiumBadge(p.badgeType) ? 'برداشتن کاربر ویژه' : 'فعال‌کردن کاربر ویژه'}`, f: () => toggleStar(p.id) });
            it.push({ t: ic('trash') + 'حذف ویراست (مدیر)', d: 1, f: () => deletePost(p.id) });
            it.push({ t: ic('alert') + 'اخطار به ارسال‌کننده', f: () => openWarnModal(p.id) });
            it.push({ t: ic('ban') + 'بن اکانت', d: 1, f: () => banUser(p.id) });
        }
    }
    if (ad) it.push(state.warnSenderAccount === p.handle ? { t: ic('close') + 'لغو اخطاردهنده', f: () => removeWarnSender(p.id) } : { t: ic('user') + 'تنظیم به عنوان اخطاردهنده', f: () => setWarnSender(p.id) });
    menu(it);
};

// ============================================================
// نوشتن پست: چندتصویری، شمارنده، پیش‌نویس، ویرایش، نقل‌قول (۱۶، ۱۹، ۲۰، ۲۳، ۲۴، ۳)
// ============================================================
const ta = $('compose-text'); $('upload-image').multiple = true;
const fxLim = () => postCharLimit(editingPostId ? state.user : (composeSelectedAccount || state.user));
ta.maxLength = fxLim();
const cnt = document.createElement('span'); cnt.id = 'fx-counter'; $('compose-modal').querySelector('.compose-footer').appendChild(cnt);
const updCnt = () => { const n = ta.value.length, L = fxLim(); cnt.textContent = `${n.toLocaleString('fa-IR')}/${L.toLocaleString('fa-IR')}`; cnt.className = n > L - 20 ? 'warn' : ''; };
{ // با عوض‌شدن اکانت نویسنده، سقف کاراکتر هم عوض شود (۲۸۰ یا ۵۰۰)
    const ouc = window.updateComposeUI;
    window.updateComposeUI = function () { const r = ouc.apply(this, arguments); ta.maxLength = fxLim(); updCnt(); return r; };
}
const dk = () => 'viraasti_draft_' + me();
let dt; ta.addEventListener('input', () => { updCnt(); if (editingPostId) return; clearTimeout(dt); dt = setTimeout(() => { try { ta.value.trim() ? localStorage.setItem(dk(), ta.value) : localStorage.removeItem(dk()); } catch (e) {} }, 400); });
const qp = document.createElement('div'); qp.id = 'fx-quote-prev'; document.querySelector('#compose-modal .compose-input-wrapper').after(qp);

function quoteCard(id, rm) {
    const q = find(id), x = rm ? `<button type="button" class="remove-q" onclick="event.stopPropagation();fxR(${reg(() => { composeQuote = null; renderQuote(); })})">×</button>` : '';
    if (!q) return `<div class="quote-card">این ویراست حذف شده است${x}</div>`;
    return `<div class="quote-card" onclick="event.stopPropagation();openPostDetail({target:document.body},'${q.id}')"><b>${esc(q.author)}</b> <span dir="ltr" style="color:var(--text-secondary)">${esc(q.handle)}</span><div>${parseAll(String(q.text || '').slice(0, 120))}</div>${q.image ? '<span>📷</span>' : ''}${x}</div>`;
}
const renderQuote = () => { qp.innerHTML = composeQuote ? quoteCard(composeQuote, true) : ''; };
function renderPrev() {
    const c = $('compose-image-preview');
    if (!tempImages.length) { c.style.display = 'none'; c.innerHTML = ''; return; }
    c.style.display = 'block';
    c.innerHTML = '<div class="fx-thumbs">' + tempImages.map((s, i) => `<div class="fx-thumb"><img src="${s}" alt=""><button type="button" onclick="fxRm(${i})">×</button></div>`).join('') + '</div>';
}
window.fxRm = i => { tempImages.splice(i, 1); renderPrev(); };
document.addEventListener('change', e => {
    if (!e.target || e.target.id !== 'upload-image') return;
    e.stopImmediatePropagation();
    const files = [...e.target.files].slice(0, 4 - tempImages.length); e.target.value = '';
    files.forEach(f => compressImage(f, 600, 600, b64 => { if (tempImages.length < 4) { tempImages.push(b64); renderPrev(); } }, null, 0.75));
}, true);

$('btn-compose').addEventListener('click', () => {
    if ($('view-messages').classList.contains('active')) return;
    tempPostImage = null; tempImages = []; composeQuote = null; renderPrev(); renderQuote(); ta.maxLength = fxLim();
    const d = localStorage.getItem(dk());
    if (d) { ta.value = d; updateComposeHighlight(); showToast('پیش‌نویس قبلی بازیابی شد', 'info'); }
    updCnt();
});
const oedit = editPost;
window.editPost = function (id) {
    oedit(id);
    const p = state.posts.find(x => x.id == id); if (!p) return;
    tempImages = (p.images && p.images.length ? p.images : p.image ? [p.image] : []).slice(); composeQuote = null; renderPrev(); renderQuote(); updCnt();
    if (p.poll) {
        $('compose-poll-container').style.display = 'block'; $('poll-question').value = p.poll.question;
        const l = $('poll-options-list'); l.innerHTML = '';
        p.poll.options.forEach(o => { const i = document.createElement('input'); i.type = 'text'; i.className = 'poll-option-input'; i.value = o.text; l.appendChild(i); });
    }
};
function applyPollEdit(p) {
    const q = $('poll-question').value.trim(), ins = [...document.querySelectorAll('.poll-option-input')], vals = ins.map(i => i.value.trim()).filter(Boolean);
    if (!q || vals.length < 2) { showToast('سوال و حداقل ۲ گزینه وارد کنید.', 'error'); return false; }
    p.poll.question = q;
    if (p.poll.options.reduce((s, o) => s + o.votes, 0) === 0) p.poll.options = vals.map(t => ({ text: t, votes: 0 }));
    else p.poll.options.forEach((o, i) => { if (ins[i] && ins[i].value.trim()) o.text = ins[i].value.trim(); });
    return true;
}
function startQuote(id) { $('btn-compose').click(); composeQuote = id; renderQuote(); }
function closeCompose() { $('compose-modal').classList.remove('show'); tempImages = []; composeQuote = null; renderPrev(); renderQuote(); }

{ // جایگزینی دکمه‌ی ارسال
    const old = $('btn-submit-post'), nb = old.cloneNode(true); old.replaceWith(nb);
    nb.addEventListener('click', () => {
        if (ta.value.length > fxLim()) { showToast(`حداکثر ${fxLim().toLocaleString('fa-IR')} کاراکتر مجاز است.`, 'error'); return; }
        const text = ta.value.trim();
        if (editingPostId) {
            const p = state.posts.find(x => x.id === editingPostId); if (!p) return;
            if (!text && !tempImages.length && !p.poll) { showToast('متن یا تصویر وارد کنید.', 'error'); return; }
            if (p.poll && !applyPollEdit(p)) return;
            p.text = text; p.images = tempImages.slice(); p.image = tempImages[0] || null; p.edited = true;
            editingPostId = null; saveNow(); closeCompose(); renderFeeds(); return;
        }
        const a = composeSelectedAccount || state.user;
        let poll = null;
        if ($('compose-poll-container').style.display !== 'none') {
            const q = $('poll-question').value.trim(), opts = [...document.querySelectorAll('.poll-option-input')].map(i => i.value.trim()).filter(Boolean).map(t => ({ text: t, votes: 0 }));
            if (!q || opts.length < 2) { showToast('سوال و حداقل ۲ گزینه وارد کنید.', 'error'); return; }
            poll = { question: q, options: opts, votedIndex: null, aiVoters: {}, maxVotes: Math.max(5, Math.floor((a.followers || 100) * 1.1)) };
        }
        if (!text && !tempImages.length && !poll && !composeQuote) { showToast('متن یا تصویر وارد کنید.', 'error'); return; }
        const post = { id: uid(), author: a.name, handle: a.handle, avatar: a.avatar || DEFAULT_AVATAR, isVerified: a.isVerified, badgeType: a.badgeType, ts: Date.now(),
            joinedDate: a.joinedDate || getCurrentPersianDate(), text, image: tempImages[0] || null, images: tempImages.slice(), poll, quoteOf: composeQuote || null,
            stats: generateStats(a.followers || 100, 0), myReaction: null, liked: false, retweeted: false, bookmarked: false };
        state.posts.unshift(post); mentions(post);
        if (post.quoteOf) { const q = find(post.quoteOf), o = q && mineAcc(q.handle); if (o && o.handle !== a.handle) notify(o.handle, `${a.name} ویراست شما را نقل‌قول کرد`, 'retweet', { t: 'post', id: post.id }); }
        try { localStorage.removeItem(dk()); } catch (e) {}
        addNotification('ویراست شما با موفقیت منتشر شد.', 'post');
        saveNow(); closeCompose(); switchView('home'); renderFeeds();
    });
}

// ============================================================
// نمایش پست (کارت): پاسخ، سنجاق، نقل‌قول، تصاویر، نتایج نظرسنجی
// ============================================================
const ocp = createPostHTML;
window.createPostHTML = function (p) {
    const res = p.poll && p.poll.votedIndex === null && fxRes.has(p.id); if (res) p.poll.votedIndex = -1;
    let h; try { h = ocp(p); } finally { if (res) p.poll.votedIndex = null; }
    if (p.poll) {
        if (res) h = h.replace('· شما رأی داده‌اید', () => '');
        if (p.poll.votedIndex === null) h = h.replace('class="poll-footer">', () => `class="poll-footer"><a class="poll-toggle" onclick="event.stopPropagation();fxToggleRes('${p.id}')">${res ? 'پنهان کردن نتایج' : 'مشاهده نتایج'}</a> · `);
    }
    if (p.replyTo) { const par = find(p.replyTo), ph = par ? par.handle : '';
        h = h.replace('<div class="post-text">', () => `<div class="fx-replying">در پاسخ به ${par ? `<span class="mention" onclick="event.stopPropagation();openUserProfile(decodeURIComponent('${enc(ph)}'))">${esc(ph)}</span>` : 'ویراست حذف‌شده'}</div><div class="post-text">`); }
    if (fxPin && p.pinned) h = h.replace('<div class="post-text">', () => '<div class="pin-label">📌 سنجاق‌شده</div><div class="post-text">');
    if (p.quoteOf) h = h.replace('<div class="post-actions">', () => quoteCard(p.quoteOf) + '<div class="post-actions">');
    if (p.images && p.images.length > 1) h = h.replace(`<img src="${p.image}" class="post-img" alt="Post Image">`, () => grid(p.images));
    if (p.edited) h = h.replace(/(class="post-time"[^>]*>)([^<]*)(<\/span>)/, (m, a, b, c) => `${a}${b} · ویرایش‌شده${c}`);
    h = h.replace('<button type="button" class="action-btn"><svg><use href="#i-reply"/>', () => `<button type="button" class="action-btn" onclick="event.stopPropagation();openReplyBox('${p.id}')"><svg><use href="#i-reply"/>`);
    return h;
};
window.fxToggleRes = id => { fxRes.has(id) ? fxRes.delete(id) : fxRes.add(id); renderFeeds(); };

// ============================================================
// بازنشر و نقل‌قول (۳)، لایک با اعلان
// ============================================================
function retweetMenu(id) {
    const rt = (state.user.retweets = state.user.retweets || []), on = rt.includes(id);
    menu([{ t: ic('retweet') + (on ? 'لغو بازنشر' : 'بازنشر'), f: () => {
        const p = find(id); if (!p) return;
        if (on) rt.splice(rt.indexOf(id), 1); else rt.push(id);
        p.retweeted = !on; p.stats.retweets = faNum(parseStatNum(p.stats.retweets) + (on ? -1 : 1));
        const o = mineAcc(p.handle); if (!on && o && o.handle !== me()) notify(o.handle, `${state.user.name} ویراست شما را بازنشر کرد`, 'retweet', { t: 'post', id });
        save(); renderFeeds(); } },
        { t: ic('pen') + 'نقل‌قول', f: () => startQuote(id) }]);
}
const otg = toggleAction;
window.toggleAction = function (e, id, type) {
    if (type === 'retweet') { e.stopPropagation(); retweetMenu(id); return; }
    otg(e, id, type);
    const p = find(id), o = p && mineAcc(p.handle);
    if (type === 'like' && p.liked && o && o.handle !== me()) notify(o.handle, `${state.user.name} ویراست شما را پسندید`, 'like', { t: 'post', id });
};

// ============================================================
// جزئیات پست: اکشن‌ها + پاسخ‌ها (۱، ۲)
// ============================================================
const orp = renderPostDetail;
window.renderPostDetail = function (id) {
    const pv = $('fx-reply-text'), keep = pv ? { v: pv.value, f: document.activeElement === pv } : null;
    orp(id);
    const p = find(id), c = $('post-detail-content'); if (!p || !c) return;
    const pt = c.querySelector('.post-text');
    if (pt) {
        if (p.quoteOf) pt.insertAdjacentHTML('afterend', quoteCard(p.quoteOf));
        if (p.replyTo) { const par = find(p.replyTo); pt.insertAdjacentHTML('beforebegin', `<div class="fx-replying" onclick="openPostDetail({target:document.body},'${p.replyTo}')">در پاسخ به ${par ? esc(par.handle) : 'ویراست حذف‌شده'}</div>`); }
    }
    const im = c.querySelector('img.post-img'); if (im && p.images && p.images.length > 1) im.outerHTML = grid(p.images);
    const replies = state.posts.filter(x => x.replyTo === p.id && fxVisible(x, false)).sort((a, b) => a.ts - b.ts);
    c.insertAdjacentHTML('beforeend', `<div class="post-actions fx-dact">
        <button type="button" class="action-btn" onclick="document.getElementById('fx-reply-text').focus()"><svg><use href="#i-reply"/></svg> ${formatStatDisplay(p.stats.replies)}</button>
        <button type="button" class="action-btn retweet-btn ${p.retweeted ? 'retweeted' : ''}" onclick="toggleAction(event,'${p.id}','retweet')"><svg><use href="#i-retweet"/></svg> ${formatStatDisplay(p.stats.retweets)}</button>
        <button type="button" class="action-btn like-btn ${p.liked ? 'liked' : ''}" onclick="toggleAction(event,'${p.id}','like')"><svg><use href="#i-heart"/></svg> ${formatStatDisplay(p.stats.likes)}</button>
        <button type="button" class="action-btn bookmark-btn ${p.bookmarked ? 'bookmarked' : ''}" onclick="toggleAction(event,'${p.id}','bookmark')"><svg><use href="#i-bookmark"/></svg></button></div>
        <div class="fx-reply-box"><textarea id="fx-reply-text" rows="2" maxlength="${postCharLimit(state.user)}" placeholder="پاسخ خود را بنویسید..."></textarea><button type="button" class="btn-primary" onclick="submitReply('${p.id}')">پاسخ</button></div>
        <div>${replies.length ? replies.map(createPostHTML).join('') : '<div class="fx-empty">هنوز پاسخی نیست</div>'}</div>`);
    if (keep) { const n = $('fx-reply-text'); n.value = keep.v; if (keep.f) n.focus(); }
};
window.openReplyBox = id => { activePostId = id; renderPostDetail(id); switchView('post-detail'); setTimeout(() => { const n = $('fx-reply-text'); n && n.focus(); }, 100); };
window.submitReply = pid => {
    const t = $('fx-reply-text'), text = t.value.trim(), par = find(pid), u = state.user;
    if (!text) { showToast('متن پاسخ را بنویسید.', 'error'); return; } if (!par) return;
    const r = { id: uid(), author: u.name, handle: u.handle, avatar: u.avatar || DEFAULT_AVATAR, isVerified: u.isVerified, badgeType: u.badgeType, ts: Date.now(),
        joinedDate: u.joinedDate || getCurrentPersianDate(), text, image: null, poll: null, stats: generateStats(u.followers || 100, 0),
        myReaction: null, liked: false, retweeted: false, bookmarked: false, replyTo: pid };
    state.posts.unshift(r); par.stats.replies = faNum(parseStatNum(par.stats.replies) + 1);
    const o = mineAcc(par.handle); if (o && o.handle !== u.handle) notify(o.handle, `${u.name} به ویراست شما پاسخ داد`, 'reply', { t: 'post', id: pid });
    mentions(r); t.value = ''; saveNow(); renderFeeds();
};

// ============================================================
// فید، پروفایل و تب‌ها (۱۳)
// ============================================================
window.renderFeeds = function () {
    const m = me(), rt = state.user.retweets || [];
    all().forEach(p => { p.retweeted = rt.includes(p.id); });
    let l;
    if (currentHomeTab === 'foryou') l = all();
    else { const f = state.user.followedUsers || []; l = all().filter(p => f.includes(p.handle) || p.handle === m || rt.includes(p.id)); }
    l = l.filter(p => !p.replyTo && fxVisible(p, true)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    $('feed').innerHTML = l.length ? l.map(createPostHTML).join('') : emptyHTML('هنوز ویراستی نیست');
    renderProfileFeed(); renderMessages(); renderNotifications();
    const bm = all().filter(p => p.bookmarked && fxVisible(p, false));
    $('bookmarks-feed').innerHTML = bm.length ? bm.map(createPostHTML).join('') : emptyHTML('نشانکی ندارید');
    if (activePostId && $('view-post-detail').classList.contains('active')) renderPostDetail(activePostId);
};
window.renderProfileFeed = function () {
    const c = $('profile-feed'); if (!c) return;
    const my = state.posts.filter(p => p.handle === me()), T = currentProfileTab, rt = state.user.retweets || [];
    let l;
    if (T === 'بازنشرها') l = all().filter(p => rt.includes(p.id));
    else if (T === 'پاسخ‌ها') l = my.filter(p => p.replyTo);
    else if (T === 'رسانه') l = my.filter(p => p.image && !p.replyTo);
    else if (T === 'واکنش‌ها') l = all().filter(p => p.myReaction);
    else if (T === 'لایک‌ها') l = all().filter(p => p.liked);
    else l = my.filter(p => !p.replyTo);
    l = l.filter(p => fxVisible(p, false)).sort(pinSort);
    fxPin = T === 'ویراست‌ها'; c.innerHTML = l.length ? l.map(createPostHTML).join('') : emptyHTML('محتوایی یافت نشد'); fxPin = false;
};
{ // تب لایک‌ها
    const pt = document.querySelector('#view-profile .profile-tabs'), b = document.createElement('button');
    b.type = 'button'; b.className = 'ptab'; b.textContent = 'لایک‌ها'; pt.appendChild(b);
    b.addEventListener('click', () => { pt.querySelectorAll('.ptab').forEach(t => t.classList.remove('active')); b.classList.add('active'); currentProfileTab = 'لایک‌ها'; renderProfileFeed(); });
}

// ============================================================
// پروفایل دیگران: پیام، بلاک/میوت/گزارش، خصوصی، رفع بن (۱۱، ۳۵–۳۸، ۴۱)
// ============================================================
const oup = openUserProfile;
window.openUserProfile = function (raw) {
    oup(raw); if (!raw) return;
    const h = '@' + String(raw).replace(/@/g, '').trim(), u = state.user; if (h === u.handle) return;
    const c = $('user-profile-content'); if (!c) return;
    if (state.bannedUsers.includes(h)) {
        if (isAdmin()) c.insertAdjacentHTML('beforeend', `<div style="text-align:center;margin-top:12px"><button class="btn-primary" onclick="fxUnban(decodeURIComponent('${enc(h)}'))">رفع بن</button></div>`);
        return;
    }
    const row = c.querySelector('.profile-actions-row'), fb = row && row.querySelector('.btn-follow-profile'); if (!fb) return;
    const blocked = (u.blocked || []).includes(h), acc = mineAcc(h), locked = acc && acc.isPrivate && !(acc.approvedFollowers || []).includes(u.handle),
        req = (u.requested || []).includes(h), hq = `decodeURIComponent('${enc(h)}')`;
    const w = document.createElement('div'); w.className = 'fx-pa'; fb.replaceWith(w);
    w.insertAdjacentHTML('beforeend', `<button type="button" class="icon-btn fx-round" onclick="event.stopPropagation();fxMore(${hq})"><svg><use href="#i-more"/></svg></button><button type="button" class="icon-btn fx-round" onclick="openChat(${hq})"><svg><use href="#i-mail"/></svg></button>`);
    if (blocked) w.insertAdjacentHTML('beforeend', `<button type="button" class="btn-follow-profile" onclick="fxUnblock(${hq})">رفع بلاک</button>`);
    else {
        if (req) { fb.classList.add('following'); fb.firstElementChild.textContent = 'درخواست ارسال شد'; }
        else if (locked && !fb.classList.contains('following')) fb.firstElementChild.textContent = 'درخواست دنبال کردن';
        w.appendChild(fb);
    }
    const feed = $('other-profile-feed');
    if (feed) {
        if (blocked) feed.innerHTML = emptyHTML('شما این کاربر را بلاک کرده‌اید');
        else if (locked) feed.innerHTML = emptyHTML('🔒 این حساب خصوصی است');
        else { const l = all().filter(p => p.handle === h && !p.replyTo && fxVisible(p, false)).sort(pinSort);
            fxPin = true; feed.innerHTML = l.length ? l.map(createPostHTML).join('') : emptyHTML('محتوایی یافت نشد'); fxPin = false; }
    }
};

// ============================================================
// فالو، درخواست فالو، لیست دنبال‌کننده‌ها (۱۲، ۴۱)
// ============================================================
const otf = toggleFollow;
window.toggleFollow = function (e, h) {
    e.stopPropagation(); const u = state.user;
    if ((u.blocked || []).includes(h)) { showToast('ابتدا بلاک را بردارید.', 'error'); return; }
    const following = (u.followedUsers || []).includes(h), acc = mineAcc(h);
    if (acc && acc.handle !== u.handle) {
        if (!following && acc.isPrivate) {
            u.requested = u.requested || []; acc.pendingRequests = acc.pendingRequests || [];
            if (u.requested.includes(h)) { u.requested = u.requested.filter(x => x !== h); acc.pendingRequests = acc.pendingRequests.filter(x => x !== u.handle); state.notifications = state.notifications.filter(n => !(n.type === 'follow_request' && n.from === u.handle && n.to === h && !n.done)); showToast('درخواست لغو شد', 'info'); }
            else { u.requested.push(h); acc.pendingRequests.push(u.handle); notify(h, `${u.name} درخواست دنبال کردن شما را داد`, 'follow_request', { t: 'user', handle: u.handle }, { from: u.handle, to: h }); showToast('درخواست ارسال شد', 'success'); }
            save(); openUserProfile(h); return;
        }
        acc.approvedFollowers = acc.approvedFollowers || [];
        if (following) { acc.approvedFollowers = acc.approvedFollowers.filter(x => x !== u.handle); acc.followers = Math.max(0, (acc.followers || 0) - 1); }
        else { acc.approvedFollowers.push(u.handle); acc.followers = (acc.followers || 0) + 1; notify(h, `${u.name} شما را دنبال کرد`, 'follow', { t: 'user', handle: u.handle }); }
    }
    otf(e, h);
};
function userList(h, type) {
    const a = mineAcc(h);
    const list = type === 'following' ? (a ? a.followedUsers || [] : [])
        : [...new Set([...(a ? a.approvedFollowers || [] : []), ...mine().filter(x => (x.followedUsers || []).includes(h)).map(x => x.handle)])];
    sheet(type === 'following' ? 'دنبال‌شده‌ها' : 'دنبال‌کننده‌ها', list.length ? list.map(x => {
        const i = getUserInfo(x);
        return `<div class="new-chat-user" onclick="fxR(${reg(() => { closeSheet(); openUserProfile(x); })})"><img src="${i.avatar}" alt=""><div class="new-chat-user-info"><span class="new-chat-user-name">${esc(i.name)}${getBadgeHTML(i.badgeType)}</span><span class="new-chat-user-handle">${esc(i.handle)}</span></div></div>`;
    }).join('') : '<div class="fx-empty">فهرستی برای نمایش نیست</div>');
}
document.addEventListener('click', e => {
    const s = e.target.closest('.profile-stats span'); if (!s) return;
    const idx = [...s.parentNode.children].indexOf(s); let h;
    if (s.closest('#view-profile')) h = me(); else { const el = document.querySelector('#user-profile-content .profile-handle'); h = el && el.textContent.trim(); }
    if (h) userList(h, idx === 0 ? 'following' : 'followers');
});

// ============================================================
// جستجو: کاربران + پست‌ها + هشتگ (۷، ۹)
// ============================================================
let si = $('search-input'); { const n = si.cloneNode(true); si.replaceWith(n); si = n; }
function doSearch(raw) {
    const q = norm(raw.trim()), box = $('search-results'); if (!q) { renderTrends(); return; }
    const handles = new Set([...all().map(p => p.handle), ...mine().map(a => a.handle)]);
    const users = [...handles].filter(h => !state.bannedUsers.includes(h) && !(state.user.blocked || []).includes(h)).map(h => getUserInfo(h))
        .filter(i => norm(i.handle).includes(q.replace(/^@/, '@')) || norm(i.name).includes(q)).slice(0, 6);
    const posts = all().filter(p => fxVisible(p, false) && (norm(p.text).includes(q) || norm(p.author).includes(q))).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    box.innerHTML = (users.length ? '<div style="padding:0 16px">' + users.map(i => `<div class="new-chat-user" onclick="openUserProfile(decodeURIComponent('${enc(i.handle)}'))"><img src="${i.avatar}" alt=""><div class="new-chat-user-info"><span class="new-chat-user-name">${esc(i.name)}${getBadgeHTML(i.badgeType)}</span><span class="new-chat-user-handle">${esc(i.handle)}</span></div></div>`).join('') + '</div>' : '')
        + (posts.length ? posts.map(createPostHTML).join('') : (users.length ? '' : emptyHTML('نتیجه‌ای یافت نشد')));
}
let st; si.addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => doSearch(e.target.value), 200); });
window.openHashtag = tag => { switchView('search'); si.value = tag; doSearch(tag); };

// ============================================================
// پیام‌رسانی: لیست، پاسخ، ویرایش/حذف، تیک خوانده‌شدن، تایپ (۲۹–۳۲)
// ============================================================
window.renderMessages = function () {
    const c = $('messages-list'); if (!c) return;
    const av = $('messages-header-avatar'); if (av) av.src = state.user.avatar || DEFAULT_AVATAR;
    const m = me(), my = state.directMessages.filter(x => x.sender === m || x.recipient === m);
    const unread = x => x.recipient === m && x.sender !== m && !x.read;
    const badge = $('dm-badge'), n = my.filter(unread).length;
    badge.textContent = n.toLocaleString('fa-IR'); badge.style.display = n ? 'block' : 'none';
    const g = {}; my.forEach(x => { const p = x.sender === m ? x.recipient : x.sender; if ((state.user.blocked || []).includes(p)) return; (g[p] = g[p] || []).push(x); });
    const rows = Object.entries(g).map(([p, ms]) => { ms.sort((a, b) => b.ts - a.ts); return { p, ms }; }).sort((a, b) => b.ms[0].ts - a.ms[0].ts);
    if (!rows.length) { c.innerHTML = emptyHTML('هیچ پیامی ندارید'); return; }
    c.innerHTML = rows.map(({ p, ms }) => {
        const l = ms[0], i = getUserInfo(p), un = ms.filter(unread).length, sup = p === '@support', h = `decodeURIComponent('${enc(p)}')`;
        return `<div class="dm-item"><img src="${l.sender === p && l.senderAvatar || i.avatar}" class="dm-avatar" onclick="event.stopPropagation();openUserProfile(${h})" style="object-fit:${sup ? 'contain' : 'cover'};background:${sup ? 'white' : 'transparent'}">
            <div class="dm-content" onclick="openChat(${h})"><div class="dm-header"><span class="dm-name">${esc(l.sender === p && l.senderName || i.name)}${getBadgeHTML(l.sender === p && l.badgeType || i.badgeType)}</span><span class="dm-time">${formatTimeAgo(l.ts)}</span></div>
            <div class="dm-text">${l.sender === m ? 'شما: ' : ''}${warnData(l) ? '⚠️ اخطار: ' + esc(warnData(l).reason) : parseAll(String(l.text || '').slice(0, 80))}</div></div>
            ${un ? `<span class="nav-badge" style="position:relative;top:0;right:0;align-self:center">${un.toLocaleString('fa-IR')}</span>` : ''}</div>`;
    }).join('');
};
const rb = document.createElement('div'); rb.id = 'fx-reply-bar'; document.querySelector('#view-chat .chat-input-area').before(rb);
function showRB() { const m = chatReplyTo && state.directMessages.find(x => x.id === chatReplyTo); rb.style.display = m ? 'flex' : 'none'; rb.innerHTML = m ? `<span>پاسخ به: ${esc(String(m.text || '').slice(0, 50))}</span><button type="button" onclick="fxCancelReply()">×</button>` : ''; }
window.fxCancelReply = () => { chatReplyTo = null; showRB(); };
const chatOpen = h => activeChatUser === h && $('view-chat').classList.contains('active');
function renderChatMessages() {
    const c = $('chat-messages'), h = activeChatUser, m = me(); if (!c || !h) return;
    const ms = state.directMessages.filter(x => (x.sender === m && x.recipient === h) || (x.sender === h && x.recipient === m)).sort((a, b) => a.ts - b.ts);
    if (!ms.length) { c.innerHTML = emptyHTML(`شروع گفتگو با ${esc(getUserInfo(h).name)}`); return; }
    const own = !!mineAcc(h);
    c.innerHTML = ms.map(x => {
        const sent = x.sender === m, seen = own ? x.read : Date.now() - x.ts > 6000;
        const q = x.replyTo && state.directMessages.find(y => y.id === x.replyTo), wd = warnData(x);
        return `<div class="chat-bubble ${sent ? 'sent' : 'received'}${wd ? ' fx-warnbubble' : ''}" onclick="msgMenu(event,'${x.id}')">${wd ? warnCard(wd, x.senderName) : `${x.replyTo ? `<div class="fx-msg-quote">${esc(q ? String(q.text || '').slice(0, 60) : 'پیام حذف شده')}</div>` : ''}${parseAll(x.text)}${x.image ? `<img src="${x.image}" alt="Image">` : ''}`}<div class="chat-time">${formatTimeAgo(x.ts)}${x.edited ? ' · ویرایش‌شده' : ''}${sent ? (seen ? ' ✓✓' : ' ✓') : ''}</div></div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
}
const ooc = openChat;
window.openChat = function (h) { chatReplyTo = null; showRB(); ooc(h); renderChatMessages(); syncChat(h); setTimeout(() => { const c = $('chat-messages'); c.scrollTop = c.scrollHeight; }, 120); };
window.msgMenu = (e, id) => {
    e.stopPropagation(); const x = state.directMessages.find(y => y.id === id); if (!x) return;
    const it = [{ t: ic('reply') + 'پاسخ', f: () => { chatReplyTo = id; showRB(); $('chat-input').focus(); } }];
    if (x.sender === me()) {
        if (!x.image && !warnData(x)) it.push({ t: ic('pen') + 'ویرایش', f: () => { const t = prompt('ویرایش پیام', x.text); if (t && t.trim()) { x.text = t.trim(); x.edited = true; save(); renderChatMessages(); } } });
        it.push({ t: ic('trash') + 'حذف پیام', d: 1, f: () => { state.directMessages = state.directMessages.filter(y => y.id !== id); save(); renderChatMessages(); renderMessages(); } });
    }
    menu(it);
};
function setTyping(h, on) { if (chatOpen(h)) $('chat-header-handle').textContent = on ? 'در حال تایپ…' : getUserInfo(h).handle; }
function autoReply(to) {
    if (mineAcc(to) || closedChat(to) || Math.random() > 0.75) return;
    setTimeout(() => setTyping(to, true), 1200);
    setTimeout(() => {
        setTyping(to, false); const i = getUserInfo(to), open = chatOpen(to);
        state.directMessages.push({ id: uid(), sender: to, senderName: i.name, senderAvatar: i.avatar, badgeType: i.badgeType, recipient: me(), text: rnd(['سلام! ممنون از پیامت 😊', 'باشه، حتماً', 'چه خبر؟', 'دمت گرم 🙏', 'بعداً باهات صحبت می‌کنم']), ts: Date.now(), read: open });
        save(); open ? renderChatMessages() : renderMessages();
    }, 3800);
}
{ // جایگزینی دکمه‌ی ارسال چت
    const old = $('btn-send-chat'), nb = old.cloneNode(true); old.replaceWith(nb);
    nb.addEventListener('click', () => {
        const inp = $('chat-input'), text = inp.value.trim(), to = activeChatUser, u = state.user; if (!text || !to) return;
        if ((u.blocked || []).includes(to)) { showToast('این کاربر را بلاک کرده‌اید.', 'error'); return; }
        if (closedChat(to)) { showToast(NOCHAT, 'error'); return; }
        const own = mineAcc(to) && to !== u.handle;
        state.directMessages.push({ id: uid(), sender: u.handle, senderName: u.name, senderAvatar: u.avatar, isVerified: u.isVerified, badgeType: u.badgeType, recipient: to, text, ts: Date.now(), read: !own, replyTo: chatReplyTo || null });
        if (own) notify(to, `پیام جدید از ${u.name}`, 'dm', { t: 'chat', handle: u.handle });
        inp.value = ''; chatReplyTo = null; showRB(); save(); renderChatMessages(); renderMessages();
        autoReply(to); setTimeout(() => chatOpen(to) && renderChatMessages(), 6200);
    });
}

// ============================================================
// شبیه‌ساز تعامل (لایک/بازنشر/پاسخ/فالو برای حساب‌های شما)
// ============================================================
function simTick() {
    const seeds = []; const seen = new Set();
    state.aiPosts.forEach(p => { if (!seen.has(p.handle) && !aiBadUsers.some(b => b.handle === p.handle) && !state.bannedUsers.includes(p.handle)) { seen.add(p.handle); seeds.push(p); } });
    if (!seeds.length) return;
    mine().forEach(a => {
        const ps = state.posts.filter(p => p.handle === a.handle && !p.replyTo && Date.now() - p.ts < 6 * 3600e3);
        if (ps.length && Math.random() < 0.5) {
            const p = rnd(ps), s = rnd(seeds), r = Math.random(), link = { t: 'post', id: p.id };
            if (r < 0.6) notify(a.handle, `${s.author} ویراست شما را پسندید`, 'like', link);
            else if (r < 0.8) notify(a.handle, `${s.author} ویراست شما را بازنشر کرد`, 'retweet', link);
            else if (state.posts.filter(x => x.replyTo === p.id).length < 3) {
                state.posts.unshift({ id: uid(), author: s.author, handle: s.handle, avatar: s.avatar, isVerified: s.isVerified, badgeType: s.badgeType, ts: Date.now(), joinedDate: s.joinedDate,
                    text: rnd(['عالی بود 👏', 'موافقم 👍', 'ممنون از اشتراک‌گذاری', 'جالب بود!', 'این‌یکی رو دوست داشتم 🔥']), image: null, poll: null, stats: generateStats(200, 0),
                    myReaction: null, liked: false, retweeted: false, bookmarked: false, replyTo: p.id });
                p.stats.replies = faNum(parseStatNum(p.stats.replies) + 1);
                notify(a.handle, `${s.author} به ویراست شما پاسخ داد`, 'reply', link);
            }
        }
        if (Math.random() < 0.2) {
            const s = rnd(seeds); a.approvedFollowers = a.approvedFollowers || []; a.pendingRequests = a.pendingRequests || [];
            if (!a.approvedFollowers.includes(s.handle) && !a.pendingRequests.includes(s.handle)) {
                if (a.isPrivate) { a.pendingRequests.push(s.handle); notify(a.handle, `${s.author} درخواست دنبال کردن شما را داد`, 'follow_request', { t: 'user', handle: s.handle }, { from: s.handle, to: a.handle }); }
                else { a.approvedFollowers.push(s.handle); a.followers = (a.followers || 0) + 1; notify(a.handle, `${s.author} شما را دنبال کرد`, 'follow', { t: 'user', handle: s.handle }); }
            }
        }
    });
    save();
    if ($('view-post-detail').classList.contains('active') && activePostId) renderPostDetail(activePostId);
    renderMessages(); updBadges();
}
setInterval(simTick, 20000);

// ============================================================
// اخطار به کاربر: پیش‌نمایش، گزینه‌ها و متن پیش‌فرض
// ============================================================
const NOCHAT = 'امکان ارسال پیام به این کاربر وجود ندارد';
const WARN_REASONS = ['نقض قوانین ویراستی', 'اسپم و تبلیغات مزاحم', 'توهین و بی‌احترامی', 'محتوای نامناسب', 'انتشار اطلاعات نادرست'];
const warnerInfo = () => {
    const h = state.warnSenderAccount, a = mineAcc(h); if (a) return a;
    if (state.bannedUsers.includes(h)) return null;
    const p = all().find(x => x.handle === h);
    return p ? { name: p.author, handle: p.handle, avatar: p.avatar, isVerified: p.isVerified, badgeType: p.badgeType } : null;
};
function fixWarner() {
    if (warnerInfo()) return;
    state.warnSenderAccount = me(); save(); showToast('اخطاردهنده‌ی قبلی در دسترس نبود؛ به حساب فعال شما برگشت.', 'info');
}
const closedChat = h => h === state.warnSenderAccount && h !== me() && !!warnerInfo();
function warnPv(p) { const t = String(p.text || '').trim(); return t ? (t.length > 30 ? t.slice(0, 30) + '...' : t) : (p.image ? '(ویراست تصویری)' : '(ویراست بدون متن)'); }
function warnData(m) {
    if (m.warn) return m.warn;
    const t = String(m.text || ''), a = t.match(/^کاربر محترم (.*?)\n/), b = t.match(/ویراست شما:\n"([\s\S]*?)"\n\nبه دلیل "([\s\S]*?)" اخطار دریافت کرد/);
    return b ? { author: a ? a[1] : '', preview: b[1], reason: b[2] } : null;
}
function warnCard(d, from) {
    return `<div class="fx-wc"><div class="fx-wc-ic"><svg><use href="#i-alert"/></svg></div><div class="fx-wc-m">
        <div class="fx-wc-h"><b>اخطار</b><span>از ${esc(from || 'پشتیبانی')}</span></div>
        <div class="fx-wc-post">${esc(d.preview)}</div><span class="fx-wc-r">${esc(d.reason)}</span></div></div>`;
}
function warnText(p, reason) {
    const pv = warnPv(p);
    return `کاربر محترم ${p.author}\n\nویراست شما:\n"${pv}"\n\nبه دلیل "${reason}" اخطار دریافت کرد. در رعایت قوانین کوشا باشید.`;
}
{ // ساخت رابط مودال اخطار
    const f = $('warn-modal').querySelector('.edit-form');
    f.innerHTML = `<div id="fx-warn-flow"></div>
        <div class="fx-chips" id="fx-warn-chips">${WARN_REASONS.map((r, i) => `<button type="button" data-i="${i}">${r}</button>`).join('')}</div>
        <textarea id="warn-reason" rows="2" placeholder="یا دلیل دلخواه را بنویسید..."></textarea>
        <div class="fx-sec">پیش‌نمایش</div><div id="fx-warn-prev"></div><div class="fx-warn-err" id="fx-warn-err"></div>`;
    $('fx-warn-chips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('warn-reason').value = WARN_REASONS[b.dataset.i]; warnRefresh(); });
    $('warn-reason').addEventListener('input', warnRefresh);
}
function warnRefresh() {
    const p = find(currentWarnPostId), w = warnerInfo(), r = $('warn-reason').value.trim(); if (!p || !w) return;
    const who = i => `<span class="fx-p"><img src="${i.avatar || DEFAULT_AVATAR}" alt=""><b>${esc(i.name)}</b></span>`;
    $('fx-warn-flow').innerHTML = `<div class="fx-flow">${who(w)}<span class="fx-ar">←</span>${who({ name: p.author, avatar: p.avatar })}</div>`;
    document.querySelectorAll('#fx-warn-chips button').forEach(b => b.classList.toggle('on', WARN_REASONS[b.dataset.i] === r));
    $('fx-warn-prev').innerHTML = warnCard({ author: p.author, preview: warnPv(p), reason: r || '...' }, w.name);
    const same = w.handle === p.handle;
    $('fx-warn-err').textContent = same ? 'اخطاردهنده و گیرنده یکسان‌اند؛ ابتدا اخطاردهنده را عوض کنید.' : '';
    $('btn-submit-warn').disabled = same;
}
window.openWarnModal = function (id) {
    closePostOptions(); const p = find(id); if (!p) { showToast('این ویراست دیگر وجود ندارد.', 'error'); return; }
    currentWarnPostId = id; fixWarner(); $('warn-reason').value = WARN_REASONS[0]; warnRefresh(); $('warn-modal').classList.add('show');
};
{
    const old = $('btn-submit-warn'), nb = old.cloneNode(true); old.replaceWith(nb);
    nb.addEventListener('click', () => {
        const reason = $('warn-reason').value.trim(), p = find(currentWarnPostId);
        if (!reason) { showToast('لطفا دلیل را وارد کنید.', 'error'); return; }
        if (!p) { showToast('این ویراست دیگر وجود ندارد.', 'error'); $('warn-modal').classList.remove('show'); return; }
        fixWarner(); const w = warnerInfo();
        if (w.handle === p.handle) { showToast('اخطاردهنده و گیرنده یکسان‌اند.', 'error'); return; }
        state.directMessages.unshift({ id: uid(), sender: w.handle, senderName: w.name, senderAvatar: w.avatar, isVerified: w.isVerified, badgeType: w.badgeType, recipient: p.handle, text: warnText(p, reason), warn: { author: p.author, preview: warnPv(p), reason }, ts: Date.now(), read: false });
        fx.warnings.unshift({ to: p.handle, by: w.handle, reason, ts: Date.now() }); fxSave();
        const o = mineAcc(p.handle); if (o && o.handle !== w.handle) notify(o.handle, `اخطار جدید از طرف ${w.name}`, 'alert', { t: 'chat', handle: w.handle });
        addNotification(`اخطار برای ${p.author} با موفقیت ارسال شد.`, 'alert');
        save(); renderMessages(); showToast(`اخطار با موفقیت از طرف ${w.name} ارسال شد.`, 'success');
        $('warn-modal').classList.remove('show');
    });
}
const obu = banUser;
window.banUser = function (id) { const p = find(id); obu(id); if (p && state.warnSenderAccount === p.handle) { state.warnSenderAccount = me(); save(); } };

// چت با اخطاردهنده: متن داخل همان باکس ورودی نوشته می‌شود
function syncChat(h) {
    const closed = closedChat(h), inp = $('chat-input'), area = document.querySelector('#view-chat .chat-input-area');
    inp.disabled = closed; if (closed) inp.value = '';
    inp.placeholder = closed ? NOCHAT : 'پیام خود را بنویسید...';
    area.classList.toggle('fx-closed', closed); if (closed) rb.style.display = 'none';
}

// ============================================================
// ترندها (۸)
// ============================================================
const SEED_TAGS = ['ویراستی', 'خبر_فوری', 'تکنولوژی', 'ورزش', 'موسیقی', 'فیلم_و_سریال', 'هوش_مصنوعی', 'آموزش'];
const TAG_RE = /(^|\s)#[\w\u0622-\u06CC\u06F0-\u06F9\u200c]+/g;
const HOUR = 36e5;
let trendTab = 'tags';
const statN = v => parseStatNum(v);
const engagement = p => { const s = p.stats || {}; return statN(s.likes) + 2 * statN(s.retweets) + 1.5 * statN(s.replies) + 0.1 * statN(s.views); };
const compact = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') .replace('.', '٫').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) + ' میلیون'
    : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '').replace('.', '٫').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) + ' هزار' : n.toLocaleString('fa-IR');

// هشتگ‌های ترند: بر اساس تعداد استفاده در ۴۸ ساعت اخیر + میزان تعامل پست‌ها
function trendingTags() {
    const now = Date.now(), day = Math.floor(now / 864e5), hash = t => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const map = new Map(), posts = all().filter(p => fxVisible(p, true));
    posts.forEach(p => {
        const age = (now - (p.ts || now)) / HOUR; if (age > 48) return;
        const seen = new Set();
        (String(p.text || '').match(TAG_RE) || []).forEach(m => {
            const tag = m.trim(), k = norm(tag.slice(1)); if (seen.has(k)) return; seen.add(k);
            const e = map.get(k) || { tag, uses: 0, eng: 0, score: 0, seed: false };
            e.uses++; e.eng += engagement(p);
            e.score += (100 + Math.log10(1 + engagement(p)) * 20) / Math.pow(age + 2, 0.5);
            map.set(k, e);
        });
    });
    // پر کردن با هشتگ‌های پیشنهادی وقتی هشتگ واقعی کم است
    SEED_TAGS.forEach(t => {
        const k = norm(t), base = 40 + hash(t + day) % 900, e = map.get(k);
        if (e) { e.uses += base; e.score += base; }
        else map.set(k, { tag: '#' + t, uses: base, eng: 0, score: base, seed: true });
    });
    return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10);
}

// ویراست‌های ترند: امتیاز تعامل تقسیم بر سن پست (هر چه تازه‌تر و پرتعامل‌تر، بالاتر)
function trendingPosts() {
    const now = Date.now();
    return all().filter(p => !p.replyTo && fxVisible(p, true))
        .map(p => ({ p, s: engagement(p) / Math.pow((now - (p.ts || now)) / HOUR + 2, 1.1) }))
        .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10).map(x => x.p);
}

window.fxTrendTab = t => { trendTab = t; renderTrends(); };
function renderTrends() {
    const box = $('search-results'); if (!box) return;
    const tabs = `<div class="fx-trend-tabs"><button type="button" class="${trendTab === 'tags' ? 'active' : ''}" onclick="fxTrendTab('tags')">هشتگ‌های ترند</button><button type="button" class="${trendTab === 'posts' ? 'active' : ''}" onclick="fxTrendTab('posts')">ویراست‌های ترند</button></div>`;
    let body;
    if (trendTab === 'tags') {
        body = '<div class="fx-trends">' + trendingTags().map((t, i) =>
            `<div class="fx-trend" onclick="openHashtag(decodeURIComponent('${enc(t.tag)}'))"><span class="fx-rank">${(i + 1).toLocaleString('fa-IR')}</span><div><div class="fx-th">${esc(t.tag)}</div><div class="fx-tc">${t.uses.toLocaleString('fa-IR')} ویراست${t.eng ? ' · ' + compact(Math.round(t.eng)) + ' تعامل' : ''}</div></div></div>`).join('') + '</div>';
    } else {
        const l = trendingPosts();
        body = l.length ? l.map((p, i) => `<div class="fx-trend-post"><div class="fx-trend-label"><span class="fx-rank">${(i + 1).toLocaleString('fa-IR')}</span> در ترند</div>${createPostHTML(p)}</div>`).join('') : emptyHTML('هنوز ویراست ترندی نیست');
    }
    box.innerHTML = tabs + body;
}

// ============================================================
// ناوبری و راه‌اندازی
// ============================================================
const osv = switchView;
window.switchView = function (v) {
    const prev = document.querySelector('.view.active'), pid = prev && prev.id;
    osv(v);
    if (pid === 'view-notifications' && v !== 'notifications') markRead();
    if (v === 'settings') renderFxSettings();
    if (v === 'search' && !si.value.trim()) renderTrends();
    updBadges();
};
document.querySelectorAll('.nav-item')[2].insertAdjacentHTML('beforeend', '<span id="notif-badge" class="nav-badge" style="display:none">0</span>');
{ const orf = window.renderFeeds; window.renderFeeds = function () { orf.apply(this, arguments); if ($('view-search').classList.contains('active') && !si.value.trim()) renderTrends(); }; }
updCnt(); renderFeeds(); renderTrends();
})();