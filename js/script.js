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
const BACKEND_URL = "http://seu-backend.com/api";   // <--- ALTERE QUANDO TIVER BACKEND
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
   SIMULAÇÃO DE DADOS (para teste sem backend)
   -------------------------------------------------------------- */
let counter = 0;
async function fetchData() {
  // ---- DADOS FALSOS ----
  const temp = 22 + Math.sin(counter / 10) * 12;   // 10-34 °C
  const hum  = 55 + Math.cos(counter / 10) * 25;   // 30-80 %
  const buses = Math.random() > 0.6 ? ['Ônibus 101', 'Ônibus 205'] : [];

  // ---- ATUALIZA UI ----
  tempValue.textContent = temp.toFixed(1) + ' °C';
  humValue.textContent  = hum.toFixed(1) + ' %';
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  tempTime.textContent = now;
  humTime.textContent  = now;

  busListEl.innerHTML = buses.length
    ? buses.map(b => `<li class="text-green-400">${b}</li>`).join('')
    : '<li class="text-gray-500">—</li>';

  // ---- GRÁFICO ----
  const label = now.split(' ')[1];   // só HH:MM:SS
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