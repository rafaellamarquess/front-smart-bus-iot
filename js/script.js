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
const BACKEND_URL = "https://back-smart-bus-iot-nyp0.onrender.com";   
const pollInterval = 5000;                         // 5 s (aumentado para reduzir spam)
const maxPoints = 30;                              // pontos no gráfico

// Adicionar status de conexão na UI
let connectionStatus = document.createElement('div');
connectionStatus.id = 'connectionStatus';
connectionStatus.className = 'fixed top-4 right-4 px-3 py-1 rounded text-sm';
document.body.appendChild(connectionStatus);

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
let lastDataSource = 'unknown';

async function fetchData() {
  console.log('🔄 Buscando dados...', new Date().toLocaleTimeString());
  
  // Primeiro, tenta dados reais do backend
  if (await tryBackendData()) return;
  
  // Se falhar, usa dados simulados
  console.log('⚠️ Usando dados simulados');
  useFallbackData();
}

async function tryBackendData() {
  try {
    updateConnectionStatus('Conectando...', 'bg-yellow-500');
    
    const response = await fetch(`${BACKEND_URL}/api/sensors/test_thingspeak`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Resposta do backend:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('📊 Dados recebidos:', data);
      
      // Verifica se os dados são válidos
      if (data && (data.temperature !== undefined || data.humidity !== undefined)) {
        const temp = parseFloat(data.temperature) || generateFallbackTemp();
        const hum = parseFloat(data.humidity) || generateFallbackHum();
        
        updateConnectionStatus('Conectado', 'bg-green-500');
        lastDataSource = 'backend';
        updateUI(temp, hum, 'Backend Real');
        return true;
      } else {
        console.warn('❌ Dados inválidos recebidos do backend:', data);
      }
    } else {
      console.warn('❌ Erro HTTP:', response.status);
      updateConnectionStatus(`Erro ${response.status}`, 'bg-red-500');
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    updateConnectionStatus('Desconectado', 'bg-red-500');
  }
  
  return false;
}

function updateConnectionStatus(text, className) {
  connectionStatus.textContent = text;
  connectionStatus.className = `fixed top-4 right-4 px-3 py-1 rounded text-sm text-white ${className}`;
}

function generateFallbackTemp() {
  return 22 + Math.sin(counter / 10) * 12;   // 10-34 °C
}

function generateFallbackHum() {
  return 55 + Math.cos(counter / 10) * 25;    // 30-80 %
}

function useFallbackData() {
  // ---- DADOS SIMULADOS PARA FALLBACK ----
  const temp = generateFallbackTemp();
  const hum = generateFallbackHum();
  
  updateConnectionStatus('Simulado', 'bg-blue-500');
  lastDataSource = 'simulated';
  updateUI(temp, hum, 'Simulado');
}

function updateUI(temp, hum, source = 'Desconhecido') {
  console.log(`📱 Atualizando UI - Temp: ${temp.toFixed(1)}°C, Hum: ${hum.toFixed(1)}%, Fonte: ${source}`);
  
  // ---- ATUALIZA UI ----
  if (tempValue) tempValue.textContent = temp.toFixed(1) + ' °C';
  if (humValue) humValue.textContent = hum.toFixed(1) + ' %';
  
  const now = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  if (tempTime) tempTime.textContent = `${now} (${source})`;
  if (humTime) humTime.textContent = `${now} (${source})`;

  // Simulação de ônibus (pode ser expandido futuramente)
  const buses = Math.random() > 0.6 ? ['Ônibus 101', 'Ônibus 205'] : [];
  if (busListEl) {
    busListEl.innerHTML = buses.length
      ? buses.map(b => `<li class="text-green-400">${b}</li>`).join('')
      : '<li class="text-gray-500">—</li>';
  }

  // ---- ATUALIZA GRÁFICO ----
  const label = now.substring(0, 8); // Só hora:minuto:segundo
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
   POLLING E INICIALIZAÇÃO
   -------------------------------------------------------------- */
let pollTimer = null;

function startPolling() {
  console.log('🚀 Iniciando polling de dados...');
  stopPolling();
  pollTimer = setInterval(fetchData, pollInterval);
  fetchData();               // primeira chamada imediata
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  console.log('⏹️ Polling parado');
}

// Verificar se os elementos DOM existem
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏁 DOM carregado, verificando elementos...');
  
  // Verificar elementos críticos
  const elements = {
    tempValue: document.getElementById('tempValue'),
    humValue: document.getElementById('humValue'),
    tempTime: document.getElementById('tempTime'),
    humTime: document.getElementById('humTime'),
    busListEl: document.getElementById('busList'),
    chartCanvas: document.getElementById('lineChart')
  };
  
  console.log('📋 Elementos encontrados:', elements);
  
  // Verificar se todos os elementos existem
  const missingElements = Object.entries(elements)
    .filter(([key, element]) => !element)
    .map(([key]) => key);
  
  if (missingElements.length > 0) {
    console.error('❌ Elementos não encontrados:', missingElements);
    alert(`Erro: Elementos não encontrados no DOM: ${missingElements.join(', ')}`);
  } else {
    console.log('✅ Todos os elementos DOM encontrados');
    startPolling();
  }
});

// Fallback: tentar iniciar após um delay se o DOM já estiver carregado
if (document.readyState === 'loading') {
  console.log('⏳ DOM ainda carregando...');
} else {
  console.log('⚡ DOM já carregado, iniciando imediatamente');
  setTimeout(startPolling, 1000);
}