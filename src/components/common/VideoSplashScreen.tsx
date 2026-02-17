import React, {useState} from 'react';
import {View, StyleSheet, StatusBar} from 'react-native';
import Video from 'react-native-video';

interface VideoSplashScreenProps {
  onFinish: () => void;
}

export const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({onFinish}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    onFinish();
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        source={require('../../assets/splash-video.mp4')}
        style={styles.video}
        resizeMode="contain"
        onEnd={onFinish}
        onError={() => {
          setHasError(true);
        }}
        repeat={false}
        muted={false}
        playInBackground={false}
        playWhenInactive={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: 150,
    transform: [{scale: 1.2}],
  },
});
