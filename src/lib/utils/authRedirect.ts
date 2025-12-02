/**
 * Utility functions for handling authentication redirects with return URLs
 */

/**
 * Redirects to login page with the current URL as the return URL
 * @param router - Next.js router instance
 * @param currentPath - Current pathname (use usePathname() hook)
 */
export function redirectToLogin(router: any, currentPath: string) {
  // Don't redirect if already on login or signup page
  if (currentPath === '/login' || currentPath === '/signup') {
    return;
  }
  
  // Encode the current path as return URL
  const returnUrl = encodeURIComponent(currentPath);
  router.push(`/login?returnUrl=${returnUrl}`);
}

/**
 * Gets the return URL from search params and redirects there, or to a default path
 * @param router - Next.js router instance
 * @param searchParams - URLSearchParams from useSearchParams()
 * @param defaultPath - Default path to redirect to if no return URL is found
 */
export function redirectAfterLogin(
  router: any,
  searchParams: URLSearchParams | null,
  defaultPath: string = '/home'
) {
  const returnUrl = searchParams?.get('returnUrl');
  
  if (returnUrl) {
    try {
      const decodedUrl = decodeURIComponent(returnUrl);
      // Validate that it's a relative path (security check)
      if (decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
        router.push(decodedUrl);
        return;
      }
    } catch (error) {
      console.error('Invalid return URL:', error);
    }
  }
  
  // Fallback to default path
  router.push(defaultPath);
}

