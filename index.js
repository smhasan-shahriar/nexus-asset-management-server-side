const express = require('express');
require('dotenv').config()
const jwt= require('jsonwebtoken')
const port = process.env.PORT || 5000;
const cors = require('cors')
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wzle5cq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("assetDB");
    const usersCollection = database.collection("users");
    const assetCollection = database.collection("assets");
    const customRequestCollection = database.collection("customRequests");
    const requestCollection = database.collection("requests")


//asset related APIs
    app.get("/assets", async(req, res) => {
        const typeField = req.query.typeField;
        const sortField = req.query.sortField;
        const sortOrder = req.query.sortOrder;
        const search = req.query.search;
        const companySearch = req.query.companySearch;

        let queryObj ={}
        let sortObj = {}
        if(typeField){
            queryObj.assetType = typeField;
        }
        if(search){
            itemField = { $regex: new RegExp(search, 'i') }
            queryObj.assetName = itemField;
        }
        if(sortField && sortOrder){
            sortObj[sortField] = sortOrder;
        }
        if(companySearch){
            queryObj.companyName=companySearch;
        }

        const result = await assetCollection.find(queryObj).sort(sortObj).toArray();
        res.send(result)
    })
    app.post("/create-asset", async(req, res) => {
        const newAsset = req.body;
        const result = await assetCollection.insertOne(newAsset);
        res.send(result)
    })

//custom request related APIs

app.get("/allcustomrequests", async(req, res) => {
    const companySearch = req.query.companySearch;
    let queryObj ={}
 
    if(companySearch){
        queryObj.requesterCompany=companySearch;
    }


    const singleResult = await customRequestCollection.find(queryObj).toArray();
    res.send({singleResult});
})

    app.post("/create-custom-request", async(req, res) => {
        const newCustomRequest = req.body;
        const result = await customRequestCollection.insertOne(newCustomRequest);
        res.send(result)
    })

//request related APIs


app.get("/allrequests", async(req, res) => {
    const nameSearch = req.query.nameSearch;
    const emailSearch = req.query.emailSearch;
    const companySearch = req.query.companySearch;
    let queryObj ={}
   
    if(nameSearch){
        itemField = { $regex: new RegExp(nameSearch, 'i') }
        queryObj.userName = itemField;
    }
    if(emailSearch){
        queryObj.userEmail = emailSearch;
    }

    if(companySearch){
        queryObj.requesterCompany=companySearch;
    }


    const singleResult = await requestCollection.find(queryObj).toArray();
    res.send({singleResult});
})
    app.post("/create-request", async(req, res) => {
        const newRequest = req.body;
        const result = await requestCollection.insertOne(newRequest);
        res.send(result);
    })

//user database related API
    app.post("/users", async (req, res) => {
        const newUser = req.body; 
        const userEmail = newUser.email;
        const query = {email: userEmail }
        console.log(newUser, query)
        const isExist = await usersCollection.findOne(query);
        if(isExist){
            return res.send('user already exists')
        }
        else{
            const userResult = await usersCollection.insertOne(newUser);
            res.send(userResult)
        }

    })
    app.put("/users/:email", async(req, res) => {
        const email = req.params.email;
        const updatedUser = req.body;
        const filter = {email}
        const updateUser = {
            $set: {
                name: updatedUser.name,
                dateOfBirth: updatedUser.dateOfBirth
            }
        }
        const result = await usersCollection.updateOne(filter, updateUser);
        res.send(result)
    })

    app.get("/checkuser", async(req, res) => {
        const userEmail = req.query.email;
        query = {email: userEmail}
        const user = await usersCollection.findOne(query);
        res.send(user);

    })

//payment related apis
app.post('/create-payment-intent', async (req, res) => {
    const {price} = req.body; 
    const amount = parseInt(price * 100)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });

    res.send({
        clientSecret: paymentIntent.client_secret
    })
})


//jwt related API
app.post('/jwt', async(req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' });
    res.send({token})

})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server is up and running')
})

app.listen(port, ()=> {
    console.log(`server is running on ${port}`)
})