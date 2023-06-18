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


  async function getAuthorizationCode(
    authorizeUri,
    epicClientId,
    launchToken,
    aud,
    redirectUri,
    scope,
    state,
    pkce = null
  ) {
    console.log(
      'Requesting authorization code from EPIC, url: %s',
      authorizeUri
    );
  
    let queryParams = new URLSearchParams();
    queryParams.append('response_type', 'code');
    queryParams.append('client_id', epicClientId);
    queryParams.append('redirect_uri', encodeURIComponent(redirectUri));
    queryParams.append('state', state);
    queryParams.append('scope', scope);
    queryParams.append('launch', launchToken);
    queryParams.append('aud', encodeURIComponent(aud));
    if (pkce) {
      queryParams.append('code_challenge', pkce.code_challenge);
      queryParams.append('code_challenge_method', pkce.code_challenge_method);
    }
  

    let rawLocation;
    try {
      let response = await got(authorizeUri, {
        https: {
          rejectUnauthorized: false,
        },
        timeout: 1000,
        retry: {
          limit: 10,
        },
        followRedirect: false,
        searchParams: queryParams,
        headers: {
          'User-Agent': userAgent,
        },
      });

      //console.log(response);

      /* Extract response parameters from the redirect_uri query string.
       */
      rawLocation = response.headers['location'];
      console.log('getAuthorizationCode: location header: %s', rawLocation);
      const locationUrl = new URL(rawLocation); /* Can throw a TypeError */
      if (`${locationUrl.origin}${locationUrl.pathname}` === redirectUri) {
        if (locationUrl.searchParams.get('state') === state) {
          const code = locationUrl.searchParams.get('code');
          const error = locationUrl.searchParams.get('error');
          if (code && !error) {
            return code;
          } else {
            console.log(
              'EPIC authorization code request failed: received error: "%s"',
              error
            );
          }
        } else {
          console.log(
            'EPIC authorization code request failed: invalid state parameter, expected: "%s", got: "%s"',
            state,
            locationUrl.searchParams.get('state')
          );
        }
      } else {
        console.log(
          'EPIC authorization code request failed: invalid redirect uri, expected: "%s", got: "%s"',
          redirectUri,
          `${locationUrl.origin}${locationUrl.pathname}`
        );
      }
    } catch (error) {

      let reason;
      if (error.name === 'RequestError') {
        reason = 'Unable to connect to EPIC';
      } else if (error.name === 'HTTPError') {
        reason = error?.message;
      } else if (error.name === 'TypeError') {
        reason = rawLocation
          ? 'Invalid location header'
          : 'Missing location header';
      } else {
        reason = error.name;
      }
      console.log(
        'EPIC authorization code request failed: %s - %s',
        authorizeUri,
        reason
      );
    }
    return null;
  }





module.exports = {
  getMetaData,
  getEndpoints,
  getAuthorizationCode
};
