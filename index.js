const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wzle5cq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("assetDB");
    const usersCollection = database.collection("users");
    const assetCollection = database.collection("assets");
    const customRequestCollection = database.collection("customRequests");
    const requestCollection = database.collection("requests");

    //asset related APIs
    app.get("/assets", async (req, res) => {
      const typeField = req.query.typeField;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;
      const search = req.query.search;
      const companySearch = req.query.companySearch;
      const quantityStatus = req.query.quantityStatus;

      let queryObj = {};
      let sortObj = {};
      if (typeField) {
        queryObj.assetType = typeField;
      }
      if (search) {
        itemField = { $regex: new RegExp(search, "i") };
        queryObj.assetName = itemField;
      }
      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder;
      }
      if (companySearch) {
        queryObj.companyName = companySearch;
      }
      if (quantityStatus && quantityStatus === "available") {
        queryObj.assetQuantity = { $gt: "0" };
      }
      if (quantityStatus && quantityStatus === "outOfStock") {
        queryObj.assetQuantity = "0";
      }
      console.log(queryObj);
      const result = await assetCollection
        .find(queryObj)
        .sort(sortObj)
        .toArray();
      res.send(result);
    });
    app.get("/asset/:id", async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await assetCollection.findOne(query);
      res.send(result)
    })
    app.put("/update-asset/:id", async(req, res) => {
      const id = req.params.id;
      const updatedAsset = req.body;
      const filter = {_id: new ObjectId(id)};
      const updateAsset = {
        $set: {
          assetName: updatedAsset.assetName,
          assetType: updatedAsset.assetType,
          assetQuantity: updatedAsset.assetQuantity
        },
      };
      const result = await assetCollection.updateOne(filter, updateAsset)
      res.send(result)
    })


    app.post("/create-asset", async (req, res) => {
      const newAsset = req.body;
      const result = await assetCollection.insertOne(newAsset);
      res.send(result);
    });

    //custom request related APIs

    app.get("/allcustomrequests", async (req, res) => {
      const companySearch = req.query.companySearch;
      const emailSearch = req.query.emailSearch;
      let queryObj = {};

      if (companySearch) {
        queryObj.requesterCompany = companySearch;
      }
      if(emailSearch){
        queryObj.employeeEmail = emailSearch;
      }

      const singleResult = await customRequestCollection.find(queryObj).toArray();

  
      res.send({ singleResult });
    });

    app.post("/create-custom-request", async (req, res) => {
      const newCustomRequest = req.body;
      const result = await customRequestCollection.insertOne(newCustomRequest);
      res.send(result);
    });

    app.put("/manage-custom-request/:id", async (req, res) => {
        const id = req.params.id;
        const newStatus = req.body.newStatus;
  
        const filter = { _id: new ObjectId(id) };
        const updateRequest = {
          $set: {
            status: newStatus,
          },
        };
        const result = await customRequestCollection.updateOne(filter, updateRequest);
        res.send(result);
      });
      app.put("/update-custom-request/:id", async (req, res) => {
        const id = req.params.id;
        const assetName = req.body.assetName;
        const assetType = req.body.assetType;
        const assetPrice = req.body.assetPrice;
        const assetImage = req.body.assetImage;
        const requestReason = req.body.requestReason;
        const requestInfo = req.body.requestInfo;
  
        const filter = { _id: new ObjectId(id) };
        const updateRequest = {
          $set: {
            assetName: assetName,
            assetType: assetType,
            assetPrice: assetPrice,
            assetImage: assetImage,
            requestReason: requestReason,
            requestInfo: requestInfo
          },
        };
        const result = await customRequestCollection.updateOne(filter, updateRequest);
        res.send(result);
      });
  

    //request related APIs

    app.get("/allrequests", async (req, res) => {
      const nameSearch = req.query.nameSearch;
      const emailSearch = req.query.emailSearch;
      const companySearch = req.query.companySearch;
      const statusSearch = req.query.statusSearch;
      const typeSearch = req.query.typeSearch;
      const itemNameSearch = req.query.itemNameSearch;
      let queryObj = {};

      if (nameSearch) {
        itemField = { $regex: new RegExp(nameSearch, "i") };
        queryObj.userName = itemField;
      }
      if (emailSearch) {
        queryObj.userEmail = emailSearch;
      }
      if (emailSearch && statusSearch) {
        queryObj.userEmail = emailSearch;
        queryObj.status = statusSearch
      }
      if (emailSearch && typeSearch) {
        queryObj.userEmail = emailSearch;
        queryObj.assetType = typeSearch
      }
      if(itemNameSearch){
        queryObj.assetName = { $regex: new RegExp(`^${itemNameSearch}$`, "i") };
      }
      if (companySearch) {
        queryObj.requesterCompany = companySearch;
      }

      const singleResult = await requestCollection.find(queryObj).toArray();
      res.send({ singleResult });
    });

    app.post("/create-request", async (req, res) => {
      const newRequest = req.body;
      const result = await requestCollection.insertOne(newRequest);
      res.send(result);
    });

    app.put("/manage-request/:id", async (req, res) => {
      const id = req.params.id;
      const newStatus = req.body.newStatus;
      const actionDate = req.body.actionDate;
      const assetId = req.body.assetId;
      if(newStatus === "approved"){
        const assetQuery = {
            _id: new ObjectId(assetId),
          };
          const newAsset = await assetCollection.findOne(assetQuery);
          const existingQuantity = newAsset.assetQuantity;
          const newQuantity = parseInt(existingQuantity) - 1;
          const newQuantityString = newQuantity.toString();
    
          const updateQuantity = {
            $set: {
              assetQuantity: newQuantityString,
            },
          };
          const assetQuantityUpdate = await assetCollection.updateOne(
            assetQuery,
            updateQuantity
          );
      }
  

      if(newStatus === "returned"){
        const assetQuery = {
            _id: new ObjectId(assetId),
          };
          const newAsset = await assetCollection.findOne(assetQuery);
          const existingQuantity = newAsset.assetQuantity;
          const newQuantity = parseInt(existingQuantity) + 1;
          const newQuantityString = newQuantity.toString();
    
          const updateQuantity = {
            $set: {
              assetQuantity: newQuantityString,
            },
          };
          const assetQuantityUpdate = await assetCollection.updateOne(
            assetQuery,
            updateQuantity
          );
      }

      const filter = { _id: new ObjectId(id) };
      const updateRequest = {
        $set: {
          status: newStatus,
          actionDate: actionDate
        },
      };
      const result = await requestCollection.updateOne(filter, updateRequest);
      res.send(result);
    });
    app.delete('/delete-request/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await requestCollection.deleteOne(query);
        res.send(result)
    })

    //user database related API
    app.get("/find-users", async (req, res) => {
      const userCompany = req.query.userCompany;
      const role = req.query.role;
      let query = {};
      if (userCompany) {
        query.userCompany = userCompany;
      }
      if (role) {
        query.role = role;
      }

      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

  

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const userEmail = newUser.email;
      const query = { email: userEmail };
      console.log(newUser, query);
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send("user already exists");
      } else {
        const userResult = await usersCollection.insertOne(newUser);
        res.send(userResult);
      }
    });
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;
      console.log(updatedUser);
      const filter = { email };
      const updateUser = {
        $set: {
          name: updatedUser.name,
          dateOfBirth: updatedUser.dateOfBirth,
        },
      };
      const result = await usersCollection.updateOne(filter, updateUser);
      res.send(result);
    });
    app.put("/manage-team-member/:email", async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;
      console.log(updatedUser);
      const filter = { email };
      const updateUser = {
        $set: {
          userCompany: updatedUser.userCompany,
          companyImage: updatedUser.companyImage
        },
      };
      const result = await usersCollection.updateOne(filter, updateUser);
      res.send(result);
    });
    app.put("/adminusers/:email", async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;
      console.log(updatedUser);
      const filter = { email };
      const newUser = await usersCollection.findOne(filter);
      const existingLimit = newUser.employeeLimit;
      const newLimit =
        parseInt(existingLimit) + parseInt(updatedUser.employeeLimit);
      const newLimitString = newLimit.toString();
      const updateUser = {
        $set: {
          employeeLimit: newLimitString,
        },
      };
      const result = await usersCollection.updateOne(filter, updateUser);
      res.send(result);
    });

    app.get("/checkuser", async (req, res) => {
      const userEmail = req.query.email;
      query = { email: userEmail };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    //payment related apis
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //jwt related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
