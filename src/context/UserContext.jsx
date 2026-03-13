import React, { createContext, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabase";
import { useUserStore } from "../store/userStore";

export const UserContext = createContext({});

export const UserProvider = ({ children }) => {
  const {
    user,
    session,
    isAuthenticated,
    loading,
    setUser,
    setSession,
    setIsAuthenticated,
    setLoading,
    clearUser,
    currentStaff,
    setCurrentStaff,
  } = useUserStore();

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const stored = localStorage.getItem("auth_session");
      const stored2 = localStorage.getItem("current_staff");
      
      if (stored && stored2) {
        const data = JSON.parse(stored);
        let data1 = JSON.parse(stored2);

        // Check if the current_staff data is missing the multi-tenant identifier
        if (!data1.tenant_id) {
          try {
            const { data: updatedStaff, error } = await supabase
              .from('staff')
              .select('*')
              .eq('user_id', data.user.id)
              .single();

            if (!error && updatedStaff) {
              data1 = updatedStaff;
              localStorage.setItem("current_staff", JSON.stringify(updatedStaff));
            }
          } catch (err) {
            console.error("Error fetching updated profile:", err);
          }
        }

        setCurrentStaff(data1);
        setSession(data);
        setUser(data.user);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    initAuth();
  }, [setUser, setSession, setIsAuthenticated, setLoading, setCurrentStaff]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Example: Supabase email/password login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const sessionData = { user: data.user, accessToken: data.session.access_token };
      const {data:staff,error:staffError}=await supabase.from('staff').select("*").eq('user_id',data.user.id).single();
      if(staffError) throw staffError;
      setCurrentStaff(staff);
      setSession(sessionData);
      setUser(data.user);
      setIsAuthenticated(true);
      if (staff) {
         localStorage.setItem('current_staff',JSON.stringify(staff));
      }
      localStorage.setItem("auth_session", JSON.stringify(sessionData));
    } catch (err) {
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    clearUser();
    localStorage.removeItem("auth_session");
    localStorage.removeItem('current_staff');
    await supabase.auth.signOut?.();
    toast.info("Logged out");
  };

  return (
    <UserContext.Provider
      value={{ user, session, isAuthenticated,currentStaff, loading, login, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easier consumption
export const useUser = () => useContext(UserContext);
