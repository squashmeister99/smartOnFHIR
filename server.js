const express = require("express")
const app = express();
const smart   = require("fhirclient");
const session = require("express-session");
const epicClient = require('./epicclient');
const EPIC_CLIENT_ID = "52d7ef24-a2db-4fcd-a347-366c140c0b21";
const CERNER_CLIENT_ID = "b7cd27bb-e0af-41a8-a11c-c3afe1781449";

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
    clientId: CERNER_CLIENT_ID,
    redirectUri: "http://localhost:3000/callback",
    scope: "launch patient launch/Patient patient/Patient.read user/Appointment.read",
    iss: "https://launch.smarthealthit.org/v/r2/sim/eyJrIjoiMSIsImIiOiJzbWFydC03Nzc3NzA1In0/fhir"
};


app.get("/test/provider", (req, res, next) => {
    console.log(req.query);
    smartSettings.iss = req.query.iss;
    smart(req, res).authorize(smartSettings).catch(next);
});


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