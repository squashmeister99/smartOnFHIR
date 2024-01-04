const express = require("express")
const app = express();
const smart   = require("fhirclient");
const session = require("express-session");
const epicClient = require('./epicclient');
const { uuid } = require('uuidv4');
require('dotenv').config();
const ssohandler = require('./ssohandler.js');
const querystring = require('querystring');
const utf8 = require('utf8');
const got = require('got');

//EPIC EHR settings
const EPIC_PROVIDER_CLIENT_ID = "83970d92-5423-40ae-a7bf-e9bc9820b5ee";
const EPIC_PROVIDER_SCOPE = "launch openid fhirUser"
const EPIC_PATIENT_CLIENT_ID = "33bf5c24-48d0-4f92-8e21-8cf856d023a9";
const EPIC_PATIENT_SCOPE = "launch openid fhirUser"


// CERNER EHR settings
const CERNER_PROVIDER_SCOPE = "launch patient launch/Patient patient/Patient.read user/Appointment.read"
const CERNER_PATIENT_SCOPE = "launch patient patient/Patient.read patient/Observation.read launch/patient online_access openid profile"
const CERNER_PROVIDER_CLIENT_ID = "b7cd27bb-e0af-41a8-a11c-c3afe1781449";
const CERNER_PATIENT_CLIENT_ID = "52a6011c-0e98-49a4-8ccd-77cec814913a";


// The SMART state is stored in a session. If you want to clear your session
// and start over, you will have to delete your "connect.sid" cookie!
app.use(session({
    secret: "mysecretcookieKey",
    resave: false,
    saveUninitialized: false
}));


/**** Epic Provider ****/
const epicProviderSmartSettings = {
    clientId: EPIC_PROVIDER_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: EPIC_PROVIDER_SCOPE,
    iss: ""
};

app.get("/epic/test/provider", (req, res, next) => {
    //console.log(req.query);
    // set the iss URL received as launch parameter
    epicProviderSmartSettings.iss = req.query.iss;
    // validate iss
    smart(req, res).authorize(epicProviderSmartSettings)
    .catch(next);
});

function loggerMiddleware(req, res) {

    console.log(res.req.session);
    console.log(res.req.session.SMART_KEY);
    console.log(res.req.session[res.req.session.SMART_KEY]);
};


/**** Epic Patient ****/
const epicPatientSmartSettings = {
    clientId: EPIC_PATIENT_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: EPIC_PATIENT_SCOPE,
    iss: ""
};

app.get("/epic/test/patient", (req, res, next) => {
    console.log(req.query);
    // set the iss URL received as launch parameter
    epicPatientSmartSettings.iss = req.query.iss;
    smart(req, res).authorize(epicPatientSmartSettings).catch(next);
    console.log('smart key = ' + req.session.SMART_KEY);
});


/**** Cerner Provider ****/
const cernerProviderSmartSettings = {
    clientId: CERNER_PROVIDER_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: CERNER_PROVIDER_SCOPE,
    iss: ""
};

app.get("/cerner/test/provider", (req, res, next) => {
    console.log(req.query);
    // set the iss URL received as launch parameter
    cernerProviderSmartSettings.iss = req.query.iss;
    smart(req, res).authorize(cernerProviderSmartSettings).catch(next);
});


/**** Cerner Patient ****/
const cernerPatientSmartSettings = {
    clientId: CERNER_PATIENT_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: CERNER_PATIENT_SCOPE,
    iss: ""
};

app.get("/cerner/test/patient", (req, res, next) => {
    console.log(req.query);
    cernerPatientSmartSettings.iss = req.query.iss;
    smart(req, res).authorize(cernerPatientSmartSettings).catch(next);
});

// callbacks from all EHRs
app.get("/callback", (req, res) => {
    console.log(req.query);
    //console.log("callback called")
    smart(req, res).ready()
    .then(client => handler2(client, res)).catch(err=>console.log(err));
});


async function handler2(client, res) {
    sessionData = res.req.session[res.req.session.SMART_KEY];
    console.log(sessionData);
    const foo = {
        clientID: sessionData.clientId,
        serverUrl: sessionData.serverUrl,
        accessToken: sessionData.tokenResponse.access_token,
        key: sessionData.key,
        expires_in: sessionData.tokenResponse.expires_in
    }
    console.log(JSON.stringify(foo, null, "\n"));
    res.type("json").send(JSON.stringify(client.state.tokenResponse, null, 4));
} 

