// ========================
// تنظیمات نسخه و بروزرسانی
// ========================
const APP_VERSION = '1.0.0'; 
const CURRENT_VER_KEY = 'viraasti_app_version';

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
    localStorage.setItem(CURRENT_VER_KEY, APP_VERSION);
    setTimeout(async () => {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let name of cacheNames) await caches.delete(name);
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) await registration.unregister();
        }
        window.location.href = window.location.pathname + '?v=' + Date.now();
    }, 400); 
});

document.getElementById('btn-dismiss-update').addEventListener('click', () => {
    document.getElementById('update-modal').classList.remove('show');
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
    
    // انیمیشن ورود
    setTimeout(() => toast.classList.add('show'), 10);
    
    // حذف خودکار بعد از ۳ ثانیه
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
// سیستم هوشمند تبدیل ایموجی‌ها و منشن‌ها
// ========================
let emojiData = null;
const emojiMap = {
    '❤️': 'red-heart', '👍': 'thumbs-up', '😂': 'face-with-tears-of-joy', '🔥': 'fire', '😮': 'face-with-open-mouth'
};

async function initEmojiData() {
    const cached = localStorage.getItem('emojiDataCache');
    if (cached) { emojiData = JSON.parse(cached); return; }
    try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/emojibase-data@15.0.0/en/compact.json');
        const data = await res.json();
        emojiData = {};
        data.forEach(item => { emojiData[item.hexcode] = item.label; });
        localStorage.setItem('emojiDataCache', JSON.stringify(emojiData));
        renderFeeds(); renderProfile();
        if (document.getElementById('view-post-detail').classList.contains('active') && activePostId) renderPostDetail(activePostId);
    } catch (e) { console.error('خطا در دیتابیس ایموجی‌ها:', e); }
}

function parseEmojis(text) {
    if (!text) return '';
    if (!Intl.Segmenter) {
        let parsed = text;
        for (const [emoji, name] of Object.entries(emojiMap)) {
            parsed = parsed.split(emoji).join(`<img src="https://api.iconify.design/fluent-emoji/${name}.svg" class="emoji-img" alt="${emoji}">`);
        }
        return parsed;
    }
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = segmenter.segment(text);
    let result = '';
    for (const { segment } of segments) {
        let found = false;
        const hexcode = Array.from(segment).map(c => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('-');
        if (emojiData && emojiData[hexcode]) {
            const label = emojiData[hexcode];
            const kebabLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            result += `<img src="https://api.iconify.design/fluent-emoji/${kebabLabel}.svg" class="emoji-img" alt="${segment}" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
            found = true;
        } else {
            for (const [emoji, name] of Object.entries(emojiMap)) {
                if (segment === emoji) {
                    result += `<img src="https://api.iconify.design/fluent-emoji/${name}.svg" class="emoji-img" alt="${segment}" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
                    found = true; break;
                }
            }
        }
        if (!found) result += segment;
    }
    return result;
}

function getEmojiImg(emoji, size = '18px') {
    const name = emojiMap[emoji];
    if (!name) return `<span>${emoji}</span>`; 
    return `<img src="https://api.iconify.design/fluent-emoji/${name}.svg" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle;" alt="${emoji}">`;
}

function parseAll(text) {
    if (!text) return '';
    let parsed = parseEmojis(text);
    parsed = parsed.replace(/(^|\s)(@[a-zA-Z0-9_آ-ی]+)/g, '$1<span class="mention" onclick="event.stopPropagation(); openUserProfile(\'$2\')">$2</span>');
    return parsed;
}

let state = {
    user: {
        name: 'کاربر Virasty', handle: '@user_viraasti', bio: 'به Virasty خوش آمدید!', joinedDate: 'فروردین ۱۴۰۳',
        followers: 100, following: 50, avatar: DEFAULT_AVATAR, header: DEFAULT_HEADER, isVerified: false, followedUsers: [] 
    },
    accounts: [], 
    posts: [],
    aiPosts: [],
    directMessages: [], 
    bannedUsers: [] 
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
        if (!state.user.followedUsers) state.user.followedUsers = [];
    } catch (e) { console.error(e); }
}

