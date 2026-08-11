import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpdatePassword(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    // --------------------------------------------------
    // Check passwords
    // --------------------------------------------------

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    // --------------------------------------------------
    // Update password
    // --------------------------------------------------

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Your password has been successfully updated."
    );

    // --------------------------------------------------
    // Redirect to login
    // --------------------------------------------------

    setTimeout(() => {
      navigate("/");
    }, 2000);
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
            UPDATE PASSWORD CARD
            ========================= */}

        <div className="login-card">

          <div className="login-header">

            <h2>
              Create a new password
            </h2>

            <p>
              Enter your new password below.
            </p>

          </div>


          <form
            onSubmit={handleUpdatePassword}
            className="login-form"
          >

            {/* New Password */}

            <div className="login-field">

              <label htmlFor="new-password">
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

            </div>


            {/* Confirm Password */}

            <div className="login-field">

              <label htmlFor="confirm-password">
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

            </div>


            {/* Success Message */}

            {message && (
              <div className="reset-password-success">
                {message}
              </div>
            )}


            {/* Error Message */}

            {error && (
              <div className="reset-password-error">
                {error}
              </div>
            )}


            {/* Update Button */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </button>

          </form>

        </div>


        {/* Footer */}

        <div className="login-footer">
          TalentPop {new Date().getFullYear()}
        </div>

      </div>

    </div>
  );
}

export default UpdatePassword;