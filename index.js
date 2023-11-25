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
    const customRequestCollection = database.collection("customRequests")


//asset related APIs
    app.get("/assets", async(req, res) => {
        const category = req.query.category;
        const sortField = req.query.sortField;
        const sortOrder = req.query.sortOrder;
        const search = req.query.search;

        let queryObj ={}
        let sortObj = {}
        if(category){
            queryObj.assetType = category;
        }
        if(search){
            itemField = { $regex: new RegExp(search, 'i') }
            queryObj.assetName = itemField;
        }
        if(sortField && sortOrder){
            sortObj[sortField] = sortOrder;
        }


        const result = await assetCollection.find(queryObj).sort(sortObj).toArray();
        res.send(result)
    })
    app.post("/create-asset", async(req, res) => {
        const newAsset = req.body;
        const result = await assetCollection.insertOne(newAsset);
        res.send(result)
    })

//request related APIs
    app.post("/create-custom-request", async(req, res) => {
        const newRequest = req.body;
        const result = await customRequestCollection.insertOne(newRequest);
        res.send(result)
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