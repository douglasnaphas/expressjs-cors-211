const express = require("express");
const mysql = require("mysql2");
var app = express();
const bodyparser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session")({
  secret: "secret",
  resave: false,
  saveUninitialized: false,
});
const passport = require("passport");

const jwt = require("jsonwebtoken");

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyparser.json());
app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(expressSession);

const axios = require("axios");

var mysqlConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sys",
  multipleStatements: true,
});

mysqlConnection.connect((err) => {
  if (!err) console.log("DB connection succeded.");
  else
    console.log(
      "DB connection failed \n Error : " + JSON.stringify(err, undefined, 2)
    );
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, PUT, GET, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.listen(5000, () =>
  console.log("Express server is runnig at port no : 5000")
);

app.get("/get", authenticateToken, (req, res) => {
  jwt.verify(req.token, "secretpassword", (err) => {
    if (err) {
      res.sendStatus(403);
    } else {
      mysqlConnection.query("SELECT * FROM sys.jobs", (err, rows) => {
        if (rows === undefined) {
          res.send("Hello World!");
        } else {
          res.send(rows);
        }
      });
    }
  });
});

app.get("/", authenticateToken, (req, res) => {
  jwt.verify(req.token, "secretpassword", async (err) => {
    if (err) {
      res.sendStatus(403);
    } else {
      let response = await axios.get("http://localhost:5000/" + "get", {
        withCredentials: true,
        headers: {
          "Access-Control-Allow-Origin": "*",
          Authorization: `Bearer 
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjAwOTIyMTQ0LCJleHAiOjE2MDg2OTgxNDR9.aRsw- 
jEQJ-7mlO10nBKA5VT3IL7P0b9T9K0C8aT8sUs`,
        },
      });

      res.send(response.data);
    }
  });
});

app.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    mysqlConnection.query(
      "SELECT * FROM sys.users WHERE email = ?",
      [email],
      async (error, results) => {
        const id = results[0].id;
        const token = jwt.sign({ id }, "secretpassword", {
          expiresIn: "90d",
        });

        const cookieOptions = {
          expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          secure: false,
          httpOnly: true,
        };

        res.cookie("jwt", token, cookieOptions);

        res.status(200).redirect("/get");
      }
    );
  } catch (error) {
    console.log(error);
  }
});

function authenticateToken(req, res, next) {
  const bearerHeader = req.cookies.jwt;

  if (typeof bearerHeader !== "undefined") {
    req.token = bearerHeader;

    next();
  } else {
    res.sendStatus(403);
  }
}
