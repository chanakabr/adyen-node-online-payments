const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;
const intent = document.getElementById("intent").innerHTML;
const user = document.getElementById("user").innerHTML;
const pass = document.getElementById("pass").innerHTML;
const udid = document.getElementById("udid").innerHTML;

// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId'); // Unique identifier for the payment session
const redirectResult = urlParams.get('redirectResult');

// Kalutra params -- FILL
const username = user; //"frs1_cbrtest_1650554741";
const password = pass; //"123456";
// const udid = "80B464A89BE047F186D7040F7AE33FBC";

async function startCheckout() {
  try {
    // Init Sessions
    const checkoutSessionResponse = await callServer("/api/sessions?type=" + type);
    console.log(JSON.stringify(checkoutSessionResponse));

    // Create AdyenCheckout using Sessions response
    const checkout = await createAdyenCheckout(checkoutSessionResponse)

  // Create an instance of Drop-in and mount it
    checkout.create(type).mount(document.getElementById(type));

  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
}

async function startCheckoutWithKaltura() {
  try {
    // Create Kaltura Request Payload
    var url = 'https://api.frs1.ott.kaltura.com/api_v3/service/ottuser/action/login';
    var payload = {
      "apiVersion": "6.8.0",
      "extra_params": {},
      "partnerId": 3223,
      "password": password,
      "udid": udid,
      "username": username
    }
    const loginres = await callServer(url, payload);
    console.log(JSON.stringify(loginres));

    var ks = loginres.result.loginSession.ks;
    var userId = loginres.result.user.id;
    var householdId = loginres.result.user.householdId;

    var url = 'https://api.frs1.ott.kaltura.com/api_v3/service/householdPaymentGateway/action/invoke'
    var payload = {
      "apiVersion": "6.8.0",
      "extraParameters": [
          {
              "key": "UserId",
              "value": userId
          },
          {
              "key": "householdId",
              "value": householdId
          },
          {
              "key": "contentId",
              "value": 0
          },
          {
              "key": "ProductId",
              "value": 123457003
          },
          {
              "key": "paymentAmount",
              "value": 7.9
          },
          {
              "key": "currencyCode",
              "value": "CHF"
          },
          {
              "key": "transactionType",
              "value": "subscription"
          },
          {
              "key": "shopperEmail",
              "value": "frs1_cbrtest_1649686841@mailinator.com"
          },
          {
              "key": "merchantReturnData",
              "value": "12345"
          },
          {
              "key": "couponCode",
              "value": ""
          },
          {
              "key": "countryCode",
              "value": "CH"
          }
      ],
      "intent": "FirstPurchase",
      "ks": ks,
      "paymentGatewayId": 551
    }

    if ( cintentat === 'addcard' ) {
      payload['intent'] = 'AddCard'
    }

    console.log(`INVOKE:`)
    console.log(url);
    console.log(JSON.stringify(payload));
    const invokeres = await callServer(url, payload);
    console.log(JSON.stringify(invokeres));

    // Build the checkoutSession
    var session = {}

    if ('result' in invokeres && 'paymentGatewayConfiguration' in invokeres.result) {
      invokeres.result.paymentGatewayConfiguration.forEach((entry) => {
        var k0 = ""
        var v0 = ""
        Object.entries(entry).forEach(([key, value]) => {
          if (key==="key") {
          	k0 = value;
          }
          if (key==="value"){
            v0 = value;
          }
          console.log(`${key}: ${value}`);
        });
        console.log(`${k0}:::${v0}`)
        session[k0]=v0;
      });
    }

    console.log(session);

    // Create AdyenCheckout using Sessions response
    const checkout = await createAdyenCheckout(session)

    // Create an instance of Drop-in and mount it
    checkout.create(type).mount(document.getElementById(type));

  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
}


// Some payment methods use redirects. This is where we finalize the operation
async function finalizeCheckout() {
    try {
        // Create AdyenCheckout re-using existing Session
        const checkout = await createAdyenCheckout({id: sessionId});
        console.log(JSON.stringify(checkout));
        console.log(redirectResult)
        // Submit the extracted redirectResult (to trigger onPaymentCompleted() handler)
        checkout.submitDetails({details: {redirectResult}});
    } catch (error) {
        console.error(error);
        alert("Error occurred. Look at console for details");
    }
}

async function createAdyenCheckout(session) {

    const configuration = {
        clientKey,
        locale: "en_US",
        environment: "test",  // change to live for production
        showPayButton: true,
        session: session,
        paymentMethodsConfiguration: {
            ideal: {
                showImage: true
            },
            card: {
                hasHolderName: true,
                holderNameRequired: true,
                name: "Credit or debit card",
                amount: {
                    value: 1000,
                    currency: "EUR"
                }
            },
            paypal: {
                amount: {
                    currency: "USD",
                    value: 1000
                },
                environment: "test",
                countryCode: "US"   // Only needed for test. This will be automatically retrieved when you are in production.
            }
        },
        onPaymentCompleted: (result, component) => {
            console.log(JSON.stringify(result));
            handleServerResponse(result, component);
        },
        onError: (error, component) => {
            console.error(error.name, error.message, error.stack, component);
        }
    };

    console.log(JSON.stringify(configuration));

    return new AdyenCheckout(configuration);
}

// Calls your server endpoints
async function callServer(url, data) {
  console.log('Calling Server:')
  console.log(url)
  console.log(data ? JSON.stringify(data) : "")
  const res = await fetch(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : "",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
}

// Calls kaltura BE endpoints
async function callKalturaBEServer(url, data) {
  console.log('Calling Server (Invoke):')
  console.log(url)
  console.log(data ? JSON.stringify(data) : "")
  const res = await fetch(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : "",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
}


// Handles responses sent from your server to the client
function handleServerResponse(res, component) {
  if (res.action) {
    console.log(`In handleServerResponse(): res.action TRUE`);
    console.log(JSON.stringify(res));
  } else {
    console.log(`In handleServerResponse(): res.action FALSE`);
    console.log(JSON.stringify(res));
    switch (res.resultCode) {
      case "Authorised":
        window.location.href = "/result/success";
        break;
      case "Pending":
      case "Received":
        window.location.href = "/result/pending";
        break;
      case "Refused":
        window.location.href = "/result/failed";
        break;
      default:
        window.location.href = "/result/error";
        break;
    }
  }
}

console.log("sessionID:");
console.log(sessionId);
console.log("type:");
console.log(type);
console.log("intent:");
console.log(intent);
console.log("user:");
console.log(user);
console.log("pass:");
console.log(pass);
console.log("udid:");
console.log(udid);



if (!sessionId) {
    //startCheckout();
    startCheckoutWithKaltura();
}
else {
    // existing session: complete Checkout
    finalizeCheckout();
}
