'use client';

import { useState, useEffect } from 'react';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

interface MediaPermissionsState {
  cameraPermission: PermissionState;
  isChecking: boolean;
  isSupported: boolean;
}

/**
 * Hook to check and request media permissions (camera/gallery access)
 * On mobile devices, camera permissions often control photo gallery access
 */
export function useMediaPermissions() {
  const [state, setState] = useState<MediaPermissionsState>({
    cameraPermission: 'unsupported',
    isChecking: false,
    isSupported: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if Permissions API is supported
    const isSupported = 'permissions' in navigator;
    
    if (isSupported) {
      checkPermissions();
    } else {
      // Permissions API not supported (older browsers, some iOS versions)
      // In this case, permissions are handled implicitly through file input
      setState({
        cameraPermission: 'unsupported',
        isChecking: false,
        isSupported: false,
      });
    }
  }, []);

  const checkPermissions = async () => {
    try {
      setState(prev => ({ ...prev, isChecking: true }));

      // Detect Android - Android browsers handle permissions differently
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // On Android, don't check camera permissions for gallery access
      // File inputs handle permissions independently
      if (isAndroid) {
        setState({
          cameraPermission: 'unsupported',
          isChecking: false,
          isSupported: false, // Don't use Permissions API on Android for gallery
        });
        return;
      }

      // Query camera permission (affects photo access on mobile, mainly iOS)
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      let permission: PermissionState = 'unsupported';
      if (permissionStatus) {
        if (permissionStatus.state === 'granted') {
          permission = 'granted';
        } else if (permissionStatus.state === 'denied') {
          permission = 'denied';
        } else {
          permission = 'prompt';
        }

        // Listen for permission changes
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setState(prev => ({ ...prev, cameraPermission: 'granted' }));
          } else if (permissionStatus.state === 'denied') {
            setState(prev => ({ ...prev, cameraPermission: 'denied' }));
          } else {
            setState(prev => ({ ...prev, cameraPermission: 'prompt' }));
          }
        };
      }

      setState({
        cameraPermission: permission,
        isChecking: false,
        isSupported: true,
      });
    } catch (error) {
      // Permissions API might not support 'camera' permission name in this browser
      // This is common on some iOS versions, Android browsers, or older browsers
      // Permissions API check failed, will rely on implicit permissions
      setState({
        cameraPermission: 'unsupported',
        isChecking: false,
        isSupported: false,
      });
    }
  };

  const requestCameraPermission = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.isSupported) {
      // Permissions API not supported - permissions are handled implicitly through file input
      return { success: true };
    }

    try {
      setState(prev => ({ ...prev, isChecking: true }));

      // For web applications, camera permission is typically requested through getUserMedia
      // However, for gallery access, we rely on the file input which triggers its own permission dialog
      // This function checks if we can request camera permission (for taking photos)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Permission granted - stop the stream immediately as we just needed to check/request permission
        stream.getTracks().forEach(track => track.stop());
        
        setState(prev => ({ ...prev, cameraPermission: 'granted', isChecking: false }));
        return { success: true };
      } catch (err: any) {
        // Permission denied or not available
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setState(prev => ({ ...prev, cameraPermission: 'denied', isChecking: false }));
          return { 
            success: false, 
            error: 'Camera/gallery permission was denied. Please enable it in your browser settings.' 
          };
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          // No camera available, but this doesn't prevent gallery access
          return { success: true };
        } else {
          setState(prev => ({ ...prev, isChecking: false }));
          return { success: true }; // Allow gallery access even if camera isn't available
        }
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, isChecking: false }));
      return { success: true }; // Default to allowing file input to handle permissions
    }
  };

  const requestGalleryAccess = async (): Promise<{ success: boolean; error?: string }> => {
    // On web, gallery access is typically granted implicitly when user interacts with file input
    // Android browsers handle file input permissions independently - they don't require camera permission
    // iOS Safari may require camera permission for photo access, but we should be lenient
    
    // Detect Android - Android browsers handle file inputs differently
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // On Android, file inputs handle permissions automatically - no need to check
    if (isAndroid) {
      return { success: true };
    }

    // For iOS and other platforms, check permissions but be lenient
    if (state.cameraPermission === 'granted') {
      return { success: true };
    }

    // Don't block on denied - let the file input try (it may still work)
    // Some browsers deny camera permission but still allow file input access
    if (state.cameraPermission === 'denied') {
      // Allow file input to try - it may still work even if camera permission is denied
      // The file input will show its own permission dialog if needed
      return { success: true };
    }

    // Try to request permission if needed and supported
    if (state.isSupported && state.cameraPermission === 'prompt') {
      const result = await requestCameraPermission();
      // Even if camera permission fails, allow file input to try
      return { success: true };
    }

    // If unsupported or prompt, allow the file input to handle permissions
    // (iOS Safari handles this automatically when file input is clicked)
    return { success: true };
  };

  return {
    cameraPermission: state.cameraPermission,
    isChecking: state.isChecking,
    isSupported: state.isSupported,
    checkPermissions,
    requestCameraPermission,
    requestGalleryAccess,
  };
}

