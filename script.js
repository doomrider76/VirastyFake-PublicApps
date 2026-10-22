// ========================
// تنظیمات ذخیره‌سازی
// ========================
const KEY = 'viraasti_v1';
const BACKUP_KEY = 'viraasti_backup_auto';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=1d9bf0&color=fff&size=400'; 
const DEFAULT_HEADER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1500&h=500&fit=crop';

// ========================
// تنظیمات ایموجی‌های ویندوز ۱۱ (Fluent Emoji)
// ========================
const emojiMap = {
    '❤️': 'https://api.iconify.design/fluent-emoji/red-heart.svg',
    '👍': 'https://api.iconify.design/fluent-emoji/thumbs-up.svg',
    '😂': 'https://api.iconify.design/fluent-emoji/face-with-tears-of-joy.svg',
    '🔥': 'https://api.iconify.design/fluent-emoji/fire.svg',
    '😮': 'https://api.iconify.design/fluent-emoji/face-with-open-mouth.svg'
};

function getEmojiImg(emoji, size = '18px') {
    const url = emojiMap[emoji];
    if (!url) return `<span>${emoji}</span>`; 
    return `<img src="${url}" style="width: ${size}; height: ${size}; object-fit: contain; vertical-align: middle;" alt="${emoji}">`;
}

let state = {
    user: {
        name: 'کاربر ویراستی',
        handle: '@user_viraasti',
        bio: 'به ویراستی خوش آمدید!',
        joinedDate: 'فروردین ۱۴۰۳',
        followers: 100,
        following: 50,
        avatar: DEFAULT_AVATAR,
        header: DEFAULT_HEADER,
        isVerified: false,
        followedUsers: [] 
    },
    accounts: [], 
    posts: [],
    aiPosts: []
};

let currentViewStack = ['home'];
let currentHomeTab = 'following';
let currentProfileTab = 'ویراست‌ها';
let activePostId = null;
let currentReactionPostId = null;
let isPollMode = false;

// ========================
// سیستم Load و Save
// ========================
function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        
        if (saved.user) {
            state.user = { ...state.user, ...saved.user };
        }
        if (saved.accounts) state.accounts = saved.accounts;
        if (Array.isArray(saved.posts)) state.posts = saved.posts;
        if (Array.isArray(saved.aiPosts)) state.aiPosts = saved.aiPosts;
        
        if (saved.followedUsers && (!state.user.followedUsers || state.user.followedUsers.length === 0)) {
            state.user.followedUsers = saved.followedUsers;
        }
        if (!state.user.followedUsers) state.user.followedUsers = [];

    } catch (e) { console.error('خطا در بارگذاری:', e); }
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
                user: state.user,
                accounts: allAccounts,
                posts: state.posts,
                aiPosts: state.aiPosts
            };

            const s = JSON.stringify(payload);
            localStorage.setItem(KEY, s);
            localStorage.setItem(BACKUP_KEY, s);
        } catch (e) { console.error('خطا در ذخیره:', e); }
    }, 150);
}

// شروع
load();

if (state.aiPosts.length === 0) {
    const now = Date.now();
    state.aiPosts = [
        {
            id: 'ai1', author: 'اخبار هوش مصنوعی', handle: '@AINews',
            avatar: 'https://ui-avatars.com/api/?name=AI&background=1d9bf0&color=fff',
            isVerified: true, ts: now - (2 * 60 * 60 * 1000),
            text: 'هوش مصنوعی گوگل (Gemini) به‌روزرسانی جدیدی دریافت کرد که می‌تواند ویدیوهای طولانی را در چند ثانیه خلاصه کند. این فناوری قرار است به زودی به اپلیکیشن یوتیوب اضافه شود. 🤖🎥',
            image: null, stats: generateStats(50000),
            myReaction: null, liked: false, retweeted: false, bookmarked: false
        },
        {
            id: 'ai2', author: 'هوش مصنوعی ویراستی', handle: '@ViraastiAI',
            avatar: 'https://ui-avatars.com/api/?name=AI&background=8b5cf6&color=fff',
            isVerified: true, ts: now - (5 * 60 * 60 * 1000),
            text: 'به نظر شما مهم‌ترین تأثیر هوش مصنوعی بر شبکه‌های اجتماعی در سال آینده چه خواهد بود؟ 🤖',
            image: null, stats: generateStats(12000),
            poll: {
                question: 'مهم‌ترین تأثیر هوش مصنوعی بر شبکه‌های اجتماعی؟',
                options: [
                    { text: 'تولید محتوای خودکار', votes: 45 },
                    { text: 'تشخیص اخبار جعلی', votes: 80 },
                    { text: 'الگوریتم‌های پیشنهاددهنده هوشمندتر', votes: 32 }
                ],
                votedIndex: null
            },
            myReaction: null, liked: false, retweeted: false, bookmarked: false
        }
    ];
    save();
}

