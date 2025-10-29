// js/script.js
/* --------------------------------------------------------------
   PROTEÇÃO DE LOGIN
   -------------------------------------------------------------- */
if (!localStorage.getItem('token')) {
  window.location.href = 'login.html';
}

/* --------------------------------------------------------------
   LOGOUT
   -------------------------------------------------------------- */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/* --------------------------------------------------------------
   CONFIGURAÇÕES
   -------------------------------------------------------------- */
const BACKEND_URL = "https://back-smart-bus-iot-nyp0.onrender.com";   // URL corrigida (removido o duplo h)
const pollInterval = 2000;                         // 2 s
const maxPoints = 30;                              // pontos no gráfico

/* --------------------------------------------------------------
   ELEMENTOS DO DOM
   -------------------------------------------------------------- */
const tempValue = document.getElementById('tempValue');
const humValue  = document.getElementById('humValue');
const tempTime  = document.getElementById('tempTime');
const humTime   = document.getElementById('humTime');
const busListEl = document.getElementById('busList');

/* --------------------------------------------------------------
   CHART.JS
   -------------------------------------------------------------- */
const ctx = document.getElementById('lineChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Temperatura (°C)', data: [], borderColor: '#10b981', tension: 0.3, fill: false },
      { label: 'Umidade (%)',     data: [], borderColor: '#3b82f6', tension: 0.3, fill: false }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } }
  }
});

/* --------------------------------------------------------------
   FUNÇÃO PARA BUSCAR DADOS DO BACKEND
   -------------------------------------------------------------- */
let counter = 0;
async function fetchData() {
  try {
    // Tenta buscar dados reais do ThingSpeak via backend
    const response = await fetch(`${BACKEND_URL}/api/sensors/test_thingspeak`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Usa os dados reais se disponíveis
      const temp = parseFloat(data.temperature) || (22 + Math.sin(counter / 10) * 12);
      const hum = parseFloat(data.humidity) || (55 + Math.cos(counter / 10) * 25);
      
      updateUI(temp, hum);
    } else {
      // Fallback para dados simulados se o backend não responder
      useFallbackData();
    }
  } catch (error) {
    console.warn('Erro ao conectar com backend, usando dados simulados:', error);
    useFallbackData();
  }
}

function useFallbackData() {
  // ---- DADOS SIMULADOS PARA FALLBACK ----
  const temp = 22 + Math.sin(counter / 10) * 12;   // 10-34 °C
  const hum = 55 + Math.cos(counter / 10) * 25;    // 30-80 %
  updateUI(temp, hum);
}

function updateUI(temp, hum) {
  // ---- ATUALIZA UI ----
  tempValue.textContent = temp.toFixed(1) + ' °C';
  humValue.textContent = hum.toFixed(1) + ' %';
  
  const now = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  tempTime.textContent = now;
  humTime.textContent = now;

  // Simulação de ônibus (pode ser expandido futuramente)
  const buses = Math.random() > 0.6 ? ['Ônibus 101', 'Ônibus 205'] : [];
  busListEl.innerHTML = buses.length
    ? buses.map(b => `<li class="text-green-400">${b}</li>`).join('')
    : '<li class="text-gray-500">—</li>';

  // ---- ATUALIZA GRÁFICO ----
  const label = now;
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(temp);
  chart.data.datasets[1].data.push(hum);

  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update('quiet');

  counter++;
}

/* --------------------------------------------------------------
   POLLING
   -------------------------------------------------------------- */
let pollTimer = null;
function startPolling() {
  stopPolling();
  pollTimer = setInterval(fetchData, pollInterval);
  fetchData();               // primeira chamada imediata
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}
startPolling();