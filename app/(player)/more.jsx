import { Redirect } from 'expo-router';
import { ROUTES } from '../../src/constants/routes';

export default function PlayerMoreRoute() {
  return <Redirect href={ROUTES.PLAYER_HOME} />;
}
