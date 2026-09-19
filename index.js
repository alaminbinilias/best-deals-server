///for DNS error
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

//import all server related....
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 4000;
//console.log(process.env.DB_User);

//MiddleWare
app.use(cors());
app.use(express.json());

//Firebase AdminSDk
const admin=require("firebase-admin");
const {getAuth}= require("firebase-admin/auth");
const serviceAccount=require("./best-deals-for-firebase-adminsdk.json");

admin.initializeApp({
  credential:admin.cert(serviceAccount)
})

/// created middleware....

// const logger = (req, res, next) => {
//   console.log("Hello");
//   next();
// };

///authLoginMiddleware....

const verfiedLoginMiddleware = async(req, res, next) => {

  //console.log("middleware Token", req.headers.authorization);

  const getToken=req.headers.authorization;
  if(!req.headers.authorization){
    return res.status(401).send({message:"Unauthorized Access"});
  }
  const onlyTokenPart=getToken.split(" ")[1];
  //console.log(onlyTokenPart);
  if(!onlyTokenPart){
    return res.status(401).send({message:"Unauthorized Access"});
  }

  ///now verify firebase token

  try{
    const decodedToken=await getAuth().verifyIdToken(onlyTokenPart);
    //console.log(decodedToken);
    const usrEmail=decodedToken.email;
    //console.log(usrEmail);
    req.vrifyEmailAddress=usrEmail;
    next();
  }catch(err){
    console.log("Token Invaild",err);
  }

};

app.get("/", (req, res) => {
  res.send("Best Deals server");
});

///Database connection  start;

//best_deals
//H3zjq81cWjbgSeQd
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.afmvsxs.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

///database Connection
async function run() {
  await client.connect().then(() => {
    app.listen(port, () => {
      console.log(`Server is Running on Port ${port}`);
    });

    //database create

    const mydb = client.db("best_deals");
    const ProductCollection = mydb.collection("products");
    const usersCollection = mydb.collection("users");
    const BidCollection = mydb.collection("bids");

    ///For All users Operations

    app.post("/users", async (req, res) => {
      const NewUser = req.body;
      const result = await usersCollection.insertOne(NewUser);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    /// For all Products Operations
    //create operation
    app.post("/products", async (req, res) => {
      const newProducts = req.body;
      const result = await ProductCollection.insertOne(newProducts);
      res.send(result);
    });

    //Read operation for all products
    app.get("/products", async (req, res) => {
      const cursor = ProductCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-products", async (req, res) => {
      const filterProducts = { created_at: -1 };
      const cursor = ProductCollection.find().sort(filterProducts).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const quary = {
        _id: new ObjectId(id),
      };
      const result = await usersCollection.findOne(quary);
      res.send(result);
    });

    //Read operation for a single products
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const quary = {
        _id: id,
      };
      const result = await ProductCollection.findOne(quary);
      res.send(result);
    });

    //Update opration
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const newProducts = req.body;
      const quary = {
        _id: new ObjectId(id),
      };
      const UpdatedProducts = {
        $set: {
          name: newProducts.name,
          price: newProducts.price,
        },
      };
      const optional = {};
      const result = await ProductCollection.updateOne(
        quary,
        UpdatedProducts,
        optional,
      );
      res.send(result);
    });

    //delete operation
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const quary = {
        _id: new ObjectId(id),
      };
      const result = await ProductCollection.deleteOne(quary);
      res.send(quary);
    });

    /// All bid details for a spacific product

    app.get("/products/bids/:id",verfiedLoginMiddleware, async (req, res) => {
      const ProductId = req.params.id;
      const query = {
        productId: ProductId,
      };
      const cursor = BidCollection.find(query).sort({ bidPrice: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    ////Bids Section

    ///Bid post section
    app.post("/bids", async (req, res) => {
      const newBids = req.body;
      const bidvalue = newBids.bidPrice;
      //console.log(bidvalue);
      const result = await BidCollection.insertOne(newBids);
      res.send(result);
    });

    ///Bid Get Section
    app.get("/bids", async (req, res) => {
      const cursor = BidCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //bid details for a specific email
    app.get("/bids/mybids", verfiedLoginMiddleware, async (req, res) => {
      //console.log(req.vrifyEmailAddress);
      //console.log("token", req.headers);
      //console.log(req.query.email);
      if(req.vrifyEmailAddress!=req.query.email){
        return res.status(401).send({message:"Forbidden Access"});
      }
      let quary = {};

      //if(req.vrifyEmailAddress!=req.)

      if (req.query.email) {
        quary = {
          buyerEmail: req.query.email,
        };
      }

      const cursor = BidCollection.find(quary);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/mybids/:id", async (req, res) => {
      const ID = req.params.id;
      const quary = {
        _id: new ObjectId(ID),
      };
      const result = await BidCollection.deleteOne(quary);
      res.send(result);
    });
  });
}

run().catch(console.dir);
