const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the PWA Script section
const oldScriptRegex = /\/\/ PWA Install Logic[\s\S]*?<\/script>/i;

const newScript = `// PWA Install Logic
    let deferredPrompt = null;
    const installModal = document.getElementById('install-modal');
    const installBtn = document.getElementById('install-btn');

    // Always check if we should show the modal (only on first visits, and not if already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (!localStorage.getItem('pwa-dismissed') && !isStandalone) {
        // Show after 2 seconds to give them a moment
        setTimeout(() => {
            installModal.style.display = 'flex';
        }, 2500);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    installBtn.addEventListener('click', async () => {
        installModal.style.display = 'none';
        localStorage.setItem('pwa-dismissed', 'true'); // don't nag again
        
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        } else {
            // iOS or unsupported / prompt not fired
            alert('لتثبيت التطبيق:\\n\\n1. اضغط على زر المشاركة أو القائمة في متصفحك (بأعلى أو أسفل الشاشة).\\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).');
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
</script>`;

html = html.replace(oldScriptRegex, newScript);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Patched PWA install script in index.html");
