const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//!----middle-wire
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("<center><h1>HandsCraft Server</h1></center>");
});

app.listen(port, () => {
  console.log("listening from port: ", port);
});
