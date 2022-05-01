const kalturabeconfig = {
    be : {
        service_url: 'https://api.frs1.ott.kaltura.com/api_v3/service/',
        group_id: 3223,
        api_version: '6.8.0',
        
    },
    app: {
      port: 3000
    },
    db: {
      host: 'localhost',
      port: 27017,
      name: 'db'
    }
   };
   
module.exports = kalturabeconfig;