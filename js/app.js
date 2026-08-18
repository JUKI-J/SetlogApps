// ========================================
// Translations
// ========================================
const translations = {
    ko: {
        'multagi-name': '물타기',
        'multagi-desc': '주식 물타기용 계산기',
        'multagi-feature-1': '평균 단가 자동 계산',
        'multagi-feature-2': '목표가 도달 시 필요 매수량 계산',
        'multagi-feature-3': '간편한 UI로 빠른 계산',
        'multagi-feature-4': '투자 전략 수립 지원',
        'onesync-name': 'OneSync',
        'onesync-desc': '크로스플랫폼 파일 및 텍스트 공유',
        'onesync-feature-1': 'iOS, Android 간 파일 공유',
        'onesync-feature-2': '텍스트 클립보드 실시간 동기화',
        'onesync-feature-3': '보안 클라우드 스토리지로 안전한 전송',
        'onesync-feature-4': '별도 계정 없이 간편 사용',
        'claudeminer-name': 'ClaudeMiner',
        'claudeminer-desc': 'Claude Code 세션 시각 모니터',
        'claudeminer-feature-1': '⛏️ 3가지 마이너 상태 (작업중, 휴식, 좀비)',
        'claudeminer-feature-2': '🔢 프로세스 ID 표시',
        'claudeminer-feature-3': '🔔 작업 완료 알림 (macOS)',
        'claudeminer-feature-4': '⚡ 경량 (약 20MB RAM 사용)',
        'charcoal-name': 'Charcoal Player',
        'charcoal-desc': 'macOS 음악 연습용 스템 분리 플레이어',
        'charcoal-feature-1': '보컬·드럼·베이스 등 최대 6개 스템 분리',
        'charcoal-feature-2': '음정 유지 배속 재생 (0.5~3.0배)',
        'charcoal-feature-3': '샘플 단위 정확한 A-B 구간 반복',
        'charcoal-feature-4': '광고·계정·데이터 수집 없이 무료',
        'timerlync-name': 'TimerLync',
        'timerlync-desc': '여러 기기 동기화 카운트다운 타이머',
        'timerlync-feature-1': 'iPhone·iPad·Apple Watch 동시 알람',
        'timerlync-feature-2': '룸 코드·QR 공유, 계정 없이 사용',
        'timerlync-feature-3': '네트워크 시간 기준 종료 시각 동기화',
        'timerlync-feature-4': '시퀀스·그룹 뽀모도로·위젯 지원',
        'laplync-name': 'LapLync',
        'laplync-desc': '여러 기기 동시 시작 스톱워치·랩 타이머',
        'laplync-feature-1': '최대 8대 기기 밀리초 단위 동시 시작',
        'laplync-feature-2': '6자리 룸 코드·QR로 계정 없이 참가',
        'laplync-feature-3': '연결이 끊겨도 측정 유지, 자동 병합',
        'laplync-feature-4': '랩·분할 기록 CSV 내보내기',
        'lottotown-name': '우리동네로또',
        'lottotown-desc': '지역 기반 로또 번호 추천',
        'lottotown-feature-1': '우리 동네 핫번호·콜드번호 통계',
        'lottotown-feature-2': '주변 명당 판매점 찾기, 전국 명당 TOP 30',
        'lottotown-feature-3': 'QR코드로 당첨 여부 즉시 확인',
        'lottotown-feature-4': '번호 저장 및 회차별 당첨 정보'
    },
    en: {
        'multagi-name': 'Multagi',
        'multagi-desc': 'Stock Averaging Calculator',
        'multagi-feature-1': 'Automatic average price calculation',
        'multagi-feature-2': 'Calculate required shares to reach target price',
        'multagi-feature-3': 'Quick calculation with simple UI',
        'multagi-feature-4': 'Investment strategy support',
        'onesync-name': 'OneSync',
        'onesync-desc': 'Cross-platform File & Text Sharing',
        'onesync-feature-1': 'File sharing between iOS and Android',
        'onesync-feature-2': 'Real-time clipboard text sync',
        'onesync-feature-3': 'Secure transfer with cloud storage',
        'onesync-feature-4': 'Easy to use without account',
        'claudeminer-name': 'ClaudeMiner',
        'claudeminer-desc': 'Visual Process Monitor for Claude Code',
        'claudeminer-feature-1': '⛏️ 3 Miner States (Working, Resting, Zombie)',
        'claudeminer-feature-2': '🔢 Process ID Display',
        'claudeminer-feature-3': '🔔 Task Completion Notifications (macOS)',
        'claudeminer-feature-4': '⚡ Lightweight (~20MB RAM)',
        'charcoal-name': 'Charcoal Player',
        'charcoal-desc': 'Stem-Splitting Practice Player for macOS',
        'charcoal-feature-1': 'Split any track into up to 6 stems',
        'charcoal-feature-2': 'Pitch-preserving speed (0.5x–3.0x)',
        'charcoal-feature-3': 'Sample-accurate A-B loop',
        'charcoal-feature-4': 'No ads, no account, no tracking — free',
        'timerlync-name': 'TimerLync',
        'timerlync-desc': 'Synced Countdown Timer Across Devices',
        'timerlync-feature-1': 'One alarm on iPhone, iPad & Apple Watch',
        'timerlync-feature-2': 'Share by room code or QR, no account',
        'timerlync-feature-3': 'One shared end time based on network time',
        'timerlync-feature-4': 'Sequences, group Pomodoro & widgets',
        'laplync-name': 'LapLync',
        'laplync-desc': 'Multi-device Synced Stopwatch & Lap Timer',
        'laplync-feature-1': 'Start up to 8 devices in the same millisecond',
        'laplync-feature-2': 'Join by 6-digit room code or QR, no account',
        'laplync-feature-3': 'Keeps timing offline, auto-merges on reconnect',
        'laplync-feature-4': 'Export laps & splits as CSV',
        'lottotown-name': 'LottoTown',
        'lottotown-desc': 'Region-based Korean Lotto Number Picks',
        'lottotown-feature-1': 'Hot & cold number stats for your area',
        'lottotown-feature-2': 'Nearby lucky retailers & nationwide Top 30',
        'lottotown-feature-3': 'Instant QR code win check',
        'lottotown-feature-4': 'Save numbers & view draw results'
    }
};

