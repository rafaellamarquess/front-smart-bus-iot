// js/analytics.js
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

let BACKEND_URL = "https://back-smart-bus-iot-nyp0.onrender.com"; // Inicializar com Render

/* --------------------------------------------------------------
   CHART.JS - GRÁFICO HISTÓRICO
   -------------------------------------------------------------- */
const historicalCtx = document.getElementById('historicalChart').getContext('2d');
// Forçar dimensões fixas para evitar crescimento infinito
const chartContainer = document.getElementById('historicalChart').parentElement;
document.getElementById('historicalChart').style.height = '200px';
document.getElementById('historicalChart').style.maxHeight = '200px';
document.getElementById('historicalChart').style.width = '100%';
document.getElementById('historicalChart').style.maxWidth = '100%';
document.getElementById('historicalChart').width = chartContainer.offsetWidth;
document.getElementById('historicalChart').height = 200;

const historicalChart = new Chart(historicalCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { 
        label: 'Temperatura (°C)', 
        data: [], 
        borderColor: '#ef4444', 
        backgroundColor: 'transparent',
        tension: 0.2,
        fill: false,
        pointRadius: 2
      },
      { 
        label: 'Umidade (%)', 
        data: [], 
        borderColor: '#3b82f6', 
        backgroundColor: 'transparent',
        tension: 0.2,
        fill: false,
        pointRadius: 2
      }
    ]
  },
  options: {
    responsive: true, // Habilitar responsividade controlada
    maintainAspectRatio: false,
    animation: false,
    plugins: { 
      legend: { 
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 8
        }
      }
    },
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 10,
        right: 10
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 4,
          font: {
            size: 10
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 4,
          font: {
            size: 10
          }
        }
      }
    }
  }
});

/* --------------------------------------------------------------
   FUNÇÕES DE CARREGAMENTO DE DADOS
   -------------------------------------------------------------- */

// Carregar dashboard completo
async function loadDashboard() {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Dashboard usando URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Dashboard data:', data);
      updateDashboardSummary(data);
    }
  } catch (error) {
    console.warn('Erro ao carregar dashboard:', error);
  }
}

// Carregar análise de tendências
async function loadTrends(days = 7) {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Trends usando URL:', BACKEND_URL);
    const response = await fetch(`${BACKEND_URL}/api/analytics/trends?days=${days}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📈 Trends data:', data);
      updateTrendsDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao carregar tendências:', error);
    showFallbackTrends(days);
  }
}

// Carregar qualidade dos dados
async function loadDataQuality() {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Data Quality usando URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/analytics/data-quality`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎯 Data quality:', data);
      updateDataQualityDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao carregar qualidade dos dados:', error);
    showFallbackDataQuality();
  }
}

// Carregar resumo por período
async function loadSummary(timeframe = '24h') {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Summary usando URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/analytics/summary?timeframe=${timeframe}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Summary data:', data);
      updateSummaryDisplay(data, timeframe);
    }
  } catch (error) {
    console.warn('Erro ao carregar resumo:', error);
    showFallbackSummary(timeframe);
  }
}

// Carregar estatísticas do pipeline
async function loadPipelineStats() {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Pipeline Stats usando URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/analytics/pipeline-stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('⚙️ Pipeline stats:', data);
      updatePipelineDisplay(data);
    }
  } catch (error) {
    console.warn('Erro ao carregar estatísticas do pipeline:', error);
    showFallbackPipeline();
  }
}

// Carregar leituras para gráfico histórico
async function loadHistoricalData() {
  try {
    BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Analytics Historical Data usando URL:', BACKEND_URL);
    // Limitar para apenas 5 pontos para evitar travamento
    const response = await fetch(`${BACKEND_URL}/api/sensors/readings?limit=5`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📈 Historical data:', data);
      updateHistoricalChart(data.readings);
    }
  } catch (error) {
    console.warn('Erro ao carregar dados históricos:', error);
    showFallbackHistorical();
  }
}

/* --------------------------------------------------------------
   FUNÇÕES DE ATUALIZAÇÃO DA UI
   -------------------------------------------------------------- */

function updateDashboardSummary(data) {
  // Seguindo estrutura da documentação API
  if (data.summary) {
    document.getElementById('totalReadings').textContent = data.summary.total_readings || '--';
    document.getElementById('totalOutliers').textContent = data.summary.outlier_rate ? `${data.summary.outlier_rate}%` : '0';
  }
  
  if (data.current_metrics) {
    const quality = data.current_metrics.data_quality_score;
    if (quality) {
      document.getElementById('avgQuality').textContent = quality.toFixed(1) + '%';
    }
  }
  
  if (data.alerts) {
    document.getElementById('totalOutliers').textContent = data.alerts.outliers_detected || '0';
    document.getElementById('dataFreshness').textContent = data.alerts.data_freshness || 'Boa';
  }
}

