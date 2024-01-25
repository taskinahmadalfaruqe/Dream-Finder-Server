const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
// const stripe = require("stripe")(process.env.STRIPE_SECRITE_KEY);
const cookieParser = require('cookie-parser');


const port = process.env.PORT || 5000;

//CORS CONFIG FILE
const corsConfig = {
    origin: [
        'http://localhost:5174',
        'lowly-key.surge.sh',
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
};


// middleware
app.use(cors());
app.use(express.json());
app.use(cors(corsConfig));
app.use(cookieParser());
app.use(express.static("public"));

//MONGODB CONNECTION 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.6kbuzrn.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {

        // ALL DATABSE 
        const apartmentCollection = client.db("Haven").collection("apartment");
        
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);


// SERVER STARTING POINT 
app.get('/', (req, res) => {
    res.send('Dream Finder Server Is Running')
})
app.listen(port, () => {
    console.log(`Dream Finder Server Is Sitting On Port ${port}`);
})