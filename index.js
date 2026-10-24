// ============================================================
//  HProxy bepul API: kalitsiz, CORS yoqilgan, davlat bo'yicha filtr
//  Hujjat: https://hproxy.com/docs/free-proxy-list
// ============================================================

const regionSelect = document.getElementById('region');
const stepUrl = document.getElementById('step-url');
const urlInput = document.getElementById('url');
const openBtn = document.getElementById('open-btn');
const statusBox = document.getElementById('status');
const resultContainer = document.getElementById('result-container');
const resultFrame = document.getElementById('result-frame');

// HProxy API manzili
const HPROXY_API = 'https://hproxy.com/api/proxy-list';

// Region tanlanganda URL maydonini ko'rsatish
regionSelect.addEventListener('change', () => {
    if (regionSelect.value) {
        stepUrl.classList.remove('hidden');
        hideStatus();
    } else {
        stepUrl.classList.add('hidden');
        resultContainer.classList.add('hidden');
    }
});

// "Ochish" tugmasi
openBtn.addEventListener('click', async () => {
    const country = regionSelect.value;
    const targetUrl = urlInput.value.trim();

    // Validatsiya
    if (!country) {
        showStatus('Iltimos, avval regionni tanlang.', 'error');
        return;
    }
    if (!targetUrl) {
        showStatus('Iltimos, sayt manzilini kiriting.', 'error');
        return;
    }
    if (!/^https?:\/\/.+/i.test(targetUrl)) {
        showStatus('Manzil http:// yoki https:// bilan boshlanishi kerak.', 'error');
        return;
    }

    // UI: yuklash holati
    setLoading(true);
    hideStatus();
    resultContainer.classList.add('hidden');

    try {
        // 1. Tanlangan davlat uchun proksi olish
        showStatus(`⏳ ${country} uchun proksi qidirilmoqda...`, 'info');
        const proxy = await fetchProxy(country);

        if (!proxy) {
            showStatus(`❌ ${country} uchun ishlaydigan proksi topilmadi. Boshqa regionni sinab ko'ring.`, 'error');
            setLoading(false);
            return;
        }

        showStatus(`✅ Proksi topildi: ${proxy.ip}:${proxy.port}. So'rov yuborilmoqda...`, 'success');

        // 2. Proksi orqali URL'ga so'rov yuborish
        //    Brauzerda fetch orqali proksi ishlatish uchun CORS proksi xizmatidan foydalanamiz.
        //    HProxy proksini to'g'ridan-to'g'ri fetch'da ishlatib bo'lmaydi, shuning uchun
        //    CORS proxy xizmatidan (masalan, corsproxy.io) foydalanamiz va proksi ma'lumotini
        //    faqat ko'rsatamiz. Bu demo maqsadida.
        const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetch(corsProxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP xatolik: ${response.status}`);
        }

        const html = await response.text();

        // Natijani iframe ichida ko'rsatish
        resultFrame.srcdoc = html;
        resultContainer.classList.remove('hidden');
        showStatus(`✅ Sahifa muvaffaqiyatli yuklandi (proksi: ${proxy.ip}:${proxy.port}).`, 'success');

    } catch (err) {
        console.error(err);
        showStatus(`❌ Xatolik: ${err.message}`, 'error');
    } finally {
        setLoading(false);
    }
});

/**
 * HProxy API'dan tanlangan davlat uchun bitta ishlaydigan proksi oladi.
 * @param {string} countryCode - ISO 3166-1 alpha-2 (masalan, "DE")
 * @returns {Promise<{ip: string, port: number}|null>}
 */
async function fetchProxy(countryCode) {
    const params = new URLSearchParams({
        format: 'json',
        country: countryCode,
        protocol: 'http',      // HTTP proksilar brauzerda eng mos
        anonymity: 'elite',    // Elite (yuqori anonimlik)
        limit: '5'             // Bir nechta variant olib, birinchisini ishlatamiz
    });

    const response = await fetch(`${HPROXY_API}?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Proksi API xatosi: ${response.status}`);
    }

    const data = await response.json();

    // HProxy javobi: massiv yoki { data: [...] } bo'lishi mumkin
    const list = Array.isArray(data) ? data : (data.data || data.proxies || []);
    if (!list.length) return null;

    const first = list[0];
    // Turli formatlarga moslashuvchanlik
    const ip = first.ip || (first.proxy ? first.proxy.split(':')[0] : null);
    const port = first.port || (first.proxy ? parseInt(first.proxy.split(':')[1], 10) : null);

    if (!ip || !port) return null;
    return { ip, port };
}

/**
 * Holat xabarini ko'rsatish.
 */
function showStatus(message, type = 'info') {
    statusBox.textContent = message;
    statusBox.className = `status ${type}`;
    statusBox.classList.remove('hidden');
}

function hideStatus() {
    statusBox.classList.add('hidden');
}

/**
 * Yuklash holatini boshqarish.
 */
function setLoading(isLoading) {
    openBtn.disabled = isLoading;
    openBtn.textContent = isLoading ? '⏳ Ochilmoqda...' : '🔓 Ochish';
}