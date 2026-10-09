/** Only public, validated release metadata may enter the client bundle. */
function publicBuildInfo(env, version) {
  const candidate = env.GITHUB_SHA || env.VERCEL_GIT_COMMIT_SHA || '';
  return {
    NEXT_PUBLIC_ALVEO_VERSION: /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) ? version : 'unavailable',
    NEXT_PUBLIC_ALVEO_REVISION: /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(candidate) ? candidate.toLowerCase() : 'unavailable',
  };
}
module.exports = { publicBuildInfo };
