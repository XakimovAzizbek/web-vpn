// ============================================================
//  Chrome Proxy API — Davlat bo'yicha proksi sozlash
// ============================================================

const HPROXY_API = 'https://hproxy.com/api/proxy-list';

// Xabarlarni qabul qilish (popup.js dan)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setProxy') {
        setProxyForCountry(request.country, request.url)
            .then(result => sendResponse({ success: true, proxy: result.proxy }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Asinxron javob uchun
    }

    if (request.action === 'clearProxy') {
        clearProxy()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

/**
 * Tanlangan davlat uchun proksi olib, brauzerga o'rnatadi.
 */
async function setProxyForCountry(countryCode, targetUrl) {
    // 1. HProxy API dan proksi olish
    const proxy = await fetchProxy(countryCode);
    if (!proxy) {
        throw new Error(`${countryCode} uchun ishlaydigan proksi topilmadi.`);
    }

    // 2. Proksi sozlamalarini o'rnatish
    const config = {
        mode: 'fixed_servers',
        rules: {
            singleProxy: {
                scheme: 'http',
                host: proxy.ip,
                port: proxy.port
            },
            bypassList: ['localhost', '127.0.0.1']
        }
    };

    await new Promise((resolve, reject) => {
        chrome.proxy.settings.set(
            { value: config, scope: 'regular' },
            () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            }
        );
    });

    // 3. Xatoliklarni kuzatish
    chrome.proxy.onProxyError.addListener(handleProxyError);

    return { proxy };
}

/**
 * Proksi sozlamalarini tozalash (to'g'ridan-to'g'ri ulanish).
 */
async function clearProxy() {
    await new Promise((resolve, reject) => {
        chrome.proxy.settings.clear(
            { scope: 'regular' },
            () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * HProxy API dan tanlangan davlat uchun bitta ishlaydigan proksi oladi.
 */
async function fetchProxy(countryCode) {
    const params = new URLSearchParams({
        format: 'json',
        country: countryCode,
        protocol: 'http',
        anonymity: 'elite',
        limit: '5'
    });

    const response = await fetch(`${HPROXY_API}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Proksi API xatosi: ${response.status}`);
    }

    const data = await response.json();
    const list = Array.isArray(data) ? data : (data.data || data.proxies || []);
    if (!list.length) return null;

    const first = list[0];
    const ip = first.ip || (first.proxy ? first.proxy.split(':')[0] : null);
    const port = first.port || (first.proxy ? parseInt(first.proxy.split(':')[1], 10) : null);

    if (!ip || !port) return null;
    return { ip, port };
}

/**
 * Proksi xatoligi yuz berganda foydalanuvchini ogohlantirish.
 */
function handleProxyError(details) {
    console.warn('Proxy xatoligi:', details);
    // Popup ochiq bo'lsa, xabar yuborish mumkin
    chrome.runtime.sendMessage({
        action: 'proxyError',
        error: details.error || 'Proksi bilan ulanishda xatolik.'
    }).catch(() => {});
}