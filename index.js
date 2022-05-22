const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//!---- middle-wire -----
app.use(express.json());
app.use(cors());

//!---- external route -----
app.get("/", (req, res) => {
  res.send("<center><h1>HandsCraft Server</h1></center>");
});

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASS}@cluster0.4imeq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("CraftsHand").collection("tools");

    //!-------- get all Tools ---------
    app.get("/tools", async (req, res) => {
      const cursor = toolsCollection.find({});
      const tools = await cursor.toArray();
      res.send(tools);
    });
    
  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("listening from port: ", port);
});
