// 1. INITIAL SETUP & DATE CHECK
let transactions = JSON.parse(localStorage.getItem('theH_data')) || [];
const balanceEl = document.getElementById('net-balance');

// Check if we need to save yesterday's file
window.onload = function() {
    const lastDate = localStorage.getItem('last_saved_date');
    const today = new Date().toLocaleDateString();

    if (lastDate && lastDate !== today && transactions.length > 0) {
        if(confirm("It's a new day! Download yesterday's Hisaab and clear list?")) {
            downloadReport();
            transactions = []; // Clear data
            localStorage.setItem('theH_data', JSON.stringify(transactions));
            updateUI();
        }
    }
    localStorage.setItem('last_saved_date', today);
    updateUI();
};

// 2. CHART CONFIG
const ctx = document.getElementById('hisaabChart').getContext('2d');
let hisaabChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Income', 'Expense'],
        datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } }
});

// 3. CORE FUNCTIONS
function updateUI(filter = '') {
    const cList = document.getElementById('credit-list');
    const dList = document.getElementById('debit-list');
    let totalC = 0, totalD = 0;

    cList.innerHTML = ''; dList.innerHTML = '';

    transactions.forEach((t, index) => {
        if (t.name.toLowerCase().includes(filter.toLowerCase())) {
            const item = document.createElement('li');
            item.innerHTML = `
                <div>${t.name} <br><small style="color:#aaa">${t.date}</small></div>
                <div style="display:flex; align-items:center;">
                    <span>₹${t.amount}</span>
                    <button class="delete-btn" onclick="deleteItem(${index})"><i class="fas fa-trash"></i></button>
                </div>`;
            
            if (t.type === 'credit') { cList.appendChild(item); totalC += t.amount; }
            else { dList.appendChild(item); totalD += t.amount; }
        }
    });

    // Calc totals from full list
    const realC = transactions.filter(t=>t.type==='credit').reduce((a,b)=>a+b.amount,0);
    const realD = transactions.filter(t=>t.type==='debit').reduce((a,b)=>a+b.amount,0);

    balanceEl.innerText = `₹${realC - realD}`;
    hisaabChart.data.datasets[0].data = [realC, realD];
    hisaabChart.update();
}

// Add Item
function addEntry(name, amount, type) {
    transactions.push({ 
        name, amount, type, 
        date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    });
    localStorage.setItem('theH_data', JSON.stringify(transactions));
    updateUI();
}

// Delete Item
window.deleteItem = function(index) {
    if(confirm("Delete this entry?")) {
        transactions.splice(index, 1);
        localStorage.setItem('theH_data', JSON.stringify(transactions));
        updateUI();
    }
}

// Download Report File
function downloadReport() {
    const dataStr = "Date, Name, Type, Amount\n" + transactions.map(t => `${t.date}, ${t.name}, ${t.type}, ${t.amount}`).join("\n");
    const blob = new Blob([dataStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hisaab_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
}
document.getElementById('export-btn').onclick = downloadReport;

// 4. MIC LOGIC (FIXED FOR HINGLISH)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
// 'en-IN' forces the phone to use Latin characters (ABC) even for Hindi words
recognition.lang = 'en-IN'; 

document.getElementById('mic-btn').onclick = () => {
    document.getElementById('status-msg').innerText = "Listening...";
    document.getElementById('status-msg').style.color = "#10b981";
    recognition.start();
};

recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('status-msg').innerText = `Heard: "${text}"`;
    
    const nums = text.match(/\d+/); // Find number
    if (nums) {
        const amount = parseInt(nums[0]);
        // Remove the number and clean up text
        const name = text.replace(nums[0], '').replace('rupees','').replace('rupee','').trim();
        
        if(confirm(`Add "${name}" : ₹${amount}?\nOK = Credit (Income)\nCancel = Debit (Expense)`)) {
            addEntry(name, amount, 'credit');
        } else {
            addEntry(name, amount, 'debit');
        }
    } else {
        alert("Please speak a number (e.g., 'Chai 20')");
    }
};

// 5. MANUAL INPUT & SEARCH
document.getElementById('enter-btn').onclick = () => {
    const val = document.getElementById('manual-input').value;
    const parts = val.split(',');
    if(parts.length === 2) {
        const type = confirm("OK = Credit, Cancel = Debit") ? 'credit' : 'debit';
        addEntry(parts[0].trim(), parseInt(parts[1]), type);
        document.getElementById('manual-input').value = '';
    }
};

document.getElementById('search-input').oninput = (e) => updateUI(e.target.value);

// 6. HBOT
function toggleChat() {
    document.getElementById('hbot-widget').classList.toggle('closed');
    const icon = document.getElementById('toggle-icon');
    icon.classList.toggle('fa-chevron-up');
    icon.classList.toggle('fa-chevron-down');
}

document.getElementById('chat-input').onkeypress = (e) => {
    if(e.key === 'Enter') {
        const q = e.target.value.toLowerCase();
        const disp = document.getElementById('chat-display');
        disp.innerHTML += `<div style="text-align:right; margin:5px; color:#aaa;">${e.target.value}</div>`;
        
        let reply = "I only know your Balance and Kharcha.";
        if(q.includes('balance') || q.includes('net')) reply = `Net Balance: ${balanceEl.innerText}`;
        if(q.includes('kharcha') || q.includes('expense')) {
            const exp = transactions.filter(t=>t.type==='debit').reduce((a,b)=>a+b.amount,0);
            reply = `Total Kharcha: ₹${exp}`;
        }
        
        setTimeout(()=> {
            disp.innerHTML += `<div class="bot-msg">${reply}</div>`;
            disp.scrollTop = disp.scrollHeight;
        }, 500);
        e.target.value = '';
    }
};

