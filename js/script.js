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
  // Fallback para o Render se config não carregou
  return "https://back-smart-bus-iot-nyp0.onrender.com";
}

let BACKEND_URL = "http://localhost:8001"; // Inicializar com localhost
const pollInterval = 20000;                       // 20 segundos
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

// Endpoint principal: dados ThingSpeak direto (sem salvar no banco)
const API_ENDPOINTS = [
  {
    name: 'Dados ThingSpeak',
    url: '/api/sensors/thingspeak?results=10',
    parser: 'thingspeak_direct'
  },
  {
    name: 'Leituras dos Sensores', //fallback
    url: '/api/sensors/readings?limit=8',
    parser: 'readings'
  },
  {
    name: 'Dashboard Analytics', //fallback
    url: '/api/analytics/dashboard',
    parser: 'dashboard'
  }
];

async function fetchData() {
  console.log('Buscando dados...', new Date().toLocaleTimeString());
  
  // Tenta endpoints em sequência até encontrar dados válidos
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i];
    console.log(`Tentando: ${endpoint.name}`);
    
    if (await tryEndpoint(endpoint)) {
      currentEndpointIndex = i;
      return;
    }
  }
  
  // Se todos falharem, exibe erro e não atualiza UI
  console.log('Nenhum dado real disponível');
  updateConnectionStatus('Falha na conexão ou sem dados disponíveis', 'bg-red-500');
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
        console.warn(` ${endpoint.name} - Dados inválidos:`, data);
      }
    } else {
      console.warn(` ${endpoint.name} - Erro HTTP:`, response.status);
      updateConnectionStatus(`Erro ${response.status}`, 'bg-red-500');
    }
  } catch (error) {
    console.error(` ${endpoint.name} - Erro de conexão:`, error);
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
    case 'thingspeak_direct':
      // Dados diretos do ThingSpeak via /api/thingspeak
      if (Array.isArray(data.sample_data) && data.sample_data.length > 0) {
        // Exibe todos os dados recebidos do ThingSpeak
        extra.allSamples = data.sample_data;
        // Atualiza painel principal com o último valor
        const last = data.sample_data[data.sample_data.length - 1];
        temp = last.temperature;
        hum = last.humidity;
        extra.source = 'ThingSpeak Direto';
        extra.deviceId = last.device_id;
        extra.entryId = last.entry_id;
        extra.createdAt = last.thingspeak_created_at;
      }
      break;
    case 'thingspeak':
      // ThingSpeak teste (fallback)
      temp = data.temperature;
      hum = data.humidity;
      extra = { source: 'ThingSpeak Test' };
      break;
  }
  // Só retorna se encontrou dados reais
  if (temp !== null || hum !== null) {
    return {
      temp: temp,
      hum: hum,
      extra: extra
    };
  }
  return null;
}

function updateConnectionStatus(text, className) {
  connectionStatus.textContent = text;
  connectionStatus.className = `fixed top-4 right-4 px-3 py-1 rounded text-sm text-white ${className}`;
}

// Função para calcular índice de calor (Heat Index)
function calculateHeatIndex(tempC, humidity) {
  // Converter para Fahrenheit para usar fórmula padrão
  const tempF = (tempC * 9/5) + 32;
  const T = tempF;
  const RH = humidity;
  
  // Fórmula simplificada do National Weather Service
  if (T < 80) {
    return tempC; // Se temperatura baixa, heat index = temperatura
  }
  
  const HI = -42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH 
           - 6.83783e-3*T*T - 5.481717e-2*RH*RH + 1.22874e-3*T*T*RH 
           + 8.5282e-4*T*RH*RH - 1.99e-6*T*T*RH*RH;
  
  // Converter de volta para Celsius
  return (HI - 32) * 5/9;
}