// ========================
// فرمت‌کننده زمان (Time Ago)
// ========================
function formatTimeAgo(ts) {
    if (!ts) return 'همین حالا';
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);
    const month = Math.floor(day / 30);
    const year = Math.floor(month / 12);

    if (sec < 60) return 'همین حالا';
    if (min < 60) return `${min.toLocaleString('fa-IR')} دقیقه پیش`;
    if (hour < 24) return `${hour.toLocaleString('fa-IR')} ساعت پیش`;
    if (day < 30) return `${day.toLocaleString('fa-IR')} روز پیش`;
    if (month < 12) return `${month.toLocaleString('fa-IR')} ماه پیش`;
    return `${year.toLocaleString('fa-IR')} سال پیش`;
}

// ========================
// توابع رندر
// ========================
const iconReaction = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
const iconEmpty = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

function createPostHTML(post) {
    let reactionsHTML = '<div class="post-reactions">';
    if (post.stats.reactions && Object.keys(post.stats.reactions).length > 0) {
        for (const [emoji, count] of Object.entries(post.stats.reactions)) {
            if (count > 0) {
                const isReacted = post.myReaction === emoji ? 'reacted' : '';
                reactionsHTML += `
                    <button type="button" class="reaction-pill ${isReacted}" onclick="toggleReaction(event, '${post.id}', '${emoji}')">
                        ${getEmojiImg(emoji)}
                        <span class="rp-count">${count.toLocaleString('fa-IR')}</span>
                    </button>
                `;
            }
        }
    }
    reactionsHTML += `<button type="button" class="add-reaction-btn" onclick="openReactionPicker(event, '${post.id}')">${iconReaction}</button></div>`;

    const followedList = state.user.followedUsers || [];
    const isFollowed = followedList.includes(post.handle) || post.handle === state.user.handle;
    const followBtnHTML = (!isFollowed && currentHomeTab === 'foryou') 
        ? `<button type="button" class="follow-btn" onclick="followUser(event, '${post.handle}')">دنبال کردن</button>` 
        : '';
        
    const timeStr = post.ts ? formatTimeAgo(post.ts) : (post.time || 'همین حالا');
    const verifiedIcon = post.isVerified ? `<img src="blue-tick.png" class="verified-icon" alt="verified">` : '';

    let pollHTML = '';
    if (post.poll) {
        const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const hasVoted = post.poll.votedIndex !== null;
        
        pollHTML = `<div class="poll-container" onclick="event.stopPropagation();">
            <div class="poll-question">${post.poll.question}</div>`;
            
        post.poll.options.forEach((opt, index) => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isSelected = post.poll.votedIndex === index;
            const selectedClass = isSelected ? 'selected' : '';
            
            pollHTML += `
                <div class="poll-option ${selectedClass}" onclick="votePoll(event, '${post.id}', ${index})">
                    <div class="poll-progress" style="width: ${hasVoted ? percent : 0}%"></div>
                    <div class="poll-option-content">
                        <span class="poll-option-text">${opt.text} ${isSelected ? '✓' : ''}</span>
                        ${hasVoted ? `<span class="poll-option-percent">${percent.toLocaleString('fa-IR')}%</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        pollHTML += `<div class="poll-footer">${totalVotes.toLocaleString('fa-IR')} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    return `
        <div class="post" onclick="openPostDetail(event, '${post.id}')">
            <div class="post-avatar"><img src="${post.avatar}" alt="Avatar"></div>
            <div class="post-content">
                <div class="post-header">
                    <div style="display:flex; align-items:center; gap:6px; flex:1; overflow:hidden;">
                        <span class="post-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${post.author} ${verifiedIcon}</span>
                        <span class="post-handle" style="white-space:nowrap;">${post.handle}</span>
                        <span class="post-time" style="white-space:nowrap;">· ${timeStr}</span>
                    </div>
                    ${followBtnHTML}
                </div>
                <div class="post-text">${post.text}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" alt="Post Image">` : ''}
                
                ${pollHTML}
                ${reactionsHTML}

                <div class="post-actions">
                    <button type="button" class="action-btn"><svg><use href="#i-reply"/></svg> ${post.stats.replies}</button>
                    <button type="button" class="action-btn retweet-btn ${post.retweeted ? 'retweeted' : ''}" onclick="toggleAction(event, '${post.id}', 'retweet')"><svg><use href="#i-retweet"/></svg> ${post.stats.retweets}</button>
                    <button type="button" class="action-btn like-btn ${post.liked ? 'liked' : ''}" onclick="toggleAction(event, '${post.id}', 'like')"><svg><use href="#i-heart"/></svg> ${post.stats.likes}</button>
                    <button type="button" class="action-btn"><svg><use href="#i-chart"/></svg> ${post.stats.views}</button>
                    <button type="button" class="action-btn bookmark-btn ${post.bookmarked ? 'bookmarked' : ''}" onclick="toggleAction(event, '${post.id}', 'bookmark')"><svg><use href="#i-bookmark"/></svg></button>
                </div>
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
        displayPosts = state.posts.filter(p => 
            followedList.includes(p.handle) || p.handle === state.user.handle
        );
        const followedAIPosts = state.aiPosts.filter(p => followedList.includes(p.handle));
        displayPosts = [...followedAIPosts, ...displayPosts];
    }

    if (displayPosts.length === 0) {
        document.getElementById('feed').innerHTML = `
            <div class="empty-state">
                ${iconEmpty}
                <h3>هنوز توییتی نیست</h3>
                <p>در بخش «برای شما» افراد را دنبال کنید تا توییت‌هایشان اینجا نمایش داده شود.</p>
            </div>
        `;
    } else {
        document.getElementById('feed').innerHTML = displayPosts.map(p => createPostHTML(p)).join('');
    }
    
    renderProfileFeed();
    
    const bmarks = [...state.posts, ...state.aiPosts].filter(p => p.bookmarked);
    document.getElementById('bookmarks-feed').innerHTML = bmarks.length > 0 ? bmarks.map(p => createPostHTML(p)).join('') : `<div class="empty-state"><h3>نشانکی ندارید</h3></div>`;

    if (activePostId && document.getElementById('view-post-detail').classList.contains('active')) {
        renderPostDetail(activePostId);
    }
}

function renderProfileFeed() {
    const myPosts = state.posts.filter(p => p.handle === state.user.handle);
    let filteredPosts = [];
    
    if (currentProfileTab === 'ویراست‌ها') {
        filteredPosts = myPosts;
    } else if (currentProfileTab === 'بازنشرها') {
        filteredPosts = myPosts.filter(p => p.retweeted);
    } else if (currentProfileTab === 'پاسخ‌ها') {
        filteredPosts = myPosts.filter(p => p.replyTo);
    } else if (currentProfileTab === 'رسانه') {
        filteredPosts = myPosts.filter(p => p.image);
    } else if (currentProfileTab === 'واکنش‌ها') {
        filteredPosts = myPosts.filter(p => p.myReaction);
    }

    const container = document.getElementById('profile-feed');
    if (container) {
        container.innerHTML = filteredPosts.length > 0 
            ? filteredPosts.map(p => createPostHTML(p)).join('') 
            : `<div class="empty-state"><h3>محتوایی در این بخش یافت نشد</h3></div>`;
    }
}

// ========================
// مدیریت اکانت‌ها
// ========================
function renderAccountList() {
    const container = document.getElementById('account-list');
    if (!container) return;
    
    const allUsers = [state.user, ...(state.accounts || []).filter(u => u.handle !== state.user.handle)];
    
    container.innerHTML = allUsers.map(u => `
        <div class="account-card ${u.handle === state.user.handle ? 'active' : ''}">
            <div class="account-info">
                <img src="${u.avatar || DEFAULT_AVATAR}" class="account-avatar">
                <div class="account-details">
                    <span class="account-name">${u.name}</span>
                    <span class="account-handle">${u.handle}</span>
                </div>
            </div>
            ${u.handle === state.user.handle 
                ? '<span class="btn-active-label">فعال</span>' 
                : `<button class="btn-switch" onclick="switchAccount('${u.handle}')">تغییر</button>`
            }
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
        save();
        renderProfile();
        renderFeeds();
        renderAccountList();
        switchView('home'); 
    }
}

// ========================
// اکشن‌ها
// ========================
function followUser(e, handle) {
    e.stopPropagation();
    if (!state.user.followedUsers) state.user.followedUsers = [];
    
    if (!state.user.followedUsers.includes(handle)) {
        state.user.followedUsers.push(handle);
        state.user.following = (state.user.following || 0) + 1;
        save();
        renderFeeds();
        document.getElementById('profile-following').textContent = state.user.following.toLocaleString('fa-IR');
    }
}

function votePoll(e, id, optionIndex) {
    e.stopPropagation();
    const post = [...state.posts, ...state.aiPosts].find(p => p.id == id);
    if (!post || !post.poll) return;
    
    if (post.poll.votedIndex !== null) return; // اگر قبلا رای داده، کاری نکن
    
    post.poll.options[optionIndex].votes += 1;
    post.poll.votedIndex = optionIndex;
    
    save();
    renderFeeds();
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
        if (post.myReaction && post.stats.reactions[post.myReaction]) {
            post.stats.reactions[post.myReaction] = Math.max(0, post.stats.reactions[post.myReaction] - 1);
        }
        post.stats.reactions[emoji] = (post.stats.reactions[emoji] || 0) + 1;
        post.myReaction = emoji;
    }
    save();
    renderFeeds();
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
        if (post.myReaction && post.stats.reactions[post.myReaction]) {
            post.stats.reactions[post.myReaction] = Math.max(0, post.stats.reactions[post.myReaction] - 1);
        }
        post.stats.reactions[emoji] = (post.stats.reactions[emoji] || 0) + 1;
        post.myReaction = emoji;
    }
    save();
    renderFeeds();
    currentReactionPostId = null;
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
    save();
    renderFeeds();
}

// ========================
// ناوبری
// ========================
function switchHomeTab(tab) {
    currentHomeTab = tab;
    document.getElementById('tab-following').classList.toggle('active', tab === 'following');
    document.getElementById('tab-foryou').classList.toggle('active', tab === 'foryou');
    renderFeeds();
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navIndex = ['home', 'search', 'notifications', 'bookmarks', 'profile'].indexOf(viewName);
    if (navIndex !== -1) document.querySelectorAll('.nav-item')[navIndex].classList.add('active');
    
    const topTabs = document.getElementById('home-tabs-container');
    const header = document.getElementById('main-header');
    
    if (viewName === 'profile' || viewName === 'search' || viewName === 'notifications' || viewName === 'bookmarks' || viewName === 'settings' || viewName === 'post-detail') {
        if(header) header.style.display = 'none';
        if(topTabs) topTabs.style.display = 'none';
    } else {
        if(header) header.style.display = 'flex';
        if(topTabs) topTabs.style.display = 'flex';
    }
    
    if (viewName === 'profile') renderProfile();
    if (viewName === 'settings') renderAccountList();
    if (currentViewStack[currentViewStack.length - 1] !== viewName) currentViewStack.push(viewName);
}

function goBack() {
    if (currentViewStack.length > 1) {
        currentViewStack.pop();
        const prev = currentViewStack[currentViewStack.length - 1];
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${prev}`).classList.add('active');
        
        const topTabs = document.getElementById('home-tabs-container');
        const header = document.getElementById('main-header');
        
        if (prev === 'profile' || prev === 'search' || prev === 'notifications' || prev === 'bookmarks' || prev === 'settings' || prev === 'post-detail') {
            if(header) header.style.display = 'none';
            if(topTabs) topTabs.style.display = 'none';
        } else {
            if(header) header.style.display = 'flex';
            if(topTabs) topTabs.style.display = 'flex';
        }
    }
}

