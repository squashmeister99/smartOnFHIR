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


app.listen(3000, () => {
    console.log("listening on port 3000")
})