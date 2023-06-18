const express = require("express")
const app = express();
const epicClient = require('./epicclient');
const EPIC_CLIENT_ID = "52d7ef24-a2db-4fcd-a347-366c140c0b21"

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
    const state = "1234";

    const authorizationCode = await epicClient.getAuthorizationCode(
        metadata.authorizeUri,
        EPIC_CLIENT_ID,
        req.query.launch, 
        req.query.iss,
        "http://localhost:3000/callback",
        scope,
        state,
        null
      );


    res.json({authorizationCode})
})

app.get('/callback', (req, res) => {
    res.send('This is the callback page launched by Epic')
  })

app.get('/redirectPage', (req, res) => {
    res.send('This is another callback page launched by Epic')
  })


app.listen(3000, () => {
    console.log("listening on port 3000")
})