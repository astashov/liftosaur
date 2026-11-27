export function FeatureImages_altText(title: string, featureId: string, name: string): string {
  const rest = name.replace(new RegExp(`^${featureId}-?`), "").replace(/-/g, " ");
  return rest ? `${title}: ${rest}` : title;
}