function updateUI(temp, hum, source = 'Desconhecido', extra = {}) {
  // Se vier dados de sample_data, atualiza o gráfico com todos
  if (extra.allSamples && Array.isArray(extra.allSamples) && extra.allSamples.length > 0) {
    chart.data.labels = extra.allSamples.map(item => {
      return new Date(item.thingspeak_created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    });
    chart.data.datasets[0].data = extra.allSamples.map(item => item.temperature);
    chart.data.datasets[1].data = extra.allSamples.map(item => item.humidity);
    chart.update('quiet');

    // Atualiza painel principal com o último valor
    const last = extra.allSamples[extra.allSamples.length - 1];
    if (tempValue) tempValue.textContent = last.temperature.toFixed(1) + ' °C';
    if (humValue) humValue.textContent = last.humidity.toFixed(1) + ' %';
    if (tempTime) tempTime.textContent = `${new Date(last.thingspeak_created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (ThingSpeak)`;
    if (humTime) humTime.textContent = `${new Date(last.thingspeak_created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (ThingSpeak)`;

    // Atualiza métricas extras
    extra.temp = last.temperature;
    extra.hum = last.humidity;
    updateExtraMetrics(extra);
    return;
  }

  // Fallback para dados simples (sem allSamples)
  if (temp !== null && hum !== null) {
    if (tempValue) tempValue.textContent = temp.toFixed(1) + ' °C';
    if (humValue) humValue.textContent = hum.toFixed(1) + ' %';
    
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (tempTime) tempTime.textContent = `${now} (${source})`;
    if (humTime) humTime.textContent = `${now} (${source})`;

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

    // Atualiza métricas extras
    extra.temp = temp;
    extra.hum = hum;
    updateExtraMetrics(extra);
  }

  // Aguardando dados reais de ônibus do backend
  if (busListEl) {
    busListEl.innerHTML = '<li class="text-gray-500">Aguardando dados...</li>';
  }

  counter++;
}

function updateExtraMetrics(extra) {
  // Atualiza elementos extras se existirem
  if (document.getElementById('heatIndexValue')) {
    // Usar heatIndex do backend se disponível, senão calcular localmente
    let heatIndex = extra.heatIndex;
    if (!heatIndex && extra.temp && extra.hum) {
      heatIndex = calculateHeatIndex(extra.temp, extra.hum);
    }
    if (heatIndex) {
      document.getElementById('heatIndexValue').textContent = heatIndex.toFixed(1) + ' °C';
    }
  }
  
  // REMOVIDO: Qualidade dos dados - movido para analytics apenas
  
  // REMOVIDO: Tendências - movido para analytics apenas
  
  // Atualizar status IoT baseado na idade dos dados
  updateIoTStatus(extra);
}

// Função para verificar status IoT em tempo real
function updateIoTStatus(extra) {
  const alertsEl = document.getElementById('alertsInfo');
  if (!alertsEl) return;
  
  let isConnected = false;
  let lastDataTime = null;
  
  // Verificar se temos dados recentes do ThingSpeak
  if (extra.createdAt) {
    lastDataTime = new Date(extra.createdAt);
    const now = new Date();
    const diffMinutes = (now - lastDataTime) / (1000 * 60); // Diferença em minutos
    
    // IoT considerado "conectado" se dados são de até 5 minutos atrás
    isConnected = diffMinutes <= 5;
  }
  
  // SEMPRE atualizar APENAS com status IoT - IGNORAR TUDO SOBRE OUTLIERS
  if (isConnected) {
    alertsEl.textContent = '🟢 IoT Conectado';
    alertsEl.className = 'text-lg font-bold mt-2 text-green-400';
  } else {
    alertsEl.textContent = '🔴 IoT Desconectado';
    alertsEl.className = 'text-lg font-bold mt-2 text-red-400';
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
  detailedPollTimer = setInterval(fetchDetailedAnalytics, 60000); // 60 segundos (menos frequente)
  setTimeout(fetchDetailedAnalytics, 25000); // primeira chamada após 25s
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
  
  if (qualityEl && data.data_quality) {
    const quality = data.data_quality.average_score.toFixed(1);
    qualityEl.textContent = quality + '%';
    qualityEl.className = quality > 90 ? 'text-green-400 text-2xl font-bold mt-2' : 
                         quality > 75 ? 'text-yellow-400 text-2xl font-bold mt-2' : 
                         'text-red-400 text-2xl font-bold mt-2';
  }
  
  // REMOVIDO: Não exibir outliers no dashboard principal
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
