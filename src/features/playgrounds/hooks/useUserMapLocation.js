import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

let LocationModule = null;
try {
  LocationModule = require('expo-location');
} catch {
  LocationModule = null;
}

const Location = LocationModule || {};

export function useUserMapLocation() {
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [error, setError] = useState(null);

  const requestPermission = useCallback(async () => {
    if (!Location?.requestForegroundPermissionsAsync) {
      setPermissionStatus('unavailable');
      return { granted: false, status: 'unavailable' };
    }

    const response = await Location.requestForegroundPermissionsAsync();
    const status = String(response?.status || 'undetermined');
    setPermissionStatus(status);

    return {
      granted: status === 'granted',
      status,
    };
  }, []);

  const locate = useCallback(async () => {
    setIsLocating(true);
    setError(null);

    try {
      const permission = await requestPermission();
      if (!permission.granted) {
        return {
          success: false,
          reason: permission.status || 'denied',
        };
      }

      if (!Location?.getCurrentPositionAsync) {
        setPermissionStatus('unavailable');
        return {
          success: false,
          reason: 'unavailable',
        };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location?.Accuracy?.Balanced || 3,
      });

      const nextCoordinates = {
        latitude: Number(position?.coords?.latitude),
        longitude: Number(position?.coords?.longitude),
      };

      setCoordinates(nextCoordinates);

      return {
        success: true,
        coordinates: nextCoordinates,
      };
    } catch (locationError) {
      setError(locationError);
      return {
        success: false,
        reason: 'location_error',
        error: locationError,
      };
    } finally {
      setIsLocating(false);
    }
  }, [requestPermission]);

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    permissionStatus,
    isLocating,
    coordinates,
    error,
    locate,
    requestPermission,
    openLocationSettings,
    isDenied:
      permissionStatus === 'denied' || permissionStatus === 'blocked',
    isAvailable: permissionStatus !== 'unavailable',
  };
}

