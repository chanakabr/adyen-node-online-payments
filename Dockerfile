ARG app_name

FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

#Container ENV with some default
ENV PORT 8080
ENV ADYEN_API_KEY adyen_api_key
ENV ADYEN_MERCHANT_ACCOUNT adyen_merchant_account
ENV ADYEN_CLIENT_KEY adyen_client_key
ENV ADYEN_CLIENT_KEY KAL_BE_ENV

# Copy the source files into the image
COPY . .

CMD [ "npm", "start" ]
