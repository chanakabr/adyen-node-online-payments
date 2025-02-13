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
ENV KAL_BE_ENV KAL_BE_ENV
ENV KAL_PGW_ID KAL_PGW_ID
ENV KAL_KS KAL_KS
ENV KAL_USER_ID KAL_USER_ID

# Copy the source files into the image
COPY . .

CMD [ "npm", "start" ]
