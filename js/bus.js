// =====================================
// MAPA + LOCALIZAÇÃO REAL DO USUÁRIO
// =====================================
const map = L.map("busMap").setView([-8.05, -34.9], 14); // fallback Recife

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// =====================================
// ÍCONES PERSONALIZADOS
// =====================================
const userIcon = L.icon({
  iconUrl: "img/logo.png",
  iconSize: [42, 42],
  className: "rounded-full border-4 border-green-400 shadow-xl"
});

const stopIcon = L.icon({
  iconUrl: "img/logo.png",
  iconSize: [28, 28],
  className: "rounded-full border-2 border-blue-400 shadow-md"
});

let userMarker = null;

// =====================================
// PEGAR LOCALIZAÇÃO REAL
// =====================================
function loadUserLocation() {
  if (!navigator.geolocation) {
    alert("Seu navegador não permite geolocalização.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // colocar mapa na posição real
      map.setView([lat, lng], 16);

      if (userMarker) map.removeLayer(userMarker);

      userMarker = L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("📍 Você está aqui")
        .openPopup();

      loadNearbyStops(lat, lng);
    },
    () => {
      alert("Não foi possível obter a localização real.");
    }
  );
}

loadUserLocation();

// =====================================
// BUSCAR PARADAS (OpenStreetMap / Overpass)
// =====================================
function loadNearbyStops(lat, lng) {
  const radius = 600; // metros ao redor do usuário

  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](around:${radius}, ${lat}, ${lng});
      node["public_transport"="platform"](around:${radius}, ${lat}, ${lng});
    );
    out body;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
    .then((r) => r.json())
    .then((data) => renderStops(data.elements))
    .catch(() => alert("Erro ao carregar paradas próximas."));
}

// =====================================
// RENDERIZAR PARADAS NO MAPA
// =====================================
function renderStops(stops) {
  stops.forEach((stop) => {
    const name = stop.tags.name || "Parada sem nome";
    const lines = stop.tags.ref ? stop.tags.ref.split(";") : [];

    const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon })
      .addTo(map)
      .bindPopup(`<b>${name}</b><br>Clique para ver ônibus`);

    marker.on("click", () => updateBusList(name, lines));
  });
}

// =====================================
// LISTAR LINHAS DO ÔNIBUS NO CARD
// =====================================
function updateBusList(stopName, lines) {
  const busList = document.getElementById("busList");

  if (!lines.length) {
    busList.innerHTML = `
      <li class="text-blue-300 font-semibold mb-1">${stopName}</li>
      <li>Nenhuma linha cadastrada no OSM</li>
    `;
    return;
  }

  busList.innerHTML = `
    <li class="text-blue-300 font-semibold mb-1">${stopName}</li>
    ${lines.map((l) => `<li>Ônibus: ${l}</li>`).join("")}
  `;
}