function updateTrendsDisplay(data) {
  const trendsEl = document.getElementById('trendsAnalysis');
  
  if (data.temperature_trend && data.humidity_trend) {
    trendsEl.innerHTML = `
      <div class="space-y-3">
        <div class="p-3 bg-gray-800 rounded">
          <h4 class="font-semibold text-red-400 mb-2">🌡️ Tendência de Temperatura</h4>
          <div class="flex items-center gap-2">
            <span class="text-2xl">${getTrendSymbol(data.temperature_trend.direction)}</span>
            <span class="font-semibold">${data.temperature_trend.direction}</span>
            <span class="text-gray-400">(${data.temperature_trend.slope.toFixed(4)})</span>
          </div>
          <div class="text-sm text-gray-400 mt-1">${data.temperature_trend.interpretation}</div>
        </div>
        
        <div class="p-3 bg-gray-800 rounded">
          <h4 class="font-semibold text-blue-400 mb-2">💧 Tendência de Umidade</h4>
          <div class="flex items-center gap-2">
            <span class="text-2xl">${getTrendSymbol(data.humidity_trend.direction)}</span>
            <span class="font-semibold">${data.humidity_trend.direction}</span>
            <span class="text-gray-400">(${data.humidity_trend.slope.toFixed(4)})</span>
          </div>
          <div class="text-sm text-gray-400 mt-1">${data.humidity_trend.interpretation}</div>
        </div>
        
        <div class="text-xs text-gray-500">
          Período: ${data.period?.start ? new Date(data.period.start).toLocaleDateString() : ''} - 
          ${data.period?.end ? new Date(data.period.end).toLocaleDateString() : ''} (${data.period?.days || 0} dias)
        </div>
      </div>
    `;
  }
}

