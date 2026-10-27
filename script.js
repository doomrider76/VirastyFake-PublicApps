// ========================
// تنظیمات نسخه و بروزرسانی
// ========================
const APP_VERSION = '1.0.1'; 
const CURRENT_VER_KEY = 'viraasti_app_version';

function getPersianDate(ts = Date.now()) {
    try {
        const parts = new Intl.DateTimeFormat('fa-IR', { 
            month: 'long', 
            year: 'numeric' 
        }).formatToParts(new Date(ts));
        const month = parts.find(p => p.type === 'month')?.value || '';
        const year = parts.find(p => p.type === 'year')?.value || '';
        return `\u200F${month} ${year}`;
    } catch(e) {
        return 'نامشخص';
    }
}

function getCurrentPersianDate() {
    return getPersianDate(Date.now());
}

function checkForUpdate() {
    const savedVer = localStorage.getItem(CURRENT_VER_KEY);
    if (savedVer !== APP_VERSION) {
        setTimeout(() => {
            document.getElementById('update-modal').classList.add('show');
        }, 1000);
    }
}

document.getElementById('btn-do-update').addEventListener('click', async () => {
    const modal = document.getElementById('update-modal');
    modal.classList.remove('show');

    const pendingVersion = sessionStorage.getItem('pending_server_version');
    sessionStorage.removeItem('pending_server_version');
    const versionToSave = pendingVersion || APP_VERSION;
    localStorage.setItem(CURRENT_VER_KEY, versionToSave);

    setTimeout(async () => {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) await caches.delete(name);
            }
        } catch(e) { console.warn('Cache clear failed:', e); }

        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) await registration.unregister();
            }
        } catch(e) { console.warn('SW unregister failed:', e); }

        window.location.href = window.location.pathname + '?v=' + Date.now();
    }, 400); 
});

document.getElementById('btn-dismiss-update').addEventListener('click', () => {
    document.getElementById('update-modal').classList.remove('show');
});

// ✅ دکمه بررسی بروزرسانی (با رفرش کامل)
document.getElementById('btn-check-update')?.addEventListener('click', async function() {
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg style="width:20px;height:20px;animation:spin 1s linear infinite;"><use href="#i-refresh"/></svg> در حال بررسی...';

    showToast('درحال بررسی ورژن و آخرین بروزرسانی', 'info');

    // 1. تلاش برای دریافت نسخه سرور
    let serverVersion = null;
    try {
        const response = await fetch('script.js?nocache=' + Date.now(), { cache: 'no-store' });
        if (response.ok) {
            const text = await response.text();
            const match = text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
            if (match && match[1]) serverVersion = match[1];
        }
    } catch (e) {
        console.warn('Version fetch failed:', e);
    }

    // 2. پاک‌سازی کش و سرویس‌ورکر
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let name of cacheNames) await caches.delete(name);
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) await registration.unregister();
        }
    } catch(e) { console.warn('Clear cache failed:', e); }

    // 3. علامت‌گذاری برای نمایش پیام بعد از رفرش
    if (serverVersion && serverVersion !== APP_VERSION) {
        sessionStorage.setItem('update_available_version', serverVersion);
    } else {
        sessionStorage.setItem('update_checked', '1');
    }

    // 4. رفرش کامل صفحه
    setTimeout(() => {
        window.location.href = window.location.pathname + '?v=' + Date.now();
    }, 500);
});

// ========================
// سیستم اعلانات داخلی (Toast)
// ========================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================
// تنظیمات ذخیره‌سازی
// ========================
const KEY = 'viraasti_v1';
const BACKUP_KEY = 'viraasti_backup_auto';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=1d9bf0&color=fff&size=400'; 
const DEFAULT_HEADER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1500&h=500&fit=crop';

// ========================
// نشان‌های تأیید (۴ نوع)
// ========================
const BADGE_TYPES = {
    'blue':     { src: 'blue-tick.png',     title: 'نشان افراد سرشناس' },
    'yellow':   { src: 'yellow-tick.png',   title: 'نشان سازمانی' },
    'green':    { src: 'green-tick.png',    title: 'نشان تجاری' },
    'personal': { src: 'personal-tick.png', title: 'نشان شخصی' }
};

function getBadgeHTML(badgeType, size = '') {
    if (!badgeType) return '';
    const b = BADGE_TYPES[badgeType];
    if (!b) return '';
    const sizeClass = size ? ` ${size}` : '';
    return `<img src="${b.src}" class="verified-icon${sizeClass}" alt="${b.title}" title="${b.title}">`;
}

function migrateBadge(obj) {
    if (!obj) return obj;
    if (obj.isVerified && !obj.badgeType) {
        obj.badgeType = 'blue';
    }
    if (!obj.badgeType) {
        obj.isVerified = false;
    } else {
        obj.isVerified = true;
    }
    return obj;
}

// ========================
// ایموجی‌های Fluent (فقط برای ری‌اکشن‌ها)
// ========================
const emojiMap = {
    '❤️': 'red-heart', '👍': 'thumbs-up', '😂': 'face-with-tears-of-joy', '🔥': 'fire', '😮': 'face-with-open-mouth',
    '😭': 'loudly-crying-face', '😍': 'smiling-face-with-heart-eyes', '🙏': 'folded-hands', '😊': 'smiling-face-with-smiling-eyes', '🥺': 'pleading-face',
    '😎': 'smiling-face-with-sunglasses', '💔': 'broken-heart', '✨': 'sparkles', '💯': 'hundred-points', '🤔': 'thinking-face',
    '👏': 'clapping-hands', '🎉': 'party-popper', '💀': 'skull', '🤣': 'rolling-on-the-floor-laughing', '😁': 'beaming-face-with-smiling-eyes'
};

function parseEmojis(text) { return text || ''; }

function getEmojiImg(emoji, size = '18px') {
    const name = emojiMap[emoji];
    if (!name) return `<span>${emoji}</span>`; 
    return `<img src="https://api.iconify.design/fluent-emoji/${name}.svg" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle; transform: translateZ(0);" alt="${emoji}">`;
}

function parseAll(text) {
    if (!text) return '';
    let parsed = text;
    parsed = parsed.replace(/(^|\s)(@[a-zA-Z0-9_آ-ی]+)/g, '$1<span class="mention" onclick="event.stopPropagation(); openUserProfile(\'$2\')">$2</span>');
    return parsed;
}

// ========================
// ابزارهای تبدیل اعداد
// ========================
function faToEnDigits(str) {
    return String(str)
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[,٬،\u066C\u060C\s]/g, '');
}
function parseStatNum(v) { const n = parseInt(faToEnDigits(v), 10); return isNaN(n) ? 0 : n; }
function faNum(n) { return Math.max(0, Math.floor(n)).toLocaleString('fa-IR'); }

function formatStatDisplay(val) {
    if (val === null || val === undefined) return '۰';
    const n = typeof val === 'number' ? val : parseStatNum(val);
    if (isNaN(n) || n < 0) return '۰';
    return n.toLocaleString('fa-IR');
}

// ========================
// آپدیت لایو باکس تایپ
// ========================
function updateComposeHighlight() {
    const text = document.getElementById('compose-text').value;
    const highlight = document.getElementById('compose-highlight');
    if (text === '') highlight.innerHTML = '';
    else highlight.innerHTML = parseAll(text) + '<br>'; 
    highlight.scrollTop = document.getElementById('compose-text').scrollTop;
}

// ✅ اضافه شدن آرایه notifications به state
let state = {
    user: {
        name: 'کاربر Virasty', handle: '@user_viraasti', bio: 'به Virasty خوش آمدید!', 
        joinedDate: getCurrentPersianDate(),
        followers: 100, following: 50, avatar: DEFAULT_AVATAR, header: DEFAULT_HEADER, 
        isVerified: false, badgeType: null, followedUsers: [] 
    },
    accounts: [], 
    posts: [],
    aiPosts: [],
    directMessages: [], 
    bannedUsers: [],
    warnSenderAccount: null,
    notifications: [] // ✅ اضافه شد
};

let currentViewStack = ['home'];
let currentHomeTab = 'following';
let currentProfileTab = 'ویراست‌ها';
let activePostId = null;
let currentReactionPostId = null;
let isPollMode = false;
let editingPostId = null; 
let currentWarnPostId = null; 
let activeChatUser = null; 
let composeSelectedAccount = null; 

// ========================
// سیستم Load و Save
// ========================
function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.user) state.user = { ...state.user, ...saved.user };
        if (saved.accounts) state.accounts = saved.accounts;
        if (Array.isArray(saved.posts)) state.posts = saved.posts;
        if (Array.isArray(saved.aiPosts)) state.aiPosts = saved.aiPosts;
        if (Array.isArray(saved.directMessages)) state.directMessages = saved.directMessages;
        if (Array.isArray(saved.bannedUsers)) state.bannedUsers = saved.bannedUsers;
        if (Array.isArray(saved.notifications)) state.notifications = saved.notifications; // ✅ لود اعلانات
        if (saved.warnSenderAccount) state.warnSenderAccount = saved.warnSenderAccount;
        else state.warnSenderAccount = state.user.handle;
        
        if (!state.user.followedUsers) state.user.followedUsers = [];

        migrateBadge(state.user);
        state.accounts.forEach(a => migrateBadge(a));
        state.posts.forEach(p => migrateBadge(p));
        state.aiPosts.forEach(p => migrateBadge(p));
        state.directMessages.forEach(m => {
            if (m.isVerified && !m.badgeType) m.badgeType = 'blue';
        });
    } catch (e) { console.error(e); }
}

let saveTimer = null;

