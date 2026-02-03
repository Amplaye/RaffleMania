import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(
  name: keyof RootStackParamList,
  params?: object,
) {
  if (navigationRef.isReady()) {
    // @ts-ignore - Navigation params type is complex
    navigationRef.navigate(name, params);
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