function renderProfile() {
    const u = state.user;
    const headerUrl = u.header || DEFAULT_HEADER;
    const avatarUrl = u.avatar || DEFAULT_AVATAR;

    const headerEl = document.getElementById('profile-header');
    if(headerEl) headerEl.style.backgroundImage = `url('${headerUrl}')`;
    
    const avEl = document.getElementById('profile-avatar');
    if(avEl) avEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
    
    const verifiedIcon = u.isVerified ? `<img src="blue-tick.png" class="verified-icon lg" alt="verified">` : '';
    
    const nameEl = document.getElementById('profile-name');
    if(nameEl) nameEl.innerHTML = `${u.name} ${verifiedIcon}`;
    
    const handleEl = document.getElementById('profile-handle');
    if(handleEl) handleEl.textContent = u.handle;
    
    const bioEl = document.getElementById('profile-bio');
    if(bioEl) bioEl.textContent = u.bio;
    
    const folEl = document.getElementById('profile-followers');
    if(folEl) folEl.textContent = (u.followers || 0).toLocaleString('fa-IR');
    
    const folngEl = document.getElementById('profile-following');
    if(folngEl) folngEl.textContent = (u.following || 0).toLocaleString('fa-IR');
    
    const joinedEl = document.getElementById('profile-joined-text');
    if(joinedEl) joinedEl.textContent = u.joinedDate || 'نامشخص';
    
    const hAvEl = document.getElementById('header-avatar');
    if(hAvEl) hAvEl.src = avatarUrl;
}

