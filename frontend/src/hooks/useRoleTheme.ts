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
    console.log('🎨 useRoleTheme: user changed', user);

    if (!user) {
      // No user logged in, use default theme
      console.log('🎨 No user, removing data-theme');
      document.documentElement.removeAttribute('data-theme');
      return;
    }

    // Map user role to theme name (case-insensitive)
    const normalizedRole = user.role?.toLowerCase() || '';
    console.log('🎨 Normalized role:', normalizedRole);
    
    let theme = 'default';
    if (normalizedRole === 'student') {
      theme = 'student';
    } else if (normalizedRole === 'admin') {
      theme = 'admin'; // Can add admin theme later
    } else if (normalizedRole === 'teacher') {
      theme = 'teacher'; // Can add teacher theme later
    }
    // Can extend with more roles...

    // Alternative: use user.theme directly if stored in DB
    const selectedTheme = user.theme || theme;

    console.log('🎨 Setting theme to:', selectedTheme, 'from role:', user.role);

    // Apply theme
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('user-theme', selectedTheme);
    
    // Log current state
    setTimeout(() => {
      console.log('🎨 data-theme attribute:', document.documentElement.getAttribute('data-theme'));
      console.log('🎨 root classes:', document.documentElement.className);
      console.log('🎨 --background computed:', getComputedStyle(document.documentElement).getPropertyValue('--background').trim());
      console.log('🎨 --primary computed:', getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
    }, 100);
  }, [user]);
}
