import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuthStore} from '../store/useAuthStore';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Queue for pending navigations when navigator is not yet ready
let pendingNavigation: {name: keyof RootStackParamList; params?: object} | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// Auth screens that exist in AuthNavigator
const AUTH_SCREENS: Array<keyof RootStackParamList> = ['EmailVerification'];

// Check if the navigator is fully ready to handle navigation to MainStack screens
function isMainStackReady(): boolean {
  if (!navigationRef.isReady()) return false;
  // MainStack screens only exist when user is authenticated
  return useAuthStore.getState().isAuthenticated;
}

export function navigate(
  name: keyof RootStackParamList,
  params?: object,
) {
  // For auth screens, only check if navigator is ready
  const isAuthScreen = AUTH_SCREENS.includes(name);
  const ready = isAuthScreen ? navigationRef.isReady() : isMainStackReady();

  if (ready) {
    // @ts-ignore - Navigation params type is complex
    navigationRef.navigate(name, params);
  } else {
    // Store pending navigation and start retry loop
    pendingNavigation = {name, params};
    startRetryLoop();
  }
}

// Retry processing pending navigation until navigator AND auth are ready (max 10 seconds)
function startRetryLoop() {
  if (retryTimer) return; // Already retrying

  let attempts = 0;
  const maxAttempts = 40; // 40 x 250ms = 10 seconds max

  const tryProcess = () => {
    attempts++;
    if (processPendingNavigation() || attempts >= maxAttempts) {
      retryTimer = null;
      return;
    }
    retryTimer = setTimeout(tryProcess, 250);
  };

  retryTimer = setTimeout(tryProcess, 250);
}

// Returns true if navigation was processed (or no pending navigation)
export function processPendingNavigation(): boolean {
  if (!pendingNavigation) return true;

  const isAuthScreen = AUTH_SCREENS.includes(pendingNavigation.name);
  const ready = isAuthScreen ? navigationRef.isReady() : isMainStackReady();
  if (!ready) return false;

  const {name, params} = pendingNavigation;
  pendingNavigation = null;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  // @ts-ignore - Navigation params type is complex
  navigationRef.navigate(name, params);
  return true;
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
