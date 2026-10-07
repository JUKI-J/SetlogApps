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
        'charcoal-feature-4': '광고·계정·추적 없음 · 무료 사용 + 선택형 인앱 구독',
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
        'lottotown-desc': '로또 추첨 결과 통계·데이터 분석',
        'lottotown-feature-1': '과거 추첨 기반 번호별 출현 빈도·핫/콜드 통계',
        'lottotown-feature-2': '회차별 추첨 결과와 1등 배출 판매점 정보',
        'lottotown-feature-3': 'QR코드로 회차별 결과 대조',
        'lottotown-feature-4': '통계 정보 제공용이며 당첨을 보장하지 않습니다'
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
        'charcoal-feature-4': 'No ads, accounts or tracking · free to use + optional in-app subscription',
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
        'lottotown-desc': 'Korean Lotto Draw Statistics & Data',
        'lottotown-feature-1': 'Number frequency & hot/cold stats from past draws',
        'lottotown-feature-2': 'Draw results by round & top-prize retailer info',
        'lottotown-feature-3': 'Compare tickets to round results via QR',
        'lottotown-feature-4': 'For statistical reference only; does not guarantee results'
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
