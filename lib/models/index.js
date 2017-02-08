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
  let VeriCode      = require('./VeriCode');
  let User          = require('./User');
  let RegisteredUser = require('./RegisteredUser');

  return {
    connectToMaster: function(cb){
      return this.connect(masterDb, cb);
    },

    connect: function(account, cb){
      //为了向下兼容，保留connect方法，但是connect方法返回的连接不再分account返回独立的连接，
      //所有的连接都是返回masterDB的连接。将多数据库整合为一个数据库
      let db = dbs[masterDb];
      if(!db){
        debug("url : ", urljoin(serverUrl, account));

        let conn = mongoose.createConnection(urljoin(serverUrl, account));
        dbs[masterDb] = conn;

        conn.on('error', console.error.bind(console, 'connection error:'));
        conn.once('open', function() {
          // we're connected!
          debug("we are connected to: " + account);
          cb(null, conn);
        });
      }else{
        cb(null, db);
      }
    }
  }
}
