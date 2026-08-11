import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

function ResetPassword() {
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Automatically populate email when logged in
  // --------------------------------------------------

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // --------------------------------------------------
  // Send reset email
  // --------------------------------------------------

  async function handleResetPassword(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "If an account exists with this email address, a password reset link has been sent."
    );
  }

  return (
    <div className="login-page">

      <div className="login-container">

        {/* =========================
            BRANDING
            ========================= */}

        <div className="login-branding">

          <h1>
            IS KPI Portal
          </h1>

          <p>
            Performance Management
          </p>

        </div>


        {/* =========================
            RESET PASSWORD CARD
            ========================= */}

        <div className="login-card">

          <div className="login-header">

            <h2>
              Reset your password
            </h2>

            <p>
              Enter your email address and we'll
              send you a link to reset your password.
            </p>

          </div>


          <form
            onSubmit={handleResetPassword}
            className="login-form"
          >

            {/* Email */}

            <div className="login-field">

              <label htmlFor="reset-email">
                Email
              </label>

              <input
                id="reset-email"
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


            {/* Success */}

            {message && (
              <div className="reset-password-success">
                {message}
              </div>
            )}


            {/* Error */}

            {error && (
              <div className="reset-password-error">
                {error}
              </div>
            )}


            {/* Submit */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>

          </form>


          {/* Back */}

          <div className="reset-password-back">

            <Link to="/dashboard">
              Back
            </Link>

          </div>

        </div>


        {/* Footer */}

        <div className="login-footer">
          TalentPop {new Date().getFullYear()}
        </div>

      </div>

    </div>
  );
}

export default ResetPassword;