function openPostDetail(e, id) {
    if (e.target.closest('button') || e.target.closest('.poll-option')) return;
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
        
        pollHTML = `<div class="poll-container" style="margin-top: 16px;">
            <div class="poll-question">${post.poll.question}</div>`;
            
        post.poll.options.forEach((opt, index) => {
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isSelected = post.poll.votedIndex === index;
            const selectedClass = isSelected ? 'selected' : '';
            
            pollHTML += `
                <div class="poll-option ${selectedClass}" onclick="votePoll(event, '${post.id}', ${index})">
                    <div class="poll-progress" style="width: ${hasVoted ? percent : 0}%"></div>
                    <div class="poll-option-content">
                        <span class="poll-option-text">${opt.text} ${isSelected ? '✓' : ''}</span>
                        ${hasVoted ? `<span class="poll-option-percent">${percent.toLocaleString('fa-IR')}%</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        pollHTML += `<div class="poll-footer">${totalVotes.toLocaleString('fa-IR')} رأی ${hasVoted ? '· شما رأی داده‌اید' : ''}</div></div>`;
    }

    const detailHTML = `
        <div class="post" style="border-bottom:none;">
            <div class="post-avatar"><img src="${post.avatar}"></div>
            <div class="post-content">
                <div class="post-header">
                    <span class="post-name">${post.author} ${verifiedIcon}</span>
                    <span class="post-handle">${post.handle}</span>
                </div>
                <div class="post-text" style="font-size:18px; margin-top:8px;">${post.text}</div>
                ${post.image ? `<img src="${post.image}" class="post-img" style="margin-top:12px;">` : ''}
                ${pollHTML}
                <div style="color:var(--text-secondary); font-size:14px; margin-top:16px;">${timeStr} · ${post.stats.views} بازدید</div>
            </div>
        </div>
    `;
    document.getElementById('post-detail-content').innerHTML = detailHTML;
}

// ========================
// جستجو و توییت
// ========================
document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('search-results');
    if (!query) { resultsContainer.innerHTML = ''; return; }
    const allPosts = [...state.posts, ...state.aiPosts];
    const results = allPosts.filter(p => p.text.toLowerCase().includes(query) || p.author.toLowerCase().includes(query));
    resultsContainer.innerHTML = results.length > 0 ? results.map(p => createPostHTML(p)).join('') : '<div class="empty-state"><h3>نتیجه‌ای یافت نشد</h3></div>';
});

