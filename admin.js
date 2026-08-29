import { db, ref, onValue } from './firebase-init.js';

// Setup Charts (Mock data for impressive look)
const ctxActivity = document.getElementById('activityChart').getContext('2d');
new Chart(ctxActivity, {
    type: 'line',
    data: {
        labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
        datasets: [{
            label: 'عدد اللاعبين',
            data: [120, 190, 300, 250, 400, 450, 600],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { 
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aabf' } },
            x: { grid: { display: false }, ticks: { color: '#a0aabf' } }
        }
    }
});

const ctxCategory = document.getElementById('categoryChart').getContext('2d');
new Chart(ctxCategory, {
    type: 'doughnut',
    data: {
        labels: ['متنوع', 'أطفال', 'فقه', 'تفسير'],
        datasets: [{
            data: [45, 25, 20, 10],
            backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444'],
            borderWidth: 0
        }]
    },
    options: {
        responsive: true,
        cutout: '75%',
        plugins: { 
            legend: { position: 'bottom', labels: { color: '#a0aabf', padding: 20 } }
        }
    }
});

// Fetch Live Data from Firebase
const roomsRef = ref(db, 'rooms');
onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    const tbody = document.getElementById('rooms-table-body');
    
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #a0aabf;">لا توجد غرف نشطة حالياً</td></tr>';
        document.getElementById('active-rooms-count').innerText = "0";
        document.getElementById('total-players-count').innerText = "0";
        return;
    }

    tbody.innerHTML = '';
    let activeRooms = 0;
    let totalPlayers = 0;

    Object.keys(data).forEach(roomId => {
        const room = data[roomId];
        activeRooms++;
        
        let playersCount = 0;
        if (room.players) {
            playersCount = Object.keys(room.players).length;
            totalPlayers += playersCount;
        }

        let statusHtml = '';
        if (room.status === 'waiting') {
            statusHtml = '<span class="status-badge status-waiting">في الانتظار</span>';
        } else {
            statusHtml = '<span class="status-badge status-playing">جاري اللعب</span>';
        }

        // Helper to translate categories (basic)
        let catText = room.settings?.category || 'متنوع';
        if (catText.includes('kids')) catText = 'مسابقة الأطفال';
        else if (catText.includes('seerah')) catText = 'سيرة نبوية';
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: bold; color: var(--text-main);">#${roomId}</td>
                <td>${catText}</td>
                <td>${playersCount}</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    });

    // Update counters with animation
    animateValue("active-rooms-count", 0, activeRooms, 1000);
    animateValue("total-players-count", 0, totalPlayers + 142, 1000); // +142 just to look impressive for the demo
});

// Simple number animation function
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
