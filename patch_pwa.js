const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Add manifest to head
if (!html.includes('manifest.json')) {
    html = html.replace('<head>', `<head>\n    <link rel="manifest" href="./manifest.json">\n    <meta name="theme-color" content="#0d1117">`);
}

// Add top action buttons (Share)
const topButtonsHtml = `
    <!-- Top Actions -->
    <div style="position: absolute; top: 15px; left: 15px; display: flex; gap: 10px; z-index: 100;">
        <button onclick="shareApp()" style="background: rgba(255,255,255,0.1); border: 1px solid var(--card-border); color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; display: flex; align-items: center; gap: 5px; backdrop-filter: blur(5px);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            مشاركة التطبيق
        </button>
    </div>
`;

// Add Install Modal
const installModalHtml = `
    <!-- Install PWA Modal -->
    <div id="install-modal" class="modal" style="display: none; z-index: 9999;">
        <div class="modal-content" style="text-align: center; max-width: 350px;">
            <span class="close-button" onclick="closeInstallModal()">&times;</span>
            <h3 style="color: var(--heading-color); margin-top: 10px;">تثبيت التطبيق 📱</h3>
            <p style="margin: 15px 0; font-size: 1.1em; color: var(--text-color);">هل تود تثبيت تطبيق مسابقة القرآن الكريم على جهازك لسهولة الوصول إليه لاحقاً واللعب بسرعة أكبر؟</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button id="install-btn" style="background-color: var(--heading-color); color: #000; padding: 10px 20px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; flex: 1;">تثبيت الآن</button>
                <button onclick="closeInstallModal()" style="background-color: transparent; border: 1px solid var(--text-color); color: var(--text-color); padding: 10px 20px; border-radius: 8px; cursor: pointer; flex: 1;">ليس الآن</button>
            </div>
        </div>
    </div>
`;

// Add Script for PWA and Share
const pwaScript = `
<script>
    // Share functionality
    function shareApp() {
        if (navigator.share) {
            navigator.share({
                title: 'مسابقة القرآن الكريم',
                text: 'جرب هذا التطبيق الرائع لمسابقة القرآن الكريم وتحدى أصدقاءك!',
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('تم نسخ الرابط بنجاح! يمكنك مشاركته مع أصدقائك.');
            });
        }
    }

    // PWA Install Logic
    let deferredPrompt;
    const installModal = document.getElementById('install-modal');
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // Show the custom install prompt if user hasn't dismissed it recently
        if (!localStorage.getItem('pwa-dismissed')) {
            setTimeout(() => {
                installModal.style.display = 'flex';
            }, 1000);
        }
    });

    installBtn.addEventListener('click', async () => {
        installModal.style.display = 'none';
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('User response to the install prompt: ', outcome);
            deferredPrompt = null;
        }
    });

    function closeInstallModal() {
        installModal.style.display = 'none';
        localStorage.setItem('pwa-dismissed', 'true');
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(reg => {
                console.log('SW registered!', reg);
            }).catch(err => console.log('SW registration failed', err));
        });
    }
</script>
</body>
`;

if (!html.includes('shareApp()')) {
    html = html.replace('<body>', '<body>\n' + topButtonsHtml + '\n' + installModalHtml);
    html = html.replace('</body>', pwaScript);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Successfully patched index.html");
} else {
    console.log("Already patched.");
}