let saveTimer = null;
function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            const allAccounts = [...(state.accounts || [])];
            const existingIdx = allAccounts.findIndex(a => a.handle === state.user.handle);
            if (existingIdx !== -1) allAccounts[existingIdx] = state.user;
            else allAccounts.push(state.user);

            const payload = {
                user: state.user, accounts: allAccounts, posts: state.posts, aiPosts: state.aiPosts,
                directMessages: state.directMessages, bannedUsers: state.bannedUsers
            };
            const s = JSON.stringify(payload);
            localStorage.setItem(KEY, s);
            localStorage.setItem(BACKUP_KEY, s);
        } catch (e) { console.error(e); }
    }, 150);
}

load();

if (state.aiPosts.length === 0) {
    const now = Date.now();
    state.aiPosts = [
        {
            id: 'ai1', author: 'اخبار هوش مصنوعی', handle: '@AINews', avatar: 'https://ui-avatars.com/api/?name=AI&background=1d9bf0&color=fff',
            isVerified: true, ts: now - (2 * 60 * 60 * 1000),
            text: 'هوش مصنوعی گوگل (Gemini) به‌روزرسانی جدیدی دریافت کرد. 🤖🎥',
            image: null, stats: generateStats(50000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai2', author: 'ورزش۳', handle: '@Varzesh3', avatar: 'https://ui-avatars.com/api/?name=ورزش&background=dc2626&color=fff',
            isVerified: true, ts: now - (4 * 60 * 60 * 1000),
            text: 'رئال مادرید در یک بازی نفس‌گیر موفق شد بارسلونا را شکست دهد و قهرمان شود! ⚽🏆🔥',
            image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&fit=crop',
            stats: generateStats(120000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai3', author: 'تکنولوژی روز', handle: '@TechNews', avatar: 'https://ui-avatars.com/api/?name=Tech&background=3b82f6&color=fff',
            isVerified: true, ts: now - (6 * 60 * 60 * 1000),
            text: 'اپل از تراشه جدید M4 رونمایی کرد. این تراشه ۵۰ درصد سریع‌تر از نسل قبل است و در آیپد پرو جدید استفاده خواهد شد. 💻📱',
            image: null, stats: generateStats(85000), myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai4', author: 'میم و سرگرمی', handle: '@Memes', avatar: 'https://ui-avatars.com/api/?name=Meme&background=f59e0b&color=fff',
            isVerified: false, ts: now - (8 * 60 * 60 * 1000),
            text: 'وقتی میفهمی فردا امتحان داری و هنوز هیچی نخوندی: 😂💀',
            image: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&fit=crop',
            stats: generateStats(250000), myReaction: null, liked: false, retweeted: false, bookmarked: false
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
                reactionsHTML += `<button type="button" class="reaction-pill ${isReacted}" onclick="toggleReaction(event, '${post.id}', '${emoji}')">${getEmojiImg(emoji)}<span class="rp-count">${count.toLocaleString('fa-IR')}</span></button>`;
            }
        }
    }
    reactionsHTML += `<button type="button" class="add-reaction-btn" onclick="openReactionPicker(event, '${post.id}')">${iconReaction}</button></div>`;

    const timeStr = post.ts ? formatTimeAgo(post.ts) : (post.time || 'همین حالا');
    const verifiedIcon = post.isVerified ? `<img src="blue-tick.png" class="verified-icon" alt="verified">` : '';

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
        pollHTML += `<div class="poll-footer">${totalVotes.toLocaleString('fa-IR')} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    return `
        <div class="post" onclick="openPostDetail(event, '${post.id}')">
            <div class="post-avatar" onclick="event.stopPropagation(); openUserProfile('${post.handle}')"><img src="${post.avatar}" alt="Avatar"></div>
            <div class="post-content">
                <div class="post-header" style="display:flex; flex-direction:column; margin-bottom:6px; width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; width: 100%; line-height: 1.1;">
                        <div style="display:flex; align-items:center; gap:2px; overflow:hidden;">
                            <span class="post-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="event.stopPropagation(); openUserProfile('${post.handle}')">${parseAll(post.author)}</span>${verifiedIcon}
                        </div>
                        <button type="button" class="post-more-btn" onclick="openPostOptions(event, '${post.id}')" style="margin-right: 0; padding: 0 4px; margin-top: -3px;"><svg style="width: 18px; height: 18px;"><use href="#i-more"/></svg></button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; width: 100%; margin-top: -1px; line-height: 1.1;">
                        <span class="post-handle" style="white-space:nowrap; cursor:pointer; color:var(--text-secondary); opacity:0.8; font-size:13px;" onclick="event.stopPropagation(); openUserProfile('${post.handle}')">${post.handle}</span>
                        <span class="post-time" style="white-space:nowrap; color:var(--text-secondary); opacity:0.8; font-size:13px;">${timeStr}</span>
                    </div>
                </div>
                
                <div class="post-text">${parseAll(post.text)}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" alt="Post Image">` : ''}
                ${pollHTML}
                <div class="post-actions">
                    <button type="button" class="action-btn"><svg><use href="#i-reply"/></svg> ${post.stats.replies}</button>
                    <button type="button" class="action-btn retweet-btn ${post.retweeted ? 'retweeted' : ''}" onclick="toggleAction(event, '${post.id}', 'retweet')"><svg><use href="#i-retweet"/></svg> ${post.stats.retweets}</button>
                    <button type="button" class="action-btn like-btn ${post.liked ? 'liked' : ''}" onclick="toggleAction(event, '${post.id}', 'like')"><svg><use href="#i-heart"/></svg> ${post.stats.likes}</button>
                    <button type="button" class="action-btn"><svg><use href="#i-chart"/></svg> ${post.stats.views}</button>
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

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    const dummyNotifications = [
        { id: 1, type: 'like', text: 'کاربر <b>ورزش۳</b> ویراست شما را لایک کرد.', time: Date.now() - 1000 * 60 * 5 },
        { id: 2, type: 'reply', text: 'کاربر <b>تکنولوژی روز</b> به ویراست شما پاسخ داد: "عالی بود!"', time: Date.now() - 1000 * 60 * 60 * 2 },
        { id: 3, type: 'retweet', text: 'کاربر <b>اخبار هوش مصنوعی</b> ویراست شما را بازنشر کرد.', time: Date.now() - 1000 * 60 * 60 * 5 }
    ];

    container.innerHTML = dummyNotifications.map(n => {
        let iconHTML = '';
        if (n.type === 'like') iconHTML = `<svg><use href="#i-heart"/></svg>`;
        else if (n.type === 'reply') iconHTML = `<svg><use href="#i-reply"/></svg>`;
        else if (n.type === 'retweet') iconHTML = `<svg><use href="#i-retweet"/></svg>`;

        return `
            <div class="notification-item">
                <div class="notification-icon">${iconHTML}</div>
                <div class="notification-content">
                    <div class="notification-text">${n.text}</div>
                    <div class="notification-time">${formatTimeAgo(n.time)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getUserInfo(handle) {
    if (handle === state.user.handle) return state.user;
    const acc = state.accounts.find(a => a.handle === handle);
    if (acc) return acc;
    
    const post = [...state.posts, ...state.aiPosts].find(p => p.handle === handle);
    if (post) {
        return { 
            name: post.author, 
            handle: post.handle, 
            avatar: post.avatar, 
            header: DEFAULT_HEADER, 
            bio: 'به Virasty خوش آمدید!', 
            followers: Math.floor(Math.random() * 1000),
            following: Math.floor(Math.random() * 500),
            isVerified: post.isVerified 
        };
    }
    
    return { 
        name: handle.replace('@', ''), 
        handle: handle, 
        avatar: DEFAULT_AVATAR, 
        header: DEFAULT_HEADER, 
        bio: 'کاربر Virasty', 
        followers: 0, 
        following: 0, 
        isVerified: false 
    };
}

function openUserProfile(rawHandle) {
    if (!rawHandle) return;
    let handle = '@' + rawHandle.replace(/@/g, '').trim();

    if (handle === state.user.handle) {
        switchView('profile');
        return;
    }
    
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
                <h1 class="profile-name">${parseAll(u.name)}${u.isVerified ? `<img src="blue-tick.png" class="verified-icon lg">` : ''}</h1>
                <span class="profile-handle">${u.handle}</span>
                <p class="profile-bio">${parseAll(u.bio || 'کاربر ویراستی')}</p>
                <div class="profile-stats">
                    <span><b>${(u.following || 0).toLocaleString('fa-IR')}</b> دنبال‌شده</span>
                    <span><b>${(u.followers || 0).toLocaleString('fa-IR')}</b> دنبال‌کننده</span>
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
                        <span class="dm-name" onclick="event.stopPropagation(); openUserProfile('${sender}')">${lastMsg.senderName || uInfo.name}${lastMsg.isVerified ? `<img src="blue-tick.png" class="verified-icon">` : ''}</span>
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
    if (uInfo.isVerified || senderHandle === '@support') {
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
        recipient: activeChatUser,
        text: text,
        ts: Date.now(),
        read: true
    };
    state.directMessages.push(newMsg);
    save();
    input.value = '';
    openChat(activeChatUser);
});

document.getElementById('chat-upload-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && activeChatUser) {
        compressImage(file, 800, 800, (base64) => {
            const newMsg = {
                id: Date.now().toString(),
                sender: state.user.handle,
                senderName: state.user.name,
                senderAvatar: state.user.avatar,
                isVerified: state.user.isVerified,
                recipient: activeChatUser,
                text: '📷 عکس ارسال شد',
                image: base64,
                ts: Date.now(),
                read: true
            };
            state.directMessages.push(newMsg);
            save();
            openChat(activeChatUser);
        });
    }
});

// ========================
// توابع انتخاب اکانت برای نوشتن
// ========================
function updateComposeUI() {
    if (!composeSelectedAccount) return;
    document.getElementById('compose-avatar').src = composeSelectedAccount.avatar || DEFAULT_AVATAR;
    
    const tickHTML = composeSelectedAccount.isVerified ? `<img src="blue-tick.png" class="verified-icon" style="width: 20px; height: 20px; margin-right: 0px; vertical-align: middle;">` : '';
    document.getElementById('compose-account-name').innerHTML = `${parseAll(composeSelectedAccount.name)}${tickHTML}`;
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
                    <span class="account-name">${parseAll(u.name)}${u.isVerified ? `<img src="blue-tick.png" class="verified-icon">` : ''}</span>
                    <span class="account-handle">${u.handle}</span>
                </div>
            </div>
            ${u.handle === composeSelectedAccount.handle ? '<span class="btn-active-label">انتخاب شده</span>' : ''}
        </div>
    `).join('');
    
    document.getElementById('compose-account-modal').classList.add('show');
}

function selectComposeAccount(handle) {
    if (handle === state.user.handle) {
        composeSelectedAccount = state.user;
    } else {
        composeSelectedAccount = (state.accounts || []).find(a => a.handle === handle);
    }
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
    
    let menuHTML = '';
    if (isMine) {
        menuHTML += `<div class="post-option-item" onclick="editPost('${post.id}')"><svg><use href="#i-pen"/></svg> ویرایش ویراست</div>`;
        menuHTML += `<div class="post-option-item danger" onclick="deletePost('${post.id}')"><svg><use href="#i-trash"/></svg> حذف ویراست</div>`;
        
        if (!post.isWarnSender) {
            menuHTML += `<div class="post-option-item" onclick="setWarnSender('${post.id}')"><svg><use href="#i-user"/></svg> تنظیم به عنوان اخطار دهنده</div>`;
        } else {
            menuHTML += `<div class="post-option-item" onclick="removeWarnSender('${post.id}')"><svg><use href="#i-close"/></svg> لغو اخطار دهنده</div>`;
        }
    } else {
        if (!post.isVerified) menuHTML += `<div class="post-option-item" onclick="giveBlueTick('${post.id}')"><svg><use href="#i-check"/></svg> دادن تیک آبی</div>`;
        menuHTML += `<div class="post-option-item danger" onclick="deletePost('${post.id}')"><svg><use href="#i-trash"/></svg> حذف ویراست</div>`;
        menuHTML += `<div class="post-option-item" onclick="openWarnModal('${post.id}')"><svg><use href="#i-alert"/></svg> اخطار به ارسال کننده</div>`;
        if (!post.isWarnSender) {
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
        post.isWarnSender = true;
        save();
        showToast('از این پس پیام‌های اخطار از طرف این پروفایل ارسال می‌شود.', 'info');
    }
}

function removeWarnSender(id) {
    closePostOptions();
    const post = state.posts.find(p => p.id === id) || state.aiPosts.find(p => p.id === id);
    if (post) {
        post.isWarnSender = false;
        save();
        showToast('اخطار دهنده به حالت پیش‌فرض (شما) بازگشت.', 'info');
    }
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
    document.getElementById('compose-poll-container').style.display = 'none';
    document.getElementById('compose-image-preview').style.display = 'none';
    document.getElementById('compose-modal').classList.add('show');
}

function giveBlueTick(id) {
    closePostOptions();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    state.posts.forEach(p => { if (p.handle === post.handle) p.isVerified = true; });
    state.aiPosts.forEach(p => { if (p.handle === post.handle) p.isVerified = true; });
    if (state.user.handle === post.handle) state.user.isVerified = true;
    const acc = state.accounts.find(a => a.handle === post.handle);
    if (acc) acc.isVerified = true;
    save(); renderFeeds(); renderProfile();
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
        
        const senderInfo = post.isWarnSender ? 
            { handle: post.handle, name: post.author, avatar: post.avatar, isVerified: post.isVerified } : 
            { handle: state.user.handle, name: state.user.name, avatar: state.user.avatar, isVerified: state.user.isVerified };

        const msgText = `کاربر محترم ${post.author}\n\nویراست شما:\n"${preview}"\n\nبه دلیل "${reason}" اخطار دریافت کرد. در رعایت قوانین کوشا باشید.`;

        const newDM = {
            id: Date.now().toString(),
            sender: senderInfo.handle,
            senderName: senderInfo.name,
            senderAvatar: senderInfo.avatar, 
            isVerified: senderInfo.isVerified,
            recipient: post.handle,
            text: msgText,
            ts: Date.now(),
            read: false
        };
        state.directMessages.unshift(newDM);
        save();
        renderMessages();
        showToast('اخطار با موفقیت ارسال شد.', 'success');
    }
    
    document.getElementById('warn-modal').classList.remove('show');
});

function banUser(id) {
    closePostOptions();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post) return;
    
    // حذف confirm و انجام مستقیم عملیات با نمایش اعلان
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
                        <span class="new-chat-user-name">${u.name}${u.isVerified ? `<img src="blue-tick.png" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;">` : ''}</span>
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
    
    if (!query) {
        openNewChatModal();
        return;
    }
    
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
                        <span class="new-chat-user-name">${u.name}${u.isVerified ? `<img src="blue-tick.png" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;">` : ''}</span>
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

function renderAccountList() {
    const container = document.getElementById('account-list');
    if (!container) return;
    const allUsers = [state.user, ...(state.accounts || []).filter(u => u.handle !== state.user.handle)];
    container.innerHTML = allUsers.map(u => `
        <div class="account-card ${u.handle === state.user.handle ? 'active' : ''}">
            <div class="account-info">
                <img src="${u.avatar || DEFAULT_AVATAR}" class="account-avatar">
                <div class="account-details">
                    <span class="account-name">${parseAll(u.name)}${u.isVerified ? `<img src="blue-tick.png" class="verified-icon">` : ''}</span>
                    <span class="account-handle">${u.handle}</span>
                </div>
            </div>
            ${u.handle === state.user.handle ? '<span class="btn-active-label">فعال</span>' : `<button class="btn-switch" onclick="switchAccount('${u.handle}')">تغییر</button>`}
        </div>
    `).join('');
}

function switchAccount(handle) {
    const existingIdx = state.accounts.findIndex(a => a.handle === state.user.handle);
    if (existingIdx !== -1) state.accounts[existingIdx] = state.user;
    else state.accounts.push(state.user);

    const newUser = state.accounts.find(a => a.handle === handle);
    if (newUser) {
        state.user = newUser;
        save(); renderProfile(); renderFeeds(); renderAccountList(); switchView('home'); 
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
        let cl = parseInt(post.stats.likes.replace(/,/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) || 0;
        post.stats.likes = Math.max(0, cl + (post.liked ? 1 : -1)).toLocaleString('fa-IR');
    } else if (type === 'retweet') {
        post.retweeted = !post.retweeted;
        let cr = parseInt(post.stats.retweets.replace(/,/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) || 0;
        post.stats.retweets = Math.max(0, cr + (post.retweeted ? 1 : -1)).toLocaleString('fa-IR');
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
    
    const verifiedIcon = u.isVerified ? `<img src="blue-tick.png" class="verified-icon lg" alt="verified">` : '';
    
    const nameEl = document.getElementById('profile-name');
    if(nameEl) nameEl.innerHTML = `${parseAll(u.name)}${verifiedIcon}`;
    if(document.getElementById('profile-handle')) document.getElementById('profile-handle').textContent = u.handle;
    if(document.getElementById('profile-bio')) document.getElementById('profile-bio').innerHTML = parseAll(u.bio);
    if(document.getElementById('profile-followers')) document.getElementById('profile-followers').textContent = (u.followers || 0).toLocaleString('fa-IR');
    if(document.getElementById('profile-following')) document.getElementById('profile-following').textContent = (u.following || 0).toLocaleString('fa-IR');
    if(document.getElementById('profile-joined-text')) document.getElementById('profile-joined-text').textContent = u.joinedDate || 'نامشخص';
    
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
    const verifiedIcon = post.isVerified ? `<img src="blue-tick.png" class="verified-icon lg" alt="verified">` : '';

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
        pollHTML += `<div class="poll-footer">${totalVotes.toLocaleString('fa-IR')} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    let reactionsHTML = '<div class="post-reactions" style="margin-top: 12px;">';
    if (post.stats.reactions && Object.keys(post.stats.reactions).length > 0) {
        for (const [emoji, count] of Object.entries(post.stats.reactions)) {
            if (count > 0) {
                const isReacted = post.myReaction === emoji ? 'reacted' : '';
                reactionsHTML += `<button type="button" class="reaction-pill ${isReacted}" onclick="toggleReaction(event, '${post.id}', '${emoji}')">${getEmojiImg(emoji)}<span class="rp-count">${count.toLocaleString('fa-IR')}</span></button>`;
            }
        }
    }
    reactionsHTML += `<button type="button" class="add-reaction-btn" onclick="openReactionPicker(event, '${post.id}')">${iconReaction}</button></div>`;

    const detailHTML = `
        <div class="post" style="border-bottom:none;">
            <div class="post-avatar" onclick="openUserProfile('${post.handle}')"><img src="${post.avatar}"></div>
            <div class="post-content">
                <div class="post-header" style="display:flex; flex-direction:column; gap:0px; margin-bottom: 4px;">
                    <div style="display:flex; align-items:center; gap:2px; line-height: 1.1;">
                        <span class="post-name" style="cursor:pointer;" onclick="openUserProfile('${post.handle}')">${parseAll(post.author)}</span>${verifiedIcon}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top: -2px; line-height: 1.1;">
                        <span class="post-handle" style="cursor:pointer; color:var(--text-secondary); opacity:0.8; font-size:14px;" onclick="openUserProfile('${post.handle}')">${post.handle}</span>
                    </div>
                </div>
                <div class="post-text" style="font-size:18px; margin-top:8px;">${parseAll(post.text)}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" style="margin-top:12px;">` : ''}
                ${pollHTML}
                <div style="color:var(--text-secondary); font-size:14px; margin-top:16px;">${timeStr} · ${post.stats.views} بازدید</div>
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
        if (file) compressImage(file, 800, 800, (base64) => { tempPostImage = base64; document.getElementById('preview-img').src = base64; document.getElementById('compose-image-preview').style.display = 'block'; });
    }
    if (e.target && e.target.id === 'upload-avatar') {
        const file = e.target.files[0];
        if (file) compressImage(file, 400, 400, (base64) => { tempAvatar = base64; document.getElementById('edit-avatar-preview').innerHTML = `<img src="${base64}" alt="Avatar"><label for="upload-avatar" class="edit-avatar-btn"><svg><use href="#i-image"/></svg></label><input type="file" id="upload-avatar" accept="image/*" hidden>`; }, 1.0); 
    }
    if (e.target && e.target.id === 'upload-cover') {
        const file = e.target.files[0];
        if (file) compressImage(file, 1920, 1080, (base64) => { tempCover = base64; document.getElementById('edit-cover-preview').style.backgroundImage = `url('${base64}')`; }, null, 0.92); 
    }
});

document.getElementById('btn-submit-post').addEventListener('click', () => {
    const text = document.getElementById('compose-text').value.trim();
    
    if (editingPostId) {
        const post = state.posts.find(p => p.id === editingPostId);
        if (post) { post.text = text; save(); renderFeeds(); }
        editingPostId = null;
        document.getElementById('compose-modal').classList.remove('show');
        return;
    }

    let pollData = null;
    if (isPollMode) {
        const question = document.getElementById('poll-question').value.trim();
        const optionInputs = document.querySelectorAll('.poll-option-input');
        const options = [];
        optionInputs.forEach(input => { const val = input.value.trim(); if (val) options.push({ text: val, votes: 0 }); });
        if (!question || options.length < 2) { showToast('سوال و حداقل ۲ گزینه وارد کنید.', 'error'); return; }
        pollData = { question, options, votedIndex: null };
    }

    if (!text && !tempPostImage && !pollData) return;
    
    const authorAccount = composeSelectedAccount || state.user;
    const newStats = generateStats(authorAccount.followers || 100);
    
    const newPost = {
        id: Date.now().toString(), 
        author: authorAccount.name, 
        handle: authorAccount.handle,
        avatar: authorAccount.avatar || DEFAULT_AVATAR, 
        isVerified: authorAccount.isVerified,
        ts: Date.now(), 
        text, 
        image: tempPostImage, 
        poll: pollData, 
        stats: newStats,
        myReaction: null, 
        liked: false, 
        retweeted: false, 
        bookmarked: false
    };
    
    state.posts.unshift(newPost);
    save();
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
    document.getElementById('edit-joined').value = u.joinedDate || '';
    document.getElementById('edit-verified').checked = u.isVerified || false;
    
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
    e.preventDefault(); e.stopPropagation();
    const newName = document.getElementById('edit-name').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();
    if (newName) state.user.name = newName;
    state.user.bio = newBio;
    state.user.followers = parseInt(document.getElementById('edit-followers').value) || 0;
    state.user.following = parseInt(document.getElementById('edit-following').value) || 0;
    state.user.joinedDate = document.getElementById('edit-joined').value.trim() || 'نامشخص';
    state.user.isVerified = document.getElementById('edit-verified').checked;
    
    const newUsernameInput = document.getElementById('edit-username').value.trim();
    if (newUsernameInput) {
        const cleanUsername = newUsernameInput.replace(/@/g, '').replace(/\s+/g, '');
        state.user.handle = '@' + cleanUsername;
    }
    if (tempAvatar) state.user.avatar = tempAvatar;
    if (tempCover) state.user.header = tempCover;
    
    save(); renderProfile(); renderFeeds(); 
    document.getElementById('edit-profile-modal').classList.remove('show');
    tempAvatar = null; tempCover = null;
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
        name, handle, bio: 'به Virasty خوش آمدید!', joinedDate: 'فروردین ۱۴۰۳',
        followers: 0, following: 0, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=400`,
        header: DEFAULT_HEADER, isVerified: false, followedUsers: []
    };
    
    const existingIdx = (state.accounts || []).findIndex(a => a.handle === state.user.handle);
    if (!state.accounts) state.accounts = [];
    if (existingIdx !== -1) state.accounts[existingIdx] = state.user;
    else state.accounts.push(state.user);
    
    state.user = newUser;
    save(); renderProfile(); renderFeeds(); renderAccountList();
    document.getElementById('add-account-modal').classList.remove('show');
    document.getElementById('new-account-name').value = '';
    document.getElementById('new-account-handle').value = '';
    switchView('home');
});

function generateStats(followers) {
    const views = Math.floor(followers * 1.1) + Math.floor(Math.random() * 20);
    const likes = Math.floor(views * (0.05 + Math.random() * 0.1));
    const retweets = Math.floor(likes * (0.1 + Math.random() * 0.2));
    const replies = Math.floor(retweets * (0.2 + Math.random() * 0.3));
    const reactions = {};
    if (likes > 0) {
        const emojis = ['❤️', '👍', '😂', '🔥', '😮'];
        const shuffled = emojis.sort(() => 0.5 - Math.random());
        reactions[shuffled[0]] = Math.floor(likes * 0.6);
        if (likes > 5) reactions[shuffled[1]] = Math.floor(likes * 0.3);
        if (likes > 20) reactions[shuffled[2]] = Math.floor(likes * 0.1);
    }
    return {
        views: views.toLocaleString('fa-IR'), likes: likes.toLocaleString('fa-IR'),
        retweets: retweets.toLocaleString('fa-IR'), replies: replies.toLocaleString('fa-IR'), reactions
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initEmojiData(); renderFeeds(); renderProfile(); switchHomeTab('following'); checkForUpdate();
});
