const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require('stripe')('sk_test_51OEQAXCnHb1beKhZJJgjGjfouvPkTRf3ueIAkXIlPAjmg6b24VD9gfUGFI18rs5KJxRicOVO0tq1ZA7ABCKkmhNv00hK2IfRut')
require("dotenv").config();

const port = process.env.PORT || 5000;

//CORS CONFIG FILE
const corsConfig = {
  origin: [
    "http://localhost:3000",
    "https://dream-finder.vercel.app",
    "https://dream-finder-development.netlify.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

// middleware
app.use(cors());
app.use(express.json());
app.use(cors(corsConfig));

//MONGODB CONNECTION
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.hyjkkob.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//  FUNCTION
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
async function run() {
  try {
    const userCollection = client
      .db("DreamFinder")
      .collection("UserCollection");
    const companyCollection = client
      .db("DreamFinder")
      .collection("CompanyCollection");
    const applicationsCollection = client
      .db("DreamFinder")
      .collection("applications");
    const jobsCollection = client.db("DreamFinder").collection("jobs");
    const bookmarks = client.db("DreamFinder").collection("bookmarks");
    const feedbacksCollection = client.db("DreamFinder").collection("feedbacks");
    const contactsCollection = client.db("DreamFinder").collection("contacts");
    const blockEmailCollection = client.db("DreamFinder").collection("blockEmails");

    const verifyToken = (req, res, next) => {
      const tokenWithBearer = req?.headers?.authorization;
      console.log("inside verifyToken middleware //////=>", tokenWithBearer);
      if (!tokenWithBearer) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = tokenWithBearer.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decodedToken = decoded;
        console.log("decoded email:", decoded.email);
        next();
      });
    };

    // admin verify middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decodedToken?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      console.log(" HIT: verify admin middleware");

      if (!isAdmin) {
        console.log("403 form verifyAdmin");
        return res.status(403).send({ message: "forbidden access" });
      }
      console.log("admin verified");
      // if all ok, then next()
      next();
    };

    // admin verify middleware
    const verifyHr = async (req, res, next) => {
      const email = req.decodedToken?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isHr = user?.role === "hr";
      console.log(" HIT: verify hr middleware");

      if (!isHr) {
        console.log("403 form verifyHr");

        return res.status(403).send({ message: "forbidden access" });
      }
      console.log("hr verified");
      // if all ok, then next()
      next();
    };

    // is admin checker
    app.get("/user/admin-check/:email", verifyToken, async (req, res) => {
      console.log(" HIT: /users/admin-check/:email");
      const email = req?.params?.email;
      console.log("param:", email, "decode:", req.decodedToken?.email);

      if (email !== req?.decodedToken?.email) {
        console.log("in the forbidden block");
        console.log("403 form admin checker");

        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      console.log("last block:", { admin });
      res.send({ admin });
    });

    // is hr checker
    app.get("/user/hr-check/:email", verifyToken, async (req, res) => {
      console.log(" HIT: /users/hr-check/:email");
      const email = req?.params?.email;
      if (email !== req?.decodedToken?.email) {
        console.log("403 form hr checker");

        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let hr = false;
      if (user) {
        hr = user?.role === "hr";
      }
      res.send({ hr });
    });

    ///////////     JWT     //////////

    // payment intent
    app.post('/createPayment', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });

    });

    // create jwt token
    app.post("/create/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3h",
      });
      res.send({ token });
    });

    ///////////     USERS     //////////

    // create user
    app.post("/create/user", async (req, res) => {
      // get user email form client side
      const user = req.body;
      // create user email query
      const query = { email: user.email };
      // get user from DB
      const isUserExist = await userCollection.findOne(query);
      // if user already exist in DB, then return with insertedId: null
      if (isUserExist) {
        return res.send({
          message: "user already exists in DreamFinder",
          insertedId: null,
        });
      }
      // if user don't exist in DB, then insert user in DB
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all user
    app.get("/get/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // delete a single user
    app.delete("/delete/user/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // update user info
    app.put("/update/user/:email", async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const result = await userCollection.updateOne(
        filter,
        { $set: userInfo },
        options
      );
      res.send(result);
    });

    // make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

     // User block
    app.patch("/users/block/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "block",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


     // company block
     app.patch("/company/block/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "block",
        },
      };
      const result = await companyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

     // get all block emails
     app.get("/block/email", async (req, res) => {
      const result = await blockEmailCollection.find().toArray();
      res.send(result);
    });


    // block email collections 

    app.post('/block/email',async(req,res)=>{
      const email = req.body
      const result = await blockEmailCollection.insertOne(email);
      res.send(result)
    })

    ///////////     COMPANY     //////////

    // create company entries in db with details
    app.post("/create/company", async (req, res) => {
      const company = req.body;
      const query = { companyEmail: company.companyEmail };
      const isCompanyExist = await companyCollection.findOne(query);
      if (isCompanyExist) {
        return res.send({
          message: "company already exists in DreamFinder DB",
          insertedId: null,
        });
      }
      const result = await companyCollection.insertOne(company);
      res.send(result);
    });

    // get all companies info
    app.get("/get/companies", async (req, res) => {
      const result = await companyCollection.find().toArray();
      res.send(result);
    });


    // delete a single company entries from db
    app.delete("/delete/company/:id", async (req, res) => {
      const id = req.params.id
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await companyCollection.deleteOne(query);
      res.send(result);
    });

    // UPLOAD RESUME AND COVER LETTER
    app.post("/uploadResume", async (req, res) => {
      const data = req.body;
      const result = await applicationsCollection.insertOne(data);
      res.status(200).send(result);
    });

    // GET ALL APPLICATIONS IDS
    app.get("/retrieveResume", async (req, res) => {
      const { user } = req.query;
      const query = {
        user,
      };
      let ids = [];
      const result = await applicationsCollection
        .find(query)
        .sort({ appliedDate: -1 })
        .toArray();
      if (result) {
        result.map((item) => ids.push(item._id.toString()));
      }

      res.send(ids);
    });

    // GET SINGLE APPLICATION INFO
    app.get("/retrieveResume/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await applicationsCollection.findOne(query);
      res.send({ result });
    });


     // get all jobs info
     app.get("/get/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });


    // GET SINGLE JOB INFO
    app.get("/jobDetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });


     // delete a single job from db
     app.delete("/get/jobs/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // CHECK SPECIFIC JOB APPLIED OR NOT
    app.get("/checkApplied", async (req, res) => {
      const { user, jobId } = req.query;
      const query = {
        user,
        jobId,
      };
      const result = await applicationsCollection.find(query).toArray();
      res.send({ isApplied: result.length });
    });

    // GET ALL JOB POST (SEARCH AND SORT)
    app.get("/api/v1/jobs", async (req, res) => {
      const {
        category,
        location,
        minSalary,
        maxSalary,
        type,
        page,
        preference,
        postedDate,
      } = req.query;
      const pageNumber = Number(page);
      const minSalaryNumber = Number(minSalary);
      const maxSalaryNumber = Number(maxSalary);
      const isPreference = preference === "true";

      let typeArray;
      if (type) {
        typeArray = type.split(",").map((item) => item);
      }

      const query = {};

      if (category) {
        query.category = { $regex: new RegExp(`${category}`, "i") };
      }

      if (postedDate) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(postedDate));

        const formattedDaysAgo = formatDate(daysAgo);

        query.posted_date = {
          $gte: formattedDaysAgo,
        };
      }

      if (typeArray && typeArray.length > 0) {
        query.type = { $in: typeArray };
      }
      if (!isNaN(minSalary)) {
        query.minSalary = { $gte: minSalaryNumber };
      }
      if (!isNaN(maxSalary)) {
        query.maxSalary = { $lte: maxSalaryNumber };
      }
      if (location) {
        query.location = { $regex: new RegExp(location, "i") };
      }

      const sortOptions = isPreference ? { viewCount: -1 } : {};
      const foundedJobs = await jobsCollection.find(query).toArray();
      const result = await jobsCollection
        .find(query)
        .sort(sortOptions)
        .skip((pageNumber - 1) * 9)
        .limit(5)
        .toArray();

      res.send({ result, jobCount: foundedJobs.length });
    });

    // GET LAST 2 WEEK POSTED JOB
    app.get("/api/v1/recent-jobs", async (req, res) => {
      const today = new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      const startDate = formatDate(twoWeeksAgo);
      const endDate = formatDate(today);
      const filteredJobs = await jobsCollection
        .find({
          posted_date: {
            $gte: startDate,
            $lt: endDate,
          },
        })
        .toArray();
      res.send(filteredJobs);
    });

    // GET MOST 15 VIEWED JOBS IN ALL JOBS
    app.get("/api/v1/most-viewed15-jobs", async (req, res) => {
      const result = await jobsCollection
        .find()
        .sort({ viewCount: -1 })
        .limit(15)
        .toArray();
      res.send(result);
    });

    // GET ALL JOBS FOR A PARTICULAR COMPANY BY HR EMAIL
    app.get(
      "/api/v1/posted-jobs/:email",
      verifyToken,
      verifyHr,
      async (req, res) => {
        const query = { company_email: req.params.email };
        const result = await jobsCollection.find(query).toArray();
        console.log(result);
        res.send(result);
      }
    );

    // GET ALL JOBS IN ONE API
    app.get("/get/all-jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    // POST A NEW JOB
    app.post("/api/v1/post-job", verifyToken, verifyHr, async (req, res) => {
      const data = req.body;
      console.log(data);
      // res.send({ message: "hit job post api" });
      const result = await jobsCollection.insertOne(data);
      res.send(result);
    });

    ///////////     BOOKMARKS     //////////

    // GET USER'S BOOKMARKS
    app.get("/bookmark/:user", async (req, res) => {
      const { user } = req.params;
      const { page } = req.query
      const pageNumber = Number(page)
      const query = { user };
      const count = await bookmarks.find(query).toArray()
      const result = await bookmarks.find(query).skip((pageNumber - 1) * 7).limit(7).toArray();
      res.send({ bookmarks: result, count: count.length });
    });

    // SAVE TO BOOKMARK
    app.post("/bookmark", async (req, res) => {
      const job = req.body;
      const result = await bookmarks.insertOne(job);
      res.send(result);
    });

    // REMOVE BOOKMARK FROM DASHBOARD
    app.delete("/bookmark/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await bookmarks.deleteOne(query);
      res.send(result);
    });

    // REMOVE BOOKMARK FROM ALL JOB PAGE
    app.delete("/bookmarkDelete", async (req, res) => {
      const { user, id } = req.query;
      const query = {
        user,
        jobId: id,
      };
      const result = await bookmarks.deleteOne(query);
      res.send(result);
    });

    // post to contact

    app.post("/contacts", async (req, res) => {
      const contacts = req.body;
      const result = await contactsCollection.insertOne(contacts);
      res.send(result);
    });
    // stat count

    // get contacts
    app.get("/contacts", async (req, res) => {
      const cursor = contactsCollection.find()
      const result = await cursor.toArray();
      res.send(result)
    })

    // post to Feedback

    app.post("/feedbacks", async (req, res) => {
      const feedbacks = req.body;
      const result = await feedbacksCollection.insertOne(feedbacks);
      res.send(result);
    });

    // get FeedBack
    
    app.get('/feedbacks', async(req,res) => {
      const cursor = feedbacksCollection.find()
      const result = await cursor.toArray();
      res.send(result);
  })

    // stat count 
    app.get('/admin-stats', async (req, res) => {
      const applicants = await userCollection.estimatedDocumentCount()
      const companies = await companyCollection.estimatedDocumentCount()
      const applications = await applicationsCollection.estimatedDocumentCount()
      const jobs = await jobsCollection.countDocuments()
      const listOfBookmarks = await bookmarks.countDocuments()
      res.send({
        applicants,
        companies,
        applications,
        jobs,
        listOfBookmarks
      })
    })

    app.get("/", (req, res) => {
      res.send({ message: "Welcome To Dream Finder Server" });
    });

    app.patch("/incrementAppliedCount/:id", async (req, res) => {
      const { id } = req.params
      const query = { _id: new ObjectId(id) }
      const appliedPost = await jobsCollection.findOne(query)
      const prevAppliedCount = appliedPost.appliedCount
      const updatedCount = {
        $set: {
          appliedCount: prevAppliedCount + 1
        }
      }
      const result = await jobsCollection.updateOne(query, updatedCount)
      res.send(result)
    })

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, function () {
  console.log(`app is listening on http://localhost:${port}`);
});
