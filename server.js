const express = require("express")
const app = express();
const smart   = require("fhirclient");
const session = require("express-session");
const epicClient = require('./epicclient');
const EPIC_CLIENT_ID = "52d7ef24-a2db-4fcd-a347-366c140c0b21";
const { uuid } = require('uuidv4');

// The SMART state is stored in a session. If you want to clear your session
// and start over, you will have to delete your "connect.sid" cookie!
app.use(session({
    secret: "mysecretcookieKey",
    resave: false,
    saveUninitialized: false
}));

// The settings that we use to connect to our SMART on FHIR server
const smartSettings = {
    clientId: EPIC_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: "launch openid fhirUser",
    iss: "https://launch.smarthealthit.org/v/r2/sim/eyJrIjoiMSIsImIiOiJzbWFydC03Nzc3NzA1In0/fhir"
};


// =============================================================================
// LAUNCHING
// =============================================================================
// 1. If you remove the iss options and request https://c0che.sse.codesandbox.io/launch
//    it will throw because the FHIR service url is not known!
// 2. If an EHR calls it, it will append "launch" and "state" parameters. Try
//    it by loading https://c0che.sse.codesandbox.io/launch?iss=https://launch.smarthealthit.org/v/r3/fhir&launch=eyJhIjoiMSIsImciOiIxIn0
// 3. If you only add an "iss" url parameter (no "launch"), you are doing a
//    "dynamic" standalone launch. The app cannot obtain a launch context but
//    it is still useful to be able to do that. In addition, the SMART Sandbox
//    can be used to build a standalone launch url that contains embedded launch
//    context which may be perfect for previewing you app. For example load this
//    to launch the app with Angela Montgomery from DSTU-2:
//    https://c0che.sse.codesandbox.io/launch?iss=https://launch.smarthealthit.org/v/r2/sim/eyJrIjoiMSIsImIiOiJzbWFydC03Nzc3NzA1In0/fhir
// 4. We have an "iss" authorize option to make this do standalone launch by
//    default. In this case https://c0che.sse.codesandbox.io/launch will
//    not throw. Note that the "iss" url parameter takes precedence over the iss
//    option, so the app will still be launch-able from an EHR.
// 5. If an open server is passed as an "iss" option, or as "iss" url parameter,
//    no authorization attempt will be made and we will be redirected to the
//    redirect_uri (in this case we don't have launch context and there is no
//    selected patient so we show all patients instead). Try it:
//    https://c0che.sse.codesandbox.io/launch?iss=https://r3.smarthealthit.org
// 6. Finally, a "fhirServiceUrl" parameter can be passed as option or as url
//    parameter. It is like "iss" but will bypass the authorization (only useful
//    in testing and development). Example:
//    https://c0che.sse.codesandbox.io/launch?fhirServiceUrl=https://launch.smarthealthit.org/v/r3/fhir
app.get("/launch5", (req, res, next) => {
    console.log(req.query);
    smartSettings.iss = req.query.iss;
    smart(req, res).authorize(smartSettings).catch(next);
});

// =============================================================================
// APP
// =============================================================================
// The app lives at your redirect_uri (in this case that is
// "https://c0che.sse.codesandbox.io/app"). After waiting for "ready()", you get
// a client instance that can be used to query the fhir server.
app.get("/callback", (req, res) => {
    console.log("callback called")
    console.log(req.query);
    smart(req, res).ready().then(console.log(res.json()));
});

app.get("/launch", (req, res) => {
    const { query, method } = req;
    res.json({query, method})
})

app.get("/launch2", async (req, res) => {
    const metadata = await epicClient.getMetaData(req.query.iss, EPIC_CLIENT_ID);
    res.json({metadata})
})

app.get("/launch3", async (req, res) => {
    const metadata = await epicClient.getEndpoints(req.query.iss, EPIC_CLIENT_ID);
    res.json({metadata})
})

app.get("/launch4", async (req, res) => {
    const metadata = await epicClient.getEndpoints(req.query.iss, EPIC_CLIENT_ID);
    const scope = "launch";
    const state = uuid();

    const authorizationCode = await epicClient.getAuthorizationCode2(
        metadata.authorizeUri,
        EPIC_CLIENT_ID,
        req.query.launch, 
        req.query.iss,
        "http://localhost:3000/redirectPage",
        scope,
        state,
        null
      );


    res.json({authorizationCode})
})

app.get('/callback', (req, res) => {
    const { query } = req;
    console.log('callback from epic');
    console.log(query);
    res.json({ query })
  })

app.get('/redirectPage', (req, res) => {
    const { query } = req;
    console.log('callback to redirect page from epic');
    console.log(query);
    res.json({ query })
  })


app.listen(3000, () => {
    console.log("listening on port 3000")
})