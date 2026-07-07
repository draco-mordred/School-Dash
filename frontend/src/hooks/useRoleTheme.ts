import { useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to apply role-based theme (student, admin, teacher, etc.)
 * Reads user.role from AuthContext and sets the data-theme attribute
 * Used as a side effect in the app root to automatically theme the UI
 */
export function useRoleTheme() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      document.documentElement.removeAttribute('data-theme');
      return;
    }

    const normalizedRole = user.role?.toLowerCase() || '';
    let theme = 'default';

    if (normalizedRole === 'student') {
      theme = 'student';
    } else if (normalizedRole === 'admin') {
      theme = 'admin';
    } else if (normalizedRole === 'teacher') {
      theme = 'teacher';
    }

    const selectedTheme = user.theme || theme;
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('user-theme', selectedTheme);
  }, [user]);
}