document.getElementById('btn-compose').addEventListener('click', () => {
    document.getElementById('compose-text').value = '';
    document.getElementById('compose-image-preview').style.display = 'none';
    document.getElementById('compose-avatar').src = state.user.avatar || DEFAULT_AVATAR;
    
    // ریست کردن حالت نظرسنجی
    document.getElementById('compose-poll-container').style.display = 'none';
    document.getElementById('poll-question').value = '';
    document.getElementById('poll-options-list').innerHTML = `
        <input type="text" class="poll-option-input" placeholder="گزینه ۱">
        <input type="text" class="poll-option-input" placeholder="گزینه ۲">
    `;
    isPollMode = false;

    document.getElementById('compose-modal').classList.add('show');
    setTimeout(() => document.getElementById('compose-text').focus(), 100);
});

// ========================
// عکس‌ها و نظرسنجی
// ========================
let tempPostImage = null;
let tempAvatar = null;
let tempCover = null;

document.getElementById('btn-toggle-poll').addEventListener('click', () => {
    const container = document.getElementById('compose-poll-container');
    isPollMode = !isPollMode;
    container.style.display = isPollMode ? 'block' : 'none';
});

document.getElementById('btn-add-poll-option').addEventListener('click', () => {
    const list = document.getElementById('poll-options-list');
    if (list.children.length >= 4) {
        alert('حداکثر ۴ گزینه مجاز است.');
        return;
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'poll-option-input';
    input.placeholder = `گزینه ${list.children.length + 1}`;
    list.appendChild(input);
});

function compressImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'upload-image') {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 800, 800, (base64) => {
                tempPostImage = base64;
                document.getElementById('preview-img').src = base64;
                document.getElementById('compose-image-preview').style.display = 'block';
            });
        }
    }
    if (e.target && e.target.id === 'upload-avatar') {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 400, 400, (base64) => {
                tempAvatar = base64;
                document.getElementById('edit-avatar-preview').innerHTML = `
                    <img src="${base64}" alt="Avatar">
                    <label for="upload-avatar" class="edit-avatar-btn"><svg><use href="#i-image"/></svg></label>
                    <input type="file" id="upload-avatar" accept="image/*" hidden>
                `;
            });
        }
    }
    if (e.target && e.target.id === 'upload-cover') {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 1500, 500, (base64) => {
                tempCover = base64;
                document.getElementById('edit-cover-preview').style.backgroundImage = `url('${base64}')`;
            });
        }
    }
});

