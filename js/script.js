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
// Função para obter a melhor URL disponível
async function getBestBackendUrl() {
  if (window.selectBestBackendUrl) {
    return await window.selectBestBackendUrl();
  }
  return window.BACKEND_URL_OVERRIDE || "http://localhost:8001";
}

let BACKEND_URL = window.BACKEND_URL_OVERRIDE || "http://localhost:8001";
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
   SISTEMA DE ENDPOINTS - SMART BUS API
   -------------------------------------------------------------- */
let counter = 0;
let lastDataSource = 'unknown';
let currentEndpointIndex = 0;

// Lista de endpoints para tentar em ordem de prioridade
const API_ENDPOINTS = [
  {
    name: 'Dashboard Completo',
    url: '/api/analytics/dashboard',
    parser: 'dashboard'
  },
  {
    name: 'Leituras dos Sensores',
    url: '/api/sensors/readings?limit=1',
    parser: 'readings'
  },
  {
    name: 'Resumo Analytics',
    url: '/api/analytics/summary?timeframe=1h',
    parser: 'summary'
  },
  {
    name: 'Teste ThingSpeak',
    url: '/api/sensors/test_thingspeak',
    parser: 'thingspeak'
  }
];

async function fetchData() {
  console.log('🔄 Buscando dados...', new Date().toLocaleTimeString());
  
  // Tenta endpoints em sequência até encontrar dados válidos
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i];
    console.log(`📡 Tentando: ${endpoint.name}`);
    
    if (await tryEndpoint(endpoint)) {
      currentEndpointIndex = i;
      return;
    }
  }
  
  // Se todos falharem, usa dados simulados
  console.log('⚠️ Todos os endpoints falharam, usando dados simulados');
  useFallbackData();
}

async function tryEndpoint(endpoint) {
  try {
    updateConnectionStatus(`Conectando (${endpoint.name})...`, 'bg-yellow-500');
    
    const response = await fetch(`${BACKEND_URL}${endpoint.url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 ${endpoint.name} - Status:`, response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log(`📊 ${endpoint.name} - Dados:`, data);
      
      // Parseia os dados baseado no tipo de endpoint
      const parsedData = parseEndpointData(data, endpoint.parser);
      
      if (parsedData) {
        updateConnectionStatus(`Conectado (${endpoint.name})`, 'bg-green-500');
        lastDataSource = endpoint.name;
        updateUI(parsedData.temp, parsedData.hum, endpoint.name, parsedData.extra);
        return true;
      } else {
        console.warn(`❌ ${endpoint.name} - Dados inválidos:`, data);
      }
    } else {
      console.warn(`❌ ${endpoint.name} - Erro HTTP:`, response.status);
      updateConnectionStatus(`Erro ${response.status}`, 'bg-red-500');
    }
  } catch (error) {
    console.error(`❌ ${endpoint.name} - Erro de conexão:`, error);
    updateConnectionStatus('Desconectado', 'bg-red-500');
  }
  
  return false;
}

