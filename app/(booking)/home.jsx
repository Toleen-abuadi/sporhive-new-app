import { Redirect } from 'expo-router';
import { ROUTES } from '../../src/constants/routes';

export default function BookingHomeRoute() {
  return <Redirect href={ROUTES.PLAYGROUNDS_HOME} />;
}
