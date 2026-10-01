// ========================================
// support.html — 앱별 진입 문맥 처리 (현재: 급식로그)
// 앱이 여는 URL: /support?app=lunchlog&type=contact|ad&v=<ver>&os=<ios|android>
//  - app=lunchlog → 급식로그 섹션으로 스크롤·강조, 상단 응답 보장 문구를 급식로그 문맥용으로 교체
//  - type=ad      → 광고 신고 안내 항목을 펼치고 강조
//  - 문의 폼 버튼에 app·type·v·os를 붙여 넘긴다(Tally 숨은 필드 — 정의 안 된 키는 폼이 무시)
// 외부 리소스·추적·저장소 사용 없음. JS가 꺼져 있어도 섹션·안내는 모두 정적으로 보인다.
// ========================================
(function () {
    'use strict';

    var APPS = { lunchlog: 'lunchlog' };
    var TYPES = { contact: 'contact', ad: 'ad' };
    var OSES = { ios: 'ios', android: 'android' };

    function readParams() {
        var p;
        try { p = new URLSearchParams(window.location.search); } catch (e) { return null; }
        var app = APPS[(p.get('app') || '').toLowerCase()];
        if (!app) return null;
        var v = p.get('v') || '';
        return {
            app: app,
            type: TYPES[(p.get('type') || '').toLowerCase()] || 'contact',
            v: /^[0-9A-Za-z.+-]{1,20}$/.test(v) ? v : '',
            os: OSES[(p.get('os') || '').toLowerCase()] || ''
        };
    }

    function reduceMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function apply(ctx) {
        var section = document.getElementById(ctx.app);
        if (!section) return;

        // 상단 소개 문구: 응답 보장 문안 → 급식로그 문맥 문안 (R7 — 응답 보장 상담 없음)
        var subs = document.querySelectorAll('[data-ctx]');
        for (var i = 0; i < subs.length; i++) {
            subs[i].hidden = subs[i].getAttribute('data-ctx') !== ctx.app;
        }

        // 문의 폼 버튼에 문맥 전달
        var cta = document.getElementById(ctx.app + '-cta');
        if (cta) {
            try {
                var url = new URL(cta.getAttribute('href'));
                url.searchParams.set('app', ctx.app);
                url.searchParams.set('type', ctx.type);
                if (ctx.v) url.searchParams.set('v', ctx.v);
                if (ctx.os) url.searchParams.set('os', ctx.os);
                cta.setAttribute('href', url.toString());
            } catch (e) { /* 원래 링크 유지 */ }
        }

        var target = section;
        if (ctx.type === 'ad') {
            var ad = document.getElementById(ctx.app + '-ad');
            if (ad) {
                ad.open = true;
                ad.classList.add('focus');
                target = ad;
            }
        }
        section.classList.add('focus');
        target.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    function init() {
        var ctx = readParams();
        if (ctx) apply(ctx);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
