"use strict"

let assert    = require('assert')
    ,debug    = require('debug')('authub')
    ,log4js   = require('log4js')
    ,urljoin  = require("url-join")
    ,logger   = log4js.getLogger();

let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

module.exports = function(options){
  let serverUrl = options.server;  // e.g. mongodb://localhost:27017 on default port
  let masterDb = options.masterDB || "authub_master";
  let dbs = {};
  let Account       = require("./Account");
  let Client        = require('./Client');
  //let Administrator = require('./Administrator');
  let User          = require('./User');

  return {
    connectToMaster: function(cb){
      return this.connect(masterDb, cb);
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
          debug("we are connected to: " + account);
          cb(null, dbs[account]);
        });
      }else{
        cb(null, dbs[account]);
      }
    }
  }
}
