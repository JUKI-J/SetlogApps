// ========================================
// Translations
// ========================================
const translations = {
    ko: {
        'multagi-name': '물타기',
        'multagi-desc': '주식 물타기용 계산기',
        'onesync-name': 'OneSync',
        'onesync-desc': '크로스플랫폼 파일 및 텍스트 공유'
    },
    en: {
        'multagi-name': 'Multagi',
        'multagi-desc': 'Stock Averaging Calculator',
        'onesync-name': 'OneSync',
        'onesync-desc': 'Cross-platform File & Text Sharing'
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
