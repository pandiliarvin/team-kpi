import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // --------------------------------------------------
    // Load current authenticated user
    // --------------------------------------------------

    async function getInitialUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "Error getting authenticated user:",
          error
        );

        setUser(null);
      } else {
        setUser(user ?? null);
      }

      setLoading(false);
    }

    getInitialUser();

    // --------------------------------------------------
    // Listen for authentication changes
    //
    // IMPORTANT:
    // Do not update React state when Supabase is
    // simply refreshing the same user's session.
    // --------------------------------------------------

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        const nextUser =
          session?.user ?? null;

        setUser((currentUser) => {
          // ------------------------------------------------
          // Same authenticated user.
          //
          // This prevents TOKEN_REFRESHED and similar
          // Supabase events from replacing the user object
          // and unnecessarily triggering application logic.
          // ------------------------------------------------

          if (
            currentUser?.id &&
            nextUser?.id &&
            currentUser.id === nextUser.id
          ) {
            return currentUser;
          }

          // ------------------------------------------------
          // User logged out
          // ------------------------------------------------

          if (!nextUser) {
            return null;
          }

          // ------------------------------------------------
          // A genuinely different user logged in
          // ------------------------------------------------

          return nextUser;
        });
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------
  // Sign out
  // --------------------------------------------------

  const signOut = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Error signing out:",
        error
      );

      return;
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}