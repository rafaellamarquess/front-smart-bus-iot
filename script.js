// BACKEND
const BACKEND_URL = "http://seu-backend.com/api"; // alterar para o endpoint real
const pollInterval = 2000; // polling fixo
const maxPoints = 60;

const tempValue = document.getElementById('tempValue');
const humValue = document.getElementById('humValue');
const tempTime = document.getElementById('tempTime');
const humTime = document.getElementById('humTime');
const busListEl = document.getElementById('busList');

let readings = [];

// Chart.js
const ctx = document.getElementById('lineChart').getContext('2d');
const chartData = {
  labels: [],
  datasets: [
    {label:'Temperatura (°C)', data:[], borderWidth:2, borderColor:'#10b981', tension:0.3, fill:false},
    {label:'Umidade (%)', data:[], borderWidth:2, borderColor:'#3b82f6', tension:0.3, fill:false}
  ]
};
const chart = new Chart(ctx, { type:'line', data:chartData, options:{ responsive:true, maintainAspectRatio:false } });

let pollTimer = null;

async function fetchData() {
  try {
    const res = await fetch(BACKEND_URL+'/dashboard', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const d = await res.json();

    const temp = Number(d.temperature);
    const hum = Number(d.humidity);
    const buses = Array.isArray(d.buses)? d.buses : [];

    if(isNaN(temp) || isNaN(hum)) return;

    tempValue.textContent = temp.toFixed(1)+' °C';
    humValue.textContent = hum.toFixed(1)+' %';
    tempTime.textContent = new Date().toLocaleTimeString();
    humTime.textContent = new Date().toLocaleTimeString();

    busListEl.innerHTML = buses.length ? buses.map(b=>`<li>${b}</li>`).join('') : '<li>—</li>';

    readings.push({t:new Date().toISOString(), temperature:temp, humidity:hum});
    if(readings.length>maxPoints) readings.shift();
    pushToChart(temp, hum);

  } catch(err) {
    console.error('Erro ao buscar dados:', err);
  }
}

function pushToChart(temp, hum){
  const label = new Date().toLocaleTimeString();
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(temp);
  chart.data.datasets[1].data.push(hum);

  while(chart.data.labels.length>maxPoints){
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds=>ds.data.shift());
  }
  chart.update('none');
}

function startPolling() { stopPolling(); pollTimer=setInterval(fetchData,pollInterval); fetchData(); }
function stopPolling() { if(pollTimer) clearInterval(pollTimer); pollTimer=null; }

startPolling();
