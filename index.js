const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
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


//!-------- Verify JWT Token ---------
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}


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
    const userCollection = client.db("CraftsHand").collection("users");

    //!-------- insert a user information to DB ---------
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateUser = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateUser, option);
      const token = jwt.sign({ email: email }, process.env.TOKEN_SECRET, {
        expiresIn: "2hr",
      });
      res.send({ result, token });
    });


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
    app.post("/order", verifyJWT, async (req, res) => {
      const orderDetails = req.body;
      const output = await orderCollection.insertOne(orderDetails);
      res.send(output);
    });


    //!-------- All My orders ---------
    app.get("/order/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email === decodedEmail) {
        const query = { email: email };
        const output = await orderCollection.find(query).toArray();
        res.send(output);
      } 
      else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });


  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("listening from port: ", port);
});