// ========================
// ثبت توییت جدید
// ========================
document.getElementById('btn-submit-post').addEventListener('click', () => {
    const text = document.getElementById('compose-text').value.trim();
    
    let pollData = null;
    if (isPollMode) {
        const question = document.getElementById('poll-question').value.trim();
        const optionInputs = document.querySelectorAll('.poll-option-input');
        const options = [];
        
        optionInputs.forEach(input => {
            const val = input.value.trim();
            if (val) options.push({ text: val, votes: 0 });
        });
        
        if (!question || options.length < 2) {
            alert('لطفاً سوال و حداقل ۲ گزینه برای نظرسنجی وارد کنید.');
            return;
        }
        
        pollData = {
            question: question,
            options: options,
            votedIndex: null
        };
    }

    if (!text && !tempPostImage && !pollData) return;
    
    const newStats = generateStats(state.user.followers);
    
    const newPost = {
        id: Date.now().toString(),
        author: state.user.name,
        handle: state.user.handle,
        avatar: state.user.avatar || DEFAULT_AVATAR,
        isVerified: state.user.isVerified,
        ts: Date.now(),
        text: text,
        image: tempPostImage,
        poll: pollData,
        stats: newStats,
        myReaction: null, liked: false, retweeted: false, bookmarked: false
    };
    
    state.posts.unshift(newPost);
    save();
    
    tempPostImage = null;
    document.getElementById('compose-modal').classList.remove('show');
    switchView('home');
    renderFeeds();

    // ====== شبیه‌سازی هوش مصنوعی ======
    // هوش مصنوعی ۲ ثانیه بعد به نظرسنجی شما رای می‌دهد
    if (pollData) {
        setTimeout(() => {
            const postToVote = state.posts.find(p => p.id === newPost.id);
            if (postToVote && postToVote.poll && postToVote.poll.votedIndex === null) {
                // انتخاب یک گزینه تصادفی توسط هوش مصنوعی
                const randomIndex = Math.floor(Math.random() * postToVote.poll.options.length);
                postToVote.poll.options[randomIndex].votes += Math.floor(Math.random() * 20) + 5; // رای‌های اولیه از سمت AI
                save();
                renderFeeds();
            }
        }, 2000);
    }
});

// ========================
// باز کردن پنل ویرایش
// ========================
document.getElementById('btn-edit-profile').addEventListener('click', (e) => {
    e.preventDefault();
    const u = state.user;
    const modal = document.getElementById('edit-profile-modal');
    
    if (!u || !modal) return;

    document.getElementById('edit-name').value = u.name || '';
    document.getElementById('edit-bio').value = u.bio || '';
    document.getElementById('edit-followers').value = u.followers || 0;
    document.getElementById('edit-username').value = (u.handle || '').replace('@', '');
    document.getElementById('edit-following').value = u.following || 0;
    document.getElementById('edit-joined').value = u.joinedDate || '';
    document.getElementById('edit-verified').checked = u.isVerified || false;
    
    const headerUrl = u.header || DEFAULT_HEADER;
    const avatarUrl = u.avatar || DEFAULT_AVATAR;
    
    document.getElementById('edit-cover-preview').style.backgroundImage = `url('${headerUrl}')`;
    document.getElementById('edit-avatar-preview').innerHTML = `
        <img src="${avatarUrl}" alt="Avatar">
        <label for="upload-avatar" class="edit-avatar-btn"><svg><use href="#i-image"/></svg></label>
        <input type="file" id="upload-avatar" accept="image/*" hidden>
    `;
    
    modal.classList.add('show');
});

