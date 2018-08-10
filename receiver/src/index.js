import express from "express";
import bodyParser from "body-parser";
import {ErrorMessage} from "./errorMessage";
import {processRequest} from "./tracingOverrides";
import {tracerMiddleware} from "./tracer";

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => res.json({ message : "SAM says, 'Hi there!'" }));

app.post("/", tracerMiddleware, async (req, res) => {
  try {
    const requestContext = {
      headers : req.headers,
      body : req.body,
      startTrace : req.startTrace,
    };

    await processRequest(requestContext);
    res.sendStatus(200);
  } catch (e) {
    res
        .status(e instanceof ErrorMessage ? e.errorCode : 500)
        .json({ message : e.message });
  }
});

app.listen(3000, () => console.log("App running on port 3000"));
