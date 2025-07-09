const express = require("express");
const cors = require("cors");
const port = process.env.PORT || "5000";
const app = express();

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: "backend connected and working as it should" });
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
