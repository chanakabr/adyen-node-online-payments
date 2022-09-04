const clientKey = document.getElementById("clientKey").innerHTML;
const type = document.getElementById("type").innerHTML;
//const intent = document.getElementById("intent").innerHTML;
//const user = document.getElementById("user").innerHTML;
//const pass = document.getElementById("pass").innerHTML;
//const udid = document.getElementById("udid").innerHTML;
const invokeres = document.getElementById("invokeres").innerHTML;
const ks = document.getElementById("ks").innerHTML;

// Used to finalize a checkout call in case of redirect
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId'); // Unique identifier for the payment session
const redirectResult = urlParams.get('redirectResult');

// Kalutra params -- FILL
// const username = user; //"frs1_cbrtest_1650554741";
// const password = pass; //"123456";

//const setKs = callServer("/api/setKs",{ks:ks});


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

    // set ks for the BE
    console.log(`ks:${ks}`);
    //const setKs = await callServer("/api/setKs",{ks:ks});

    // Build the checkoutSession
    var session = {}

    if (invokeres !== null){
      console.log(`invokeres:`+invokeres);
      invokesdec=JSON.parse(decodeURIComponent(window.atob( invokeres )));
      console.log(`invokeresdecoded:`+invokesdec);

      if ('result' in invokesdec && 'paymentGatewayConfiguration' in invokesdec.result) {
        invokesdec.result.paymentGatewayConfiguration.forEach((entry) => {
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
      } else {
        console.log(`INVALID INVOKERES DECODED`);
      }
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

    const cardConfiguration = { // DEBUG
      hasHolderName: true,
      holderNameRequired: true,
      enableStoreDetails: true,
      billingAddressRequired: true, // Set to true to show the billing address input fields.
      brands:['mc','visa','amex'],

    };


    const configuration = {
        clientKey,
        locale: "en_US",
        environment: "test",  // change to live for production
        showPayButton: true,
        session: session,

        paymentMethodsConfiguration: {
/*           card: {
            hasHolderName: true,
            holderNameRequired: true,
            billingAddressRequired: false,// Set to true to show the billing address input fields.
            enableStoreDetails: true,
            brands:['mc','visa','amex'],
          } */
          card: {
            hasHolderName: true,
            holderNameRequired: true,
            billingAddressRequired: true
          },
          twint: {

          },
          threeDS2: { // add 3DS
            challengeWindowSize: '05'
          },
        },


        /* // DEBUG
        cardConfiguration: {
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
        */

        //cardConfiguration: cardConfiguration, //DEBUG

        onchange: (result, component) => { //DEBUG
          console.log(JSON.stringify(result));
        },

        onsubmit: (result, component) => { //DEBUG
          console.log(JSON.stringify(result));
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
console.log('invokeres b64:');
console.log(invokeres);
console.log('invokeres decoded:');
console.log(JSON.parse(decodeURIComponent(window.atob( invokeres ))))
console.log("intent:");
console.log(`ks:${ks}`);
/* console.log(intent);
console.log("user:");
console.log(user);
console.log("pass:");
console.log(pass);
console.log("udid:");
console.log(udid); */




if (!sessionId) {
    //startCheckout();
    startCheckoutWithKaltura();
}
else {
    // existing session: complete Checkout
    finalizeCheckout();
}
