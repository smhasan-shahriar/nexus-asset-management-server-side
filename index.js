const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://sparkly-parfait-a3fbdc.netlify.app",
    ],
    credentials: true,
  })
);
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
const dbConnect = async () => {
  try {
    client.connect();
    console.log("DB Connected Successfully✅");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

const database = client.db("assetDB");
const usersCollection = database.collection("users");
const assetCollection = database.collection("assets");
const customRequestCollection = database.collection("customRequests");
const requestCollection = database.collection("requests");

//asset related APIs
app.get("/assets", async (req, res) => {
  try {
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

    if (companySearch) {
      queryObj.companyName = companySearch;
    }
    if (quantityStatus && quantityStatus === "available") {
      queryObj.assetQuantity = { $gt: "0" };
    }
    if (quantityStatus && quantityStatus === "outOfStock") {
      queryObj.assetQuantity = "0";
    }
    const result = await assetCollection.find(queryObj).toArray();

    result.sort((a, b) => {
      const aValue = parseInt(a.assetQuantity);
      const bValue = parseInt(b.assetQuantity);

      if (sortOrder === "1") {
        return aValue - bValue;
      } else if (sortOrder === "-1") {
        return bValue - aValue;
      }
    });

    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.get("/asset/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await assetCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.put("/update-asset/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedAsset = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateAsset = {
      $set: {
        assetName: updatedAsset.assetName,
        assetType: updatedAsset.assetType,
        assetQuantity: updatedAsset.assetQuantity,
      },
    };
    const result = await assetCollection.updateOne(filter, updateAsset);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

app.post("/create-asset", async (req, res) => {
  try {
    const newAsset = req.body;
    const result = await assetCollection.insertOne(newAsset);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

app.delete("/delete-asset/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const requestResult = await requestCollection.findOne({ assetId: id });
    if (requestResult?.status === "pending") {
      res.send({
        message: "The asset has pending request. Please Resolve first.",
      });
    } else if (
      requestResult?.assetType === "returnable" &&
      requestResult?.status === "approved"
    ) {
      res.send({
        message:
          "The asset has been approved and it is returnable by the requester. Please Resolve first.",
      });
    } else {
      const query = { _id: new ObjectId(id) };
      const deleteResult = await assetCollection.deleteOne(query);
      res.send(deleteResult);
    }
  } catch (error) {
    console.log(error);
  }
});

//custom request related APIs

app.get("/allcustomrequests", async (req, res) => {
  try {
    const companySearch = req.query.companySearch;
    const emailSearch = req.query.emailSearch;
    let queryObj = {};

    if (companySearch) {
      queryObj.requesterCompany = companySearch;
    }
    if (emailSearch) {
      queryObj.employeeEmail = emailSearch;
    }

    const singleResult = await customRequestCollection.find(queryObj).toArray();

    res.send({ singleResult });
  } catch (error) {
    console.log(error);
  }
});

app.post("/create-custom-request", async (req, res) => {
  try {
    const newCustomRequest = req.body;
    const result = await customRequestCollection.insertOne(newCustomRequest);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

app.put("/manage-custom-request/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const newStatus = req.body.newStatus;

    const filter = { _id: new ObjectId(id) };
    const updateRequest = {
      $set: {
        status: newStatus,
      },
    };
    const result = await customRequestCollection.updateOne(
      filter,
      updateRequest
    );
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.put("/update-custom-request/:id", async (req, res) => {
  try {
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
        requestInfo: requestInfo,
      },
    };
    const result = await customRequestCollection.updateOne(
      filter,
      updateRequest
    );
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

//request related APIs

app.get("/allrequests", async (req, res) => {
  try {
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
      queryObj.status = statusSearch;
    }
    if (emailSearch && typeSearch) {
      queryObj.userEmail = emailSearch;
      queryObj.assetType = typeSearch;
    }
    if (itemNameSearch) {
      queryObj.assetName = {
        $regex: new RegExp(`^${itemNameSearch}$`, "i"),
      };
    }
    if (companySearch) {
      queryObj.requesterCompany = companySearch;
    }

    const singleResult = await requestCollection.find(queryObj).toArray();
    res.send({ singleResult });
  } catch (error) {
    console.log(error);
  }
});

app.post("/create-request", async (req, res) => {
  try {
    const newRequest = req.body;
    const result = await requestCollection.insertOne(newRequest);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

app.put("/manage-request/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const newStatus = req.body.newStatus;
    const actionDate = req.body.actionDate;
    const assetId = req.body.assetId;
    if (newStatus === "approved") {
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

    if (newStatus === "returned") {
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
        actionDate: actionDate,
      },
    };
    const result = await requestCollection.updateOne(filter, updateRequest);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.delete("/delete-request/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await requestCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});

//user database related API
app.get("/find-users", async (req, res) => {
  try {
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
  } catch (error) {
    console.log(error);
  }
});

app.post("/users", async (req, res) => {
  try {
    const newUser = req.body;
    const userEmail = newUser.email;
    const query = { email: userEmail };
    const isExist = await usersCollection.findOne(query);
    if (isExist) {
      return res.send("user already exists");
    } else {
      const userResult = await usersCollection.insertOne(newUser);
      return res.send(userResult);
    }
  } catch (error) {
    console.log(error);
  }
});
app.put("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const updatedUser = req.body;
    const filter = { email };
    const updateUser = {
      $set: {
        name: updatedUser.name,
        dateOfBirth: updatedUser.dateOfBirth,
      },
    };
    const result = await usersCollection.updateOne(filter, updateUser);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.put("/manage-team-member/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const updatedUser = req.body;
    const filter = { email };
    const updateUser = {
      $set: {
        userCompany: updatedUser.userCompany,
        companyImage: updatedUser.companyImage,
      },
    };
    const result = await usersCollection.updateOne(filter, updateUser);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.put("/manage-multiple-member", async (req, res) => {
  try {
    const { emails, userCompany, companyImage } = req.body;
    const updateUser = {
      $set: {
        userCompany,
        companyImage,
      },
    };

    const result = await usersCollection.updateMany(
      { email: { $in: emails } },
      updateUser
    );
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.put("/adminusers/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const updatedUser = req.body;
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
  } catch (error) {
    console.log(error);
  }
});

app.get("/checkuser", async (req, res) => {
  try {
    const userEmail = req.query.email;
    const query = { email: userEmail };
    const user = await usersCollection.findOne(query);
    res.send(user);
  } catch (error) {
    console.log(error);
  }
});

//payment related apis
app.post("/create-payment-intent", async (req, res) => {
  try {
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
  } catch (error) {
    console.log(error);
  }
});

//jwt related API
app.post("/jwt", async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, process.env.SECRET_TOKEN, {
      expiresIn: "1h",
    });
    res.send({ token });
  } catch (error) {
    console.log(error);
  }
});

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
