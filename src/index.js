<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login | The Tech Lab</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div class="container">
    <div class="login-box">
      <div class="logo"><h1>The Tech Lab</h1></div>
      <h2>Log In</h2>

      <!-- Email/Password Form -->
      <form id="loginForm">
        <input type="email" id="email" name="email" placeholder="Email address" required autocomplete="email">
        <input type="password" id="password" name="password" placeholder="Password" required autocomplete="current-password">
        <label><input type="checkbox"> Remember Me</label>
        <button type="submit">🔒 Log In</button>
      </form>

      <!-- Google Sign-In -->
      <div id="googleSignInDiv" style="margin-top: 20px; text-align: center;"></div>

      <div class="forgot">
        <p>Don't have an account? <a href="#" id="show-signup">Sign Up!</a></p>
      </div>
    </div>
  </div>

  <!-- Google One Tap / Sign-In Script -->
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script>
    // Handle Google credential response
    async function handleCredentialResponse(response) {
      try {
        const res = await fetch('/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: response.credential })
        });
        const data = await res.json();

        if (data.success) {
          // Optional: set JWT cookie from backend response
          document.cookie = `token=${data.jwt}; path=/; max-age=86400`; // 1 day
          console.log('User logged in:', data.user);
          window.location.href = '/dashboard'; // redirect to dashboard
        } else {
          console.error('Google login failed:', data.message);
        }
      } catch (err) {
        console.error('Google login error:', err);
      }
    }

    window.onload = function() {
      google.accounts.id.initialize({
        client_id: "<%= GOOGLE_CLIENT_ID %>", // From Render env
        callback: handleCredentialResponse
      });

      google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large", shape: "pill" }
      );

      google.accounts.id.prompt(); // optional One Tap popup
    };
  </script>

  <script src="/script.js"></script>
</body>
</html>