function parseEndpointData(data, parserType) {
  let temp = null, hum = null, extra = {};
  
  switch (parserType) {
    case 'dashboard':
      if (data.current_metrics) {
        temp = data.current_metrics.temperature?.average;
        hum = data.current_metrics.humidity?.average;
        extra = {
          heatIndex: data.current_metrics.heat_index?.average,
          dataQuality: data.current_metrics.data_quality_score,
          trends: data.trends,
          alerts: data.alerts,
          totalReadings: data.summary?.total_readings
        };
      }
      break;
      
    case 'readings':
      if (data.readings && data.readings.length > 0) {
        const reading = data.readings[0];
        temp = reading.temperature;
        hum = reading.humidity;
        extra = {
          heatIndex: reading.heat_index,
          dataQuality: reading.data_quality_score,
          deviceId: reading.device_id,
          recordedAt: reading.recorded_at
        };
      }
      break;
      
    case 'summary':
      if (data.temperature && data.humidity) {
        temp = data.temperature.average;
        hum = data.humidity.average;
        extra = {
          tempRange: `${data.temperature.minimum}°C - ${data.temperature.maximum}°C`,
          humRange: `${data.humidity.minimum}% - ${data.humidity.maximum}%`,
          heatIndex: data.heat_index?.average,
          dataQuality: data.data_quality?.average_score,
          timeframe: data.timeframe
        };
      }
      break;
      
    case 'thingspeak':
      // Fallback - ThingSpeak pode não retornar dados estruturados
      temp = data.temperature || generateFallbackTemp();
      hum = data.humidity || generateFallbackHum();
      extra = { source: 'ThingSpeak Test' };
      break;
  }
  
  // Valida se encontrou pelo menos temperatura ou umidade
  if (temp !== null || hum !== null) {
    return {
      temp: temp || generateFallbackTemp(),
      hum: hum || generateFallbackHum(),
      extra: extra
    };
  }
  
  return null;
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

function updateUI(temp, hum, source = 'Desconhecido', extra = {}) {
  console.log(`📱 Atualizando UI - Temp: ${temp.toFixed(1)}°C, Hum: ${hum.toFixed(1)}%, Fonte: ${source}`);
  
  // ---- ATUALIZA VALORES PRINCIPAIS ----
  if (tempValue) tempValue.textContent = temp.toFixed(1) + ' °C';
  if (humValue) humValue.textContent = hum.toFixed(1) + ' %';
  
  const now = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  if (tempTime) tempTime.textContent = `${now} (${source})`;
  if (humTime) humTime.textContent = `${now} (${source})`;

  // ---- ATUALIZA MÉTRICAS EXTRAS ----
  updateExtraMetrics(extra);

  // ---- SIMULAÇÃO DE ÔNIBUS (futura integração com API de transporte) ----
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

function updateExtraMetrics(extra) {
  // Atualiza elementos extras se existirem
  if (extra.heatIndex && document.getElementById('heatIndexValue')) {
    document.getElementById('heatIndexValue').textContent = extra.heatIndex.toFixed(1) + ' °C';
  }
  
  if (extra.dataQuality && document.getElementById('dataQualityValue')) {
    const quality = extra.dataQuality.toFixed(1);
    const qualityEl = document.getElementById('dataQualityValue');
    qualityEl.textContent = quality + '%';
    
    // Cor baseada na qualidade
    qualityEl.className = quality > 90 ? 'text-green-400' : quality > 75 ? 'text-yellow-400' : 'text-red-400';
  }
  
  if (extra.trends && document.getElementById('trendsInfo')) {
    const trendsEl = document.getElementById('trendsInfo');
    const tempTrend = extra.trends.temperature?.direction || 'stable';
    const humTrend = extra.trends.humidity?.direction || 'stable';
    
    trendsEl.innerHTML = `
      <div class="text-xs">
        <span class="text-gray-400">Temp:</span> 
        <span class="${getTrendColor(tempTrend)}">${getTrendSymbol(tempTrend)} ${tempTrend}</span>
      </div>
      <div class="text-xs">
        <span class="text-gray-400">Hum:</span> 
        <span class="${getTrendColor(humTrend)}">${getTrendSymbol(humTrend)} ${humTrend}</span>
      </div>
    `;
  }
  
  if (extra.alerts && document.getElementById('alertsInfo')) {
    const alertsEl = document.getElementById('alertsInfo');
    const outliers = extra.alerts.outliers_detected || 0;
    alertsEl.textContent = outliers > 0 ? `⚠️ ${outliers} outliers` : '✅ Normal';
    alertsEl.className = outliers > 0 ? 'text-yellow-400' : 'text-green-400';
  }
}

function getTrendColor(direction) {
  switch (direction) {
    case 'increasing': return 'text-red-400';
    case 'decreasing': return 'text-blue-400';
    case 'stable': return 'text-green-400';
    default: return 'text-gray-400';
  }
}

function getTrendSymbol(direction) {
  switch (direction) {
    case 'increasing': return '↗';
    case 'decreasing': return '↘';
    case 'stable': return '→';
    default: return '-';
  }
}

/* --------------------------------------------------------------
   SISTEMA DE POLLING INTELIGENTE
   -------------------------------------------------------------- */
let pollTimer = null;
let detailedPollTimer = null;
let consecutiveErrors = 0;
let maxErrors = 3;

// Polling principal (dados básicos) - mais frequente
function startPolling() {
  console.log('🚀 Iniciando polling principal...');
  stopPolling();
  pollTimer = setInterval(fetchData, pollInterval);
  fetchData(); // primeira chamada imediata
}

// Polling detalhado (analytics) - menos frequente
function startDetailedPolling() {
  console.log('📈 Iniciando polling de analytics...');
  stopDetailedPolling();
  detailedPollTimer = setInterval(fetchDetailedAnalytics, 30000); // 30 segundos
  setTimeout(fetchDetailedAnalytics, 5000); // primeira chamada após 5s
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  console.log('⏹️ Polling principal parado');
}

function stopDetailedPolling() {
  if (detailedPollTimer) clearInterval(detailedPollTimer);
  detailedPollTimer = null;
  console.log('⏹️ Polling de analytics parado');
}

// Busca dados de analytics detalhados
async function fetchDetailedAnalytics() {
  console.log('📊 Buscando analytics detalhados...');
  
  try {
    await Promise.allSettled([
      fetchTrends(),
      fetchDataQuality(),
      fetchSummary('6h')
    ]);
  } catch (error) {
    console.warn('⚠️ Erro no polling de analytics:', error);
  }
}

// Endpoints específicos para analytics
async function fetchTrends(days = 1) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analytics/trends?days=${days}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateTrendsDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao buscar trends:', error);
  }
}

