/** Values are fixed when this bundle is built, not when a report is downloaded. */
export const applicationBuild=Object.freeze({
  version:process.env.NEXT_PUBLIC_ALVEO_VERSION??'unavailable',
  revision:process.env.NEXT_PUBLIC_ALVEO_REVISION??'unavailable',
  mode:process.env.NODE_ENV??'unavailable',
});
