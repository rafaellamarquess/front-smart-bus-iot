// js/register.js

// Função para obter a melhor URL disponível
async function getBestBackendUrl() {
  if (window.selectBestBackendUrl) {
    return await window.selectBestBackendUrl();
  }
  // Fallback para o Render se config não carregou
  return "https://back-smart-bus-iot-nyp0.onrender.com";
}

document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!username || !email || !password) {
    alert('Preencha todos os campos!');
    return;
  }

  if (password !== confirmPassword) {
    alert('As senhas não coincidem!');
    return;
  }

  if (password.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (!email.includes('@')) {
    alert('Email inválido!');
    return;
  }

  try {
    // Seleciona a melhor URL disponível
    const BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Register tentando URL:', BACKEND_URL);
    
    // Faz requisição real para o backend
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        full_name: username
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Conta criada com sucesso! Faça login.');
      window.location.href = 'login.html';
    } else {
      alert(data.detail || 'Erro ao criar conta. Tente novamente.');
    }

  } catch (error) {
    console.error('Erro ao registrar:', error);
    
    // Fallback para modo offline
    alert('Erro de conexão. Conta simulada criada com sucesso! Faça login.');
    window.location.href = 'login.html';
  }
});