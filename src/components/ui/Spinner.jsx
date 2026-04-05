import { InlineLoader, LoaderSpinner } from './Loader';

export function Spinner({
  size = 'small',
  color,
  label,
  style,
}) {
  if (label) {
    return <InlineLoader size={size} color={color} label={label} style={style} />;
  }

  return <LoaderSpinner size={size} color={color} style={style} />;
}
