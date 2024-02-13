const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
const uri = `mongodb+srv://halimatussadia:243392@cluster0.hyjkkob.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const uri2 = `mongodb+srv://service-squad:LfgXUdOgFlY0bo3b@cluster0.3azmgms.mongodb.net/?retryWrites=true&w=majority`;
const client2 = new MongoClient(uri2, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//  FUNCTION
async function run() {
  try {
    ///////////   DATABASE   //////////
    const userCollection = client
      .db("DreamFinder")
      .collection("UserCollection");
    const companyCollection = client
      .db("DreamFinder")
      .collection("CompanyCollection");
    const applicationsCollection = client
      .db("DreamFinder")
      .collection("applications");

    const jobsCollectionOld = client2.db("serviceSquadDB").collection("jobs");
    const jobsCollection = client.db("DreamFinder").collection("jobs");
    const bookmarks = client.db("serviceSquadDB").collection("bookmarks");
    const newResumeCollection = client2
      .db("serviceSquadDB")
      .collection("newResume");
    const appliedJobsCollection = client
      .db("serviceSquadDB")
      .collection("applied-jobs");

    ///////////   MY  MIDDLEWARE     //////////

    // token verify middleware
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
      // get decoded email
      const email = req.decodedToken?.email;
      // create query
      const query = { email: email };
      // find user by there query
      const user = await userCollection.findOne(query);
      // get user role
      const isAdmin = user?.role === "admin";
      // if user role not admin, then return
      console.log(" HIT: verify admin middleware");

      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      console.log("admin verified");
      // if all ok, then next()
      next();
    };

    // company verify middleware
    const verifyHr = async (req, res, next) => {
      // get decoded email
      const email = req.decodedToken?.email;
      // create query
      const query = { email: email };
      // find user by there query
      const user = await userCollection.findOne(query);
      // get user role
      const isHr = user?.role === "hr";
      // if user role not Hr, then return
      console.log(" HIT: verify Hr middleware");

      if (!isHr) {
        return res.status(403).send({ message: "forbidden access" });
      }
      console.log("Hr verified successfully.");
      // if all ok, then next()
      next();
    };

    ///////////////////////////////////
    ///////////     API     //////////

    ///////////     JWT     //////////

    // create jwt token
    app.post("/create/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3h",
      });
      res.send({ token });
    });

    ///////////     ROLE CHECKER     //////////

    // is admin checker
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      console.log(" HIT: /users/admin/:email");
      const email = req?.params?.email;
      if (email !== req?.decodedToken?.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // is hr checker
    app.get("/users/hr/:email", verifyToken, async (req, res) => {
      console.log(" HIT: /users/hr/:email");
      const email = req?.params?.email;
      if (email !== req?.decodedToken?.email) {
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
    app.delete("/delete/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
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

    ///////////     COMPANY     //////////

    // create company entries in db with details
    app.post("/create/company", async (req, res) => {
      // get company info from client side
      const company = req.body;
      // create company email query
      const query = { companyEmail: company.companyEmail };
      // get company from DB
      const isCompanyExist = await companyCollection.findOne(query);
      // if company already exist in DB, then return with insertedId: null
      if (isCompanyExist) {
        return res.send({
          message: "company already exists in DreamFinder DB",
          insertedId: null,
        });
      }
      // if company don't exist in DB, then insert company in DB
      const result = await companyCollection.insertOne(company);
      res.send(result);
    });

    // get all companies info
    app.get(
      "/get/companies/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const result = await companyCollection.find().toArray();
        res.send(result);
      }
    );

    // delete a single company entries from db
    app.delete(
      "/delete/company/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await companyCollection.deleteOne(query);
        res.send(result);
      }
    );

    // update a single company details info
    app.put(
      "/update/company/:email",
      verifyToken,
      verifyHr,
      async (req, res) => {
        const email = req.params.email;
        const updatedInfo = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const result = await companyCollection.updateOne(
          filter,
          { $set: updatedInfo },
          options
        );
        res.send(result);
      }
    );

    // UPLOAD RESUME AND COVER LETTER
    app.post("/uploadResume", async (req, res) => {
      const data = req.body;
      const result = await newResumeCollection.insertOne(data);
      console.log(result);
      res.status(200).send(result);
    });

    // GET ALL APPLICATIONS IDS
    app.get("/retrieveResume", async (req, res) => {
      const { user } = req.query;
      const query = {
        user,
      };
      let ids = [];
      const result = await newResumeCollection
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
      const result = await newResumeCollection.findOne(query);
      res.send({ result });
    });

    // GET SINGLE JOB INFO
    app.get("/jobDetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // CHECK SPECIFIC JOB APPLIED OR NOT
    app.get("/checkApplied", async (req, res) => {
      const { user, jobId } = req.query;
      const query = {
        user,
        jobId,
      };
      const result = await newResumeCollection.find(query).toArray();
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

        // Format the date 15 days ago as "YYYY-MM-DD"
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
        .skip((pageNumber - 1) * 5)
        .limit(5)
        .toArray();
      res.send({ result, jobCount: foundedJobs.length });
    });

    // GET USER'S BOOKMARKS
    app.get("/bookmark/:user", async (req, res) => {
      const { user } = req.params;
      const query = { user };
      const result = await bookmarks.find(query).toArray();
      res.send(result);
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

    app.get("/", async (req, res) => {
      // const jobs = await newResumeCollection.find().toArray()
      // const result = await applicationsCollection.insertMany(jobs)
      // // // console.log(jobs);
      // res.send(result);
    });

    // end-point finished
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

// SERVER STARTING POINT
// app.get("/", (req, res) => {
//   res.send("Dream Finder Server Is Running");
// });
app.listen(port, () => {
  console.log(`Dream Finder Server Is Sitting On Port ${port}`);
});
