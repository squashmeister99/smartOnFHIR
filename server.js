const express = require("express")
const app = express();
const smart   = require("fhirclient");
const session = require("express-session");
const epicClient = require('./epicclient');
const { uuid } = require('uuidv4');

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
    console.log(req.query);
    // set the iss URL received as launch parameter
    epicProviderSmartSettings.iss = req.query.iss;
    smart(req, res).authorize(epicProviderSmartSettings).catch(next);
});


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
    console.log("callback called")
    smart(req, res).ready().then(client => handler(client, res)).catch(err=>console.log(err));
});


async function handler(client, res) {
    const data = await (
        client.patient.id ? client.patient.read() : client.request("Patient")
    );
    res.type("json").send(JSON.stringify(data, null, 4));
} 




// IGNORE STUFF BELOW THIS LINE

const EPIC_CLIENT_ID = "52d7ef24-a2db-4fcd-a347-366c140c0b21";

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