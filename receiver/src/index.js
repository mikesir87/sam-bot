import express from "express";
import bodyParser from "body-parser";
import {ErrorMessage} from "./errorMessage";
import {processRequest} from "./processRequest";

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => res.json({ message : "Hi there" }));

app.post("/", async (req, res) => {
  try {
    await processRequest(req.headers, req.body);
    res.sendStatus(200);
  } catch (e) {
    res
        .status(e instanceof ErrorMessage ? e.errorCode : 500)
        .json({ message : e.message });
  }
});

app.listen(3000, () => console.log("App running on port 3000"));
