/**
 * @module epicclient
 * Http client for EPIC services.
 */

'use strict';

const got = require('got');

const { name, version } = require('./package.json');
const userAgent = `${name}/${version}`;


/**
 * Get the metadata (Conformance Statement).
 * @async
 * @function getMetaData
 * @param {string} apiBaseUrl
 * @param {string} epicClientId
 * @returns {(Object | null)}
 */
async function getMetaData(apiBaseUrl, epicClientId) {
  const metaDataUri = `${apiBaseUrl}/metadata`;
  console.log(metaDataUri);

  try {
    const response = await got(metaDataUri, {
      https: {
        rejectUnauthorized: false,
      },
      timeout: 1000,
      retry: {
        limit: 10,
      },
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/fhir+json',
        'Epic-Client-ID': epicClientId,
      },
      responseType: 'json',
    });

    return response.body;
  } catch (error) {
    let statusCode = error?.response?.statusCode || 0;
    console.log(statusCode);
  }
  return null;
}


async function getEndpoints(apiBaseUrl, epicClientId) {
    const metadata = await getMetaData(apiBaseUrl, epicClientId);
    if (!metadata) {
      return null;
    }
    let authorizeUri, tokenUri;
    const security = metadata.rest[0].security;
    for (let n = 0; n < security.extension.length; n++) {
      if (
        security.extension[n].url ===
        'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
      ) {
        const extension = security.extension[n].extension;
        for (let m = 0; m < extension.length; m++) {
          if (extension[m].url === 'authorize') {
            authorizeUri = extension[n].valueUri;
          } else if (extension[m].url === 'token') {
            tokenUri = extension[m].valueUri;
          }
        }
      }
    }
    return { authorizeUri, tokenUri };
  }








module.exports = {
  getMetaData,
  getEndpoints
};
