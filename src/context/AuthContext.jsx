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
    // Load current authenticated session
    // --------------------------------------------------

    async function getInitialSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Error getting authentication session:",
            error
          );

          setUser(null);
        } else {
          setUser(
            session?.user ?? null
          );
        }
      } catch (error) {
        console.error(
          "Unexpected authentication error:",
          error
        );

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // --------------------------------------------------
    // Listen for authentication changes
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
          // Prevent unnecessary React updates when Supabase
          // refreshes the existing session.
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
          // A different user logged in
          // ------------------------------------------------

          return nextUser;
        });

        // --------------------------------------------------
        // Make sure loading is finished after auth events
        // --------------------------------------------------

        setLoading(false);
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