// بستن پنل‌ها
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.target.closest('.modal-overlay').classList.remove('show');
    });
});

// ========================
// تب‌های پروفایل
// ========================
document.querySelectorAll('.ptab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentProfileTab = e.currentTarget.textContent.trim();
        renderProfileFeed();
    });
});

// ========================
// ذخیره تغییرات پروفایل
// ========================
document.getElementById('btn-save-profile').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newName = document.getElementById('edit-name').value.trim();
    const newBio = document.getElementById('edit-bio').value.trim();
    const newFollowers = parseInt(document.getElementById('edit-followers').value) || 0;
    const newJoined = document.getElementById('edit-joined').value.trim();
    const isVerified = document.getElementById('edit-verified').checked;
    
    const newUsernameInput = document.getElementById('edit-username').value.trim();
    const newFollowing = parseInt(document.getElementById('edit-following').value) || 0;
    
    if (newName) state.user.name = newName;
    state.user.bio = newBio;
    state.user.followers = newFollowers;
    state.user.following = newFollowing;
    state.user.joinedDate = newJoined || 'نامشخص';
    state.user.isVerified = isVerified;
    
    if (newUsernameInput) {
        const cleanUsername = newUsernameInput.replace(/@/g, '').replace(/\s+/g, '');
        state.user.handle = '@' + cleanUsername;
    }
    
    if (tempAvatar) state.user.avatar = tempAvatar;
    if (tempCover) state.user.header = tempCover;
    
    if (!state.user.avatar) state.user.avatar = DEFAULT_AVATAR;
    if (!state.user.header) state.user.header = DEFAULT_HEADER;

    save();
    renderProfile();
    renderFeeds(); 
    
    document.getElementById('edit-profile-modal').classList.remove('show');
    
    tempAvatar = null;
    tempCover = null;
});

// ========================
// ساخت اکانت جدید
// ========================
document.getElementById('btn-create-account').addEventListener('click', () => {
    const name = document.getElementById('new-account-name').value.trim();
    const handleInput = document.getElementById('new-account-handle').value.trim();
    
    if (!name || !handleInput) return;
    
    const handle = '@' + handleInput.replace(/@/g, '').replace(/\s+/g, '');
    
    if (state.user.handle === handle || (state.accounts || []).some(a => a.handle === handle)) {
        alert('این نام کاربری قبلا استفاده شده است.');
        return;
    }
    
    const newUser = {
        name: name,
        handle: handle,
        bio: 'به ویراستی خوش آمدید!',
        joinedDate: 'فروردین ۱۴۰۳',
        followers: 0,
        following: 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=400`,
        header: DEFAULT_HEADER,
        isVerified: false,
        followedUsers: []
    };
    
    const existingIdx = (state.accounts || []).findIndex(a => a.handle === state.user.handle);
    if (!state.accounts) state.accounts = [];
    if (existingIdx !== -1) state.accounts[existingIdx] = state.user;
    else state.accounts.push(state.user);
    
    state.user = newUser;
    save();
    renderProfile();
    renderFeeds();
    renderAccountList();
    
    document.getElementById('add-account-modal').classList.remove('show');
    document.getElementById('new-account-name').value = '';
    document.getElementById('new-account-handle').value = '';
    switchView('home');
});

// تولید آمار
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
        views: views > 0 ? views.toLocaleString('fa-IR') : '۱',
        likes: likes > 0 ? likes.toLocaleString('fa-IR') : '۰',
        retweets: retweets > 0 ? retweets.toLocaleString('fa-IR') : '۰',
        replies: replies > 0 ? replies.toLocaleString('fa-IR') : '۰',
        reactions: reactions
    };
}

// شروع برنامه
document.addEventListener('DOMContentLoaded', () => {
    renderFeeds();
    renderProfile();
    switchHomeTab('following');
});
