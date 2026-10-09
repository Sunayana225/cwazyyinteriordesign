import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const {publicBuildInfo}=createRequire(import.meta.url)('../../scripts/public-build-info.cjs');
it('only exposes validated public release identifiers',()=>{
  const sha='A'.repeat(40),metadata=publicBuildInfo({GITHUB_SHA:sha,SECRET:'private-token',HOME:'private-folder'},'0.1.0');expect(metadata).toEqual({NEXT_PUBLIC_ALVEO_VERSION:'0.1.0',NEXT_PUBLIC_ALVEO_REVISION:sha.toLowerCase()});expect(JSON.stringify(metadata)).not.toContain('private');
});
it('does not mislabel local or malformed builds with a release commit',()=>{
  expect(publicBuildInfo({},'0.1.0').NEXT_PUBLIC_ALVEO_REVISION).toBe('unavailable');expect(publicBuildInfo({GITHUB_SHA:'private@example.com'},'bad version')).toEqual({NEXT_PUBLIC_ALVEO_VERSION:'unavailable',NEXT_PUBLIC_ALVEO_REVISION:'unavailable'});expect(publicBuildInfo({VERCEL_GIT_COMMIT_SHA:'f'.repeat(40)},'1.2.3-rc.1').NEXT_PUBLIC_ALVEO_REVISION).toBe('f'.repeat(40));
});
