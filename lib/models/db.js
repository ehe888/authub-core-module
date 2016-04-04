"use strict"

let assert    = require('assert')
    ,debug    = require('debug')('authub')
    ,log4js   = require('log4js')
    ,urljoin  = require("url-join")
    ,logger   = log4js.getLogger();

let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// /** set schemas **/
// let Domain    = require('./Domain');
// let User      = require('./User');
// let Administrator = require("./Administrator");



// exports.db            = db;
// exports.Domain        = Domain;
// exports.User          = User;
// exports.Client        = Client;
// exports.Administrator = Administrator;



module.exports = function(options){
  let serverUrl = options.server;  // e.g. mongodb://localhost:27017 on default port
  let dbs = {};
  let Account       = require("./Account");
  let Client        = require('./Client');
  let Administrator = require('./Administrator');
  let User          = require('./User');

  let masterDb = false;

  return {
    connectToMaster: function(masterServerUrl, cb){
       if(!masterDb){
         masterDb = mongoose.createConnection(masterServerUrl);
         masterDb.on('error', console.error.bind(console, 'connection error to masterDb:'));
         masterDb.once('open', function() {
           // we're connected!
           console.log("we are connected to masterDb");
           cb(null, masterDb);
         });
       }else{
         cb(null, masterDb);
       }
    },
    connect: function(account, cb){
      let db = dbs[account];
      if(!db){
        debug("url : ", urljoin(serverUrl, account));

        let conn = mongoose.createConnection(urljoin(serverUrl, account));
        dbs[account] = conn;

        conn.on('error', console.error.bind(console, 'connection error:'));
        conn.once('open', function() {
          // we're connected!
          console.log("we are connected to: " + account);
          cb(null, dbs[account]);
        });
      }else{
        cb(null, dbs[account]);
      }
    }
  }
}
