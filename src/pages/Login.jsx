import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/dashboard");
  }

  return (
    <div className="login-page">

      <div className="login-container">

        {/* =========================
            BRANDING
            ========================= */}

        <div className="login-branding">

          <h1>
            IS Team KPI App
          </h1>

          <p>
            Performance Management
          </p>

        </div>


        {/* =========================
            LOGIN CARD
            ========================= */}

        <div className="login-card">

          <div className="login-header">

            <h2>
              Welcome back
            </h2>

            <p>
              Sign in to your account
            </p>

          </div>


          <form
            onSubmit={handleLogin}
            className="login-form"
          >

            {/* Email */}

            <div className="login-field">

              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
                required
              />

            </div>


            {/* Password */}

            <div className="login-field">

              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />

            </div>


            {/* Forgot Password */}

            <div className="login-forgot-password">

              <Link to="/reset-password">
                Forgot password?
              </Link>

            </div>


            {/* Login Button */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

        </div>


        {/* Footer */}

        <div className="login-footer">
          IS Team KPI App
        </div>

      </div>

    </div>
  );
}

export default Login;
