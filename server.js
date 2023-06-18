const express = require("express")
const app = express();

app.get("/launch", (req, res) => {
    const { query, method, url, headers } = req;
    res.json({query, method})
})


app.listen(3000, () => {
    console.log("listening on port 3000")
})