function doSave() {
    try {
        const idx = state.accounts.findIndex(a => a === state.user || a.handle === state.user.handle);
        if (idx !== -1) state.accounts[idx] = state.user;
        else state.accounts.push(state.user);

        const seen = new Set();
        const unique = [];
        for (const acc of state.accounts) {
            if (!seen.has(acc.handle)) { unique.push(acc); seen.add(acc.handle); }
        }
        state.accounts = unique;

        const payload = {
            user: state.user, accounts: state.accounts, posts: state.posts, aiPosts: state.aiPosts,
            directMessages: state.directMessages, bannedUsers: state.bannedUsers,
            warnSenderAccount: state.warnSenderAccount,
            notifications: state.notifications // ✅ ذخیره اعلانات
        };
        const s = JSON.stringify(payload);

        try {
            localStorage.setItem(KEY, s);
            localStorage.setItem(BACKUP_KEY, s);
        } catch (quotaErr) {
            console.warn('حافظه پر شد، تلاش بدون backup...', quotaErr);
            try {
                localStorage.removeItem(BACKUP_KEY);
                localStorage.setItem(KEY, s);
            } catch (e2) {
                console.error('ذخیره‌سازی حتی بدون backup هم شکست خورد:', e2);
                showToast('❌ حافظه پر است؛ تغییر ذخیره نشد. چند پست/عکس قدیمی را حذف کنید.', 'error');
            }
        }
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره‌سازی', 'error');
    }
}

function save() { clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 150); }
function saveNow() { clearTimeout(saveTimer); doSave(); }

load();
if (!state.warnSenderAccount) state.warnSenderAccount = state.user.handle;
try { localStorage.removeItem('emojiDataCache'); } catch(e) {}

// ✅ تابع جدید برای اضافه کردن اعلان
function addNotification(text, type = 'info') {
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
        id: Date.now().toString(),
        text: text,
        type: type,
        time: Date.now(),
        read: false
    });
    save();
    if (document.getElementById('view-notifications').classList.contains('active')) {
        renderNotifications();
    }
}

// ========================
// توابع کمکی
// ========================
function getAccountInfo(handle) {
    if (!handle) return state.user;
    if (handle === state.user.handle) return state.user;
    const acc = (state.accounts || []).find(a => a.handle === handle);
    if (acc) return acc;
    const post = [...state.posts, ...state.aiPosts].find(p => p.handle === handle);
    if (post) {
        return { name: post.author, handle: post.handle, avatar: post.avatar, isVerified: post.isVerified, badgeType: post.badgeType };
    }
    return state.user;
}

function getAvailableAIVoters() {
    const handles = new Set();
    state.aiPosts.forEach(p => handles.add(p.handle));
    aiBadUsers.forEach(u => handles.add(u.handle));
    (state.accounts || []).forEach(a => { if (a.handle !== state.user.handle) handles.add(a.handle); });
    state.posts.forEach(p => { if (p.handle !== state.user.handle) handles.add(p.handle); });
    state.bannedUsers.forEach(h => handles.delete(h));
    handles.delete(state.user.handle);
    return [...handles];
}

// ========================
// شبیه‌ساز هوش مصنوعی
// ========================
const aiBadUsers = [
    { author: 'کاربر ناشناس', handle: '@anon_772', avatar: 'https://ui-avatars.com/api/?name=User&background=444&color=fff' },
    { author: 'اخبار فیک', handle: '@fake_news_ir', avatar: 'https://ui-avatars.com/api/?name=News&background=dc2626&color=fff' },
    { author: 'هکر کلاه سیاه', handle: '@black_hat', avatar: 'https://ui-avatars.com/api/?name=Hacker&background=000&color=fff' },
    { author: 'ترولر', handle: '@troller_402', avatar: 'https://ui-avatars.com/api/?name=Troll&background=3b82f6&color=fff' },
    { author: 'کاربر حذف شده', handle: '@deleted_user', avatar: 'https://ui-avatars.com/api/?name=Del&background=555&color=fff' }
];

const aiBadTexts = [
    'این یک متن توهین آمیز و نامناسب است که برای تست سیستم بن و گزارش قرار داده شده است. لطفاً این کاربر را بن کنید.',
    'محتوای خلاف قوانین! این پست باید گزارش شود.',
    'من یک ربات اسپم هستم و می‌خواهم شما را اذیت کنم.',
    'این یک ویراست تستی برای بررسی عملکرد سیستم مدیریت محتوا می‌باشد.'
];

function startAIModerationSimulation() {
    setInterval(() => {
        const availableUsers = aiBadUsers.filter(u => !state.bannedUsers.includes(u.handle));
        if (availableUsers.length === 0) return;
        const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        const randomText = aiBadTexts[Math.floor(Math.random() * aiBadTexts.length)];
        
        const newPost = {
            id: 'ai_bad_' + Date.now(),
            author: randomUser.author,
            handle: randomUser.handle,
            avatar: randomUser.avatar,
            isVerified: false,
            badgeType: null,
            ts: Date.now(),
            joinedDate: getCurrentPersianDate(),
            text: randomText,
            image: null,
            stats: generateStats(Math.floor(Math.random() * 500) + 100, 0),
            myReaction: null, liked: false, retweeted: false, bookmarked: false
        };
        
        state.aiPosts.unshift(newPost);
        addNotification(`ویراست جدیدی توسط ${randomUser.author} منتشر شد.`, 'post'); // ✅ اعلان ویراست جدید
        save();
        renderFeeds();
    }, 45000); 
}