async function fetchDataQuality() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analytics/data-quality`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateDataQualityDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao buscar qualidade dos dados:', error);
  }
}

async function fetchSummary(timeframe = '24h') {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analytics/summary?timeframe=${timeframe}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateSummaryDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao buscar resumo:', error);
  }
}

function updateTrendsDisplay(data) {
  const trendsEl = document.getElementById('trendsInfo');
  if (trendsEl && data.temperature_trend && data.humidity_trend) {
    trendsEl.innerHTML = `
      <div class="text-xs">
        <span class="text-gray-400">Temp:</span> 
        <span class="${getTrendColor(data.temperature_trend.direction)}">
          ${getTrendSymbol(data.temperature_trend.direction)} ${data.temperature_trend.direction}
        </span>
      </div>
      <div class="text-xs">
        <span class="text-gray-400">Hum:</span> 
        <span class="${getTrendColor(data.humidity_trend.direction)}">
          ${getTrendSymbol(data.humidity_trend.direction)} ${data.humidity_trend.direction}
        </span>
      </div>
      <div class="text-xs text-gray-500 mt-1">${data.period?.days || 1} dia(s)</div>
    `;
  }
}

function updateDataQualityDisplay(data) {
  const qualityEl = document.getElementById('dataQualityValue');
  const alertsEl = document.getElementById('alertsInfo');
  
  if (qualityEl && data.data_quality) {
    const quality = data.data_quality.average_score.toFixed(1);
    qualityEl.textContent = quality + '%';
    qualityEl.className = quality > 90 ? 'text-green-400 text-2xl font-bold mt-2' : 
                         quality > 75 ? 'text-yellow-400 text-2xl font-bold mt-2' : 
                         'text-red-400 text-2xl font-bold mt-2';
  }
  
  if (alertsEl && data.outliers) {
    const totalOutliers = data.outliers.total_outliers || 0;
    alertsEl.textContent = totalOutliers > 0 ? `⚠️ ${totalOutliers} outliers` : '✅ Normal';
    alertsEl.className = `text-lg font-bold mt-2 ${totalOutliers > 0 ? 'text-yellow-400' : 'text-green-400'}`;
  }
}

function updateSummaryDisplay(data) {
  // Atualiza informações adicionais se necessário
  console.log('📊 Resumo atualizado:', data.timeframe);
}

// Verificar se os elementos DOM existem e inicializar
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🏁 DOM carregado, verificando elementos...');
  
  // Definir URL dinâmica
  BACKEND_URL = await getBestBackendUrl();
  console.log('🔗 Backend URL:', BACKEND_URL);
  
  // Verificar elementos críticos
  const elements = {
    tempValue: document.getElementById('tempValue'),
    humValue: document.getElementById('humValue'),
    tempTime: document.getElementById('tempTime'),
    humTime: document.getElementById('humTime'),
    busListEl: document.getElementById('busList'),
    chartCanvas: document.getElementById('lineChart'),
    heatIndexValue: document.getElementById('heatIndexValue'),
    dataQualityValue: document.getElementById('dataQualityValue'),
    trendsInfo: document.getElementById('trendsInfo'),
    alertsInfo: document.getElementById('alertsInfo')
  };
  
  console.log('📋 Elementos encontrados:', elements);
  
  // Verificar elementos essenciais
  const essentialElements = ['tempValue', 'humValue', 'chartCanvas'];
  const missingEssentials = essentialElements.filter(key => !elements[key]);
  
  if (missingEssentials.length > 0) {
    console.error('❌ Elementos essenciais não encontrados:', missingEssentials);
    alert(`Erro: Elementos essenciais não encontrados: ${missingEssentials.join(', ')}`);
  } else {
    console.log('✅ Elementos essenciais encontrados');
    
    // Inicializar sistema de polling
    startPolling();
    startDetailedPolling();
    
    // Adicionar controles de debug
    addDebugControls();
  }
});

// Fallback: tentar iniciar após um delay se o DOM já estiver carregado
if (document.readyState === 'loading') {
  console.log('⏳ DOM ainda carregando...');
} else {
  console.log('⚡ DOM já carregado, iniciando imediatamente');
  setTimeout(async () => {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Backend URL:', BACKEND_URL);
    startPolling();
    startDetailedPolling();
    addDebugControls();
  }, 1000);
}

// Adiciona controles de debug (só visível no console)
function addDebugControls() {
  // Expor funções para debug no console
  window.smartBusDebug = {
    fetchData,
    fetchDetailedAnalytics,
    fetchTrends,
    fetchDataQuality,
    fetchSummary,
    API_ENDPOINTS,
    currentEndpointIndex,
    consecutiveErrors,
    restartPolling: () => {
      stopPolling();
      stopDetailedPolling();
      startPolling();
      startDetailedPolling();
    },
    testAllEndpoints: async () => {
      console.log('🧪 Testando todos os endpoints...');
      for (const endpoint of API_ENDPOINTS) {
        await tryEndpoint(endpoint);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };
  
  console.log('🛠️ Debug controls available at window.smartBusDebug');
}