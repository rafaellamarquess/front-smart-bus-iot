// js/login.js

document.getElementById('loginForm').addEventListener('submit', function (e) {
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

  // Simula login bem-sucedido
  localStorage.setItem('token', 'fake-token-123');
  localStorage.setItem('user', JSON.stringify({ email }));

  alert('Login realizado com sucesso!');
  window.location.href = 'index.html'; // Redireciona para dashboard
});

// Esqueceu a senha (simulação)
document.getElementById('forgotPassword').addEventListener('click', function (e) {
  e.preventDefault();
  const email = prompt('Digite seu email:');
  if (email) {
    alert(`Instruções enviadas para ${email} (simulação)`);
  }
});