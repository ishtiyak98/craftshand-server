const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { application } = require("express");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const reviewCollection = client.db("CraftsHand").collection("reviews");
    const paymentCollection = client.db("CraftsHand").collection("payments");

    app.post("/payment-intent", verifyJWT, async(req, res) => {
      const item =  req.body;
      const price = item.price;
      const amount = price*100;

      const paymentIntent =  await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"]
      })

      res.send({clientSecret: paymentIntent.client_secret})
    })

     //!-------- Verified Admin ---------
     const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

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


     //!----------- Add an item tool ------------
     app.post("/tools", verifyJWT, async (req, res) => {
      const toolDetails = req.body;
      const result = await toolsCollection.insertOne(toolDetails);
      res.send(result);
    });

    
    //!----------- Delete or Cancel a tool ------------
    app.delete("/toolsItem/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.deleteOne(query);
      res.send(result);
    });


    //!------------- update a tool quantity -------------
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



    //!----------- Post an order tool ------------
    app.post("/order", verifyJWT, async (req, res) => {
      const orderDetails = req.body;
      const output = await orderCollection.insertOne(orderDetails);
      res.send(output);
    });


    //!------------ All My orders -------------
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


    //!----------- Delete or Cancel a Order ------------
    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    //!-------- show one order ---------
    app.get("/orderItem/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });


    //!-------- payment DB one order ---------
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body; 
      const filter = { _id: ObjectId(id) };

      const updatedDoc = {
        $set:{
          paymentStatus: "paid",
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedPayment = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc)
    });

    
    //!----------- get all orders --------------
    app.get("/order", verifyJWT, async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });


    //!-------- update shipped of a order (ADMIN only) ---------
    app.patch("/orderShipped/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const updatedDoc = {
        $set:{
          orderStatus: "shipped"
        }
      }
      const result = await orderCollection.updateOne(filter, updatedDoc);
      res.send(result)
    });


    //!----------- Post a Review ------------
    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })


    //!----------- get all the Reviews ------------
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });


    //!----------- get all users --------------
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    //!-------- get one user ---------
    app.get("/users/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    //!-------- update details of one user ---------
    app.patch("/userUpdate/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const data = req.body; 
      const filter = { email: email };

      const updatedDoc = {
        $set:{
          education: data.education,
          location: data.location,
          phone: data.phone,
          linkedIn: data.linkedIn,
        }
      }

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    });


    //!------------ Make an Admin --------------
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } 
      else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    //!-------- Check Admin or Not ----------
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("listening from port: ", port);
});
