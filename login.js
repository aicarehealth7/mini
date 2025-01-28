document.getElementById('signupButton').addEventListener('click', async () => {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
  
    try {
      const response = await fetch('YOUR_SIGNUP_LAMBDA_URL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert(data.message);
        window.location.href = './login.html';
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error during sign-up:', error);
      alert('Failed to sign up. Please try again later.');
    }
  });
  

  