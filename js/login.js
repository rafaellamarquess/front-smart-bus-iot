// js/login.js

// Função para obter a melhor URL disponível
async function getBestBackendUrl() {
  if (window.selectBestBackendUrl) {
    return await window.selectBestBackendUrl();
  }
  return window.BACKEND_URL_OVERRIDE || "http://localhost:8001";
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('Preencha todos os campos!');
    return;
  }

  if (!email.includes('@')) {
    alert('Email inválido!');
    return;
  }

  try {
    // Seleciona a melhor URL disponível
    const BACKEND_URL = await getBestBackendUrl();
    console.log('🔗 Login tentando URL:', BACKEND_URL);
    
    // Faz requisição real para o backend
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Login bem-sucedido
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({ 
        email: email,
        full_name: data.full_name 
      }));

      alert('Login realizado com sucesso!');
      window.location.href = 'index.html';
    } else {
      // Erro no login
      alert(data.detail || 'Erro no login. Verifique suas credenciais.');
    }

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    
    // Fallback para modo de desenvolvimento
    if (email === 'test@test.com' && password === '123456') {
      localStorage.setItem('token', 'fake-token-123');
      localStorage.setItem('user', JSON.stringify({ email }));
      alert('Login offline realizado com sucesso!');
      window.location.href = 'index.html';
    } else {
      alert('Erro de conexão. Tente novamente ou use test@test.com / 123456 para modo offline.');
    }
  }
});

// Esqueceu a senha (simulação)
document.getElementById('forgotPassword').addEventListener('click', function (e) {
  e.preventDefault();
  const email = prompt('Digite seu email:');
  if (email) {
    alert(`Instruções enviadas para ${email} (simulação)`);
  }
});