async function handler(client, res) {
    console.log(`access token = ${client.state.tokenResponse.access_token}`);

    const data = await (
        client.patient.id ? client.patient.read() : client.request("Patient")
    );

    // redirect response to portal. Ideally this would be like the extData
    res.redirect(301, client.state.tokenResponse.portal);
    //res.type("json").send(JSON.stringify(data, null, 4));
} 




// IGNORE STUFF BELOW THIS LINE

const EPIC_CLIENT_ID = "52d7ef24-a2db-4fcd-a347-366c140c0b21";

app.get("/launch", (req, res) => {
    const { query, method } = req;
    validateFHIR(req.query.iss)
    .then(response => {
        console.log(`response = ${response}`);
        if (response) {
            res.json({query, method});
        }
        else{
            res.status(403).send();
        }
    })
    .catch(error => {
        console.error(error);
    });
})

app.get("/launch2", async (req, res) => {
    const metadata = await epicClient.getMetaData(req.query.iss, EPIC_PATIENT_CLIENT_ID);
    res.json({metadata})
})

app.get("/launch3", async (req, res) => {
    const metadata = await epicClient.getEndpoints(req.query.iss, EPIC_PATIENT_CLIENT_ID);
    res.json({metadata})
})

app.get("/launch4", async (req, res) => {
    const metadata = await epicClient.getEndpoints(req.query.iss, EPIC_PATIENT_CLIENT_ID);
    const scope = "launch";
    const state = uuid();

    const authorizationCode = await epicClient.getAuthorizationCode2(
        metadata.authorizeUri,
        EPIC_PATIENT_CLIENT_ID,
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
    res.json({ query })
  })

app.get('/redirectPage', (req, res) => {
    const { query } = req;
    console.log('callback to redirect page from epic');
    console.log(query);
    res.json({ query })
  })

app.get('/legacyauth', (req, res) => {
    const { query } = req;
    console.log(req.query.data);
    let handler = new ssohandler(utf8.encode(process.env.password));
    let string_params = handler.decrypt(req.query.data);
    console.log(string_params);
    let params = querystring.parse(string_params);
    console.log(params);
    //encode it again and decode it
    let encoded = handler.encrypt(utf8.encode(querystring.stringify(params)));
    console.log(encoded);
    if (encoded == req.query.data) {
        console.log('match');
    }
    else {
        console.log('no match');
    }
    const t2 = 'a0R%2FcYjbjzunULAyO%2BrrFeOF5p%2BW2k1rhLrMd0jOJgEYSGe8MwaHDWgMyBzLzrJboLzD0ZxF1f1ms5dAmiLSOKFRMJJ7LyjQtGPKuW8qYiqrPLoGUVsLAO7MPDObZwt%2Fgf1czIRq8hAoOcaeGCD%2FhmR%2Fh%2FJFU%2FEfzF8JbVvajOX0QG9MV%2FxMZV8SscJ0286Z'
    let decoded = handler.decrypt(utf8.encode(t2));
    console.log(decoded);
    let myjsonObject = {};
    myjsonObject.name="rajesh";
    myjsonObject.lastname = "vaidya";
    console.log(myjsonObject);
    console.log(querystring.stringify(myjsonObject));
    res.json(string_params || req.query.data);
  })


async function validateFHIR(url) {
    const queryURL = 'https://epicfhirvalidator-mvpcmjxn6q-uc.a.run.app/validateServer';

        try {
            const timeout = 1000;
            const response = await got(queryURL, {
                timeout,
                retry: {
                    limit: 0 // Disable retries entirely
                  }, 
                searchParams: {
                  iss: url
                }
              })
        
            switch (response.statusCode) {
              case 200:
                return true;
              default:
                // Handle other response codes
                console.error(`error status: ${response.statusCode}`);
                return false;
            }
          } catch (error) {
            console.error('Error fetching data:');
            return false;
        }
    }


app.listen(3000, () => {
    console.log("listening on port 3000")
})