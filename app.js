const ctx = document.getElementById('myChart').getContext('2d');

const data = {
    labels: [],
    datasets: [{
        label: 'Live Data',
        data: [],
        borderColor: '#ff4ecb',
        backgroundColor: 'rgba(255, 78, 203, 0.1)',
        tension: 0.4,
        pointRadius: 4
    }]
};

const config = {
    type: 'line',
    data: data,
    options: {
        animation: {
            duration: 500
        },
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Value' }, beginAtZero: true }
        }
    }
};

const myChart = new Chart(ctx, config);

const apiSelector = document.getElementById('api-selector');
const customApiInput = document.getElementById('custom-api');
const thresholdInput = document.getElementById('threshold');
const downloadBtn = document.getElementById('download');
const themeToggle = document.getElementById('theme-toggle');

function getPredefinedAPI(option) {
    switch(option) {
        case 'coingecko':
            return 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
        case 'weather':
            return 'https://api.open-meteo.com/v1/forecast?latitude=35&longitude=139&current_weather=true';
        case 'aqi':
            return 'https://api.waqi.info/feed/beijing/?token=demo';
        default:
            return '';
    }
}

let activeAPI = getPredefinedAPI(apiSelector.value);

apiSelector.addEventListener('change', () => {
    if (apiSelector.value === 'custom') {
        customApiInput.style.display = 'block';
        activeAPI = customApiInput.value;
    } else {
        customApiInput.style.display = 'none';
        activeAPI = getPredefinedAPI(apiSelector.value);
    }
});

customApiInput.addEventListener('input', () => {
    if (apiSelector.value === 'custom') {
        activeAPI = customApiInput.value;
    }
});

async function fetchDataAndUpdate() {
    try {
        if (!activeAPI) return;
        const response = await fetch(activeAPI);
        const json = await response.json();

        let value;
        if (activeAPI.includes('coingecko')) {
            value = json.bitcoin.usd;
        } else if (activeAPI.includes('open-meteo')) {
            value = json.current_weather.temperature;
        } else if (activeAPI.includes('waqi')) {
            value = json.data.aqi;
        } else {
            value = extractFirstNumeric(json);
        }

        const currentTime = new Date().toLocaleTimeString();
        if (myChart.data.labels.length > 30) {
            myChart.data.labels.shift();
            myChart.data.datasets[0].data.shift();
        }
        myChart.data.labels.push(currentTime);
        myChart.data.datasets[0].data.push(value);
        myChart.update();

        const canvas = document.getElementById('myChart');
        canvas.classList.add('update-pulse');
        setTimeout(() => canvas.classList.remove('update-pulse'), 400);

        const threshold = parseFloat(thresholdInput.value);
        if (!isNaN(threshold) && value > threshold) {
            Swal.fire({
                icon: 'warning',
                title: '🚨 Threshold Alert!',
                text: `Value ${value} crossed your set threshold ${threshold}`,
                confirmButtonColor: '#ff4ecb',
                background: '#fff0f8'
            });
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function extractFirstNumeric(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'number') return obj[key];
        if (typeof obj[key] === 'object') {
            const val = extractFirstNumeric(obj[key]);
            if (val !== undefined) return val;
        }
    }
}

setInterval(fetchDataAndUpdate, 1500); // faster updates for excitement
fetchDataAndUpdate();

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
});

downloadBtn.addEventListener('click', () => {
    const rows = [['Time', 'Value'], ...myChart.data.labels.map((label, idx) => [label, myChart.data.datasets[0].data[idx]])];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'chart_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
