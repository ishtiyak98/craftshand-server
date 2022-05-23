const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const orderCollection = client.db("CraftsHand").collection("orders");

    //!-------- get all Tools ---------
    app.get("/tools", async (req, res) => {
      const cursor = toolsCollection.find({});
      const tools = await cursor.toArray();
      res.send(tools);
    });

    //!-------- show one tool ---------
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.findOne(query);
      res.send(result);
    });

    //!-------- update a tool quantity ---------

    app.put("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const { name, image, description, minOrder, available, price } = req.body;

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: name,
          image: image,
          description: description,
          minOrder: minOrder,
          available: available,
          price: price,
        },
      };

      const result = await toolsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //!-------- Post an order tool ---------
    app.post("/order", async (req, res) => {
      const orderDetails = req.body;
      const output = await orderCollection.insertOne(orderDetails);
      res.send(output);
    });
  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("listening from port: ", port);
});
