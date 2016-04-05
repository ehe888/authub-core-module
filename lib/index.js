/**
 * Module of OAuth 2.0
 */

"use strict"

/**
 * Module entry
 * @param  {express} app    express instance
 * @param  {Object} options Initialize options
 *        {
 *        	jwt: {
 *        		secret: "thejswtsecret",
 *        		expiresIn: 7200,
 *          	algorithms: ['HS256', 'RS256', 'RS512']
 *        	}
 *        }
 */
module.exports = function(app, options){
  let _     = require("lodash")
    ,log4js = require('log4js')
    ,logger = log4js.getLogger()
    ,debug  = require('debug')('authub')
    ,urljoin = require('url-join')
    ,mongoose = require('mongoose')
    ,AuthubFilter = require('authub-core-filter');

  let defaults = {
      mongodb: {
        url: "mongodb://localhost/",
        db: "authub_master",
        options: {}
      },
      jwt: {
        secret: "thejswtsecret",
        expiresIn: 7200,
        algorithms: ['HS256', 'RS256', 'RS512']
      }
  };

  let opts = _.merge(defaults, options);
  const masterServerUrl = urljoin(opts.mongodb.url, opts.mongodb.db);

  let dbs = require('./models/db')({ server: opts.mongodb.url });

  console.log("initialize dbs");

  app.locals.dbs = dbs;

  /**
   * Regsiter new account
   * 	- POST reqeust to create account
   */
  app.post("/register", function(req, res, next){
    var name = req.body.name
      ,username    = req.body.username    //creator's username
      ,email      = req.body.email      //creator's email
      ,mobile     = req.body.mobile     //creator's mobile
      ,password   = req.body.password   //creator's password
      ,firstName  = req.body.firstName  //creator's firstName
      ,lastName   = req.body.lastName;  //creator's lastName

    if(_.isEmpty(name)){
      return res.status(500).json({
        success: false
        ,errCode: 500
        ,errMsg: "invalid_account_name"
      });
    }

    dbs.connectToMaster(masterServerUrl, function(err, db){
      db.model("Account").create({
        name: name,
        creator: {
          mobile: mobile,
          email: email,
          firstName: firstName,
          lastName: lastName
        }
      })
      .then(function(account){
        //TODO: send activation email to registered email address

        return res.status(201).json({
          success: true,
          data: account
        });
      })
      .catch(function(err){
          logger.error(err);
          return res.status(500).json({
            success: false,
            errCode: 500,
            errMsg: err.message
          })
      });
    });
  });


  /**
   * Module entry point
   * Retrieve general information from request, e.g.
   * 	Headers: X-Authub-Account
   *
   * Notes: This module must sit behind Proxy (nginx or nodejs-proxy)
   * Proxies will handle the URL rewrite and set headers
   */
  app.use(function(req, res, next){
    let accountName = req.get('X-Authub-Account') || req.query.authub_account;
    debug("account is : ", accountName);
    debug("headers: ", req.headers);
    dbs.connectToMaster(masterServerUrl, function(err, db){
      db.model("Account")
        .findOne({ name: accountName })
        .then(function(account){
            if(!account) throw new Error("invalid_account");
            res.locals.account = account;
            return next();
        })
        .catch(function(err){
            logger.error(err);
            return res.status(500).json({
              success: false,
              errCode: 500,
              errMsg: err.message
            })
        });
    });
  });

  var administratorController = require("./controllers/Administrators")(app, opts);
  var oauth2Controller = require("./controllers/OAuth2")(app, opts);


  app.use(AuthubFilter().filter(options, function(identity, cb){
    if(identity.ut === 'admin'){
      return cb(null, false);
    }else{
      return cb(null, true);
    }
  }));

  /**
   * Create a new client for this account
   *
   * @param  {[request path]} "/[endpoint]/clients"
   * @param  {[callback]}     function(req, res,next)
   */
  app.post("/clients", function(req, res, next){
      let account = res.locals.account.name;
      dbs.connect(account, function(err, db){
        if(err){
          logger.error(err);
          return res.status(500);
        }

        db.model('Client')
          .generateClientAsync(account)
          .then(function(client){
            return res.status(201).json({
              success: true,
              data: client
            });
          })
          .catch(function(err){
            if(err){
              logger.error(err);
              return res.status(500);
            }
            return res.status(200);
          });
      });
  });


  var clientController = require("./controllers/Clients")(app, opts);

  var userController = require("./controllers/Users")(app, opts);
}