// ========================================
// State Management
// ========================================
let currentLang = localStorage.getItem('language') || 'ko';
let currentTheme = localStorage.getItem('theme') || 'auto';

// ========================================
// Theme Management
// ========================================
function initTheme() {
    const body = document.body;

    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
    } else if (currentTheme === 'light') {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
    } else {
        // Auto mode - respect system preference
        body.classList.remove('dark-mode', 'light-mode');
    }
}

function toggleTheme() {
    const body = document.body;

    // Cycle through: auto -> light -> dark -> auto
    if (currentTheme === 'auto') {
        currentTheme = 'light';
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
    } else if (currentTheme === 'light') {
        currentTheme = 'dark';
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
    } else {
        currentTheme = 'auto';
        body.classList.remove('dark-mode', 'light-mode');
    }

    localStorage.setItem('theme', currentTheme);
}

// ========================================
// Language Management
// ========================================
function initLanguage() {
    updateLanguage(currentLang);
    updateLanguageButton(currentLang);
}

function updateLanguage(lang) {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;
}

function updateLanguageButton(lang) {
    const langBtn = document.getElementById('language-toggle');
    const langText = langBtn.querySelector('.lang-text');

    if (lang === 'ko') {
        langText.textContent = 'KO';
    } else {
        langText.textContent = 'EN';
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('language', currentLang);
    updateLanguage(currentLang);
    updateLanguageButton(currentLang);
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme and language
    initTheme();
    initLanguage();

    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Language toggle button
    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) {
        languageToggle.addEventListener('click', toggleLanguage);
    }
});

// ========================================
// Smooth Transitions
// ========================================
// Prevent transition flicker on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }, 100);
});
