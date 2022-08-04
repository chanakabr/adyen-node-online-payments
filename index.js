const express = require("express");
const path = require("path");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { uuid } = require("uuidv4");
const { hmacValidator } = require('@adyen/api-library');
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");
const kalturabeconfig = require('./kalturabeconfig.js');
const kaltura = require('kaltura-ott-client');

//const kalturabeproxy = require('./kalturabeproxy.js');

// init app
const app = express();
// setup request logging
app.use(morgan("dev"));
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Serve client from build folder
app.use(express.static(path.join(__dirname, "/public")));

// enables environment variables by
// parsing the .env file and assigning it to process.env
dotenv.config({
  path: "./.env",
});

// Adyen Node.js API library boilerplate (configuration, etc.)
const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");  // change to LIVE for production
const checkout = new CheckoutAPI(client);

// Kaltura BE config
const apiKalConfig = new kaltura.Configuration();
apiKalConfig.serviceUrl = "https://api."+process.env.KAL_BE_ENV+".ott.kaltura.com/api_v3/service/";
apiKalConfig.timeout = 10000; // 10s
const kalClient = new kaltura.Client(apiKalConfig);
////



app.engine(
  "handlebars",
  hbs({
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts",
    helpers: require("./util/helpers"),
  })
);

app.set("view engine", "handlebars");

/* ################# API ENDPOINTS ###################### */

// Set Kaltura BE values
api.post("/api/setKs", async (req,res) => {
  try {
    kalClient.setKs (req.ks);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});



// Invoke /sessions endpoint
app.post("/api/sessions", async (req, res) => {

  try {
    // unique ref for the transaction
    const orderRef = `CBRTEST_${uuid()}`;
    // Ideally the data passed here should be computed based on business logic
    const response = await checkout.sessions({
      amount: { currency: "EUR", value: 1000 }, // value is 10€ in minor units
      countryCode: "NL",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
      reference: orderRef, // required: your Payment Reference
      returnUrl: `http://localhost:${getPort()}/api/handleShopperRedirect?orderRef=${orderRef}` // set redirect URL required for some payment methods
    });

    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});

// Handle the shopperRedirectViaKaltura
app.all("/api/handleShopperRedirectViaKalturaBE", async (req, res) => {
  const redirect = req.method === "GET" ? req.query : req.body;
  const details = {};
  if (redirect.redirectResult) {
    details.redirectResult = redirect.redirectResult;
    console.log(`redirect.redirectResult : ${redirect.redirectResult}`)
  } else if (redirect.payload) {
    details.payload = redirect.payload;
    console.log(`redirect.payload : ${redirect.payload}`)
  }

  // call kaltura BE
  const resp = kalClient.services.householdPaymentGateway.invoke(process.env.KAL_PGW_ID, 'VerifyPayment', {redirectResult: details.redirectResult })
  console.log(`resp : ${JSON.stringify(resp)}`);
});


// Handle all redirects from payment type
app.all("/api/handleShopperRedirect", async (req, res) => {
  // Create the payload for submitting payment details
  const redirect = req.method === "GET" ? req.query : req.body;
  const details = {};
  if (redirect.redirectResult) {
    details.redirectResult = redirect.redirectResult;
  } else if (redirect.payload) {
    details.payload = redirect.payload;
  }

  try {
    const response = await checkout.paymentsDetails({ details });
    // Conditionally handle different result codes for the shopper
    switch (response.resultCode) {
      case "Authorised":
        res.redirect("/result/success");
        break;
      case "Pending":
      case "Received":
        res.redirect("/result/pending");
        break;
      case "Refused":
        res.redirect("/result/failed");
        break;
      default:
        res.redirect("/result/error");
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.redirect("/result/error");
  }
});

/* ################# end API ENDPOINTS ###################### */

/* ################# CLIENT SIDE ENDPOINTS ###################### */

// Index (select a demo)
app.get("/", (req, res) => res.render("index"));

// Cart (continue to checkout)
app.get("/preview", (req, res) =>
  res.render("preview", {
    type: req.query.type,
    clientKey: process.env.ADYEN_CLIENT_KEY,
    intent:req.query.intent,
    user:req.query.user,
    pass:req.query.pass,
    udid:req.query.udid,
    invokeres:req.query.invokeres
  })
);

// Checkout page (make a payment)
app.get("/checkout", (req, res) =>
  res.render("checkout", {
    type: req.query.type,
    clientKey: process.env.ADYEN_CLIENT_KEY,
    intent:req.query.intent,
    user:req.query.user,
    pass:req.query.pass,
    udid:req.query.udid,
    invokeres:req.query.invokeres

  })
);

// Checkout page (make a payment)
app.get("/checkoutaddcard", (req, res) =>
  res.render("checkout", {
    type: req.query.type,
    clientKey: process.env.ADYEN_CLIENT_KEY,
    intent:req.query.intent,
    user:req.query.user,
    pass:req.query.pass,
    udid:req.query.udid,
    invokeres:req.query.invokeres
  })
);

// Result page
app.get("/result/:type", (req, res) =>
  res.render("result", {
    type: req.params.type,
  })
);

/* ################# end CLIENT SIDE ENDPOINTS ###################### */

/* ################# WEBHOOK ###################### */

app.post("/api/webhooks/notifications", async (req, res) => {

  // YOUR_HMAC_KEY from the Customer Area
  const hmacKey = process.env.ADYEN_HMAC_KEY;
  const validator = new hmacValidator()
  // Notification Request JSON
  const notificationRequest = req.body;
  const notificationRequestItems = notificationRequest.notificationItems

  // Handling multiple notificationRequests
  notificationRequestItems.forEach(function(notificationRequestItem) {

    const notification = notificationRequestItem.NotificationRequestItem

    // Handle the notification
    if( validator.validateHMAC(notification, hmacKey) ) {
      // Process the notification based on the eventCode
        const merchantReference = notification.merchantReference;
        const eventCode = notification.eventCode;
        console.log('merchantReference:' + merchantReference + " eventCode:" + eventCode);
      } else {
        // invalid hmac: do not send [accepted] response
        console.log("Invalid HMAC signature: " + notification);
        res.status(401).send('Invalid HMAC signature');
    }
});

  res.send('[accepted]')
});


/* ################# end WEBHOOK ###################### */

/* ################# UTILS ###################### */

function getPort() {
  return process.env.PORT || 8080;
}

/* ################# end UTILS ###################### */

// Start server
app.listen(getPort(), () => console.log(`Server started -> http://localhost:${getPort()}`));
