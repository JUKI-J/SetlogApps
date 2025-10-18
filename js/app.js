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
        'onesync-feature-4': '별도 계정 없이 간편 사용'
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
        'onesync-feature-4': 'Easy to use without account'
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