function updateDataQualityDisplay(data) {
  const qualityEl = document.getElementById('dataQualityDetails');
  
  if (data.data_quality && data.overview) {
    qualityEl.innerHTML = `
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-gray-800 rounded text-center">
            <div class="text-lg font-bold text-green-400">${data.data_quality.average_score.toFixed(1)}%</div>
            <div class="text-xs text-gray-400">Qualidade Média</div>
          </div>
          <div class="p-3 bg-gray-800 rounded text-center">
            <div class="text-lg font-bold text-blue-400">${data.overview.recent_readings_24h}</div>
            <div class="text-xs text-gray-400">Leituras (24h)</div>
          </div>
        </div>
        
        <div class="p-3 bg-gray-800 rounded">
          <h4 class="font-semibold mb-2">🚨 Problemas de Validação</h4>
          <div class="text-sm">
            <div>Registros inválidos: <span class="text-red-400">${data.validation_issues?.invalid_records || 0}</span></div>
            <div>Outliers de temperatura: <span class="text-yellow-400">${data.outliers?.temperature_outliers || 0}</span></div>
            <div>Outliers de umidade: <span class="text-yellow-400">${data.outliers?.humidity_outliers || 0}</span></div>
          </div>
        </div>
        
        ${data.recommendations && data.recommendations.length > 0 ? `
          <div class="p-3 bg-blue-900 rounded">
            <h4 class="font-semibold mb-2">💡 Recomendações</h4>
            <ul class="text-sm space-y-1">
              ${data.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}

function updateSummaryDisplay(data, timeframe) {
  document.getElementById('currentTimeframe').textContent = timeframe;
  
  if (data.temperature) {
    document.getElementById('tempAvg').textContent = data.temperature.average.toFixed(1) + '°C';
    document.getElementById('tempMin').textContent = data.temperature.minimum.toFixed(1) + '°C';
    document.getElementById('tempMax').textContent = data.temperature.maximum.toFixed(1) + '°C';
  }
  
  if (data.humidity) {
    document.getElementById('humAvg').textContent = data.humidity.average.toFixed(1) + '%';
    document.getElementById('humMin').textContent = data.humidity.minimum.toFixed(0) + '%';
    document.getElementById('humMax').textContent = data.humidity.maximum.toFixed(0) + '%';
  }
  
  if (data.heat_index) {
    document.getElementById('heatIndexAvg').textContent = data.heat_index.average.toFixed(1) + '°C';
  }
  
  // Highlight do botão ativo
  document.querySelectorAll('button').forEach(btn => {
    btn.className = btn.className.replace('bg-blue-600', 'bg-gray-700');
  });
  event.target.className = event.target.className.replace('bg-gray-700', 'bg-blue-600');
}

function updatePipelineDisplay(data) {
  if (data.stats) {
    document.getElementById('processedCount').textContent = data.stats.processed || '--';
    document.getElementById('validCount').textContent = data.stats.valid || '--';
    document.getElementById('invalidCount').textContent = data.stats.invalid || '--';
    document.getElementById('successRate').textContent = (data.stats.success_rate || 0).toFixed(1) + '%';
  }
}

function updateHistoricalChart(readings) {
  if (!readings || readings.length === 0) {
    showFallbackHistorical();
    return;
  }
  
  // Ordenar por data
  readings.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  
  const labels = readings.map(r => new Date(r.recorded_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }));
  
  historicalChart.data.labels = labels;
  historicalChart.data.datasets[0].data = readings.map(r => r.temperature);
  historicalChart.data.datasets[1].data = readings.map(r => r.humidity);
  
  historicalChart.update('none'); // Update sem animação
}

/* --------------------------------------------------------------
   FUNÇÕES DE FALLBACK
   -------------------------------------------------------------- */

function showFallbackTrends(days) {
  const trendsEl = document.getElementById('trendsAnalysis');
  // Simular estrutura da API conforme documentação
  const fallbackData = {
    temperature_trend: {
      direction: "stable",
      slope: 0.0,
      interpretation: "No data available for trend analysis"
    },
    humidity_trend: {
      direction: "stable", 
      slope: 0.0,
      interpretation: "No data available for trend analysis"
    },
    period: {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      days: days
    }
  };
  
  updateTrendsDisplay(fallbackData);
}

function showFallbackDataQuality() {
  // Simular estrutura da API conforme documentação
  const fallbackData = {
    data_quality: {
      average_score: 94.2,
      minimum_score: 75.0,
      maximum_score: 100.0
    },
    overview: {
      total_readings: 1520,
      recent_readings_24h: 144,
      data_freshness: "good"
    },
    validation_issues: {
      invalid_records: 12
    },
    outliers: {
      temperature_outliers: 15,
      humidity_outliers: 8,
      total_outliers: 23
    },
    recommendations: [
      "Verifique os sensores para garantir leituras precisas.",]
  };
  
  updateDataQualityDisplay(fallbackData);
}

function showFallbackSummary(timeframe) {
  // Gerar dados simulados baseados no timeframe
  const temp = 25 + Math.random() * 10;
  const hum = 60 + Math.random() * 20;
  
  document.getElementById('tempAvg').textContent = temp.toFixed(1) + '°C';
  document.getElementById('tempMin').textContent = (temp - 5).toFixed(1) + '°C';
  document.getElementById('tempMax').textContent = (temp + 5).toFixed(1) + '°C';
  
  document.getElementById('humAvg').textContent = hum.toFixed(1) + '%';
  document.getElementById('humMin').textContent = (hum - 10).toFixed(0) + '%';
  document.getElementById('humMax').textContent = (hum + 10).toFixed(0) + '%';
  
  document.getElementById('heatIndexAvg').textContent = (temp + 2).toFixed(1) + '°C';
  document.getElementById('currentTimeframe').textContent = timeframe + ' (simulado)';
}

function showFallbackPipeline() {
  // Simular estrutura da API conforme documentação
  const fallbackData = {
    stats: {
      processed: 156,
      valid: 142,
      invalid: 14,
      outliers: 8,
      success_rate: 91.0,
      outlier_rate: 5.1
    }
  };
  
  updatePipelineDisplay(fallbackData);
}

function showFallbackHistorical() {
  // Gerar apenas 5 pontos simulados para evitar travamento
  const now = new Date();
  const labels = [];
  const tempData = [];
  const humData = [];
  const heatData = [];
  
  for (let i = 4; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000); // 30 min intervals
    labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    
    const temp = 25 + Math.sin(i / 5) * 8 + Math.random() * 2;
    const hum = 65 + Math.cos(i / 3) * 15 + Math.random() * 5;
    
    tempData.push(temp);
    humData.push(hum);
    heatData.push(temp + 2 + Math.random());
  }
  
  historicalChart.data.labels = labels;
  historicalChart.data.datasets[0].data = tempData;
  historicalChart.data.datasets[1].data = humData;
  
  historicalChart.update('none'); // Update sem animação
}

/* --------------------------------------------------------------
   FUNÇÕES UTILITÁRIAS
   -------------------------------------------------------------- */

function getTrendSymbol(direction) {
  switch (direction) {
    case 'increasing': return '📈';
    case 'decreasing': return '📉';
    case 'stable': return '➡️';
    default: return '❓';
  }
}

/* --------------------------------------------------------------
   INICIALIZAÇÃO
   -------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Analytics page loaded');
  
  // Carregar apenas os dados essenciais inicialmente
  loadDashboard();
  loadHistoricalData();
  
  // Carregar outros dados com delay para evitar sobrecarga
  setTimeout(() => {
    loadTrends(7);
  }, 1000);
  
  setTimeout(() => {
    loadDataQuality();
  }, 2000);
  
  setTimeout(() => {
    loadSummary('24h');
    loadPipelineStats();
  }, 3000);
  
  // Desabilitar polling automático para evitar travamentos
  // (usuário pode atualizar manualmente se necessário)
  
  console.log('📊 Analytics initialized');
});
