const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const { json } = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Doctors Portal Server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.awlo5hg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    console.log("connected");

    const appointmentOptionsCollection = client
      .db("doctorsPortal")
      .collection("appointmentOptions");
    const bookingsCollection = client
      .db("doctorsPortal")
      .collection("bookings");
    const usersCollection = client.db("doctorsPortal").collection("users");

    app.get("/appointmentOptions", async (req, res) => {
      const query = {};
      const date = req.query.date;
      const options = await appointmentOptionsCollection.find(query).toArray();

      // get the bookings of provided date
      const bookingQuery = { appointmentDate: date };
      const alredyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();
      // Code CAREFULLY
      options.forEach((option) => {
        const optionBooked = alredyBooked.filter(
          (book) => book.treatment === option.name
        );
        const bookedSlot = optionBooked.map((book) => book.slot);
        const remaningSlot = option.slots.filter(
          (slot) => !bookedSlot.includes(slot)
        );
        option.slots = remaningSlot;
      });
      res.send(options);
    });

    /**
     * Api Nameing Convention
     * app.get('/bookings')
     * app.get('/bookings/:id')
     * app.post('/bookings')
     * app.patch('/bookings/:id')
     * app.delete('/bookings/:id')
     */

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;

      const query = {
        email: booking.email,
        appointmentDate: booking.appointmentDate,
        treatment: booking.treatment,
      };
      const alredyBooked = await bookingsCollection.find(query).toArray();
      if (alredyBooked.length) {
        const message = `You Alredy Have a Booking on ${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        res.send({ accessToken: token });
      }
      res.status(403).send({ Accesstoe: "" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Listen Port", port);
});
