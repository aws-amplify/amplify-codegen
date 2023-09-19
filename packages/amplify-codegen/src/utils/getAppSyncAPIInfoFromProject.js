const getAppSyncAPIInfo = require('./getAppSyncAPIInfo');

/* Get AppSync api info if api id and region are avialable.
 * Otherwise return undefined.
 */
async function getAppSyncAPIInfoFromProject(context, project) {
  if (project.amplifyExtension.apiId && project.amplifyExtension.region) {
    const {
      amplifyExtension: { apiId, region },
    } = project;
    return getAppSyncAPIInfo(context, apiId, region);
  }
  return undefined;
}
module.exports = getAppSyncAPIInfoFromProject;
