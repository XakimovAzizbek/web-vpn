const regionSelect = document.getElementById('region');
const stepUrl = document.getElementById('step-url');
const urlInput = document.getElementById('url');
const openBtn = document.getElementById('open-btn');
const statusBox = document.getElementById('status');
const clearBtn = document.getElementById('clear-btn');

// Region tanlanganda URL maydonini ko'rsatish
regionSelect.addEventListener('change', () => {
    if (regionSelect.value) {
        stepUrl.classList.remove('hidden');
        hideStatus();
    } else {
        stepUrl.classList.add('hidden');
    }
});

// "Ochish" tugmasi
openBtn.addEventListener('click', async () => {
    const country = regionSelect.value;
    const targetUrl = urlInput.value.trim();

    if (!country) {
        showStatus('Iltimos, avval regionni tanlang.', 'error');
        return;
    }
    if (!targetUrl || !/^https?:\/\/.+/i.test(targetUrl)) {
        showStatus('Manzil http:// yoki https:// bilan boshlanishi kerak.', 'error');
        return;
    }

    setLoading(true);
    hideStatus();

    try {
        showStatus(`⏳ ${country} uchun proksi o‘rnatilmoqda...`, 'info');

        const response = await chrome.runtime.sendMessage({
            action: 'setProxy',
            country: country,
            url: targetUrl
        });

        if (!response.success) {
            throw new Error(response.error || 'Proksi o‘rnatishda xatolik.');
        }

        showStatus(`✅ Proksi o‘rnatildi (${response.proxy.ip}:${response.proxy.port}). Sayt ochilmoqda...`, 'success');
        clearBtn.classList.remove('hidden');

        // Yangi tabda saytni ochish
        chrome.tabs.create({ url: targetUrl });

        // Popup ni yopish (ixtiyoriy)
        // window.close();
    } catch (err) {
        showStatus(`❌ Xatolik: ${err.message}`, 'error');
    } finally {
        setLoading(false);
    }
});

// Proksini o'chirish
clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    try {
        const response = await chrome.runtime.sendMessage({ action: 'clearProxy' });
        if (response.success) {
            showStatus('✅ Proksi o‘chirildi. Brauzer to‘g‘ridan-to‘g‘ri ulanadi.', 'success');
            clearBtn.classList.add('hidden');
        } else {
            throw new Error(response.error);
        }
    } catch (err) {
        showStatus(`❌ Xatolik: ${err.message}`, 'error');
    } finally {
        clearBtn.disabled = false;
    }
});

// Proksi xatoliklarini tinglash
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'proxyError') {
        showStatus(`⚠️ Proksi xatoligi: ${request.error}`, 'error');
    }
});

function showStatus(message, type = 'info') {
    statusBox.textContent = message;
    statusBox.className = `status ${type}`;
    statusBox.classList.remove('hidden');
}

function hideStatus() {
    statusBox.classList.add('hidden');
}

function setLoading(isLoading) {
    openBtn.disabled = isLoading;
    openBtn.textContent = isLoading ? '⏳ Ochilmoqda...' : '🔓 Ochish';
}