if (state.aiPosts.length === 0) {
    const now = Date.now();
    state.aiPosts = [
        {
            id: 'ai1', author: 'اخبار هوش مصنوعی', handle: '@AINews', avatar: 'https://ui-avatars.com/api/?name=AI&background=1d9bf0&color=fff',
            isVerified: true, badgeType: 'yellow',
            ts: now - (2 * 60 * 60 * 1000), joinedDate: 'فروردین ۱۴۰۲',
            text: 'هوش مصنوعی گوگل (Gemini) به‌روزرسانی جدیدی دریافت کرد. 🤖🎥',
            image: null, stats: generateStats(50000, 2 * 60 * 60 * 1000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai2', author: 'ورزش۳', handle: '@Varzesh3', avatar: 'https://ui-avatars.com/api/?name=ورزش&background=dc2626&color=fff',
            isVerified: true, badgeType: 'green',
            ts: now - (4 * 60 * 60 * 1000), joinedDate: 'مرداد ۱۴۰۲',
            text: 'رئال مادرید در یک بازی نفس‌گیر موفق شد بارسلونا را شکست دهد و قهرمان شود! ⚽🏆🔥',
            image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&fit=crop',
            stats: generateStats(120000, 4 * 60 * 60 * 1000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai3', author: 'تکنولوژی روز', handle: '@TechNews', avatar: 'https://ui-avatars.com/api/?name=Tech&background=3b82f6&color=fff',
            isVerified: true, badgeType: 'blue',
            ts: now - (6 * 60 * 60 * 1000), joinedDate: 'آبان ۱۴۰۲',
            text: 'اپل از تراشه جدید M4 رونمایی کرد. این تراشه ۵۰ درصد سریع‌تر از نسل قبل است و در آیپد پرو جدید استفاده خواهد شد. 💻📱',
            image: null, stats: generateStats(85000, 6 * 60 * 60 * 1000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai4', author: 'میم و سرگرمی', handle: '@Memes', avatar: 'https://ui-avatars.com/api/?name=Meme&background=f59e0b&color=fff',
            isVerified: true, badgeType: 'personal',
            ts: now - (8 * 60 * 60 * 1000), joinedDate: 'دی ۱۴۰۲',
            text: 'وقتی میفهمی فردا امتحان داری و هنوز هیچی نخوندی: 😂💀',
            image: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&fit=crop',
            stats: generateStats(250000, 8 * 60 * 60 * 1000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        }
    ];
    save();
}

function formatTimeAgo(ts) {
    if (!ts) return 'همین حالا';
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);
    if (sec < 60) return 'همین حالا';
    if (min < 60) return `${min.toLocaleString('fa-IR')} دقیقه پیش`;
    if (hour < 24) return `${hour.toLocaleString('fa-IR')} ساعت پیش`;
    return `${day.toLocaleString('fa-IR')} روز پیش`;
}

const iconReaction = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;

function createPostHTML(post) {
    let reactionsHTML = '<div class="post-reactions">';
    if (post.stats.reactions && Object.keys(post.stats.reactions).length > 0) {
        for (const [emoji, count] of Object.entries(post.stats.reactions)) {
            if (count > 0) {
                const isReacted = post.myReaction === emoji ? 'reacted' : '';
                reactionsHTML += `<button type="button" class="reaction-pill ${isReacted}" onclick="toggleReaction(event, '${post.id}', '${emoji}')">${getEmojiImg(emoji)}<span class="rp-count">${formatStatDisplay(count)}</span></button>`;
            }
        }
    }
    reactionsHTML += `<button type="button" class="add-reaction-btn" onclick="openReactionPicker(event, '${post.id}')">${iconReaction}</button></div>`;

    const timeStr = post.ts ? formatTimeAgo(post.ts) : (post.time || 'همین حالا');
    const verifiedIcon = getBadgeHTML(post.badgeType);

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const hasVoted = post.poll.votedIndex !== null;
        pollHTML = `<div class="poll-container" onclick="event.stopPropagation();"><div class="poll-question">${parseAll(post.poll.question)}</div>`;
        post.poll.options.forEach((opt, index) => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isSelected = post.poll.votedIndex === index;
            pollHTML += `<div class="poll-option ${isSelected ? 'selected' : ''}" onclick="votePoll(event, '${post.id}', ${index})"><div class="poll-progress" style="width: ${hasVoted ? percent : 0}%"></div><div class="poll-option-content"><span class="poll-option-text">${parseAll(opt.text)} ${isSelected ? '✓' : ''}</span>${hasVoted ? `<span class="poll-option-percent">${percent.toLocaleString('fa-IR')}%</span>` : ''}</div></div>`;
        });
        pollHTML += `<div class="poll-footer">${formatStatDisplay(totalVotes)} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    return `
        <div class="post" onclick="openPostDetail(event, '${post.id}')">
            <div class="post-avatar" onclick="event.stopPropagation(); openUserProfile('${post.handle}')"><img src="${post.avatar}" alt="Avatar"></div>
            <div class="post-content">
                <div class="post-header" style="display:flex; flex-direction:column; margin-bottom:4px; width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; width: 100%;">
                        <div style="display:flex; align-items:center; gap:2px; overflow:hidden; min-width:0; flex:1;">
                            <span class="post-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="event.stopPropagation(); openUserProfile('${post.handle}')">${parseAll(post.author)}</span>${verifiedIcon}
                        </div>
                        <button type="button" class="post-more-btn" onclick="openPostOptions(event, '${post.id}')" style="margin-right: 0; padding: 0 4px; margin-top: 2px;"><svg style="width: 18px; height: 18px;"><use href="#i-more"/></svg></button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; width: 100%; margin-top: 0px;">
                        <span class="post-handle" style="white-space:nowrap; cursor:pointer; color:var(--text-secondary); opacity:0.8; font-size:13px;" onclick="event.stopPropagation(); openUserProfile('${post.handle}')">${post.handle}</span>
                        <span class="post-time" style="white-space:nowrap; color:var(--text-secondary); opacity:0.8; font-size:13px;">${timeStr}</span>
                    </div>
                </div>
                
                <div class="post-text">${parseAll(post.text)}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" alt="Post Image">` : ''}
                ${pollHTML}
                <div class="post-actions">
                    <button type="button" class="action-btn"><svg><use href="#i-reply"/></svg> ${formatStatDisplay(post.stats.replies)}</button>
                    <button type="button" class="action-btn retweet-btn ${post.retweeted ? 'retweeted' : ''}" onclick="toggleAction(event, '${post.id}', 'retweet')"><svg><use href="#i-retweet"/></svg> ${formatStatDisplay(post.stats.retweets)}</button>
                    <button type="button" class="action-btn like-btn ${post.liked ? 'liked' : ''}" onclick="toggleAction(event, '${post.id}', 'like')"><svg><use href="#i-heart"/></svg> ${formatStatDisplay(post.stats.likes)}</button>
                    <button type="button" class="action-btn"><svg><use href="#i-chart"/></svg> ${formatStatDisplay(post.stats.views)}</button>
                    <button type="button" class="action-btn bookmark-btn ${post.bookmarked ? 'bookmarked' : ''}" onclick="toggleAction(event, '${post.id}', 'bookmark')"><svg><use href="#i-bookmark"/></svg></button>
                </div>
                ${reactionsHTML}
            </div>
        </div>
    `;
}

function renderFeeds() {
    let displayPosts = [];
    if (currentHomeTab === 'foryou') {
        displayPosts = [...state.aiPosts, ...state.posts];
    } else {
        const followedList = state.user.followedUsers || [];
        displayPosts = state.posts.filter(p => followedList.includes(p.handle) || p.handle === state.user.handle);
        displayPosts = [...state.aiPosts.filter(p => followedList.includes(p.handle)), ...displayPosts];
    }

    if (displayPosts.length === 0) {
        document.getElementById('feed').innerHTML = `<div class="empty-state"><h3>هنوز ویراستی نیست</h3></div>`;
    } else {
        document.getElementById('feed').innerHTML = displayPosts.map(p => createPostHTML(p)).join('');
    }
    
    renderProfileFeed();
    renderMessages();
    renderNotifications();

    const bmarks = [...state.posts, ...state.aiPosts].filter(p => p.bookmarked);
    document.getElementById('bookmarks-feed').innerHTML = bmarks.length > 0 ? bmarks.map(p => createPostHTML(p)).join('') : `<div class="empty-state"><h3>نشانکی ندارید</h3></div>`;
    if (activePostId && document.getElementById('view-post-detail').classList.contains('active')) renderPostDetail(activePostId);
}

function renderProfileFeed() {
    const myPosts = state.posts.filter(p => p.handle === state.user.handle);
    let filteredPosts = [];
    if (currentProfileTab === 'ویراست‌ها') filteredPosts = myPosts;
    else if (currentProfileTab === 'بازنشرها') filteredPosts = myPosts.filter(p => p.retweeted);
    else if (currentProfileTab === 'پاسخ‌ها') filteredPosts = myPosts.filter(p => p.replyTo);
    else if (currentProfileTab === 'رسانه') filteredPosts = myPosts.filter(p => p.image);
    else if (currentProfileTab === 'واکنش‌ها') filteredPosts = myPosts.filter(p => p.myReaction);

    const container = document.getElementById('profile-feed');
    if (container) {
        container.innerHTML = filteredPosts.length > 0 ? filteredPosts.map(p => createPostHTML(p)).join('') : `<div class="empty-state"><h3>محتوایی یافت نشد</h3></div>`;
    }
}

// ✅ رندر واقعی اعلانات
function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (!state.notifications || state.notifications.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>هیچ اعلانی ندارید</h3></div>`;
        return;
    }

    container.innerHTML = state.notifications.map(n => {
        let iconHTML = '';
        if (n.type === 'like') iconHTML = `<svg><use href="#i-heart"/></svg>`;
        else if (n.type === 'reply') iconHTML = `<svg><use href="#i-reply"/></svg>`;
        else if (n.type === 'retweet') iconHTML = `<svg><use href="#i-retweet"/></svg>`;
        else if (n.type === 'dm') iconHTML = `<svg><use href="#i-mail"/></svg>`;
        else if (n.type === 'alert') iconHTML = `<svg><use href="#i-alert"/></svg>`;
        else if (n.type === 'post') iconHTML = `<svg><use href="#i-pen"/></svg>`;
        else iconHTML = `<svg><use href="#i-bell"/></svg>`;

        return `
            <div class="notification-item">
                <div class="notification-icon" style="${n.type === 'alert' ? 'background:rgba(249,24,128,0.1);color:#f91880;' : ''}">${iconHTML}</div>
                <div class="notification-content">
                    <div class="notification-text">${n.text}</div>
                    <div class="notification-time">${formatTimeAgo(n.time)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getUserInfo(handle) {
    if (!handle) return state.user;
    if (handle === state.user.handle) {
        if (!state.user.joinedDate) {
            state.user.joinedDate = getCurrentPersianDate();
        }
        return state.user;
    }
    
    const acc = state.accounts.find(a => a.handle === handle);
    if (acc) {
        if (!acc.joinedDate) {
            acc.joinedDate = getCurrentPersianDate();
            save();
        }
        return acc;
    }
    
    const userPosts = [...state.posts, ...state.aiPosts].filter(p => p.handle === handle);
    if (userPosts.length > 0) {
        const post = userPosts[0];
        let jd = post.joinedDate;
        if (!jd) {
            jd = getCurrentPersianDate();
            [...state.posts, ...state.aiPosts].forEach(p => {
                if (p.handle === handle) p.joinedDate = jd;
            });
            save();
        }
        
        return { 
            name: post.author, handle: post.handle, avatar: post.avatar, 
            header: DEFAULT_HEADER, bio: 'به Virasty خوش آمدید!', 
            joinedDate: jd,
            followers: Math.floor(Math.random() * 1000) + 100,
            following: Math.floor(Math.random() * 500),
            isVerified: post.isVerified, badgeType: post.badgeType 
        };
    }
    
    return { 
        name: handle.replace('@', ''), handle: handle, avatar: DEFAULT_AVATAR, 
        header: DEFAULT_HEADER, bio: 'کاربر Virasty', 
        joinedDate: getCurrentPersianDate(),
        followers: 0, following: 0, isVerified: false, badgeType: null 
    };
}

function openUserProfile(rawHandle) {
    if (!rawHandle) return;
    let handle = '@' + rawHandle.replace(/@/g, '').trim();

    if (handle === state.user.handle) { switchView('profile'); return; }
    
    const content = document.getElementById('user-profile-content');
    
    if (state.bannedUsers.includes(handle)) {
        content.innerHTML = `
            <div class="empty-state" style="margin-top: 80px; padding: 40px 20px;">
                <svg style="width:80px; height:80px; color: #f91880; opacity: 1; margin-bottom: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                <h3 style="color:#f91880; font-size: 24px;">Banned Account</h3>
                <p style="margin-top: 12px; font-weight: bold; font-size: 16px;">این اکانت به دلیل تخلفات محرز تعلیق می باشد</p>
            </div>
        `;
        switchView('user-profile');
        return;
    }

    const existsInAccounts = (state.accounts || []).some(a => a.handle === handle);
    const existsInPosts = [...state.posts, ...state.aiPosts].some(p => p.handle === handle);
    
    if (!existsInAccounts && !existsInPosts) {
        content.innerHTML = `
            <div class="empty-state" style="margin-top: 80px; padding: 40px 20px;">
                <svg style="width:80px; height:80px; color: var(--text-secondary); opacity: 1; margin-bottom: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <h3 style="color:var(--text-secondary); font-size: 24px;">کاربری یافت نشد</h3>
                <p style="margin-top: 12px; font-weight: bold; font-size: 16px;">این آیدی در ویراستی وجود ندارد</p>
            </div>
        `;
        switchView('user-profile');
        return;
    }

    const u = getUserInfo(handle);
    const userPosts = [...state.posts, ...state.aiPosts].filter(p => p.handle === handle);
    const isFollowing = (state.user.followedUsers || []).includes(handle);
    
    let finalJoinedDate = u.joinedDate;
    if (!finalJoinedDate) {
        const acc = state.accounts.find(a => a.handle === handle);
        if (acc && acc.joinedDate) finalJoinedDate = acc.joinedDate;
    }
    if (!finalJoinedDate) {
        const ps = [...state.posts, ...state.aiPosts].filter(p => p.handle === handle);
        if (ps.length > 0) {
            for (const p of ps) {
                if (p.joinedDate) { finalJoinedDate = p.joinedDate; break; }
            }
        }
    }
    if (!finalJoinedDate) finalJoinedDate = getCurrentPersianDate();
    if (finalJoinedDate === 'نامشخص') finalJoinedDate = getCurrentPersianDate();

    content.innerHTML = `
        <div class="profile-section">
            <div class="cover-photo" style="background-image: url('${u.header || DEFAULT_HEADER}');">
                <button type="button" class="icon-btn back-btn" onclick="goBack()"><svg><use href="#i-back"/></svg></button>
            </div>
            <div class="profile-actions-row">
                <div class="profile-avatar">
                    <img src="${u.avatar}" alt="Avatar">
                </div>
                <button type="button" class="btn-follow-profile ${isFollowing ? 'following' : ''}" onclick="toggleFollow(event, '${u.handle}')">
                    <span>${isFollowing ? 'دنبال می‌کنید' : 'دنبال کردن'}</span>
                </button>
            </div>
            <div class="profile-info">
                <h1 class="profile-name">${parseAll(u.name)}${getBadgeHTML(u.badgeType, 'lg')}</h1>
                <span class="profile-handle">${u.handle}</span>
                <p class="profile-bio">${parseAll(u.bio || 'کاربر ویراستی')}</p>
                <div class="profile-stats">
                    <span><b>${formatStatDisplay(u.following || 0)}</b> دنبال‌شده</span>
                    <span><b>${formatStatDisplay(u.followers || 0)}</b> دنبال‌کننده</span>
                </div>
                <div class="profile-meta">
                    <span class="meta-item">
                        <svg><use href="#i-chart"/></svg>
                        <span>عضو شده در ${finalJoinedDate}</span>
                    </span>
                </div>
            </div>
        </div>
        <div class="profile-tabs">
            <button type="button" class="ptab active">ویراست‌ها</button>
        </div>
        <div id="other-profile-feed" style="display: flex; flex-direction: column;">
            ${userPosts.length > 0 ? userPosts.map(p => createPostHTML(p)).join('') : '<div class="empty-state"><h3>محتوایی یافت نشد</h3></div>'}
        </div>
    `;
    
    switchView('user-profile');
}

function toggleFollow(e, handle) {
    e.stopPropagation();
    if (!state.user.followedUsers) state.user.followedUsers = [];
    
    const index = state.user.followedUsers.indexOf(handle);
    if (index > -1) {
        state.user.followedUsers.splice(index, 1);
        state.user.following = Math.max(0, (state.user.following || 0) - 1);
    } else {
        state.user.followedUsers.push(handle);
        state.user.following = (state.user.following || 0) + 1;
    }
    
    save();
    openUserProfile(handle);
    renderProfile(); 
    renderFeeds();
}

function renderMessages() {
    const container = document.getElementById('messages-list');
    if (!container) return;

    const msgHeaderAvatar = document.getElementById('messages-header-avatar');
    if (msgHeaderAvatar) msgHeaderAvatar.src = state.user.avatar || DEFAULT_AVATAR;
    
    const myMessages = state.directMessages.filter(m => m.recipient === state.user.handle);
    const unreadCount = myMessages.filter(m => !m.read).length;
    const badge = document.getElementById('dm-badge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount.toLocaleString('fa-IR');
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    if (myMessages.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>هیچ پیامی ندارید</h3></div>`;
        return;
    }

    const senders = [...new Set(myMessages.map(m => m.sender))];
    
    container.innerHTML = senders.map(sender => {
        const msgs = myMessages.filter(m => m.sender === sender);
        const lastMsg = msgs[0];
        const hasUnread = msgs.some(m => !m.read);
        const uInfo = getUserInfo(sender);
        
        return `
            <div class="dm-item">
                <img src="${lastMsg.senderAvatar || uInfo.avatar}" class="dm-avatar" onclick="event.stopPropagation(); openUserProfile('${sender}')" style="object-fit: ${sender === '@support' ? 'contain' : 'cover'}; background: ${sender === '@support' ? 'white' : 'transparent'};">
                <div class="dm-content" onclick="openChat('${sender}')">
                    <div class="dm-header">
                        <span class="dm-name" onclick="event.stopPropagation(); openUserProfile('${sender}')">${lastMsg.senderName || uInfo.name}${getBadgeHTML(lastMsg.badgeType || uInfo.badgeType)}</span>
                        <span class="dm-time">${formatTimeAgo(lastMsg.ts)}</span>
                    </div>
                    <div class="dm-text">${parseAll(lastMsg.text)}</div>
                </div>
                ${hasUnread ? `<span class="nav-badge" style="position:relative; top:0; right:0; align-self:center;">${msgs.filter(m=>!m.read).length.toLocaleString('fa-IR')}</span>` : ''}
            </div>
        `;
    }).join('');
}

function openChat(senderHandle) {
    activeChatUser = senderHandle;
    const myMessages = state.directMessages.filter(m => (m.recipient === state.user.handle && m.sender === senderHandle) || (m.sender === state.user.handle && m.recipient === senderHandle));
    
    let changed = false;
    myMessages.forEach(m => { if (m.recipient === state.user.handle && !m.read) { m.read = true; changed = true; } });
    if (changed) { save(); renderMessages(); }

    const uInfo = getUserInfo(senderHandle);
    const chatContainer = document.getElementById('chat-messages');
    
    if (myMessages.length === 0) {
        chatContainer.innerHTML = `<div class="empty-state"><h3>شروع گفتگو با ${uInfo.name}</h3></div>`;
    } else {
        chatContainer.innerHTML = myMessages.sort((a,b) => a.ts - b.ts).map(m => {
            const isMe = m.sender === state.user.handle;
            return `
                <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
                    ${parseAll(m.text)}
                    ${m.image ? `<img src="${m.image}" alt="Image">` : ''}
                    <div class="chat-time">${formatTimeAgo(m.ts)}</div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('chat-header-name').textContent = uInfo.name;
    document.getElementById('chat-header-handle').textContent = uInfo.handle;
    
    const tickEl = document.getElementById('chat-header-tick');
    const badgeType = uInfo.badgeType || (senderHandle === '@support' ? 'blue' : null);
    if (badgeType) {
        tickEl.innerHTML = getBadgeHTML(badgeType);
        tickEl.style.display = 'inline-block';
    } else {
        tickEl.style.display = 'none';
    }

    const avatarEl = document.getElementById('chat-header-avatar');
    avatarEl.src = uInfo.avatar;
    avatarEl.style.objectFit = senderHandle === '@support' ? 'contain' : 'cover';
    avatarEl.style.background = senderHandle === '@support' ? 'white' : 'transparent';

    switchView('chat');
    setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 100);
}

document.getElementById('btn-send-chat').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !activeChatUser) return;
    
    const newMsg = {
        id: Date.now().toString(),
        sender: state.user.handle,
        senderName: state.user.name,
        senderAvatar: state.user.avatar,
        isVerified: state.user.isVerified,
        badgeType: state.user.badgeType,
        recipient: activeChatUser,
        text: text,
        ts: Date.now(),
        read: true
    };
    state.directMessages.push(newMsg);
    addNotification(`پیام شما برای ${activeChatUser} با موفقیت ارسال شد.`, 'dm'); // ✅ اعلان ارسال پیام
    save();
    input.value = '';
    openChat(activeChatUser);
});

document.getElementById('chat-upload-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && activeChatUser) {
        compressImage(file, 500, 500, (base64) => {
            const newMsg = {
                id: Date.now().toString(),
                sender: state.user.handle,
                senderName: state.user.name,
                senderAvatar: state.user.avatar,
                isVerified: state.user.isVerified,
                badgeType: state.user.badgeType,
                recipient: activeChatUser,
                text: '📷 عکس ارسال شد',
                image: base64,
                ts: Date.now(),
                read: true
            };
            state.directMessages.push(newMsg);
            addNotification(`عکس شما برای ${activeChatUser} ارسال شد.`, 'dm'); // ✅ اعلان ارسال عکس
            save();
            openChat(activeChatUser);
        }, null, 0.75);
    }
});

// ========================
// توابع انتخاب اکانت
// ========================
function updateComposeUI() {
    if (!composeSelectedAccount) return;
    document.getElementById('compose-avatar').src = composeSelectedAccount.avatar || DEFAULT_AVATAR;
    const badgeHTML = getBadgeHTML(composeSelectedAccount.badgeType);
    document.getElementById('compose-account-name').innerHTML = `${parseAll(composeSelectedAccount.name)}${badgeHTML}`;
    document.getElementById('compose-account-handle').textContent = composeSelectedAccount.handle;
}

function openComposeAccountSelector() {
    if (editingPostId) return; 

    const container = document.getElementById('compose-account-list');
    const allUsers = [state.user, ...(state.accounts || []).filter(a => a.handle !== state.user.handle)];
    
    container.innerHTML = allUsers.map(u => `
        <div class="account-card ${u.handle === composeSelectedAccount.handle ? 'active' : ''}" onclick="selectComposeAccount('${u.handle}')">
            <div class="account-info">
                <img src="${u.avatar || DEFAULT_AVATAR}" class="account-avatar">
                <div class="account-details">
                    <span class="account-name">${parseAll(u.name)}${getBadgeHTML(u.badgeType)}</span>
                    <span class="account-handle">${u.handle}</span>
                </div>
            </div>
            ${u.handle === composeSelectedAccount.handle ? '<span class="btn-active-label">انتخاب شده</span>' : ''}
        </div>
    `).join('');
    
    document.getElementById('compose-account-modal').classList.add('show');
}

function selectComposeAccount(handle) {
    if (handle === state.user.handle) composeSelectedAccount = state.user;
    else composeSelectedAccount = (state.accounts || []).find(a => a.handle === handle);
    updateComposeUI();
    document.getElementById('compose-account-modal').classList.remove('show');
}

// ========================
// منوی سه نقطه
// ========================
function openPostOptions(e, id) {
    e.stopPropagation();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;

    const isMine = post.handle === state.user.handle;
    const menu = document.getElementById('post-options-menu');
    const isWarnSender = state.warnSenderAccount === post.handle;
    
    let menuHTML = '';
    if (isMine) {
        menuHTML += `<div class="post-option-item" onclick="editPost('${post.id}')"><svg><use href="#i-pen"/></svg> ویرایش ویراست</div>`;
        menuHTML += `<div class="post-option-item danger" onclick="deletePost('${post.id}')"><svg><use href="#i-trash"/></svg> حذف ویراست</div>`;
        
        if (!isWarnSender) {
            menuHTML += `<div class="post-option-item" onclick="setWarnSender('${post.id}')"><svg><use href="#i-user"/></svg> تنظیم به عنوان اخطار دهنده</div>`;
        } else {
            menuHTML += `<div class="post-option-item" onclick="removeWarnSender('${post.id}')"><svg><use href="#i-close"/></svg> لغو اخطار دهنده</div>`;
        }
    } else {
        if (!post.badgeType) {
            menuHTML += `<div class="post-option-item" onclick="giveBadge('${post.id}', 'blue')">${getBadgeHTML('blue')} دادن نشان افراد سرشناس</div>`;
            menuHTML += `<div class="post-option-item" onclick="giveBadge('${post.id}', 'yellow')">${getBadgeHTML('yellow')} دادن نشان سازمانی</div>`;
            menuHTML += `<div class="post-option-item" onclick="giveBadge('${post.id}', 'green')">${getBadgeHTML('green')} دادن نشان تجاری</div>`;
            menuHTML += `<div class="post-option-item" onclick="giveBadge('${post.id}', 'personal')">${getBadgeHTML('personal')} دادن نشان شخصی</div>`;
        } else {
            menuHTML += `<div class="post-option-item" onclick="removeBadge('${post.id}')">${getBadgeHTML(post.badgeType)} حذف نشان فعلی</div>`;
        }
        
        menuHTML += `<div class="post-option-item danger" onclick="deletePost('${post.id}')"><svg><use href="#i-trash"/></svg> حذف ویراست</div>`;
        menuHTML += `<div class="post-option-item" onclick="openWarnModal('${post.id}')"><svg><use href="#i-alert"/></svg> اخطار به ارسال کننده</div>`;
        if (!isWarnSender) {
            menuHTML += `<div class="post-option-item" onclick="setWarnSender('${post.id}')"><svg><use href="#i-user"/></svg> تنظیم به عنوان اخطار دهنده</div>`;
        } else {
            menuHTML += `<div class="post-option-item" onclick="removeWarnSender('${post.id}')"><svg><use href="#i-close"/></svg> لغو اخطار دهنده</div>`;
        }
        menuHTML += `<div class="post-option-item danger" onclick="banUser('${post.id}')"><svg><use href="#i-ban"/></svg> بن اکانت</div>`;
    }

    menuHTML += `<div class="post-option-item post-option-cancel" onclick="closePostOptions()">انصراف</div>`;
    menu.innerHTML = menuHTML;
    menu.classList.add('show');
}

function closePostOptions() {
    document.getElementById('post-options-menu').classList.remove('show');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.post-more-btn') && !e.target.closest('.post-options-menu')) {
        closePostOptions();
    }
});

function setWarnSender(id) {
    closePostOptions();
    const post = state.posts.find(p => p.id === id) || state.aiPosts.find(p => p.id === id);
    if (post) {
        state.warnSenderAccount = post.handle;
        save();
        showToast(`از این پس پیام‌های اخطار از طرف ${post.author} (${post.handle}) ارسال می‌شود.`, 'info');
    }
}

function removeWarnSender(id) {
    closePostOptions();
    state.warnSenderAccount = state.user.handle;
    save();
    showToast('اخطار دهنده به حساب فعال شما بازگشت.', 'info');
}

function editPost(id) {
    closePostOptions();
    const post = state.posts.find(p => p.id == id);
    if (!post) return;
    
    editingPostId = id;
    composeSelectedAccount = state.user; 
    updateComposeUI();
    document.getElementById('compose-account-selector').style.pointerEvents = 'none';

    document.getElementById('compose-modal-title').textContent = 'ویرایش ویراست';
    document.getElementById('compose-text').value = post.text;
    updateComposeHighlight();
    document.getElementById('compose-poll-container').style.display = 'none';
    document.getElementById('compose-image-preview').style.display = 'none';
    document.getElementById('compose-modal').classList.add('show');
}

function giveBadge(id, badgeType) {
    closePostOptions();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    
    const badgeInfo = BADGE_TYPES[badgeType];
    const handle = post.handle;
    
    state.posts.forEach(p => { if (p.handle === handle) { p.isVerified = true; p.badgeType = badgeType; } });
    state.aiPosts.forEach(p => { if (p.handle === handle) { p.isVerified = true; p.badgeType = badgeType; } });
    if (state.user.handle === handle) { state.user.isVerified = true; state.user.badgeType = badgeType; }
    const acc = state.accounts.find(a => a.handle === handle);
    if (acc) { acc.isVerified = true; acc.badgeType = badgeType; }
    
    save(); renderFeeds(); renderProfile();
    showToast(`نشان "${badgeInfo.title}" به ${post.author} داده شد.`, 'success');
}

function removeBadge(id) {
    closePostOptions();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    
    const handle = post.handle;
    
    state.posts.forEach(p => { if (p.handle === handle) { p.isVerified = false; p.badgeType = null; } });
    state.aiPosts.forEach(p => { if (p.handle === handle) { p.isVerified = false; p.badgeType = null; } });
    if (state.user.handle === handle) { state.user.isVerified = false; state.user.badgeType = null; }
    const acc = state.accounts.find(a => a.handle === handle);
    if (acc) { acc.isVerified = false; acc.badgeType = null; }
    
    save(); renderFeeds(); renderProfile();
    showToast(`نشان ${post.author} حذف شد.`, 'info');
}

function deletePost(id) {
    closePostOptions();
    state.posts = state.posts.filter(p => p.id != id);
    state.aiPosts = state.aiPosts.filter(p => p.id != id);
    save(); renderFeeds();
}

function openWarnModal(id) {
    closePostOptions();
    currentWarnPostId = id;
    document.getElementById('warn-reason').value = '';
    document.getElementById('warn-modal').classList.add('show');
}

document.getElementById('btn-submit-warn').addEventListener('click', () => {
    const reason = document.getElementById('warn-reason').value.trim();
    if (!reason) { showToast('لطفا دلیل را وارد کنید.', 'error'); return; }
    
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == currentWarnPostId);
    if (post) {
        const preview = post.text.length > 30 ? post.text.substring(0, 30) + '...' : post.text;
        const senderInfo = getAccountInfo(state.warnSenderAccount);
        const msgText = `کاربر محترم ${post.author}\n\nویراست شما:\n"${preview}"\n\nبه دلیل "${reason}" اخطار دریافت کرد. در رعایت قوانین کوشا باشید.`;

        const newDM = {
            id: Date.now().toString(),
            sender: senderInfo.handle,
            senderName: senderInfo.name,
            senderAvatar: senderInfo.avatar, 
            isVerified: senderInfo.isVerified,
            badgeType: senderInfo.badgeType,
            recipient: post.handle,
            text: msgText,
            ts: Date.now(),
            read: false
        };
        state.directMessages.unshift(newDM);
        addNotification(`اخطار برای ${post.author} با موفقیت ارسال شد.`, 'alert'); // ✅ اعلان ارسال اخطار
        save();
        renderMessages();
        showToast(`اخطار با موفقیت از طرف ${senderInfo.name} ارسال شد.`, 'success');
    }
    
    document.getElementById('warn-modal').classList.remove('show');
});

function banUser(id) {
    closePostOptions();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    
    if (!state.bannedUsers.includes(post.handle)) state.bannedUsers.push(post.handle);
    state.posts = state.posts.filter(p => p.handle !== post.handle);
    state.aiPosts = state.aiPosts.filter(p => p.handle !== post.handle);
    state.accounts = state.accounts.filter(a => a.handle !== post.handle);
    save(); renderFeeds();
    showToast(`اکانت ${post.handle} بن شد و آی‌دی آن دیگر قابل استفاده نیست.`, 'success');
}

function openNewChatModal() {
    const container = document.getElementById('new-chat-list');
    const searchInput = document.getElementById('new-chat-search');
    searchInput.value = '';
    
    let usersHTML = '';
    const followed = state.user.followedUsers || [];
    
    if (followed.length === 0) {
        usersHTML = '<p style="color:var(--text-secondary); text-align:center; padding:10px;">شما هنوز کسی را دنبال نکرده‌اید.</p>';
    } else {
        followed.forEach(handle => {
            const u = getUserInfo(handle);
            usersHTML += `
                <div class="new-chat-user" onclick="openChat('${handle}'); document.getElementById('new-chat-modal').classList.remove('show');">
                    <img src="${u.avatar}">
                    <div class="new-chat-user-info">
                        <span class="new-chat-user-name">${u.name}${getBadgeHTML(u.badgeType)}</span>
                        <span class="new-chat-user-handle">${u.handle}</span>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = usersHTML;
    document.getElementById('new-chat-modal').classList.add('show');
}

document.getElementById('new-chat-search').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const container = document.getElementById('new-chat-list');
    
    if (!query) { openNewChatModal(); return; }
    
    const allHandles = new Set([...state.posts.map(p => p.handle), ...state.accounts.map(a => a.handle), ...state.user.followedUsers]);
    const results = [...allHandles].filter(h => h.toLowerCase().includes(query));
    
    let usersHTML = '';
    if (results.length === 0) {
        usersHTML = '<p style="color:var(--text-secondary); text-align:center; padding:10px;">کاربری یافت نشد. (می‌توانید آیدی را کامل تایپ کنید)</p>';
    } else {
        results.forEach(handle => {
            const u = getUserInfo(handle);
            usersHTML += `
                <div class="new-chat-user" onclick="openChat('${handle}'); document.getElementById('new-chat-modal').classList.remove('show');">
                    <img src="${u.avatar}">
                    <div class="new-chat-user-info">
                        <span class="new-chat-user-name">${u.name}${getBadgeHTML(u.badgeType)}</span>
                        <span class="new-chat-user-handle">${u.handle}</span>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = usersHTML;
});

function startNewChat() {
    const query = document.getElementById('new-chat-search').value.trim().replace(/@/g, '');
    if (!query) return;
    const handle = '@' + query;
    document.getElementById('new-chat-modal').classList.remove('show');
    openChat(handle);
}

// ✅ renderAccountList با دکمه حذف
function renderAccountList() {
    const container = document.getElementById('account-list');
    if (!container) return;
    const allUsers = [state.user, ...(state.accounts || []).filter(u => u.handle !== state.user.handle)];
    
    container.innerHTML = allUsers.map(u => {
        const isActive = u.handle === state.user.handle;
        const deleteBtn = !isActive ? `<button class="btn-delete-account" onclick="deleteAccount(event, '${u.handle}')" title="حذف اکانت"><svg><use href="#i-trash"/></svg></button>` : '';
        
        return `
        <div class="account-card ${isActive ? 'active' : ''}">
            <div class="account-info">
                <img src="${u.avatar || DEFAULT_AVATAR}" class="account-avatar">
                <div class="account-details">
                    <span class="account-name">${parseAll(u.name)}${getBadgeHTML(u.badgeType)}</span>
                    <span class="account-handle">${u.handle}</span>
                </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                ${isActive ? '<span class="btn-active-label">فعال</span>' : `<button class="btn-switch" onclick="switchAccount('${u.handle}')">تغییر</button>`}
                ${deleteBtn}
            </div>
        </div>
    `}).join('');
}

// ✅ تابع جدید حذف اکانت
function deleteAccount(e, handle) {
    e.stopPropagation();
    
    if (handle === state.user.handle) {
        showToast('برای حذف، ابتدا به اکانت دیگری بروید.', 'error');
        return;
    }
    
    if (!confirm(`آیا مطمئن هستید که می‌خواهید اکانت ${handle} را برای همیشه حذف کنید؟`)) return;

    // حذف اکانت
    state.accounts = state.accounts.filter(a => a.handle !== handle);
    
    // حذف پست‌ها و پیام‌های مربوط به این اکانت
    state.posts = state.posts.filter(p => p.handle !== handle);
    state.aiPosts = state.aiPosts.filter(p => p.handle !== handle);
    state.directMessages = state.directMessages.filter(m => m.sender !== handle && m.recipient !== handle);
    
    // حذف از لیست دنبال شده‌ها
    if (state.user.followedUsers) {
        state.user.followedUsers = state.user.followedUsers.filter(h => h !== handle);
    }
    
    saveNow();
    renderAccountList();
    renderFeeds();
    renderProfile();
    showToast('اکانت با موفقیت حذف شد.', 'success');
}

function switchAccount(handle) {
    const existingIdx = state.accounts.findIndex(a => a.handle === state.user.handle);
    if (existingIdx !== -1) state.accounts[existingIdx] = state.user;
    else state.accounts.push(state.user);

    const newUser = state.accounts.find(a => a.handle === handle);
    if (newUser) {
        state.user = newUser;
        saveNow();
        renderProfile(); renderFeeds(); renderAccountList(); switchView('home'); 
    }
}

function votePoll(e, id, optionIndex) {
    e.stopPropagation();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post || !post.poll || post.poll.votedIndex !== null) return; 
    post.poll.options[optionIndex].votes += 1;
    post.poll.votedIndex = optionIndex;
    save(); renderFeeds();
}

function toggleReaction(e, id, emoji) {
    e.stopPropagation();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    if (!post.stats.reactions) post.stats.reactions = {};
    if (post.myReaction === emoji) {
        post.stats.reactions[emoji] = Math.max(0, (post.stats.reactions[emoji] || 1) - 1);
        post.myReaction = null;
    } else {
        if (post.myReaction && post.stats.reactions[post.myReaction]) post.stats.reactions[post.myReaction] = Math.max(0, post.stats.reactions[post.myReaction] - 1);
        post.stats.reactions[emoji] = (post.stats.reactions[emoji] || 0) + 1;
        post.myReaction = emoji;
    }
    save(); renderFeeds();
}

function openReactionPicker(e, id) {
    e.stopPropagation();
    currentReactionPostId = id;
    const rect = e.target.closest('button').getBoundingClientRect();
    const popup = document.getElementById('reaction-popup');
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top - 50}px`;
    popup.classList.add('show');
}

function selectReaction(emoji) {
    document.getElementById('reaction-popup').classList.remove('show');
    if (!currentReactionPostId) return;
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == currentReactionPostId);
    if (!post) return;
    if (!post.stats.reactions) post.stats.reactions = {};
    if (post.myReaction === emoji) {
        post.stats.reactions[emoji] = Math.max(0, (post.stats.reactions[emoji] || 1) - 1);
        post.myReaction = null;
    } else {
        if (post.myReaction && post.stats.reactions[post.myReaction]) post.stats.reactions[post.myReaction] = Math.max(0, post.stats.reactions[post.myReaction] - 1);
        post.stats.reactions[emoji] = (post.stats.reactions[emoji] || 0) + 1;
        post.myReaction = emoji;
    }
    save(); renderFeeds(); currentReactionPostId = null;
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.add-reaction-btn') && !e.target.closest('.reaction-popup')) {
        const popup = document.getElementById('reaction-popup');
        if(popup) popup.classList.remove('show');
    }
});

function toggleAction(e, id, type) {
    e.stopPropagation();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    if (type === 'like') {
        post.liked = !post.liked;
        const currentLikes = parseStatNum(post.stats.likes);
        post.stats.likes = faNum(currentLikes + (post.liked ? 1 : -1));
    } else if (type === 'retweet') {
        post.retweeted = !post.retweeted;
        const currentRetweets = parseStatNum(post.stats.retweets);
        post.stats.retweets = faNum(currentRetweets + (post.retweeted ? 1 : -1));
    } else if (type === 'bookmark') {
        post.bookmarked = !post.bookmarked;
    }
    save(); renderFeeds();
}

function switchHomeTab(tab) {
    currentHomeTab = tab;
    document.getElementById('tab-following').classList.toggle('active', tab === 'following');
    document.getElementById('tab-foryou').classList.toggle('active', tab === 'foryou');
    renderFeeds();
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if(target) { target.classList.add('active'); target.scrollTop = 0; }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navIndex = ['home', 'search', 'notifications', 'messages', 'bookmarks', 'profile'].indexOf(viewName);
    if (navIndex !== -1) document.querySelectorAll('.nav-item')[navIndex].classList.add('active');
    
    const topTabs = document.getElementById('home-tabs-container');
    const header = document.getElementById('main-header');
    const fab = document.getElementById('btn-compose');
    const bottomNav = document.querySelector('.bottom-nav');
    
    if (viewName === 'chat') {
        if(header) header.style.display = 'none';
        if(topTabs) topTabs.style.display = 'none';
        if(fab) fab.style.display = 'none';
        if(bottomNav) bottomNav.style.display = 'none';
    } else {
        if(bottomNav) bottomNav.style.display = 'flex';
        
        if (viewName !== 'home') {
            if(header) header.style.display = 'none';
            if(topTabs) topTabs.style.display = 'none';
        } else {
            if(header) header.style.display = 'flex';
            if(topTabs) topTabs.style.display = 'flex';
        }

        if (viewName === 'messages') {
            if(fab) {
                fab.style.display = 'flex';
                document.getElementById('fab-icon').setAttribute('href', '#i-mail');
                document.getElementById('fab-text').textContent = 'پیام جدید';
            }
        } else if (viewName === 'profile' || viewName === 'settings' || viewName === 'post-detail' || viewName === 'user-profile') {
            if(fab) fab.style.display = 'none'; 
        } else {
            if(fab) {
                fab.style.display = 'flex';
                document.getElementById('fab-icon').setAttribute('href', '#i-pen');
                document.getElementById('fab-text').textContent = 'نوشتن';
            }
        }
    }
    
    if (viewName === 'profile') renderProfile();
    if (viewName === 'settings') renderAccountList();
    if (viewName === 'messages') renderMessages();
    if (viewName === 'notifications') renderNotifications();
    if (currentViewStack[currentViewStack.length - 1] !== viewName) currentViewStack.push(viewName);
}

function goBack() {
    if (currentViewStack.length > 1) {
        currentViewStack.pop();
        const prev = currentViewStack[currentViewStack.length - 1];
        switchView(prev);
    }
}

function renderProfile() {
    const u = state.user;
    const headerEl = document.getElementById('profile-header');
    if (headerEl) headerEl.style.backgroundImage = `url('${u.header || DEFAULT_HEADER}')`;
    
    const avEl = document.getElementById('profile-avatar');
    if(avEl) avEl.innerHTML = `<img src="${u.avatar || DEFAULT_AVATAR}" alt="Avatar">`;
    
    const nameEl = document.getElementById('profile-name');
    if(nameEl) nameEl.innerHTML = `${parseAll(u.name)}${getBadgeHTML(u.badgeType, 'lg')}`;
    if(document.getElementById('profile-handle')) document.getElementById('profile-handle').textContent = u.handle;
    if(document.getElementById('profile-bio')) document.getElementById('profile-bio').innerHTML = parseAll(u.bio);
    if(document.getElementById('profile-followers')) document.getElementById('profile-followers').textContent = formatStatDisplay(u.followers || 0);
    if(document.getElementById('profile-following')) document.getElementById('profile-following').textContent = formatStatDisplay(u.following || 0);
    if(document.getElementById('profile-joined-text')) document.getElementById('profile-joined-text').textContent = u.joinedDate || getCurrentPersianDate();
    
    const hAvEl = document.getElementById('header-avatar');
    if(hAvEl) hAvEl.src = u.avatar || DEFAULT_AVATAR;
}

function openPostDetail(e, id) {
    if (e.target.closest('button') || e.target.closest('.poll-option') || e.target.closest('.post-avatar') || e.target.closest('.post-name') || e.target.closest('.post-handle') || e.target.closest('.mention')) return;
    activePostId = id;
    renderPostDetail(id);
    switchView('post-detail');
}

function renderPostDetail(id) {
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    const timeStr = post.ts ? formatTimeAgo(post.ts) : (post.time || 'همین حالا');
    const verifiedIcon = getBadgeHTML(post.badgeType, 'lg');

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const hasVoted = post.poll.votedIndex !== null;
        pollHTML = `<div class="poll-container" style="margin-top: 16px;"><div class="poll-question">${parseAll(post.poll.question)}</div>`;
        post.poll.options.forEach((opt, index) => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isSelected = post.poll.votedIndex === index;
            pollHTML += `<div class="poll-option ${isSelected ? 'selected' : ''}" onclick="votePoll(event, '${post.id}', ${index})"><div class="poll-progress" style="width: ${hasVoted ? percent : 0}%"></div><div class="poll-option-content"><span class="poll-option-text">${parseAll(opt.text)} ${isSelected ? '✓' : ''}</span>${hasVoted ? `<span class="poll-option-percent">${percent.toLocaleString('fa-IR')}%</span>` : ''}</div></div>`;
        });
        pollHTML += `<div class="poll-footer">${formatStatDisplay(totalVotes)} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    let reactionsHTML = '<div class="post-reactions" style="margin-top: 12px;">';
    if (post.stats.reactions && Object.keys(post.stats.reactions).length > 0) {
        for (const [emoji, count] of Object.entries(post.stats.reactions)) {
            if (count > 0) {
                const isReacted = post.myReaction === emoji ? 'reacted' : '';
                reactionsHTML += `<button type="button" class="reaction-pill ${isReacted}" onclick="toggleReaction(event, '${post.id}', '${emoji}')">${getEmojiImg(emoji)}<span class="rp-count">${formatStatDisplay(count)}</span></button>`;
            }
        }
    }
    reactionsHTML += `<button type="button" class="add-reaction-btn" onclick="openReactionPicker(event, '${post.id}')">${iconReaction}</button></div>`;

    const detailHTML = `
        <div class="post" style="border-bottom:none;">
            <div class="post-avatar" onclick="openUserProfile('${post.handle}')"><img src="${post.avatar}"></div>
            <div class="post-content">
                <div class="post-header" style="display:flex; flex-direction:column; gap:0px; margin-bottom: 4px;">
                    <div style="display:flex; align-items:center; gap:2px;">
                        <span class="post-name" style="cursor:pointer;" onclick="openUserProfile('${post.handle}')">${parseAll(post.author)}</span>${verifiedIcon}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top: 0px;">
                        <span class="post-handle" style="cursor:pointer; color:var(--text-secondary); opacity:0.8; font-size:14px;" onclick="openUserProfile('${post.handle}')">${post.handle}</span>
                    </div>
                </div>
                <div class="post-text" style="font-size:18px; margin-top:8px;">${parseAll(post.text)}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" style="margin-top:12px;">` : ''}
                ${pollHTML}
                <div style="color:var(--text-secondary); font-size:14px; margin-top:16px;">${timeStr} · ${formatStatDisplay(post.stats.views)} بازدید</div>
                ${reactionsHTML}
            </div>
        </div>
    `;
    document.getElementById('post-detail-content').innerHTML = detailHTML;
}

document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('search-results');
    if (!query) { resultsContainer.innerHTML = ''; return; }
    const results = [...state.posts, ...state.aiPosts].filter(p => p.text.toLowerCase().includes(query) || p.author.toLowerCase().includes(query));
    resultsContainer.innerHTML = results.length > 0 ? results.map(p => createPostHTML(p)).join('') : '<div class="empty-state"><h3>نتیجه‌ای یافت نشد</h3></div>';
});

document.getElementById('btn-compose').addEventListener('click', () => {
    if (document.getElementById('view-messages').classList.contains('active')) {
        openNewChatModal();
        return;
    }
    
    editingPostId = null;
    composeSelectedAccount = state.user;
    updateComposeUI();
    document.getElementById('compose-account-selector').style.pointerEvents = 'auto';

    document.getElementById('compose-modal-title').textContent = 'نوشتن ویراست';
    document.getElementById('compose-text').value = '';
    updateComposeHighlight();
    document.getElementById('compose-image-preview').style.display = 'none';
    
    document.getElementById('compose-poll-container').style.display = 'none';
    document.getElementById('poll-question').value = '';
    document.getElementById('poll-options-list').innerHTML = `<input type="text" class="poll-option-input" placeholder="گزینه ۱"><input type="text" class="poll-option-input" placeholder="گزینه ۲">`;
    isPollMode = false;

    document.getElementById('compose-modal').classList.add('show');
    setTimeout(() => document.getElementById('compose-text').focus(), 100);
});

let tempPostImage = null;
let tempAvatar = null;
let tempCover = null;

document.getElementById('btn-toggle-poll').addEventListener('click', () => {
    if (editingPostId) return; 
    const container = document.getElementById('compose-poll-container');
    isPollMode = !isPollMode;
    container.style.display = isPollMode ? 'block' : 'none';
});

document.getElementById('btn-add-poll-option').addEventListener('click', () => {
    const list = document.getElementById('poll-options-list');
    if (list.children.length >= 4) { showToast('حداکثر ۴ گزینه مجاز است.', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'poll-option-input'; input.placeholder = `گزینه ${list.children.length + 1}`;
    list.appendChild(input);
});

function compressImage(file, maxWidth, maxHeight, callback, cropRatio = null, quality = 0.85) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
            if (cropRatio) {
                const imgRatio = img.width / img.height;
                if (imgRatio > cropRatio) { sourceWidth = img.height * cropRatio; sourceX = (img.width - sourceWidth) / 2; }
                else if (imgRatio < cropRatio) { sourceHeight = img.width / cropRatio; sourceY = (img.height - sourceHeight) / 2; }
            }
            let targetWidth = sourceWidth, targetHeight = sourceHeight;
            if (targetWidth > maxWidth || targetHeight > maxHeight) {
                const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
                targetWidth *= ratio; targetHeight *= ratio;
            }
            canvas.width = targetWidth; canvas.height = targetHeight;
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
            callback(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'upload-image') {
        const file = e.target.files[0];
        if (file) compressImage(file, 600, 600, (base64) => { 
            tempPostImage = base64; 
            document.getElementById('preview-img').src = base64; 
            document.getElementById('compose-image-preview').style.display = 'block'; 
        }, null, 0.75);
    }
    if (e.target && e.target.id === 'upload-avatar') {
        const file = e.target.files[0];
        if (file) compressImage(file, 200, 200, (base64) => { 
            tempAvatar = base64; 
            document.getElementById('edit-avatar-preview').innerHTML = `<img src="${base64}" alt="Avatar"><label for="upload-avatar" class="edit-avatar-btn"><svg><use href="#i-image"/></svg></label><input type="file" id="upload-avatar" accept="image/*" hidden>`; 
        }, 1.0, 0.7); 
    }
    if (e.target && e.target.id === 'upload-cover') {
        const file = e.target.files[0];
        if (file) compressImage(file, 1000, 500, (base64) => { 
            tempCover = base64; 
            document.getElementById('edit-cover-preview').style.backgroundImage = `url('${base64}')`; 
        }, 2.0, 0.7); 
    }
});

document.getElementById('btn-submit-post').addEventListener('click', () => {
    const text = document.getElementById('compose-text').value.trim();
    
    if (editingPostId) {
        const post = state.posts.find(p => p.id === editingPostId);
        if (post) { post.text = text; saveNow(); renderFeeds(); }
        editingPostId = null;
        document.getElementById('compose-modal').classList.remove('show');
        return;
    }

    const authorAccount = composeSelectedAccount || state.user;

    let pollData = null;
    if (isPollMode) {
        const question = document.getElementById('poll-question').value.trim();
        const optionInputs = document.querySelectorAll('.poll-option-input');
        const options = [];
        optionInputs.forEach(input => { const val = input.value.trim(); if (val) options.push({ text: val, votes: 0 }); });
        if (!question || options.length < 2) { showToast('سوال و حداقل ۲ گزینه وارد کنید.', 'error'); return; }
        pollData = { 
            question, options, votedIndex: null,
            aiVoters: {},
            maxVotes: Math.max(5, Math.floor((authorAccount.followers || 100) * 1.1))
        };
    }

    if (!text && !tempPostImage && !pollData) return;
    
    const newStats = generateStats(authorAccount.followers || 100, 0);
    
    const newPost = {
        id: Date.now().toString(), 
        author: authorAccount.name, 
        handle: authorAccount.handle,
        avatar: authorAccount.avatar || DEFAULT_AVATAR, 
        isVerified: authorAccount.isVerified,
        badgeType: authorAccount.badgeType,
        ts: Date.now(), 
        joinedDate: authorAccount.joinedDate || getCurrentPersianDate(),
        text, 
        image: tempPostImage, 
        poll: pollData, 
        stats: newStats,
        myReaction: null, liked: false, retweeted: false, bookmarked: false
    };
    
    state.posts.unshift(newPost);
    addNotification('ویراست شما با موفقیت منتشر شد.', 'post'); // ✅ اعلان انتشار ویراست
    saveNow();
    tempPostImage = null;
    document.getElementById('compose-modal').classList.remove('show');
    switchView('home');
    renderFeeds();
});

document.getElementById('btn-edit-profile').addEventListener('click', (e) => {
    e.preventDefault();
    const u = state.user;
    if (!u) return;
    document.getElementById('edit-name').value = u.name || '';
    document.getElementById('edit-bio').value = u.bio || '';
    document.getElementById('edit-followers').value = u.followers || 0;
    document.getElementById('edit-username').value = (u.handle || '').replace('@', '');
    document.getElementById('edit-following').value = u.following || 0;
    document.getElementById('edit-joined').value = u.joinedDate || getCurrentPersianDate();
    document.getElementById('edit-badge-type').value = u.badgeType || '';
    
    document.getElementById('edit-cover-preview').style.backgroundImage = `url('${u.header || DEFAULT_HEADER}')`;
    document.getElementById('edit-avatar-preview').innerHTML = `<img src="${u.avatar || DEFAULT_AVATAR}" alt="Avatar"><label for="upload-avatar" class="edit-avatar-btn"><svg><use href="#i-image"/></svg></label><input type="file" id="upload-avatar" accept="image/*" hidden>`;
    document.getElementById('edit-profile-modal').classList.add('show');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.target.closest('.modal-overlay').classList.remove('show');
    });
});

document.querySelectorAll('.ptab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentProfileTab = e.currentTarget.textContent.trim();
        renderProfileFeed();
    });
});

document.getElementById('btn-save-profile').addEventListener('click', (e) => {
    e.preventDefault(); 
    e.stopPropagation();

    const oldHandle = state.user.handle;

    const newName = document.getElementById('edit-name').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();
    if (newName) state.user.name = newName;
    state.user.bio = newBio;
    state.user.followers = parseInt(document.getElementById('edit-followers').value) || 0;
    state.user.following = parseInt(document.getElementById('edit-following').value) || 0;
    state.user.joinedDate = document.getElementById('edit-joined').value.trim() || getCurrentPersianDate();
    
    const badgeType = document.getElementById('edit-badge-type').value;
    state.user.badgeType = badgeType || null;
    state.user.isVerified = !!badgeType;

    const newUsernameInput = document.getElementById('edit-username').value.trim();
    if (newUsernameInput) {
        const cleanUsername = newUsernameInput.replace(/@/g, '').replace(/\s+/g, '');
        state.user.handle = '@' + cleanUsername;
    }

    if (oldHandle !== state.user.handle) {
        state.accounts = state.accounts.filter(a => a.handle !== oldHandle);
    }

    if (tempAvatar) state.user.avatar = tempAvatar;
    if (tempCover) state.user.header = tempCover;

    saveNow();
    renderProfile(); renderFeeds(); renderAccountList();
    document.getElementById('edit-profile-modal').classList.remove('show');
    tempAvatar = null; 
    tempCover = null;
});

document.getElementById('btn-create-account').addEventListener('click', () => {
    const name = document.getElementById('new-account-name').value.trim();
    const handleInput = document.getElementById('new-account-handle').value.trim();
    if (!name || !handleInput) return;
    
    const handle = '@' + handleInput.replace(/@/g, '').replace(/\s+/g, '');
    
    if (state.bannedUsers.includes(handle)) {
        showToast('این نام کاربری به دلیل نقض قوانین بن شده و قابل استفاده نیست.', 'error');
        return;
    }
    
    if (state.user.handle === handle || (state.accounts || []).some(a => a.handle === handle)) {
        showToast('این نام کاربری قبلا استفاده شده است.', 'error');
        return;
    }
    
    const newUser = {
        name, handle, bio: 'به Virasty خوش آمدید!', 
        joinedDate: getCurrentPersianDate(),
        followers: 100, following: 0, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=400`,
        header: DEFAULT_HEADER, isVerified: false, badgeType: null, followedUsers: []
    };
    
    const existingIdx = (state.accounts || []).findIndex(a => a.handle === state.user.handle);
    if (!state.accounts) state.accounts = [];
    if (existingIdx !== -1) state.accounts[existingIdx] = state.user;
    else state.accounts.push(state.user);
    
    state.user = newUser;
    saveNow();
    renderProfile(); renderFeeds(); renderAccountList();
    document.getElementById('add-account-modal').classList.remove('show');
    document.getElementById('new-account-name').value = '';
    document.getElementById('new-account-handle').value = '';
    switchView('home');
});

// ========================
// ساخت آمار اولیه
// ========================
function generateStats(followers, ageMs = 0) {
    const f = Math.max(20, followers || 100);
    const cap = Math.max(10, Math.floor(f * 1.1));

    const progress = Math.min(1, Math.max(0, ageMs / (8 * 60 * 60 * 1000)));
    const initialFactor = progress * (0.3 + Math.random() * 0.4);

    const views = Math.floor(cap * initialFactor);
    const likes = Math.floor(cap * initialFactor);
    const retweets = Math.floor(cap * initialFactor);
    const replies = Math.floor(cap * initialFactor);
    const reactionsTotal = Math.floor(cap * initialFactor);

    const reactions = {};
    if (reactionsTotal > 0) {
        const emojis = ['❤️', '👍', '😂', '🔥', '😮'];
        const shuffled = [...emojis].sort(() => Math.random() - 0.5);
        let remaining = reactionsTotal;
        const r1 = Math.floor(remaining * 0.5); reactions[shuffled[0]] = r1; remaining -= r1;
        const r2 = Math.floor(remaining * 0.6); reactions[shuffled[1]] = r2; remaining -= r2;
        if (remaining > 0) reactions[shuffled[2]] = remaining;
    }

    return {
        views: faNum(views), likes: faNum(likes), retweets: faNum(retweets), replies: faNum(replies),
        reactions,
        _target: { viewsMax: cap, likesMax: cap, retweetsMax: cap, repliesMax: cap, reactionsMax: cap }
    };
}

// ========================
// شبیه‌ساز رشد آمار
// ========================
function startStatsGrowthSimulation() {
    setInterval(() => {
        let changed = false;
        const allPosts = [...state.posts, ...state.aiPosts];
        const now = Date.now();

        allPosts.forEach(post => {
            if (!post.stats) return;
            if (!post.stats._target) {
                const followers = (getAccountInfo(post.handle).followers || 100);
                const age = Math.max(0, now - (post.ts || now));
                post.stats._target = generateStats(followers, age)._target;
            }
            const t = post.stats._target;

            const cv = parseStatNum(post.stats.views);
            if (cv < t.viewsMax) {
                const step = Math.max(1, Math.ceil((t.viewsMax - cv) * 0.04 * (0.7 + Math.random() * 0.6)));
                post.stats.views = faNum(Math.min(t.viewsMax, cv + step));
                changed = true;
            }
            if (Math.random() < 0.55) {
                const cl = parseStatNum(post.stats.likes);
                if (cl < t.likesMax) {
                    const step = Math.max(1, Math.ceil((t.likesMax - cl) * 0.04 * (0.7 + Math.random() * 0.6)));
                    post.stats.likes = faNum(Math.min(t.likesMax, cl + step));
                    changed = true;
                }
            }
            if (Math.random() < 0.35) {
                const cr = parseStatNum(post.stats.retweets);
                if (cr < t.retweetsMax) {
                    const step = Math.max(1, Math.ceil((t.retweetsMax - cr) * 0.04 * (0.7 + Math.random() * 0.6)));
                    post.stats.retweets = faNum(Math.min(t.retweetsMax, cr + step));
                    changed = true;
                }
            }
            if (Math.random() < 0.25) {
                const crep = parseStatNum(post.stats.replies);
                if (crep < t.repliesMax) {
                    const step = Math.max(1, Math.ceil((t.repliesMax - crep) * 0.04 * (0.7 + Math.random() * 0.6)));
                    post.stats.replies = faNum(Math.min(t.repliesMax, crep + step));
                    changed = true;
                }
            }
            if (Math.random() < 0.5) {
                if (!post.stats.reactions) post.stats.reactions = {};
                const curTotal = Object.values(post.stats.reactions).reduce((s, n) => s + (Number(n) || 0), 0);
                if (curTotal < t.reactionsMax) {
                    const emojis = ['❤️', '👍', '😂', '🔥', '😮'];
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    const step = Math.max(1, Math.ceil((t.reactionsMax - curTotal) * 0.04));
                    post.stats.reactions[emoji] = (Number(post.stats.reactions[emoji]) || 0) + step;
                    changed = true;
                }
            }
        });

        if (changed) { save(); renderFeeds(); }
    }, 5000);
}

// ========================
// شبیه‌ساز رای AI در نظرسنجی‌ها
// ========================
function startPollVotingSimulation() {
    setInterval(() => {
        let changed = false;
        const allPosts = [...state.posts, ...state.aiPosts];
        const now = Date.now();

        allPosts.forEach(post => {
            if (!post.poll) return;
            if (!post.poll.aiVoters) post.poll.aiVoters = {};
            if (!post.poll.maxVotes) {
                const followers = getAccountInfo(post.handle).followers || 100;
                post.poll.maxVotes = Math.max(5, Math.floor(followers * 1.1));
            }

            const currentTotal = post.poll.options.reduce((s, o) => s + o.votes, 0);
            if (currentTotal >= post.poll.maxVotes) return;

            const ageMin = (now - (post.ts || now)) / 60000;
            const chance = Math.min(0.6, 0.15 + ageMin * 0.003);
            if (Math.random() > chance) return;

            const remaining = post.poll.maxVotes - currentTotal;
            const step = Math.max(1, Math.ceil(remaining * 0.03 * (0.5 + Math.random())));

            const voters = getAvailableAIVoters().filter(h => post.poll.aiVoters[h] === undefined);

            if (voters.length > 0) {
                const shuffled = [...voters].sort(() => Math.random() - 0.5);
                const count = Math.min(step, shuffled.length);
                for (let i = 0; i < count; i++) {
                    const handle = shuffled[i];
                    const optIdx = Math.floor(Math.random() * post.poll.options.length);
                    post.poll.options[optIdx].votes += 1;
                    post.poll.aiVoters[handle] = optIdx;
                }
                const stillNeed = Math.min(step - count, post.poll.maxVotes - (currentTotal + count));
                for (let i = 0; i < stillNeed; i++) {
                    const optIdx = Math.floor(Math.random() * post.poll.options.length);
                    post.poll.options[optIdx].votes += 1;
                }
            } else {
                const count = Math.min(step, remaining);
                for (let i = 0; i < count; i++) {
                    const optIdx = Math.floor(Math.random() * post.poll.options.length);
                    post.poll.options[optIdx].votes += 1;
                }
            }
            changed = true;
        });

        if (changed) { save(); renderFeeds(); }
    }, 8000);
}

// ========================
// ذخیره‌ی اضطراری
// ========================
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
});
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);

document.addEventListener('DOMContentLoaded', () => {
    // ✅ نمایش پیام موفقیت‌آمیز بودن بروزرسانی بعد از رفرش
    if (sessionStorage.getItem('update_checked') === '1') {
        sessionStorage.removeItem('update_checked');
        setTimeout(() => showToast('✓ شما از آخرین نسخه استفاده می‌کنید', 'success'), 1000);
    }
    
    // ✅ اگر آپدیتی موجود بود، مودال نمایش داده میشه (منطق داخل checkForUpdate)
    if (sessionStorage.getItem('update_available_version')) {
        sessionStorage.removeItem('update_available_version');
        setTimeout(() => document.getElementById('update-modal').classList.add('show'), 1000);
    }

    renderFeeds();
    renderProfile();
    switchHomeTab('following');
    checkForUpdate();
    startAIModerationSimulation();
    startStatsGrowthSimulation();
    startPollVotingSimulation();

    const versionEl = document.getElementById('settings-version');
    if (versionEl) versionEl.textContent = APP_VERSION;

    document.getElementById('compose-text').addEventListener('input', updateComposeHighlight);
    document.getElementById('compose-text').addEventListener('scroll', function() {
        document.getElementById('compose-highlight').scrollTop = this.scrollTop;
    });
});
